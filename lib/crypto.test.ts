import { describe, it, expect } from 'vitest';
import { createReadStream, createWriteStream } from 'node:fs';
import { unlink, stat } from 'node:fs/promises';
import { Readable } from 'node:stream';
import { encryptFile, decryptFile, encryptStream, decryptStream } from './crypto';
import { createZipFromFiles, extractZip, verifyZip } from './zip';

const CHUNK_SIZE = 5 * 1024 * 1024;
const PASSWORD = 'test-password';

const encode = (s: string) => new TextEncoder().encode(s);

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
      await new Promise<void>((res, rej) => writer.write(value, (err: Error | null | undefined) => err ? rej(err) : res()));
    }
  } finally {
    await new Promise<void>((res, rej) => writer.end((err: Error | null | undefined) => err ? rej(err) : res()));
  }
  return written;
}

async function totalRamBytes(): Promise<number> {
  try {
    const text = await import('node:fs/promises').then(m => m.readFile('/proc/meminfo', 'utf8'));
    const match = text.match(/MemTotal:\s+(\d+)\s+kB/);
    if (match) return parseInt(match[1], 10) * 1024;
  } catch {
    console.log("Can't read /proc/meminfo, defaulting to 16 GiB")
  }
  return 16 * 1024 ** 3;
}

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

describe('streaming encrypt/decrypt (100 MB)', () => {
  const SIZE = 100 * 1024 * 1024;

  it('round-trips a 100 MB stream correctly', { timeout: 60_000 }, async () => {
    const plainStream = makePlaintextStream(SIZE);
    const encStream = encryptStream(plainStream, PASSWORD);
    const decStream = decryptStream(encStream, PASSWORD);
    await verifyDecryptedStream(decStream, SIZE);
  });
});

