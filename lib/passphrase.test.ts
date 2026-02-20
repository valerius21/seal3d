import { describe, it, expect, vi } from 'vitest';
import { generatePassphrase, passphraseEntropy } from './passphrase';
import { EFF_LONG_WORDLIST } from './eff-wordlist';

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

describe('generatePassphrase', () => {
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
});

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

describe('passphraseEntropy', () => {
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
