// How the crypto works: Inspired by the [gocryptfs crypto](https://nuetzlich.net/gocryptfs/forward_mode_crypto/)
// Also see [its crypto audit](https://defuse.ca/audits/gocryptfs.htm)
//
// Effectively, we chunk every 5MiB and use AES256-GCM (GCM to find out if the crypto worked through auth tag).
// Now we furthermore ensure against 2 attack vectors:
//
// 1. **Changing chunks between files:** The chunk size is known to the attacker. So if the attacker knows (or assumes)
//    that the lazy user always uses the same password, it could take two files and write chunks from file 1 to file 2,
//    as long as it keeps chunk boundaries. To prevent this, each file has a fileid (a header) that gets put into
//    each AES chunk as AAD, thus if chunks are transfered to a different file the file id doesnt match, thus wrong aad
//    breaks, thus it fails.
// 2. **Changing chunks within files:** This obviously doesn't secure against tampering within a single file. For this,
//    we also give each chunk a number (if we just increase by 1, we dont even have to store it) and add it to the aad.

const VERSION = 1;       // File format version
const VERSION_SIZE = 1;  // 8-bit version
const CHUNK_SIZE = 5 * 1024 * 1024; // 5 MiB
const FILE_ID_SIZE = 16; // 128-bit file ID
const IV_SIZE = 12;      // 96-bit IV for AES-GCM
const GCM_TAG_SIZE = 16; // 128-bit GCM auth tag
const SALT_SIZE = 16;
const PBKDF2_ITERATIONS = 100000;

const MAX_ENC_BLOCK_SIZE = IV_SIZE + CHUNK_SIZE + GCM_TAG_SIZE;

// Derive AES-GCM key from password using PBKDF2
export const deriveKey = async (password: string, salt: BufferSource): Promise<CryptoKey> => {
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveKey']
  );
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
};

// Build AAD for block i: fileId (16 bytes) || blockIndex (uint32, big-endian, 4 bytes)
const buildAAD = (fileId: Uint8Array, blockIndex: number): Uint8Array => {
  const aad = new Uint8Array(FILE_ID_SIZE + 4);
  aad.set(fileId, 0);
  new DataView(aad.buffer).setUint32(FILE_ID_SIZE, blockIndex, false /* big-endian */);
  return aad;
};

const append = (buf: Uint8Array, chunk: Uint8Array): Uint8Array => {
  const merged = new Uint8Array(buf.length + chunk.length);
  merged.set(buf, 0);
  merged.set(chunk, buf.length);
  return merged;
};

/**
 * Encrypted stream/file layout:
 * [1-byte version][16-byte salt][16-byte fileId][N blocks...]
 *
 * Each block:
 * [12-byte IV][ciphertext + 16-byte GCM auth tag]
 */
export function encryptStream(
  input: ReadableStream<Uint8Array>,
  password: string
): ReadableStream<Uint8Array> {
  let blockIndex = 0;
  let buffer     = new Uint8Array(0);
  let totalBytes = 0;
  let fileId: Uint8Array;
  let key: CryptoKey;

  const encryptBlock = async (
    plaintext: Uint8Array,
    controller: TransformStreamDefaultController<Uint8Array>
  ): Promise<void> => {
    const iv  = crypto.getRandomValues(new Uint8Array(IV_SIZE));
    const aad = buildAAD(fileId, blockIndex++);
    const ct  = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv, additionalData: aad },
      key,
      plaintext
    );
    const block = new Uint8Array(IV_SIZE + ct.byteLength);
    block.set(iv, 0);
    block.set(new Uint8Array(ct), IV_SIZE);
    controller.enqueue(block);
  };

  const transform = new TransformStream<Uint8Array, Uint8Array>({
    async start(controller) {
      const salt = crypto.getRandomValues(new Uint8Array(SALT_SIZE));
      fileId     = crypto.getRandomValues(new Uint8Array(FILE_ID_SIZE));
      key        = await deriveKey(password, salt);

      const header = new Uint8Array(VERSION_SIZE + SALT_SIZE + FILE_ID_SIZE);
      header[0] = VERSION;
      header.set(salt,   VERSION_SIZE);
      header.set(fileId, VERSION_SIZE + SALT_SIZE);
      controller.enqueue(header);
    },

    async transform(chunk, controller) {
      totalBytes += chunk.length;
      buffer = append(buffer, chunk);

      while (buffer.length >= CHUNK_SIZE) {
        await encryptBlock(buffer.slice(0, CHUNK_SIZE), controller);
        buffer = buffer.slice(CHUNK_SIZE);
      }
    },

    async flush(controller) {
      if (totalBytes === 0) throw new Error('Cannot encrypt empty stream.');
      // buffer may be empty if input size was an exact multiple of CHUNK_SIZE
      if (buffer.length > 0) await encryptBlock(buffer, controller);
    },
  });

  return input.pipeThrough(transform);
}