describe('multi-file archive encrypt/decrypt', () => {
  /** Helper: create a browser-like File from a string. */
  function makeFile(name: string, content: string): File {
    const encoded = new TextEncoder().encode(content);
    return new File([encoded.buffer as ArrayBuffer], name);
  }

  function makeFileFromBytes(name: string, bytes: Uint8Array): File {
    return new File([bytes.buffer as ArrayBuffer], name);
  }

  it('encrypt then decrypt a ZIP archive of multiple text files', async () => {
    const files = [
      makeFile('a.txt', 'alpha content'),
      makeFile('b.txt', 'beta content'),
      makeFile('c.txt', 'gamma content'),
    ];

    // 1. Create ZIP
    const zipBlob = await createZipFromFiles(files);
    const zipBytes = new Uint8Array(await zipBlob.arrayBuffer());

    // Verify it's a valid ZIP
    const entries = verifyZip(zipBytes);
    expect(entries.sort()).toEqual(['a.txt', 'b.txt', 'c.txt']);

    // 2. Encrypt the ZIP
    const encrypted = await encryptFile(zipBytes, PASSWORD);
    expect(encrypted.length).toBeGreaterThan(zipBytes.length);

    // 3. Decrypt the ZIP
    const decrypted = await decryptFile(encrypted, PASSWORD);
    expect(Buffer.from(decrypted).equals(Buffer.from(zipBytes))).toBe(true);

    // 4. Verify the decrypted data is still a valid ZIP with correct contents
    const extracted = extractZip(decrypted);
    expect(new TextDecoder().decode(extracted['a.txt'])).toBe('alpha content');
    expect(new TextDecoder().decode(extracted['b.txt'])).toBe('beta content');
    expect(new TextDecoder().decode(extracted['c.txt'])).toBe('gamma content');
  });

  it('encrypt then decrypt a ZIP with binary data', async () => {
    const binaryData = randomBytes(10_000);
    const files = [
      makeFileFromBytes('binary.bin', binaryData),
      makeFile('readme.txt', 'This archive contains binary data'),
    ];

    const zipBlob = await createZipFromFiles(files);
    const zipBytes = new Uint8Array(await zipBlob.arrayBuffer());

    const encrypted = await encryptFile(zipBytes, PASSWORD);
    const decrypted = await decryptFile(encrypted, PASSWORD);

    const extracted = extractZip(decrypted);
    expect(extracted['binary.bin']).toEqual(binaryData);
    expect(new TextDecoder().decode(extracted['readme.txt'])).toBe(
      'This archive contains binary data',
    );
  });

  it('encrypt then decrypt a ZIP archive via streaming', async () => {
    const files = [
      makeFile('file1.md', '# Heading\n\nSome markdown content.'),
      makeFile('file2.json', '{"key": "value", "num": 42}'),
    ];

    const zipBlob = await createZipFromFiles(files);

    // Encrypt via streaming
    const encStream = encryptStream(zipBlob.stream(), PASSWORD);
    const encBlob = await new Response(encStream).blob();
    const encBytes = new Uint8Array(await encBlob.arrayBuffer());

    // Decrypt via streaming
    const decStream = decryptStream(
      new ReadableStream({
        start(c) {
          c.enqueue(encBytes);
          c.close();
        },
      }),
      PASSWORD,
    );
    const decBlob = await new Response(decStream).blob();
    const decBytes = new Uint8Array(await decBlob.arrayBuffer());

    // Verify
    const extracted = extractZip(decBytes);
    expect(new TextDecoder().decode(extracted['file1.md'])).toBe(
      '# Heading\n\nSome markdown content.',
    );
    expect(JSON.parse(new TextDecoder().decode(extracted['file2.json']))).toEqual({
      key: 'value',
      num: 42,
    });
  });

  it('wrong password fails to decrypt a ZIP archive', async () => {
    const files = [makeFile('secret.txt', 'top secret')];
    const zipBlob = await createZipFromFiles(files);
    const zipBytes = new Uint8Array(await zipBlob.arrayBuffer());

    const encrypted = await encryptFile(zipBytes, PASSWORD);

    await expect(decryptFile(encrypted, 'wrong-password')).rejects.toThrow();
  });

  it('individual file encryption works for multiple files', async () => {
    const files = [
      makeFile('doc1.txt', 'document one'),
      makeFile('doc2.txt', 'document two'),
    ];

    // Encrypt each file individually
    const encryptedFiles: Uint8Array[] = [];
    for (const file of files) {
      const data = new Uint8Array(await file.arrayBuffer());
      const encrypted = await encryptFile(data, PASSWORD);
      encryptedFiles.push(encrypted);
    }

    // Decrypt each individually
    const decryptedContents: string[] = [];
    for (const encrypted of encryptedFiles) {
      const decrypted = await decryptFile(encrypted, PASSWORD);
      decryptedContents.push(new TextDecoder().decode(decrypted));
    }

    expect(decryptedContents).toEqual(['document one', 'document two']);
  });

  it('large multi-file archive (multiple 5 MiB chunks)', { timeout: 30_000 }, async () => {
    // Create files that total > 5 MiB to force multi-block encryption
    const bigData = randomBytes(3 * 1024 * 1024); // 3 MiB
    const files = [
      makeFileFromBytes('big1.bin', bigData),
      makeFileFromBytes('big2.bin', randomBytes(3 * 1024 * 1024)),
    ];

    const zipBlob = await createZipFromFiles(files);
    const zipBytes = new Uint8Array(await zipBlob.arrayBuffer());

    // Must exceed 5 MiB to test multi-block
    expect(zipBytes.length).toBeGreaterThan(CHUNK_SIZE);

    const encrypted = await encryptFile(zipBytes, PASSWORD);
    const decrypted = await decryptFile(encrypted, PASSWORD);

    expect(Buffer.from(decrypted).equals(Buffer.from(zipBytes))).toBe(true);

    const extracted = extractZip(decrypted);
    expect(extracted['big1.bin']).toEqual(bigData);
    expect(extracted['big2.bin'].length).toBe(3 * 1024 * 1024);
  });
});

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
    const cleanup = async () => { try { await unlink(encPath); } catch { } };

    try {
      console.log('Encrypting...');
      const encStart = Date.now();
      const plainStream = makePlaintextStream(targetBytes);
      const encStream = encryptStream(plainStream, PASSWORD);
      const encBytes = await streamToFile(encStream, encPath);
      console.log(`Encrypted ${GiB(encBytes)} in ${((Date.now() - encStart) / 1000).toFixed(1)}s`);

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

