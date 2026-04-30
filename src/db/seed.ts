import { db } from './db';
import { HANGUL_CHARS, HANGUL_SETS } from '../data/hangul';
import { VOCABULARY } from '../data/vocabulary';

export async function seedDatabase() {
  try {
    const count = await db.characters.count();
    if (count === 0) {
      await db.characters.bulkAdd(
        HANGUL_CHARS.map((c) => ({
          character: c.character,
          romanization: c.romanization,
          type: c.type,
          englishAnchor: c.englishAnchor,
          mnemonic: c.mnemonic,
          weight: 1.0,
          timesCorrect: 0,
          timesWrong: 0,
          lastSeen: 0,
          unlocked: 0,
        }))
      );
    }

    const setCount = await db.sets.count();
    if (setCount === 0) {
      await db.sets.bulkAdd(
        HANGUL_SETS.map((s) => ({
          setId: s.setId,
          name: s.name,
          characters: s.characters,
          order: s.order,
          completed: 0,
        }))
      );
    }

    const vocabCount = await db.vocabulary.count();
    if (vocabCount === 0) {
      await db.vocabulary.bulkAdd(
        VOCABULARY.map((v) => ({
          korean: v.korean,
          romanization: v.romanization,
          english: v.english,
          lesson: v.lesson,
          weight: 1.0,
          timesCorrect: 0,
          timesWrong: 0,
          lastSeen: 0,
          imageUrl: '',
        }))
      );
    }
  } catch (e) {
    console.error('Seed failed', e);
  }
}
