export interface VocabularyData {
  korean: string;
  romanization: string;
  english: string;
  lesson: number;
}

export const VOCABULARY: VocabularyData[] = [
  // Lesson 1 — basic vowels practice
  { korean: '아이', romanization: 'ai', english: 'child', lesson: 1 },
  { korean: '오이', romanization: 'oi', english: 'cucumber', lesson: 1 },

  // Lesson 2 — basic consonants vocab
  { korean: '나무', romanization: 'namu', english: 'tree', lesson: 2 },
  { korean: '노래', romanization: 'norae', english: 'song', lesson: 2 },
  { korean: '이마', romanization: 'ima', english: 'forehead', lesson: 2 },
  { korean: '이모', romanization: 'imo', english: 'aunt', lesson: 2 },
  { korean: '나라', romanization: 'nara', english: 'country', lesson: 2 },
  { korean: '미로', romanization: 'miro', english: 'maze', lesson: 2 },
  { korean: '가로', romanization: 'garo', english: 'width', lesson: 2 },
  { korean: '다리', romanization: 'dari', english: 'leg/bridge', lesson: 2 },
  { korean: '도로', romanization: 'doro', english: 'road', lesson: 2 },
  { korean: '바다', romanization: 'bada', english: 'ocean', lesson: 2 },
  { korean: '보라', romanization: 'bora', english: 'purple', lesson: 2 },
  { korean: '고구마', romanization: 'goguma', english: 'sweet potato', lesson: 2 },
  { korean: '사자', romanization: 'saja', english: 'lion', lesson: 2 },
  { korean: '시소', romanization: 'siso', english: 'seesaw', lesson: 2 },
  { korean: '자두', romanization: 'jadu', english: 'plum', lesson: 2 },
  { korean: '조개', romanization: 'jogae', english: 'seashell', lesson: 2 },
  { korean: '나비', romanization: 'nabi', english: 'butterfly', lesson: 2 },
  { korean: '구두', romanization: 'gudu', english: 'dress shoes', lesson: 2 },
  { korean: '새우', romanization: 'saeu', english: 'shrimp', lesson: 2 },
  { korean: '바지', romanization: 'baji', english: 'pants', lesson: 2 },
  { korean: '개미', romanization: 'gaemi', english: 'ant', lesson: 2 },
  { korean: '가수', romanization: 'gasu', english: 'singer', lesson: 2 },
  { korean: '세수', romanization: 'sesu', english: 'wash face', lesson: 2 },
  { korean: '배구', romanization: 'baegu', english: 'volleyball', lesson: 2 },
  { korean: '대나무', romanization: 'daenamu', english: 'bamboo', lesson: 2 },
  { korean: '모르다', romanization: 'moreuda', english: "don't know", lesson: 2 },
  { korean: '알다', romanization: 'alda', english: 'know', lesson: 2 },

  // Lesson 3 — aspirated consonants vocab
  { korean: '스키', romanization: 'seuki', english: 'ski', lesson: 3 },
  { korean: '코', romanization: 'ko', english: 'nose', lesson: 3 },
  { korean: '기타', romanization: 'gita', english: 'guitar', lesson: 3 },
  { korean: '토마토', romanization: 'tomato', english: 'tomato', lesson: 3 },
  { korean: '피아노', romanization: 'piano', english: 'piano', lesson: 3 },
  { korean: '포도', romanization: 'podo', english: 'grape', lesson: 3 },
  { korean: '입', romanization: 'ip', english: 'mouth', lesson: 3 },
  { korean: '귀', romanization: 'gwi', english: 'ear', lesson: 3 },
  { korean: '머리', romanization: 'meori', english: 'head', lesson: 3 },
  { korean: '아파', romanization: 'apa', english: 'sick/hurts', lesson: 3 },
  { korean: '치마', romanization: 'chima', english: 'skirt', lesson: 3 },
  { korean: '고추', romanization: 'gochu', english: 'pepper', lesson: 3 },
  { korean: '허리', romanization: 'heori', english: 'back/waist', lesson: 3 },
  { korean: '호주', romanization: 'hoju', english: 'Australia', lesson: 3 },
  { korean: '비행기', romanization: 'bihaenggi', english: 'airplane', lesson: 3 },
  { korean: '포크', romanization: 'pokeu', english: 'fork', lesson: 3 },
  { korean: '커피', romanization: 'keopi', english: 'coffee', lesson: 3 },

  // Lesson 4 — tense consonants vocab
  { korean: '코끼리', romanization: 'kokkiri', english: 'elephant', lesson: 4 },
  { korean: '꼬리', romanization: 'kkori', english: 'tail', lesson: 4 },
  { korean: '허리띠', romanization: 'heoritti', english: 'belt', lesson: 4 },
  { korean: '뜨다', romanization: 'tteuda', english: 'to float', lesson: 4 },
  { korean: '아빠', romanization: 'appa', english: 'dad', lesson: 4 },
  { korean: '뿌리', romanization: 'ppuri', english: 'root', lesson: 4 },
  { korean: '씨', romanization: 'ssi', english: 'seed', lesson: 4 },
  { korean: '쓰다', romanization: 'sseuda', english: 'to write', lesson: 4 },
  { korean: '찌개', romanization: 'jjigae', english: 'stew', lesson: 4 },
  { korean: '토끼', romanization: 'tokki', english: 'rabbit', lesson: 4 },
  { korean: '쓰레기', romanization: 'sseuregi', english: 'trash', lesson: 4 },
  { korean: '맵다', romanization: 'maepda', english: 'spicy', lesson: 4 },
  { korean: '짜다', romanization: 'jjada', english: 'salty', lesson: 4 },
  { korean: '끄다', romanization: 'kkeuda', english: 'turn off', lesson: 4 },
  { korean: '켜다', romanization: 'kyeoda', english: 'turn on', lesson: 4 },
  { korean: '읽다', romanization: 'ikda', english: 'to read', lesson: 4 },
  { korean: '바쁘다', romanization: 'bappeuda', english: 'busy', lesson: 4 },
  { korean: '비싸다', romanization: 'bissada', english: 'expensive', lesson: 4 },
  { korean: '싸다', romanization: 'ssada', english: 'cheap', lesson: 4 },
  { korean: '빠르다', romanization: 'ppareuda', english: 'fast', lesson: 4 },
  { korean: '느리다', romanization: 'neurida', english: 'slow', lesson: 4 },
];
