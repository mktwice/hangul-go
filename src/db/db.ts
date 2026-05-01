import Dexie, { type Table } from 'dexie';

export interface HangulCharacter {
  character: string;
  romanization: string;
  type: 'consonant' | 'vowel' | 'double' | 'compound';
  englishAnchor: string;
  mnemonic?: string;
  weight: number;
  timesCorrect: number;
  timesWrong: number;
  lastSeen: number;
  unlocked: number; // 0 | 1 for indexable boolean
}

export interface HangulSet {
  setId: string;
  name: string;
  characters: string[];
  completed: number; // 0 | 1
  order: number;
}

export interface VocabularyItem {
  id?: number;
  korean: string;
  romanization: string;
  english: string;
  lesson: number;
  weight: number;
  timesCorrect: number;
  timesWrong: number;
  lastSeen: number;
  imageUrl?: string;
  imageData?: string; // base64 data URL of generated illustration
  imageGeneratedAt?: number;
}

export interface LessonNote {
  id?: number;
  title: string;
  body: string;
  createdAt: number;
}

export interface ExampleSentence {
  korean: string;
  english: string;
}

export interface Lesson {
  id?: number;
  lessonNumber: number;
  title: string;
  topic: string;
  date?: string; // ISO date (YYYY-MM-DD)
  // Primary keys into the characters table (which is keyed by unicode string,
  // not auto-incremented). Naming reflects that — these are string keys.
  characterKeys: string[];
  vocabIds: number[];
  grammarNotes: string;
  exampleSentences: ExampleSentence[];
  myNotes: string;
  questionsForNext: string[];
  createdAt: number;
  updatedAt: number;
}
export interface ConversationMessage {
  id?: number;
  role: string;
  content: string;
  createdAt: number;
}

export interface ConversationCorrection {
  original: string;
  corrected: string;
  explanation: string;
}

export interface ConversationVocabItem {
  korean: string;
  english: string;
}

export interface ConversationTurn {
  role: 'user' | 'assistant';
  korean: string;
  english?: string;
  correction?: ConversationCorrection;
  newVocab?: ConversationVocabItem[]; // assistant turns only — for tap-to-translate lookup
  timestamp: number;
}

export interface Conversation {
  id?: number;
  scenarioId: string;
  scenarioTitle: string;
  startedAt: number;
  endedAt?: number;
  messages: ConversationTurn[];
  mistakesSummary: ConversationCorrection[];
  newVocabLearned: ConversationVocabItem[];
}

export class HangulGoDB extends Dexie {
  characters!: Table<HangulCharacter, string>;
  sets!: Table<HangulSet, string>;
  vocabulary!: Table<VocabularyItem, number>;
  lessonNotes!: Table<LessonNote, number>;
  lessons!: Table<Lesson, number>;
  conversationHistory!: Table<ConversationMessage, number>;
  conversations!: Table<Conversation, number>;

  constructor() {
    super('hangul-go');

    // v1: all tables (future-phase tables start empty; new versions can be added later)
    this.version(1).stores({
      characters: '&character, type, unlocked, weight',
      sets: '&setId, order, completed',
      vocabulary: '++id, word, createdAt',
      lessonNotes: '++id, title, createdAt',
      conversationHistory: '++id, role, createdAt',
    });

    // v2: vocabulary store reshaped for Phase 2 (Vocab Bank). Old shape was a
    // placeholder with no rows in practice, so no data upgrade function needed.
    this.version(2).stores({
      vocabulary: '++id, korean, lesson',
    });

    // v3: Phase 3 (Lessons). New `lessons` store; the v1 `lessonNotes`
    // placeholder is left untouched (always empty in practice). lessonNumber
    // is unique so adding the same lesson twice is rejected.
    this.version(3).stores({
      lessons: '++id, &lessonNumber',
    });

    // v4: Phase 4 (Practice). New `conversations` store; the v1
    // `conversationHistory` placeholder is left untouched.
    this.version(4).stores({
      conversations: '++id, scenarioId, startedAt',
    });
  }
}

export const db = new HangulGoDB();
