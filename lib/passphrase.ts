/**
 * Passphrase generation using the EFF long wordlist and Web Crypto API.
 * Each word provides ~12.9 bits of entropy (log2(7776)).
 * Default 6 words ≈ 77.5 bits — comparable to a random 12-char mixed-case+symbol password.
 *
 * Options:
 * - `capitalize`: randomly capitalize each word (adds ~1 bit per word)
 * - `includeNumber`: insert a random digit (0-9) between each pair of words (adds ~3.32 bits each)
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

/** Options for passphrase generation. */
export interface PassphraseOptions {
  /** Number of words (default 6). */
  wordCount?: number;
  /** Separator between words/numbers (default "-"). */
  separator?: string;
  /** Randomly capitalize each word with 50 % probability (default false). */
  capitalize?: boolean;
  /** Insert a random digit (0-9) between each pair of words (default false). */
  includeNumber?: boolean;
}

/**
 * Get a single cryptographically random value in [0, max) using rejection
 * sampling to avoid modulo bias. Uses Uint16Array (range 0-65535).
 */
function secureRandomBelow(max: number): number {
  const limit = 65536 - (65536 % max);
  while (true) {
    const buf = new Uint16Array(1);
    crypto.getRandomValues(buf);
    if (buf[0] < limit) return buf[0] % max;
  }
}

/**
 * Capitalize the first letter of a string.
 */
function capitalizeWord(word: string): string {
  if (word.length === 0) return word;
  return word[0].toUpperCase() + word.slice(1);
}

/**
 * Generate a cryptographically random passphrase.
 *
 * @param optionsOrWordCount - Either a PassphraseOptions object or a word count
 *   number for backward compatibility.
 * @param separatorCompat - Separator string (only used when first arg is a number).
 * @returns A passphrase string.
 *
 * @example
 * // Legacy call style (still works):
 * await generatePassphrase(6, '-');
 *
 * @example
 * // New options style:
 * await generatePassphrase({ wordCount: 6, capitalize: true, includeNumber: true });
 */
export async function generatePassphrase(
  optionsOrWordCount: PassphraseOptions | number = 6,
  separatorCompat = '-',
): Promise<string> {
  // Normalize arguments for backward compatibility
  const opts: Required<PassphraseOptions> =
    typeof optionsOrWordCount === 'number'
      ? {
          wordCount: optionsOrWordCount,
          separator: separatorCompat,
          capitalize: false,
          includeNumber: false,
        }
      : {
          wordCount: optionsOrWordCount.wordCount ?? 6,
          separator: optionsOrWordCount.separator ?? '-',
          capitalize: optionsOrWordCount.capitalize ?? false,
          includeNumber: optionsOrWordCount.includeNumber ?? false,
        };

  const { wordCount, separator, capitalize, includeNumber } = opts;

  const wordlist = await loadWordlist();
  const len = wordlist.length;

  // Pick random words using bulk randomness + rejection sampling
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
    let word = wordlist[val % len];

    // Capitalize: each word independently has a 50 % chance
    if (capitalize) {
      const flip = secureRandomBelow(2); // 0 or 1
      if (flip === 1) {
        word = capitalizeWord(word);
      }
    }

    words.push(word);
  }

  // If includeNumber, insert a random digit between each pair of words.
  // Result: word0 <digit> word1 <digit> word2 ...
  if (includeNumber && words.length > 1) {
    const parts: string[] = [words[0]];
    for (let i = 1; i < words.length; i++) {
      parts.push(String(secureRandomBelow(10)));
      parts.push(words[i]);
    }
    return parts.join(separator);
  }

  return words.join(separator);
}

/**
 * Approximate entropy in bits for a passphrase with the given options.
 *
 * - Base: wordCount * log2(7776)
 * - Capitalize adds 1 bit per word (uppercase or not)
 * - Numbers add log2(10) ≈ 3.32 bits per digit (one between each word pair)
 */
export function passphraseEntropy(
  wordCountOrOptions: number | PassphraseOptions = 6,
): number {
  const opts: Required<PassphraseOptions> =
    typeof wordCountOrOptions === 'number'
      ? { wordCount: wordCountOrOptions, separator: '-', capitalize: false, includeNumber: false }
      : {
          wordCount: wordCountOrOptions.wordCount ?? 6,
          separator: wordCountOrOptions.separator ?? '-',
          capitalize: wordCountOrOptions.capitalize ?? false,
          includeNumber: wordCountOrOptions.includeNumber ?? false,
        };

  const { wordCount, capitalize, includeNumber } = opts;

  let entropy = wordCount * Math.log2(7776);

  if (capitalize) {
    entropy += wordCount * 1; // 1 bit per word (cap or not)
  }

  if (includeNumber && wordCount > 1) {
    entropy += (wordCount - 1) * Math.log2(10); // ~3.32 bits per digit
  }

  return entropy;
}
