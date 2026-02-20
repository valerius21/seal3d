/**
 * Passphrase generation using the EFF long wordlist and Web Crypto API.
 * Each word provides ~12.9 bits of entropy (log2(7776)).
 * Default 6 words ≈ 77.5 bits — comparable to a random 12-char mixed-case+symbol password.
 *
 * @see https://www.eff.org/dice
 */

let cachedWordlist: string[] | null = null;

async function loadWordlist(): Promise<string[]> {
  if (cachedWordlist) return cachedWordlist;

  const { EFF_LONG_WORDLIST } = await import('./eff-wordlist');
  cachedWordlist = EFF_LONG_WORDLIST;
  return EFF_LONG_WORDLIST;
}

/**
 * Generate a cryptographically random passphrase.
 *
 * @param wordCount Number of words (default 6 ≈ 77.5 bits entropy)
 * @param separator Separator between words (default "-")
 * @returns A passphrase string like "correct-horse-battery-staple-foo-bar"
 */
export async function generatePassphrase(
  wordCount = 6,
  separator = '-',
): Promise<string> {
  const wordlist = await loadWordlist();
  const len = wordlist.length;

  const buf = new Uint16Array(wordCount);
  crypto.getRandomValues(buf);

  const words: string[] = [];
  for (let i = 0; i < wordCount; i++) {
    let val = buf[i];
    const limit = 65536 - (65536 % len);
    while (val >= limit) {
      const extra = new Uint16Array(1);
      crypto.getRandomValues(extra);
      val = extra[0];
    }
    words.push(wordlist[val % len]);
  }

  return words.join(separator);
}

/**
 * Approximate entropy in bits for a passphrase of the given word count.
 */
export function passphraseEntropy(wordCount: number): number {
  return wordCount * Math.log2(7776);
}
