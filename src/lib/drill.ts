import type { HangulCharacter } from '../db/db';

export function weightedPick(chars: HangulCharacter[], exclude?: string): HangulCharacter {
  const pool = exclude ? chars.filter((c) => c.character !== exclude) : chars;
  const list = pool.length ? pool : chars;
  const total = list.reduce((s, c) => s + c.weight, 0);
  let r = Math.random() * total;
  for (const c of list) {
    r -= c.weight;
    if (r <= 0) return c;
  }
  return list[list.length - 1];
}

// Plausible distractors: characters whose romanizations share a letter/phoneme
export function pickDistractors(
  answer: HangulCharacter,
  all: HangulCharacter[],
  n: number
): HangulCharacter[] {
  const others = all.filter((c) => c.character !== answer.character);
  const ansLetters = new Set(answer.romanization.replace(/\//g, '').split(''));

  const scored = others.map((c) => {
    const letters = new Set(c.romanization.replace(/\//g, '').split(''));
    let overlap = 0;
    for (const l of letters) if (ansLetters.has(l)) overlap++;
    // prefer same type and overlapping letters; add small random jitter
    const typeBonus = c.type === answer.type ? 2 : 0;
    return { c, score: overlap * 2 + typeBonus + Math.random() };
  });

  scored.sort((a, b) => b.score - a.score);
  const chosen: HangulCharacter[] = [];
  const seenRom = new Set<string>([answer.romanization]);
  for (const s of scored) {
    if (seenRom.has(s.c.romanization)) continue;
    seenRom.add(s.c.romanization);
    chosen.push(s.c);
    if (chosen.length === n) break;
  }
  // pad if not enough
  let i = 0;
  while (chosen.length < n && i < others.length) {
    const c = others[i++];
    if (!chosen.includes(c)) chosen.push(c);
  }
  return chosen;
}

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function adjustWeight(current: number, correct: boolean): number {
  const next = correct ? current - 0.2 : current + 0.5;
  return Math.max(0.1, Math.min(5, next));
}