export function decryptStream(
  input: ReadableStream<Uint8Array>,
  password: string
): ReadableStream<Uint8Array> {
  const HEADER_SIZE = VERSION_SIZE + SALT_SIZE + FILE_ID_SIZE;

  let buf          = new Uint8Array(0);
  let blockIndex   = 0;
  let headerParsed = false;
  let key: CryptoKey;
  let fileId: Uint8Array;

  const decryptBlock = async (
    encBlock: Uint8Array,
    controller: TransformStreamDefaultController<Uint8Array>
  ): Promise<void> => {
    const iv         = encBlock.slice(0, IV_SIZE);
    const ciphertext = encBlock.slice(IV_SIZE);
    const aad        = buildAAD(fileId, blockIndex);
    let plaintext: ArrayBuffer;
    try {
      plaintext = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv, additionalData: aad },
        key,
        ciphertext
      );
    } catch {
      if (blockIndex === 0) {
        throw new Error('Decryption failed on first block: wrong password or corrupted file.');
      }
      throw new Error(`Decryption failed on block ${blockIndex}: file may be corrupted.`);
    }
    blockIndex++;
    controller.enqueue(new Uint8Array(plaintext));
  };

  const transform = new TransformStream<Uint8Array, Uint8Array>({
    async transform(chunk, controller) {
      buf = append(buf, chunk);

      if (!headerParsed) {
        if (buf.length < HEADER_SIZE) return; // need more data

        let offset = 0;
        const version = buf[offset]; offset += VERSION_SIZE;
        if (version !== VERSION) throw new Error(`Unsupported file version: ${version}`);

        const salt = buf.slice(offset, offset + SALT_SIZE); offset += SALT_SIZE;
        fileId     = buf.slice(offset, offset + FILE_ID_SIZE); offset += FILE_ID_SIZE;
        buf        = buf.slice(offset);

        key          = await deriveKey(password, salt);
        headerParsed = true;
      }

      // Flush all complete blocks, but hold back the last MAX_ENC_BLOCK_SIZE bytes
      // Might be last block, might not
      while (buf.length > MAX_ENC_BLOCK_SIZE) {
        await decryptBlock(buf.slice(0, MAX_ENC_BLOCK_SIZE), controller);
        buf = buf.slice(MAX_ENC_BLOCK_SIZE);
      }
    },

    async flush(controller) {
      if (!headerParsed) throw new Error('Stream too short: missing header.');

      while (buf.length > 0) {
        const blockSize = Math.min(buf.length, MAX_ENC_BLOCK_SIZE);
        await decryptBlock(buf.slice(0, blockSize), controller);
        buf = buf.slice(blockSize);
      }
    },
  });

  return input.pipeThrough(transform);
}

// For easy use if a streaming API is not needed (possible library use)
export const encryptFile = async (data: Uint8Array, password: string): Promise<Uint8Array> => {
  if (data.length === 0) throw new Error('Cannot encrypt empty file.');
  const stream = encryptStream(
    new ReadableStream({ start(c) { c.enqueue(data); c.close(); } }),
    password
  );
  return collectStream(stream);
};

// For easy use if a streaming API is not needed (possible library use)
export const decryptFile = async (data: Uint8Array, password: string): Promise<Uint8Array> => {
  const stream = decryptStream(
    new ReadableStream({ start(c) { c.enqueue(data); c.close(); } }),
    password
  );
  return collectStream(stream);
};

async function collectStream(stream: ReadableStream<Uint8Array>): Promise<Uint8Array> {
  const chunks: Uint8Array[] = [];
  const reader = stream.getReader();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
  }
  const total = chunks.reduce((n, c) => n + c.length, 0);
  const out   = new Uint8Array(total);
  let off = 0;
  for (const c of chunks) { out.set(c, off); off += c.length; }
  return out;
}
