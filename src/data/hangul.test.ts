import { describe, it, expect } from 'vitest';
import { HANGUL_CHARS, HANGUL_SETS, type HangulType } from './hangul';

const VALID_TYPES: HangulType[] = ['vowel', 'consonant', 'double', 'compound'];

describe('HANGUL_CHARS', () => {
  it('has no duplicate characters', () => {
    const keys = HANGUL_CHARS.map((c) => c.character);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('uses only valid type values', () => {
    for (const c of HANGUL_CHARS) {
      expect(VALID_TYPES).toContain(c.type);
    }
  });

  it('has a non-empty romanization for every entry', () => {
    for (const c of HANGUL_CHARS) {
      expect(c.romanization.length).toBeGreaterThan(0);
    }
  });

  it('has a non-empty englishAnchor for every entry', () => {
    for (const c of HANGUL_CHARS) {
      expect(c.englishAnchor.length).toBeGreaterThan(0);
    }
  });
});

describe('HANGUL_SETS', () => {
  it('has unique setIds', () => {
    const ids = HANGUL_SETS.map((s) => s.setId);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('has contiguous order values starting at 1', () => {
    const orders = HANGUL_SETS.map((s) => s.order).sort((a, b) => a - b);
    expect(orders).toEqual(Array.from({ length: orders.length }, (_, i) => i + 1));
  });

  it('references only characters that exist in HANGUL_CHARS', () => {
    const known = new Set(HANGUL_CHARS.map((c) => c.character));
    for (const s of HANGUL_SETS) {
      for (const ch of s.characters) {
        expect(known.has(ch)).toBe(true);
      }
    }
  });

  it('has at least one character per set', () => {
    for (const s of HANGUL_SETS) {
      expect(s.characters.length).toBeGreaterThan(0);
    }
  });

  it('has non-empty names', () => {
    for (const s of HANGUL_SETS) {
      expect(s.name.length).toBeGreaterThan(0);
    }
  });
});
