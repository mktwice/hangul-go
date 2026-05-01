import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { HANGUL_CHARS, HANGUL_SETS } from '../data/hangul';
import { VOCABULARY } from '../data/vocabulary';

async function loadFreshDb() {
  vi.resetModules();
  const dbMod = await import('./db');
  const seedMod = await import('./seed');
  return { db: dbMod.db, seedDatabase: seedMod.seedDatabase };
}

beforeEach(async () => {
  vi.resetModules();
});

afterEach(async () => {
  const dbMod = await import('./db');
  try {
    dbMod.db.close();
  } catch {
    /* ignore */
  }
});

describe('seedDatabase', () => {
  it('populates characters, sets, vocabulary, and lessons on first run', async () => {
    const { db, seedDatabase } = await loadFreshDb();
    await seedDatabase();
    expect(await db.characters.count()).toBe(HANGUL_CHARS.length);
    expect(await db.sets.count()).toBe(HANGUL_SETS.length);
    expect(await db.vocabulary.count()).toBe(VOCABULARY.length);
    expect(await db.lessons.count()).toBe(4);
  });

  it('is idempotent — running twice does not duplicate records', async () => {
    const { db, seedDatabase } = await loadFreshDb();
    await seedDatabase();
    await seedDatabase();
    expect(await db.characters.count()).toBe(HANGUL_CHARS.length);
    expect(await db.sets.count()).toBe(HANGUL_SETS.length);
    expect(await db.vocabulary.count()).toBe(VOCABULARY.length);
    expect(await db.lessons.count()).toBe(4);
  });

  it('seeds each lesson with non-empty vocabIds matching its lesson number', async () => {
    const { db, seedDatabase } = await loadFreshDb();
    await seedDatabase();
    const lessons = await db.lessons.orderBy('lessonNumber').toArray();
    expect(lessons.map((l) => l.lessonNumber)).toEqual([1, 2, 3, 4]);
    for (const l of lessons) {
      expect(l.vocabIds.length).toBeGreaterThan(0);
      const vocab = await db.vocabulary.bulkGet(l.vocabIds);
      for (const v of vocab) {
        expect(v).toBeDefined();
        expect(v!.lesson).toBe(l.lessonNumber);
      }
    }
  });

  it('seeds each vocab word with default weight 1, lesson set, empty imageUrl', async () => {
    const { db, seedDatabase } = await loadFreshDb();
    await seedDatabase();
    const vocab = await db.vocabulary.toArray();
    for (const v of vocab) {
      expect(v.weight).toBe(1.0);
      expect(v.timesCorrect).toBe(0);
      expect(v.timesWrong).toBe(0);
      expect(v.imageUrl).toBe('');
      expect([1, 2, 3, 4]).toContain(v.lesson);
    }
  });

  it('seeds each character with default weight 1 and unlocked=0', async () => {
    const { db, seedDatabase } = await loadFreshDb();
    await seedDatabase();
    const chars = await db.characters.toArray();
    for (const c of chars) {
      expect(c.weight).toBe(1.0);
      expect(c.unlocked).toBe(0);
      expect(c.timesCorrect).toBe(0);
      expect(c.timesWrong).toBe(0);
    }
  });

  it('seeds every set with completed=0', async () => {
    const { db, seedDatabase } = await loadFreshDb();
    await seedDatabase();
    const sets = await db.sets.toArray();
    for (const s of sets) {
      expect(s.completed).toBe(0);
    }
  });

  it('logs and swallows errors instead of throwing', async () => {
    vi.resetModules();
    const dbMod = await import('./db');
    const bulkSpy = vi
      .spyOn(dbMod.db.characters, 'count')
      .mockRejectedValueOnce(new Error('idb boom'));
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    const seedMod = await import('./seed');
    await expect(seedMod.seedDatabase()).resolves.toBeUndefined();
    expect(err).toHaveBeenCalled();
    bulkSpy.mockRestore();
    err.mockRestore();
  });
});
