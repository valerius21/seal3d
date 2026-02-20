import { describe, it, expect, vi } from 'vitest';
import { generatePassphrase, passphraseEntropy } from './passphrase';
import { EFF_LONG_WORDLIST } from './eff-wordlist';

// ---------------------------------------------------------------------------
// Wordlist sanity checks
// ---------------------------------------------------------------------------

describe('EFF wordlist', () => {
  it('contains exactly 7776 words (6^5)', () => {
    expect(EFF_LONG_WORDLIST).toHaveLength(7776);
  });

  it('contains only lowercase words (letters and hyphens)', () => {
    for (const word of EFF_LONG_WORDLIST) {
      expect(word).toMatch(/^[a-z]+(-[a-z]+)*$/);
    }
  });

  it('has no duplicate entries', () => {
    const unique = new Set(EFF_LONG_WORDLIST);
    expect(unique.size).toBe(EFF_LONG_WORDLIST.length);
  });

  it('is sorted alphabetically', () => {
    for (let i = 1; i < EFF_LONG_WORDLIST.length; i++) {
      expect(EFF_LONG_WORDLIST[i] >= EFF_LONG_WORDLIST[i - 1]).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------
// Legacy API (positional arguments)
// ---------------------------------------------------------------------------

describe('generatePassphrase (legacy positional API)', () => {
  it('returns 6 words separated by hyphens by default', async () => {
    const passphrase = await generatePassphrase();
    const words = passphrase.split('-');
    expect(words).toHaveLength(6);
    for (const word of words) {
      expect(word.length).toBeGreaterThan(0);
      expect(word).toMatch(/^[a-z]+(-[a-z]+)*$/);
    }
  });

  it('respects custom word count', async () => {
    for (const n of [1, 2, 4, 8, 12]) {
      const passphrase = await generatePassphrase(n);
      expect(passphrase.split('-')).toHaveLength(n);
    }
  });

  it('respects custom separator', async () => {
    const passphrase = await generatePassphrase(4, '.');
    expect(passphrase.split('.')).toHaveLength(4);
    expect(passphrase).not.toContain('-');
  });

  it('supports space separator', async () => {
    const passphrase = await generatePassphrase(3, ' ');
    expect(passphrase.split(' ')).toHaveLength(3);
  });

  it('supports empty-string separator', async () => {
    const passphrase = await generatePassphrase(2, '');
    expect(passphrase).toMatch(/^[a-z-]+$/);
  });

  it('generates a single-word passphrase', async () => {
    const passphrase = await generatePassphrase(1);
    expect(passphrase).toMatch(/^[a-z]+(-[a-z]+)*$/);
  });

  it('every generated word is in the EFF wordlist', async () => {
    const wordSet = new Set(EFF_LONG_WORDLIST);
    for (let i = 0; i < 5; i++) {
      const words = (await generatePassphrase(8)).split('-');
      for (const w of words) {
        expect(wordSet.has(w)).toBe(true);
      }
    }
  });
});

// ---------------------------------------------------------------------------
// Options object API — basic
// ---------------------------------------------------------------------------

describe('generatePassphrase (options API)', () => {
  it('accepts an options object with defaults', async () => {
    const passphrase = await generatePassphrase({});
    const words = passphrase.split('-');
    expect(words).toHaveLength(6);
  });

  it('respects wordCount in options', async () => {
    const passphrase = await generatePassphrase({ wordCount: 3 });
    // Without capitalize or numbers, all parts should be lowercase words
    const words = passphrase.split('-');
    expect(words).toHaveLength(3);
  });

  it('respects separator in options', async () => {
    const passphrase = await generatePassphrase({ wordCount: 4, separator: '_' });
    expect(passphrase.split('_')).toHaveLength(4);
  });
});

// ---------------------------------------------------------------------------
// Capitalize option
// ---------------------------------------------------------------------------

describe('generatePassphrase capitalize option', () => {
  it('produces some capitalized words when enabled', async () => {
    // Generate many passphrases; statistically at least one word should be capitalized
    let sawCapitalized = false;
    let sawLowercase = false;
    for (let i = 0; i < 30; i++) {
      const passphrase = await generatePassphrase({ wordCount: 6, capitalize: true });
      const words = passphrase.split('-');
      for (const w of words) {
        if (w[0] >= 'A' && w[0] <= 'Z') sawCapitalized = true;
        if (w[0] >= 'a' && w[0] <= 'z') sawLowercase = true;
      }
      if (sawCapitalized && sawLowercase) break;
    }
    expect(sawCapitalized).toBe(true);
    expect(sawLowercase).toBe(true);
  });

  it('capitalized words still come from the wordlist', async () => {
    const wordSet = new Set(EFF_LONG_WORDLIST);
    for (let i = 0; i < 10; i++) {
      const passphrase = await generatePassphrase({ wordCount: 6, capitalize: true });
      const words = passphrase.split('-');
      for (const w of words) {
        expect(wordSet.has(w.toLowerCase())).toBe(true);
      }
    }
  });

  it('does not capitalize when option is false', async () => {
    for (let i = 0; i < 10; i++) {
      const passphrase = await generatePassphrase({ wordCount: 6, capitalize: false });
      expect(passphrase).toMatch(/^[a-z-]+$/);
    }
  });

  it('capitalization only affects the first letter', async () => {
    for (let i = 0; i < 20; i++) {
      const passphrase = await generatePassphrase({ wordCount: 4, capitalize: true });
      const words = passphrase.split('-');
      for (const w of words) {
        // After the first char, the rest should be lowercase
        if (w.length > 1) {
          expect(w.slice(1)).toMatch(/^[a-z-]*$/);
        }
      }
    }
  });
});

// ---------------------------------------------------------------------------
// Include number option
// ---------------------------------------------------------------------------

describe('generatePassphrase includeNumber option', () => {
  it('inserts digits between words when enabled', async () => {
    const passphrase = await generatePassphrase({
      wordCount: 4,
      includeNumber: true,
      separator: '-',
    });

    // Pattern: word-digit-word-digit-word-digit-word
    const parts = passphrase.split('-');
    // 4 words + 3 digits = 7 parts
    expect(parts).toHaveLength(7);

    // Odd-indexed parts (1, 3, 5) should be single digits
    expect(parts[1]).toMatch(/^[0-9]$/);
    expect(parts[3]).toMatch(/^[0-9]$/);
    expect(parts[5]).toMatch(/^[0-9]$/);
  });

  it('does not insert numbers for a single word', async () => {
    const passphrase = await generatePassphrase({ wordCount: 1, includeNumber: true });
    // Should just be a word, no digit
    expect(passphrase).toMatch(/^[a-z]+(-[a-z]+)*$/);
  });

  it('digits are in 0-9 range', async () => {
    const digits = new Set<string>();
    for (let i = 0; i < 50; i++) {
      const passphrase = await generatePassphrase({
        wordCount: 3,
        includeNumber: true,
        separator: '-',
      });
      const parts = passphrase.split('-');
      // parts[1] and parts[3] are digits
      digits.add(parts[1]);
      digits.add(parts[3]);
    }
    // All collected values should be single digits
    for (const d of digits) {
      expect(d).toMatch(/^[0-9]$/);
    }
    // With 50 iterations we should see more than just one digit
    expect(digits.size).toBeGreaterThan(1);
  });

  it('does not include digits when option is false', async () => {
    for (let i = 0; i < 10; i++) {
      const passphrase = await generatePassphrase({ wordCount: 4, includeNumber: false });
      expect(passphrase).not.toMatch(/[0-9]/);
    }
  });

  it('number of digits equals wordCount - 1', async () => {
    for (const wc of [2, 3, 5, 8]) {
      const passphrase = await generatePassphrase({
        wordCount: wc,
        includeNumber: true,
        separator: '-',
      });
      const parts = passphrase.split('-');
      // wc words + (wc - 1) digits
      expect(parts).toHaveLength(wc + (wc - 1));
    }
  });
});

// ---------------------------------------------------------------------------
// Combined capitalize + includeNumber
// ---------------------------------------------------------------------------

describe('generatePassphrase capitalize + includeNumber combined', () => {
  it('produces passphrases with both features', async () => {
    let sawCapitalized = false;
    let sawDigit = false;

    for (let i = 0; i < 30; i++) {
      const passphrase = await generatePassphrase({
        wordCount: 4,
        capitalize: true,
        includeNumber: true,
        separator: '-',
      });

      const parts = passphrase.split('-');
      // Should have 4 words + 3 digits = 7 parts
      expect(parts).toHaveLength(7);

      for (let j = 0; j < parts.length; j++) {
        if (j % 2 === 0) {
          // Word position — check for capitalization
          if (parts[j][0] >= 'A' && parts[j][0] <= 'Z') sawCapitalized = true;
        } else {
          // Digit position
          expect(parts[j]).toMatch(/^[0-9]$/);
          sawDigit = true;
        }
      }
      if (sawCapitalized && sawDigit) break;
    }

    expect(sawCapitalized).toBe(true);
    expect(sawDigit).toBe(true);
  });

  it('words are still from the EFF wordlist', async () => {
    const wordSet = new Set(EFF_LONG_WORDLIST);
    for (let i = 0; i < 10; i++) {
      const passphrase = await generatePassphrase({
        wordCount: 4,
        capitalize: true,
        includeNumber: true,
        separator: '-',
      });
      const parts = passphrase.split('-');
      for (let j = 0; j < parts.length; j += 2) {
        expect(wordSet.has(parts[j].toLowerCase())).toBe(true);
      }
    }
  });

  it('works with custom separator', async () => {
    const passphrase = await generatePassphrase({
      wordCount: 3,
      capitalize: true,
      includeNumber: true,
      separator: '.',
    });
    const parts = passphrase.split('.');
    expect(parts).toHaveLength(5); // 3 words + 2 digits
    expect(parts[1]).toMatch(/^[0-9]$/);
    expect(parts[3]).toMatch(/^[0-9]$/);
  });
});

// ---------------------------------------------------------------------------
// Randomness
// ---------------------------------------------------------------------------

describe('generatePassphrase randomness', () => {
  it('generates different passphrases on consecutive calls', async () => {
    const results = new Set<string>();
    for (let i = 0; i < 20; i++) {
      results.add(await generatePassphrase());
    }
    expect(results.size).toBe(20);
  });

  it('does not always pick the same word for each position', async () => {
    const firstWords = new Set<string>();
    for (let i = 0; i < 20; i++) {
      const words = (await generatePassphrase()).split('-');
      firstWords.add(words[0]);
    }
    expect(firstWords.size).toBeGreaterThan(1);
  });

  it('capitalize produces varied results across calls', async () => {
    const results = new Set<string>();
    for (let i = 0; i < 20; i++) {
      results.add(await generatePassphrase({ wordCount: 6, capitalize: true }));
    }
    expect(results.size).toBe(20);
  });

  it('includeNumber produces varied digits', async () => {
    const digits = new Set<string>();
    for (let i = 0; i < 50; i++) {
      const passphrase = await generatePassphrase({
        wordCount: 2,
        includeNumber: true,
        separator: '-',
      });
      const parts = passphrase.split('-');
      digits.add(parts[1]); // the digit between the two words
    }
    // Should see multiple different digits
    expect(digits.size).toBeGreaterThan(3);
  });
});

// ---------------------------------------------------------------------------
// Rejection sampling
// ---------------------------------------------------------------------------

describe('generatePassphrase rejection sampling', () => {
  it('rejects biased values and retries', async () => {
    const original = crypto.getRandomValues.bind(crypto);
    let callCount = 0;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- mock needs to bypass overloaded getRandomValues signature
    const spy = vi.spyOn(crypto, 'getRandomValues').mockImplementation(((array: any) => {
      callCount++;
      if (callCount <= 1) {
        if (array instanceof Uint16Array) {
          array.fill(65535);
          return array;
        }
      }
      return original(array);
    }) as typeof crypto.getRandomValues);

    try {
      const passphrase = await generatePassphrase(1);
      expect(passphrase).toMatch(/^[a-z]+(-[a-z]+)*$/);
      expect(callCount).toBeGreaterThan(1);
    } finally {
      spy.mockRestore();
    }
  });
});

// ---------------------------------------------------------------------------
// Entropy calculation — legacy (number argument)
// ---------------------------------------------------------------------------

describe('passphraseEntropy (legacy number argument)', () => {
  it('returns ~12.9 bits per word (log2(7776))', () => {
    const perWord = passphraseEntropy(1);
    expect(perWord).toBeCloseTo(Math.log2(7776), 5);
  });

  it('returns ~77.5 bits for 6 words', () => {
    const entropy = passphraseEntropy(6);
    expect(entropy).toBeCloseTo(77.55, 1);
  });

  it('scales linearly with word count', () => {
    const e3 = passphraseEntropy(3);
    const e6 = passphraseEntropy(6);
    const e12 = passphraseEntropy(12);
    expect(e6).toBeCloseTo(e3 * 2, 10);
    expect(e12).toBeCloseTo(e6 * 2, 10);
  });

  it('returns 0 for 0 words', () => {
    expect(passphraseEntropy(0)).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Entropy calculation — options object
// ---------------------------------------------------------------------------

describe('passphraseEntropy (options API)', () => {
  const basePerWord = Math.log2(7776);

  it('matches legacy result when no enhancements', () => {
    const legacy = passphraseEntropy(6);
    const opts = passphraseEntropy({ wordCount: 6 });
    expect(opts).toBeCloseTo(legacy, 10);
  });

  it('adds 1 bit per word when capitalize is true', () => {
    const base = passphraseEntropy({ wordCount: 6, capitalize: false });
    const withCap = passphraseEntropy({ wordCount: 6, capitalize: true });
    expect(withCap - base).toBeCloseTo(6, 10); // 6 words * 1 bit
  });

  it('adds ~3.32 bits per digit when includeNumber is true', () => {
    const base = passphraseEntropy({ wordCount: 4, includeNumber: false });
    const withNum = passphraseEntropy({ wordCount: 4, includeNumber: true });
    // 4 words → 3 digits → 3 * log2(10)
    expect(withNum - base).toBeCloseTo(3 * Math.log2(10), 5);
  });

  it('does not add number entropy for single word', () => {
    const base = passphraseEntropy({ wordCount: 1, includeNumber: false });
    const withNum = passphraseEntropy({ wordCount: 1, includeNumber: true });
    expect(withNum).toBeCloseTo(base, 10);
  });

  it('combines capitalize and number entropy', () => {
    const both = passphraseEntropy({ wordCount: 6, capitalize: true, includeNumber: true });
    const expected =
      6 * basePerWord + // base words
      6 * 1 +           // capitalize
      5 * Math.log2(10); // numbers (5 digits between 6 words)
    expect(both).toBeCloseTo(expected, 5);
  });

  it('defaults to 6 words with no enhancements', () => {
    const defaultEntropy = passphraseEntropy({});
    expect(defaultEntropy).toBeCloseTo(6 * basePerWord, 10);
  });

  it('returns 0 for 0 words regardless of options', () => {
    expect(passphraseEntropy({ wordCount: 0, capitalize: true, includeNumber: true })).toBe(0);
  });
});
