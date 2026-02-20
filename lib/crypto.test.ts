import { describe, it, expect } from 'vitest';
import { createReadStream, createWriteStream } from 'node:fs';
import { unlink, stat } from 'node:fs/promises';
import { Readable } from 'node:stream';
import { encryptFile, decryptFile, encryptStream, decryptStream } from './crypto';

const CHUNK_SIZE = 5 * 1024 * 1024; // 5 MiB — must match crypto.ts
const PASSWORD = 'test-password';

const encode = (s: string) => new TextEncoder().encode(s);

// crypto.getRandomValues is capped at 65536 bytes per call
const randomBytes = (size: number): Uint8Array => {
  const buf = new Uint8Array(size);
  for (let offset = 0; offset < size; offset += 65536) {
    crypto.getRandomValues(buf.subarray(offset, offset + Math.min(65536, size - offset)));
  }
  return buf;
};

const roundtrip = async (plaintext: Uint8Array, password = PASSWORD) => {
  const encrypted = await encryptFile(plaintext, password);
  const decrypted = await decryptFile(encrypted, password);
  return decrypted;
};

describe('encryptFile / decryptFile', () => {
  it('happy path: "hello world"', async () => {
    const plaintext = encode('hello world');
    const result = await roundtrip(plaintext);
    expect(Buffer.from(result).equals(Buffer.from(plaintext))).toBe(true);
  });

  it('happy path: exactly 1 byte', async () => {
    const plaintext = new Uint8Array([0x42]);
    const result = await roundtrip(plaintext);
    expect(Buffer.from(result).equals(Buffer.from(plaintext))).toBe(true);
  });

  it('happy path: exactly one full block (5 MiB)', async () => {
    const plaintext = randomBytes(CHUNK_SIZE);
    const result = await roundtrip(plaintext);
    expect(Buffer.from(result).equals(Buffer.from(plaintext))).toBe(true);
  });

  it('happy path: one full block + 1 byte (5 MiB + 1)', async () => {
    const plaintext = randomBytes(CHUNK_SIZE + 1);
    const result = await roundtrip(plaintext);
    expect(Buffer.from(result).equals(Buffer.from(plaintext))).toBe(true);
  });
});


//////////////////////
// huge optional test to test streaming
// run with: `RUN_LARGE_FILE_TEST=1 LARGE_FILE_TMP_DIR=/home/$(USER)/ bun vitest --testTimeout=600000`
// it defaults to `/tmp` if `LARGE_FILE_TMP_DIR` is not set, but its usually a special tmpfs so it will ENOSPC
//////////////////////

// Get ram via `/proc/meminfo`
async function totalRamBytes(): Promise<number> {
  try {
    const text = await import('node:fs/promises').then(m => m.readFile('/proc/meminfo', 'utf8'));
    const match = text.match(/MemTotal:\s+(\d+)\s+kB/);
    if (match) return parseInt(match[1], 10) * 1024;
  } catch {
    /* only works on linux */
    console.log("Running not on linux? Can't read mem, defaulting to 16GiB")
  }
  return 16 * 1024 ** 3; // fallback: 16 GiB
}

function nodeToWebStream(readable: Readable): ReadableStream<Uint8Array> {
  return new ReadableStream({
    start(controller) {
      readable.on('data', (chunk: Buffer) => controller.enqueue(new Uint8Array(chunk)));
      readable.on('end', () => controller.close());
      readable.on('error', (err) => controller.error(err));
    },
    cancel() { readable.destroy(); },
  });
}

async function streamToFile(stream: ReadableStream<Uint8Array>, path: string): Promise<number> {
  const writer = createWriteStream(path);
  const reader = stream.getReader();
  let written = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      written += value.byteLength;
      await new Promise<void>((res, rej) => writer.write(value, err => err ? rej(err) : res()));
    }
  } finally {
    await new Promise<void>((res, rej) => writer.end(err => err ? rej(err) : res()));
  }
  return written;
}

// We use `i&0xff` (i.e. [0,1,...,255,0,1]) so know what the decrypted stream should look like without storing the plain
function makePlaintextStream(totalBytes: number, chunkSize = 64 * 1024): ReadableStream<Uint8Array> {
  let sent = 0;
  return new ReadableStream({
    pull(controller) {
      if (sent >= totalBytes) { controller.close(); return; }
      const size = Math.min(chunkSize, totalBytes - sent);
      const buf = new Uint8Array(size);
      for (let i = 0; i < size; i++) buf[i] = (sent + i) & 0xff;
      sent += size;
      controller.enqueue(buf);
    },
  });
}

// Expects pattern described above
async function verifyDecryptedStream(stream: ReadableStream<Uint8Array>, totalBytes: number): Promise<void> {
  const reader = stream.getReader();
  let verified = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    for (let i = 0; i < value.length; i++) {
      const expected = (verified + i) & 0xff;
      if (value[i] !== expected) {
        throw new Error(
          `Byte mismatch at offset ${verified + i}: expected ${expected}, got ${value[i]}`
        );
      }
    }
    verified += value.length;
  }
  if (verified !== totalBytes) {
    throw new Error(`Length mismatch: expected ${totalBytes} bytes, got ${verified}`);
  }
}

// full run
describe('large-file streaming (opt-in)', () => {
  const skip = !process.env.RUN_LARGE_FILE_TEST;

  it('decrypt(encrypt) a file larger than RAM without loading it into memory', { skip, timeout: 10 * 60 * 1000 }, async () => {
    const ram = await totalRamBytes();
    const targetBytes = process.env.LARGE_FILE_BYTES
      ? parseInt(process.env.LARGE_FILE_BYTES, 10)
      : ram * 2;

    const GiB = (n: number) => `${(n / 1024 ** 3).toFixed(2)} GiB`;
    console.log(`Target size: ${GiB(targetBytes)} (RAM: ${GiB(ram)})`);

    const tmpDir = (process.env.LARGE_FILE_TMP_DIR ?? '/tmp').replace(/\/$/, '');
    const encPath = `${tmpDir}/seal3d-large-test.encrypted`;
    const cleanup = async () => { try { await unlink(encPath); } catch { /* already gone */ } };

    try {
      console.log('Encrypting...');
      const encStart = Date.now();
      const plainStream = makePlaintextStream(targetBytes);
      const encStream = encryptStream(plainStream, PASSWORD);
      const encBytes = await streamToFile(encStream, encPath);
      console.log(`Encrypted ${GiB(encBytes)} in ${((Date.now() - encStart) / 1000).toFixed(1)}s`);

      // Sanity check: encrypted file must be larger than plaintext (IV + auth tags)
      const { size: encSize } = await stat(encPath);
      expect(encSize).toBeGreaterThan(targetBytes);

      console.log('Decrypting & verifying...');
      const decStart = Date.now();
      const encReadStream = nodeToWebStream(createReadStream(encPath, { highWaterMark: 256 * 1024 }));
      const decStream = decryptStream(encReadStream, PASSWORD);
      await verifyDecryptedStream(decStream, targetBytes);
      console.log(`Verified in ${((Date.now() - decStart) / 1000).toFixed(1)}s`);

    } finally {
      await cleanup();
    }
  });
});
