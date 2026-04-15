export type HangulType = 'vowel' | 'consonant' | 'double' | 'compound';

export interface HangulCharData {
  character: string;
  romanization: string;
  type: HangulType;
  englishAnchor: string;
  mnemonic?: string;
}

export const HANGUL_CHARS: HangulCharData[] = [
  // Basic vowels — set 1
  { character: 'ㅏ', romanization: 'a', type: 'vowel', englishAnchor: 'Sounds like A in "father"', mnemonic: 'A vertical line with a dash pointing right — like an arm pointing "ahh!"' },
  { character: 'ㅓ', romanization: 'eo', type: 'vowel', englishAnchor: 'Sounds like U in "up" or O in "ugh"', mnemonic: 'The arm points left — the "uh" one.' },
  { character: 'ㅗ', romanization: 'o', type: 'vowel', englishAnchor: 'Sounds like O in "go"', mnemonic: 'A horizontal line with a dash pointing up — like a pot on a stove, "oh!"' },
  { character: 'ㅜ', romanization: 'u', type: 'vowel', englishAnchor: 'Sounds like OO in "boot"', mnemonic: 'The dash points down — like roots going "oo" deep.' },
  { character: 'ㅡ', romanization: 'eu', type: 'vowel', englishAnchor: 'Sounds like the E in "taken" (a tight "euh")', mnemonic: 'A flat line — mouth flat and tight saying "euh".' },

  // Basic vowels — set 2
  { character: 'ㅣ', romanization: 'i', type: 'vowel', englishAnchor: 'Sounds like EE in "see"', mnemonic: 'A single tall line — like the letter I.' },
  { character: 'ㅐ', romanization: 'ae', type: 'vowel', englishAnchor: 'Sounds like A in "cat"', mnemonic: 'ㅏ + ㅣ — an open "ae" mouth.' },
  { character: 'ㅔ', romanization: 'e', type: 'vowel', englishAnchor: 'Sounds like E in "bed"', mnemonic: 'ㅓ + ㅣ — a narrower "eh".' },
  { character: 'ㅑ', romanization: 'ya', type: 'vowel', englishAnchor: 'Sounds like YA in "yacht"', mnemonic: 'ㅏ with a double dash — add a Y to make it "ya".' },
  { character: 'ㅕ', romanization: 'yeo', type: 'vowel', englishAnchor: 'Sounds like YU in "yup"', mnemonic: 'ㅓ with double dash — "yuh".' },

  // Y-vowels — set 3
  { character: 'ㅛ', romanization: 'yo', type: 'vowel', englishAnchor: 'Sounds like YO in "yoga"', mnemonic: 'ㅗ with double dash — "yo".' },
  { character: 'ㅠ', romanization: 'yu', type: 'vowel', englishAnchor: 'Sounds like YOU', mnemonic: 'ㅜ with double dash — "yu".' },
  { character: 'ㅒ', romanization: 'yae', type: 'vowel', englishAnchor: 'Sounds like YA in "yam"', mnemonic: 'ㅐ with a double dash — add Y to make "yae".' },
  { character: 'ㅖ', romanization: 'ye', type: 'vowel', englishAnchor: 'Sounds like YE in "yes"', mnemonic: 'ㅔ with a double dash — add Y to make "ye".' },

  // Basic consonants — set 4
  { character: 'ㄱ', romanization: 'g/k', type: 'consonant', englishAnchor: 'Between G and K — softer at the start of a word', mnemonic: 'Looks like a gun barrel bending — "G" for gun.' },
  { character: 'ㄴ', romanization: 'n', type: 'consonant', englishAnchor: 'Sounds like N in "no"', mnemonic: 'Shape of a tongue tip touching the teeth — "N".' },
  { character: 'ㄷ', romanization: 'd/t', type: 'consonant', englishAnchor: 'Between D and T — softer D sound', mnemonic: 'ㄴ with a lid — like a Door.' },
  { character: 'ㄹ', romanization: 'r/l', type: 'consonant', englishAnchor: 'Between R and L — a soft flap of the tongue', mnemonic: 'A winding Road — R for road.' },
  { character: 'ㅁ', romanization: 'm', type: 'consonant', englishAnchor: 'Sounds like M in "mom"', mnemonic: 'A square — looks like a Mouth shape.' },

  // Basic consonants — set 5
  { character: 'ㅂ', romanization: 'b/p', type: 'consonant', englishAnchor: 'Between B and P — softer B', mnemonic: 'Looks like a Bucket — B for bucket.' },
  { character: 'ㅅ', romanization: 's', type: 'consonant', englishAnchor: 'Sounds like S in "sun"', mnemonic: 'Looks like a tent or a Snake\'s fang — "S".' },
  { character: 'ㅇ', romanization: 'ng/silent', type: 'consonant', englishAnchor: 'Silent at start of syllable; NG at the end (like "sing")', mnemonic: 'A circle — silent placeholder at the start, but makes the "ng" sound at the end.' },
  { character: 'ㅈ', romanization: 'j', type: 'consonant', englishAnchor: 'Sounds like J in "jam"', mnemonic: 'ㅅ with a hat — J has a dot on top.' },
  { character: 'ㅊ', romanization: 'ch', type: 'consonant', englishAnchor: 'Sounds like CH in "church"', mnemonic: 'ㅈ with a breath mark — aspirated "ch".' },

  // Basic consonants — set 6
  { character: 'ㅋ', romanization: 'k', type: 'consonant', englishAnchor: 'Sounds like K in "kite" — aspirated', mnemonic: 'ㄱ with an extra stroke — stronger K.' },
  { character: 'ㅌ', romanization: 't', type: 'consonant', englishAnchor: 'Sounds like T in "top" — aspirated', mnemonic: 'ㄷ with an extra line — stronger T.' },
  { character: 'ㅍ', romanization: 'p', type: 'consonant', englishAnchor: 'Sounds like P in "pop" — aspirated', mnemonic: 'Looks like the top of a Piano — P.' },
  { character: 'ㅎ', romanization: 'h', type: 'consonant', englishAnchor: 'Sounds like H in "hat"', mnemonic: 'A Hat on top of a circle — H for hat.' },

  // Double consonants — set 7
  { character: 'ㄲ', romanization: 'kk', type: 'double', englishAnchor: 'A tense, hard K — like "sky" but tighter', mnemonic: 'Two ㄱs — doubled and tense.' },
  { character: 'ㄸ', romanization: 'tt', type: 'double', englishAnchor: 'A tense, hard T — like "stop" but tighter', mnemonic: 'Two ㄷs — hold your throat tight and release a hard T.' },
  { character: 'ㅃ', romanization: 'pp', type: 'double', englishAnchor: 'A tense, hard P — like "spin" but tighter', mnemonic: 'Two ㅂs — tense up and pop a hard P.' },
  { character: 'ㅆ', romanization: 'ss', type: 'double', englishAnchor: 'A tense, hissier S', mnemonic: 'Two ㅅs — a sharper, hissier S.' },
  { character: 'ㅉ', romanization: 'jj', type: 'double', englishAnchor: 'A tense, hard J', mnemonic: 'Two ㅈs — clench and release a hard J.' },

  // Compound vowels — set 8
  { character: 'ㅘ', romanization: 'wa', type: 'compound', englishAnchor: 'Sounds like WA in "wander"', mnemonic: 'ㅗ + ㅏ — "o" + "a" = "wa".' },
  { character: 'ㅙ', romanization: 'wae', type: 'compound', englishAnchor: 'Sounds like WA in "wag"', mnemonic: 'ㅗ + ㅐ.' },
  { character: 'ㅚ', romanization: 'oe', type: 'compound', englishAnchor: 'Sounds like WE in "wet"', mnemonic: 'ㅗ + ㅣ.' },
  { character: 'ㅝ', romanization: 'wo', type: 'compound', englishAnchor: 'Sounds like WO in "won"', mnemonic: 'ㅜ + ㅓ.' },
  { character: 'ㅞ', romanization: 'we', type: 'compound', englishAnchor: 'Sounds like WE in "wedding"', mnemonic: 'ㅜ + ㅔ.' },

  // Compound vowels — set 9
  { character: 'ㅟ', romanization: 'wi', type: 'compound', englishAnchor: 'Sounds like WEE in "week"', mnemonic: 'ㅜ + ㅣ.' },
  { character: 'ㅢ', romanization: 'ui', type: 'compound', englishAnchor: 'Sounds like "eu-ee" run together', mnemonic: 'ㅡ + ㅣ.' },
];

