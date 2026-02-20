import { describe, it, expect, vi } from 'vitest';
import { createZipFromFiles, listZipEntries, verifyZip, extractZip } from './zip';
import { unzipSync } from 'fflate';

/** Helper: create a browser-like File object from a string. */
function makeFile(name: string, content: string): File {
  const encoded = new TextEncoder().encode(content);
  return new File([encoded.buffer as ArrayBuffer], name);
}

/** Helper: create a File from raw bytes. */
function makeFileFromBytes(name: string, bytes: Uint8Array): File {
  return new File([bytes.buffer as ArrayBuffer], name);
}

describe('createZipFromFiles', () => {
  it('throws on empty file list', async () => {
    await expect(createZipFromFiles([])).rejects.toThrow(
      'Cannot create ZIP from an empty file list.',
    );
  });

  it('zips a single file and preserves content', async () => {
    const file = makeFile('hello.txt', 'Hello, World!');
    const blob = await createZipFromFiles([file]);

    expect(blob.type).toBe('application/zip');
    expect(blob.size).toBeGreaterThan(0);

    // Verify round-trip
    const data = new Uint8Array(await blob.arrayBuffer());
    const entries = unzipSync(data);
    expect(Object.keys(entries)).toEqual(['hello.txt']);
    expect(new TextDecoder().decode(entries['hello.txt'])).toBe('Hello, World!');
  });

  it('zips multiple files and preserves all contents', async () => {
    const files = [
      makeFile('a.txt', 'content-a'),
      makeFile('b.txt', 'content-b'),
      makeFile('c.txt', 'content-c'),
    ];

    const blob = await createZipFromFiles(files);
    const data = new Uint8Array(await blob.arrayBuffer());
    const entries = unzipSync(data);

    expect(Object.keys(entries).sort()).toEqual(['a.txt', 'b.txt', 'c.txt']);
    expect(new TextDecoder().decode(entries['a.txt'])).toBe('content-a');
    expect(new TextDecoder().decode(entries['b.txt'])).toBe('content-b');
    expect(new TextDecoder().decode(entries['c.txt'])).toBe('content-c');
  });

  it('handles duplicate filenames by appending counter', async () => {
    const files = [
      makeFile('doc.pdf', 'first'),
      makeFile('doc.pdf', 'second'),
      makeFile('doc.pdf', 'third'),
    ];

    const blob = await createZipFromFiles(files);
    const data = new Uint8Array(await blob.arrayBuffer());
    const entries = unzipSync(data);

    const names = Object.keys(entries).sort();
    expect(names).toEqual(['doc (1).pdf', 'doc (2).pdf', 'doc.pdf']);
    expect(new TextDecoder().decode(entries['doc.pdf'])).toBe('first');
    expect(new TextDecoder().decode(entries['doc (1).pdf'])).toBe('second');
    expect(new TextDecoder().decode(entries['doc (2).pdf'])).toBe('third');
  });

  it('handles duplicate filenames without extension', async () => {
    const files = [
      makeFile('README', 'first'),
      makeFile('README', 'second'),
    ];

    const blob = await createZipFromFiles(files);
    const data = new Uint8Array(await blob.arrayBuffer());
    const entries = unzipSync(data);

    const names = Object.keys(entries).sort();
    expect(names).toEqual(['README', 'README (1)']);
    expect(new TextDecoder().decode(entries['README'])).toBe('first');
    expect(new TextDecoder().decode(entries['README (1)'])).toBe('second');
  });

  it('preserves binary content', async () => {
    const bytes = new Uint8Array(256);
    for (let i = 0; i < 256; i++) bytes[i] = i;
    const file = makeFileFromBytes('binary.bin', bytes);

    const blob = await createZipFromFiles([file]);
    const data = new Uint8Array(await blob.arrayBuffer());
    const entries = unzipSync(data);

    expect(entries['binary.bin']).toEqual(bytes);
  });

  it('handles large files (1 MB)', async () => {
    const size = 1024 * 1024;
    const bytes = new Uint8Array(size);
    // Fill in 64KB chunks (crypto.getRandomValues limit)
    for (let off = 0; off < size; off += 65536) {
      const len = Math.min(65536, size - off);
      crypto.getRandomValues(bytes.subarray(off, off + len));
    }
    const file = makeFileFromBytes('large.bin', bytes);

    const blob = await createZipFromFiles([file]);
    const data = new Uint8Array(await blob.arrayBuffer());
    const entries = unzipSync(data);

    expect(entries['large.bin'].length).toBe(size);
    expect(entries['large.bin']).toEqual(bytes);
  });

  it('calls onProgress callback for each file', async () => {
    const files = [
      makeFile('a.txt', 'a'),
      makeFile('b.txt', 'b'),
      makeFile('c.txt', 'c'),
    ];
    const onProgress = vi.fn();

    await createZipFromFiles(files, onProgress);

    expect(onProgress).toHaveBeenCalledTimes(3);
    expect(onProgress).toHaveBeenNthCalledWith(1, 1, 3);
    expect(onProgress).toHaveBeenNthCalledWith(2, 2, 3);
    expect(onProgress).toHaveBeenNthCalledWith(3, 3, 3);
  });

  it('does not call onProgress when not provided', async () => {
    // Just verify no error is thrown
    const file = makeFile('test.txt', 'test');
    const blob = await createZipFromFiles([file]);
    expect(blob.size).toBeGreaterThan(0);
  });

  it('handles files with special characters in names', async () => {
    const files = [
      makeFile('file with spaces.txt', 'spaces'),
      makeFile('file-with-dashes.txt', 'dashes'),
      makeFile('file_with_underscores.txt', 'underscores'),
    ];

    const blob = await createZipFromFiles(files);
    const data = new Uint8Array(await blob.arrayBuffer());
    const entries = unzipSync(data);

    expect(Object.keys(entries)).toContain('file with spaces.txt');
    expect(Object.keys(entries)).toContain('file-with-dashes.txt');
    expect(Object.keys(entries)).toContain('file_with_underscores.txt');
  });

  it('handles empty files', async () => {
    const file = makeFile('empty.txt', '');
    const blob = await createZipFromFiles([file]);
    const data = new Uint8Array(await blob.arrayBuffer());
    const entries = unzipSync(data);

    expect(entries['empty.txt'].length).toBe(0);
  });
});

