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

    const lessonCount = await db.lessons.count();
    if (lessonCount === 0) {
      // Vocab IDs are auto-incremented at insert time, so build the per-lesson
      // ID list by querying the just-seeded vocabulary table.
      const allVocab = await db.vocabulary.toArray();
      const vocabIdsByLesson = new Map<number, number[]>();
      for (const v of allVocab) {
        if (v.id == null) continue;
        if (!vocabIdsByLesson.has(v.lesson)) vocabIdsByLesson.set(v.lesson, []);
        vocabIdsByLesson.get(v.lesson)!.push(v.id);
      }

      const now = Date.now();
      await db.lessons.bulkAdd([
        {
          lessonNumber: 1,
          title: 'Basic Vowels',
          topic:
            'Introduction to vowels (ㅏ ㅓ ㅗ ㅜ ㅡ ㅣ ㅔ ㅐ) and the ㅇ + vowel = syllable concept.',
          characterKeys: ['ㅏ', 'ㅓ', 'ㅗ', 'ㅜ', 'ㅡ', 'ㅣ', 'ㅔ', 'ㅐ', 'ㅇ'],
          vocabIds: vocabIdsByLesson.get(1) ?? [],
          grammarNotes: '',
          exampleSentences: [],
          myNotes: '',
          questionsForNext: [],
          createdAt: now,
          updatedAt: now,
        },
        {
          lessonNumber: 2,
          title: 'Basic Consonants',
          topic:
            'The eight basic consonants: ㄱ ㄴ ㄷ ㄹ ㅁ ㅂ ㅅ ㅈ. Combine with vowels to form syllables.',
          characterKeys: ['ㄱ', 'ㄴ', 'ㄷ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅅ', 'ㅈ'],
          vocabIds: vocabIdsByLesson.get(2) ?? [],
          grammarNotes: '',
          exampleSentences: [],
          myNotes: '',
          questionsForNext: [],
          createdAt: now,
          updatedAt: now,
        },
        {
          lessonNumber: 3,
          title: 'Aspirated Consonants',
          topic:
            'Aspirated consonants (the "h-puff" sounds): ㅋ ㅌ ㅍ ㅊ ㅎ. Stronger, breathier counterparts to ㄱ ㄷ ㅂ ㅈ.',
          characterKeys: ['ㅋ', 'ㅌ', 'ㅍ', 'ㅊ', 'ㅎ'],
          vocabIds: vocabIdsByLesson.get(3) ?? [],
          grammarNotes: '',
          exampleSentences: [],
          myNotes: '',
          questionsForNext: [],
          createdAt: now,
          updatedAt: now,
        },
        {
          lessonNumber: 4,
          title: 'Tense Consonants',
          topic:
            'Tense (doubled) consonants: ㄲ ㄸ ㅃ ㅆ ㅉ. Tighter, sharper sounds — say with a closed throat.',
          characterKeys: ['ㄲ', 'ㄸ', 'ㅃ', 'ㅆ', 'ㅉ'],
          vocabIds: vocabIdsByLesson.get(4) ?? [],
          grammarNotes: '',
          exampleSentences: [],
          myNotes: '',
          questionsForNext: [],
          createdAt: now,
          updatedAt: now,
        },
      ]);
    }
  } catch (e) {
    console.error('Seed failed', e);
  }
}
