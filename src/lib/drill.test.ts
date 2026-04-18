import { describe, it, expect, vi, afterEach } from 'vitest';
import type { HangulCharacter } from '../db/db';
import { adjustWeight, pickDistractors, shuffle, weightedPick } from './drill';

function ch(overrides: Partial<HangulCharacter> & { character: string; romanization: string }): HangulCharacter {
  return {
    type: 'consonant',
    englishAnchor: 'anchor',
    weight: 1,
    timesCorrect: 0,
    timesWrong: 0,
    lastSeen: 0,
    unlocked: 1,
    ...overrides,
  };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('weightedPick', () => {
  it('excludes the given character when pool has alternatives', () => {
    const chars = [ch({ character: 'a', romanization: 'a' }), ch({ character: 'b', romanization: 'b' })];
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const picked = weightedPick(chars, 'a');
    expect(picked.character).toBe('b');
  });

  it('falls back to the full list when exclusion empties the pool', () => {
    const chars = [ch({ character: 'solo', romanization: 's' })];
    vi.spyOn(Math, 'random').mockReturnValue(0);
    expect(weightedPick(chars, 'solo').character).toBe('solo');
  });

  it('respects weight distribution (low random → first weighted bucket)', () => {
    const chars = [
      ch({ character: 'a', romanization: 'a', weight: 1 }),
      ch({ character: 'b', romanization: 'b', weight: 4 }),
    ];
    vi.spyOn(Math, 'random').mockReturnValue(0.0);
    expect(weightedPick(chars).character).toBe('a');
  });

  it('respects weight distribution (high random → later bucket)', () => {
    const chars = [
      ch({ character: 'a', romanization: 'a', weight: 1 }),
      ch({ character: 'b', romanization: 'b', weight: 4 }),
    ];
    vi.spyOn(Math, 'random').mockReturnValue(0.99);
    expect(weightedPick(chars).character).toBe('b');
  });

  it('returns the single remaining item when given one character', () => {
    const chars = [ch({ character: 'only', romanization: 'o' })];
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    expect(weightedPick(chars).character).toBe('only');
  });

  it('always returns a character even when all weights are zero (fallback branch)', () => {
    const chars = [
      ch({ character: 'a', romanization: 'a', weight: 0 }),
      ch({ character: 'b', romanization: 'b', weight: 0 }),
    ];
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    const picked = weightedPick(chars);
    expect(['a', 'b']).toContain(picked.character);
  });
});

describe('pickDistractors', () => {
  const pool = [
    ch({ character: 'ㄱ', romanization: 'g/k', type: 'consonant' }),
    ch({ character: 'ㅋ', romanization: 'k', type: 'consonant' }),
    ch({ character: 'ㄲ', romanization: 'kk', type: 'double' }),
    ch({ character: 'ㅏ', romanization: 'a', type: 'vowel' }),
    ch({ character: 'ㅓ', romanization: 'eo', type: 'vowel' }),
    ch({ character: 'ㅣ', romanization: 'i', type: 'vowel' }),
  ];
  const answer = pool[0];

  it('returns exactly n distractors', () => {
    const d = pickDistractors(answer, pool, 3);
    expect(d).toHaveLength(3);
  });

  it('never includes the answer', () => {
    const d = pickDistractors(answer, pool, 5);
    expect(d.some((c) => c.character === answer.character)).toBe(false);
  });

  it('dedupes by romanization', () => {
    const dupePool = [
      answer,
      ch({ character: 'x1', romanization: 'dup' }),
      ch({ character: 'x2', romanization: 'dup' }),
      ch({ character: 'x3', romanization: 'other' }),
    ];
    const d = pickDistractors(answer, dupePool, 2);
    const roms = d.map((c) => c.romanization);
    expect(new Set(roms).size).toBe(roms.length);
  });

  it('pads when n exceeds the available distinct pool', () => {
    const tiny = [answer, ch({ character: 'x', romanization: 'zz' })];
    const d = pickDistractors(answer, tiny, 3);
    expect(d.length).toBeLessThanOrEqual(1);
  });
});

describe('shuffle', () => {
  it('preserves length', () => {
    const arr = [1, 2, 3, 4, 5];
    expect(shuffle(arr)).toHaveLength(arr.length);
  });

  it('preserves multiset contents', () => {
    const arr = [1, 2, 3, 4, 5];
    expect(shuffle(arr).sort()).toEqual([...arr].sort());
  });

  it('does not mutate the input', () => {
    const arr = [1, 2, 3, 4, 5];
    const snapshot = [...arr];
    shuffle(arr);
    expect(arr).toEqual(snapshot);
  });

  it('handles empty and single-element arrays', () => {
    expect(shuffle([])).toEqual([]);
    expect(shuffle(['x'])).toEqual(['x']);
  });
});

describe('adjustWeight', () => {
  it('decreases weight on correct answers by 0.2', () => {
    expect(adjustWeight(1.0, true)).toBeCloseTo(0.8, 10);
  });

  it('increases weight on wrong answers by 0.5', () => {
    expect(adjustWeight(1.0, false)).toBeCloseTo(1.5, 10);
  });

  it('clamps to a minimum of 0.1', () => {
    expect(adjustWeight(0.1, true)).toBe(0.1);
    expect(adjustWeight(0.2, true)).toBe(0.1);
  });

  it('clamps to a maximum of 5', () => {
    expect(adjustWeight(5, false)).toBe(5);
    expect(adjustWeight(4.8, false)).toBe(5);
  });
});