describe('listZipEntries', () => {
  it('returns filenames from a ZIP archive', async () => {
    const files = [makeFile('x.txt', 'x'), makeFile('y.txt', 'y')];
    const blob = await createZipFromFiles(files);
    const data = new Uint8Array(await blob.arrayBuffer());

    const names = listZipEntries(data);
    expect(names.sort()).toEqual(['x.txt', 'y.txt']);
  });

  it('throws on invalid data', () => {
    const bad = new Uint8Array([0, 1, 2, 3]);
    expect(() => listZipEntries(bad)).toThrow();
  });
});

describe('verifyZip', () => {
  it('returns entry names for valid ZIP', async () => {
    const blob = await createZipFromFiles([makeFile('test.txt', 'test')]);
    const data = new Uint8Array(await blob.arrayBuffer());

    const names = verifyZip(data);
    expect(names).toEqual(['test.txt']);
  });

  it('throws for corrupted ZIP', () => {
    const bad = new Uint8Array(100);
    expect(() => verifyZip(bad)).toThrow();
  });

  it('throws for truncated ZIP', async () => {
    const blob = await createZipFromFiles([makeFile('test.txt', 'test')]);
    const data = new Uint8Array(await blob.arrayBuffer());
    const truncated = data.slice(0, 10);

    expect(() => verifyZip(truncated)).toThrow();
  });
});

describe('extractZip', () => {
  it('extracts all files from a ZIP', async () => {
    const files = [
      makeFile('a.txt', 'alpha'),
      makeFile('b.txt', 'beta'),
    ];
    const blob = await createZipFromFiles(files);
    const data = new Uint8Array(await blob.arrayBuffer());

    const extracted = extractZip(data);
    expect(new TextDecoder().decode(extracted['a.txt'])).toBe('alpha');
    expect(new TextDecoder().decode(extracted['b.txt'])).toBe('beta');
  });

  it('throws on invalid data', () => {
    expect(() => extractZip(new Uint8Array([99, 99, 99]))).toThrow();
  });
});