export interface HangulSetDef {
  setId: string;
  name: string;
  characters: string[];
  order: number;
}

export const HANGUL_SETS: HangulSetDef[] = [
  { setId: 'vowels-1', name: 'Basic Vowels I', order: 1, characters: ['ㅏ','ㅓ','ㅗ','ㅜ','ㅡ'] },
  { setId: 'vowels-2', name: 'Basic Vowels II', order: 2, characters: ['ㅣ','ㅐ','ㅔ','ㅑ','ㅕ'] },
  { setId: 'y-vowels', name: 'Y-Vowels', order: 3, characters: ['ㅛ','ㅠ','ㅒ','ㅖ'] },
  { setId: 'cons-1', name: 'Consonants I', order: 4, characters: ['ㄱ','ㄴ','ㄷ','ㄹ','ㅁ'] },
  { setId: 'cons-2', name: 'Consonants II', order: 5, characters: ['ㅂ','ㅅ','ㅇ','ㅈ','ㅊ'] },
  { setId: 'cons-3', name: 'Consonants III', order: 6, characters: ['ㅋ','ㅌ','ㅍ','ㅎ'] },
  { setId: 'doubles', name: 'Double Consonants', order: 7, characters: ['ㄲ','ㄸ','ㅃ','ㅆ','ㅉ'] },
  { setId: 'comp-1', name: 'Compound Vowels I', order: 8, characters: ['ㅘ','ㅙ','ㅚ','ㅝ','ㅞ'] },
  { setId: 'comp-2', name: 'Compound Vowels II', order: 9, characters: ['ㅟ','ㅢ'] },
];
