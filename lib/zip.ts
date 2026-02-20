import { zipSync, unzipSync } from 'fflate';

/**
 * Create a ZIP archive from an array of Files.
 *
 * Uses store-only compression (level 0) since the output will be encrypted
 * anyway — compressing before encryption adds CPU cost with negligible benefit
 * for already-compressed file formats.
 *
 * Duplicate filenames are disambiguated by appending " (N)" before the
 * extension (e.g. "photo.jpg" → "photo (1).jpg").
 */
export async function createZipFromFiles(
  files: File[],
  onProgress?: (current: number, total: number) => void,
): Promise<Blob> {
  if (files.length === 0) {
    throw new Error('Cannot create ZIP from an empty file list.');
  }

  const entries: Record<string, Uint8Array> = {};

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const buffer = await file.arrayBuffer();

    let name = file.name;
    if (entries[name]) {
      const dotIdx = name.lastIndexOf('.');
      const base = dotIdx > 0 ? name.slice(0, dotIdx) : name;
      const ext = dotIdx > 0 ? name.slice(dotIdx) : '';
      let counter = 1;
      while (entries[`${base} (${counter})${ext}`]) counter++;
      name = `${base} (${counter})${ext}`;
    }

    entries[name] = new Uint8Array(buffer);
    onProgress?.(i + 1, files.length);
  }

  const zipped = zipSync(entries, { level: 0 });
  return new Blob([zipped.buffer as ArrayBuffer], { type: 'application/zip' });
}

/**
 * List filenames contained in a ZIP archive (for display / verification).
 */
export function listZipEntries(data: Uint8Array): string[] {
  const entries = unzipSync(data);
  return Object.keys(entries);
}

/**
 * Verify that a Uint8Array is a valid ZIP by attempting to parse it.
 * Returns the entry names on success, throws on invalid data.
 */
export function verifyZip(data: Uint8Array): string[] {
  return Object.keys(unzipSync(data));
}

/**
 * Extract all files from a ZIP archive and return them as a map of
 * filename → Uint8Array.
 */
export function extractZip(data: Uint8Array): Record<string, Uint8Array> {
  return unzipSync(data);
}
