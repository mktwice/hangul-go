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
export interface ConversationMessage {
  id?: number;
  role: string;
  content: string;
  createdAt: number;
}

export class HangulGoDB extends Dexie {
  characters!: Table<HangulCharacter, string>;
  sets!: Table<HangulSet, string>;
  vocabulary!: Table<VocabularyItem, number>;
  lessonNotes!: Table<LessonNote, number>;
  conversationHistory!: Table<ConversationMessage, number>;

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
  }
}

export const db = new HangulGoDB();
