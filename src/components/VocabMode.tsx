import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type VocabularyItem } from '../db/db';
import { playWordAudio } from '../lib/speech';
import { adjustWeight, shuffle } from '../lib/drill';

/**
 * POST to the /api/generate-image proxy and persist the returned base64 data
 * URL onto the matching vocabulary row. Throws on HTTP / network failure.
 */
async function generateImageForWord(item: VocabularyItem): Promise<void> {
  if (item.id == null) return;
  const res = await fetch('/api/generate-image', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ word: item.korean, english: item.english }),
  });
  if (!res.ok) throw new Error(`generate-image HTTP ${res.status}`);
  const { dataUrl } = (await res.json()) as { dataUrl: string };
  if (!dataUrl) throw new Error('generate-image returned no dataUrl');
  await db.vocabulary.update(item.id, {
    imageData: dataUrl,
    imageGeneratedAt: Date.now(),
  });
}

type SubMode = 'browse' | 'drill';

export default function VocabMode() {
  const [subMode, setSubMode] = useState<SubMode>('browse');

  return (
    <div className="px-5 pt-2 flex flex-col h-full">
      <ModeToggle active={subMode} onChange={setSubMode} />
      {subMode === 'browse' ? <VocabBrowse /> : <VocabDrill />}
    </div>
  );
}

function ModeToggle({
  active,
  onChange,
}: {
  active: SubMode;
  onChange: (m: SubMode) => void;
}) {
  return (
    <div className="flex bg-brand-100 rounded-2xl p-1 mb-3">
      {(['browse', 'drill'] as SubMode[]).map((m) => {
        const isActive = m === active;
        return (
          <button
            key={m}
            onClick={() => onChange(m)}
            className={`flex-1 py-2 rounded-xl text-sm font-black uppercase tracking-wide btn-press transition ${
              isActive ? 'bg-white text-brand-700 shadow-sm' : 'text-brand-500'
            }`}
          >
            {m === 'browse' ? '📖 Browse' : '⚡ Drill'}
          </button>
        );
      })}
    </div>
  );
}

function VocabBrowse() {
  const vocab = useLiveQuery(() => db.vocabulary.toArray(), []);
  const [openLessons, setOpenLessons] = useState<Set<number>>(new Set([1]));
  const [inFlight, setInFlight] = useState<Set<number>>(new Set());
  const [batch, setBatch] = useState<{ current: number; total: number } | null>(
    null,
  );
  // Stops the Generate-all loop if the user navigates away mid-batch.
  const cancelledRef = useRef(false);
  useEffect(() => () => { cancelledRef.current = true; }, []);

  const handleGenerateOne = useCallback(async (item: VocabularyItem) => {
    if (item.id == null) return;
    let alreadyRunning = false;
    setInFlight((s) => {
      if (s.has(item.id!)) {
        alreadyRunning = true;
        return s;
      }
      const ns = new Set(s);
      ns.add(item.id!);
      return ns;
    });
    if (alreadyRunning) return;

    try {
      await generateImageForWord(item);
    } catch (e) {
      console.warn('Image generation failed for', item.korean, e);
    } finally {
      setInFlight((s) => {
        const ns = new Set(s);
        ns.delete(item.id!);
        return ns;
      });
    }
  }, []);

  const handleGenerateAll = useCallback(async () => {
    if (!vocab) return;
    const missing = vocab.filter((v) => !v.imageData && v.id != null);
    if (missing.length === 0) return;

    cancelledRef.current = false;
    setBatch({ current: 0, total: missing.length });
    for (let i = 0; i < missing.length; i++) {
      if (cancelledRef.current) break;
      setBatch({ current: i + 1, total: missing.length });
      try {
        await generateImageForWord(missing[i]);
      } catch (e) {
        console.warn('Image generation failed for', missing[i].korean, e);
      }
    }
    setBatch(null);
  }, [vocab]);

  if (!vocab) return <Loading />;

  const byLesson = new Map<number, VocabularyItem[]>();
  for (const w of vocab) {
    if (!byLesson.has(w.lesson)) byLesson.set(w.lesson, []);
    byLesson.get(w.lesson)!.push(w);
  }
  const lessons = [...byLesson.keys()].sort((a, b) => a - b);
  const missingCount = vocab.filter((v) => !v.imageData).length;

  const toggle = (lesson: number) => {
    setOpenLessons((s) => {
      const ns = new Set(s);
      if (ns.has(lesson)) ns.delete(lesson);
      else ns.add(lesson);
      return ns;
    });
  };

  return (
    <div className="flex-1 overflow-y-auto pb-4">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-2xl font-black text-brand-700">Vocab Bank</h2>
          <p className="text-sm text-brand-500 font-semibold">
            Tap a lesson to expand. Tap a word to hear it.
          </p>
        </div>
        {(missingCount > 0 || batch) && (
          <button
            onClick={handleGenerateAll}
            disabled={batch !== null}
            className="btn-press flex-shrink-0 self-start bg-gradient-to-br from-brand-500 to-pink-500 text-white text-[11px] font-black uppercase tracking-wide rounded-full px-3 py-2 shadow-md disabled:opacity-70 disabled:cursor-wait"
          >
            {batch
              ? `Generating ${batch.current}/${batch.total}…`
              : `🎨 Generate all (${missingCount})`}
          </button>
        )}
      </div>

      <div className="space-y-3">
        {lessons.map((lesson) => {
          const words = byLesson.get(lesson)!;
          const isOpen = openLessons.has(lesson);
          return (
            <div
              key={lesson}
              className="bg-white rounded-3xl shadow-md border-4 border-brand-200 overflow-hidden"
            >
              <button
                onClick={() => toggle(lesson)}
                aria-expanded={isOpen}
                className="btn-press w-full flex items-center justify-between px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <div className="text-2xl">📚</div>
                  <div className="text-left">
                    <div className="text-[10px] font-extrabold uppercase opacity-70 text-brand-500">
                      Lesson
                    </div>
                    <div className="text-lg font-black text-brand-700">
                      Lesson {lesson}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-black text-brand-600 bg-brand-100 px-2 py-1 rounded-full">
                    {words.length} words
                  </span>
                  <span className="text-brand-500 text-2xl font-black w-6 text-center">
                    {isOpen ? '−' : '+'}
                  </span>
                </div>
              </button>

              {isOpen && (
                <ul className="border-t-2 border-brand-100 divide-y-2 divide-brand-50">
                  {words.map((w) => {
                    const isInFlight = w.id != null && inFlight.has(w.id);
                    return (
                      <li key={w.id} className="flex items-center gap-3 px-4 py-3 hover:bg-brand-50">
                        <ImageCell
                          item={w}
                          inFlight={isInFlight}
                          onGenerate={() => handleGenerateOne(w)}
                        />
                        <button
                          onClick={() => playWordAudio(w.korean)}
                          className="btn-press min-w-0 flex-1 flex items-center justify-between gap-2 text-left"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="font-hangul text-2xl font-black text-brand-700 leading-tight truncate">
                              {w.korean}
                            </div>
                            <div className="text-[11px] font-black text-pink-500 uppercase tracking-wide">
                              {w.romanization}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <div className="text-sm font-bold text-brand-500 italic text-right max-w-[7rem]">
                              {w.english}
                            </div>
                            <span className="text-xl">🔊</span>
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ImageCell({
  item,
  inFlight,
  onGenerate,
}: {
  item: VocabularyItem;
  inFlight: boolean;
  onGenerate: () => void;
}) {
  if (item.imageData) {
    return (
      <img
        src={item.imageData}
        alt={item.english}
        className="flex-shrink-0 w-14 h-14 rounded-2xl object-cover bg-brand-50 border-2 border-brand-200"
      />
    );
  }
  if (inFlight) {
    return (
      <div className="flex-shrink-0 w-14 h-14 rounded-2xl bg-brand-50 border-2 border-brand-200 flex items-center justify-center">
        <span className="text-xl animate-spin">⏳</span>
      </div>
    );
  }
  return (
    <button
      onClick={onGenerate}
      aria-label={`Generate image for ${item.english}`}
      className="btn-press flex-shrink-0 w-14 h-14 rounded-2xl bg-brand-50 border-2 border-dashed border-brand-300 flex flex-col items-center justify-center text-brand-500"
    >
      <span className="text-lg leading-none">🎨</span>
      <span className="text-[8px] font-black uppercase mt-0.5">Gen</span>
    </button>
  );
}

interface VocabQuestion {
  answer: VocabularyItem;
  options: VocabularyItem[];
}

function VocabDrill() {
  const vocab = useLiveQuery(() => db.vocabulary.toArray(), []);
  const [question, setQuestion] = useState<VocabQuestion | null>(null);
  const [state, setState] = useState<'idle' | 'correct' | 'wrong'>('idle');
  const [picked, setPicked] = useState<number | null>(null);
  const [streak, setStreak] = useState(0);
  const [totals, setTotals] = useState({ right: 0, wrong: 0 });
  const lastIdRef = useRef<number | undefined>(undefined);

  const hasEnough = (vocab?.length ?? 0) >= 4;

  const nextQuestion = useMemo(
    () => () => {
      if (!vocab || vocab.length < 4) return;
      const answer = pickWeightedVocab(vocab, lastIdRef.current);
      lastIdRef.current = answer.id;
      const distractors = pickVocabDistractors(answer, vocab, 3);
      const options = shuffle([answer, ...distractors]);
      setQuestion({ answer, options });
      setPicked(null);
      setState('idle');
      setTimeout(() => playWordAudio(answer.korean), 200);
    },
    [vocab]
  );

  useEffect(() => {
    if (hasEnough && !question) nextQuestion();
  }, [hasEnough, question, nextQuestion]);

  if (!vocab) return <Loading />;

  if (!hasEnough) {
    return (
      <div className="flex flex-col items-center justify-center h-[55vh] text-center px-8">
        <div className="text-6xl mb-4 animate-bounce-in">🗂️</div>
        <h2 className="text-xl font-black text-brand-700 mb-2">Vocab not loaded yet</h2>
        <p className="text-sm font-semibold text-brand-500">
          Need at least 4 vocab words. Reload the app to seed your bank.
        </p>
      </div>
    );
  }

  if (!question) return null;

  const accuracy =
    totals.right + totals.wrong === 0
      ? 100
      : Math.round((totals.right / (totals.right + totals.wrong)) * 100);

  const handlePick = async (option: VocabularyItem) => {
    if (state !== 'idle' || !question || option.id == null) return;
    const correct = option.id === question.answer.id;
    setPicked(option.id);
    setState(correct ? 'correct' : 'wrong');

    if (question.answer.id != null) {
      await db.vocabulary.update(question.answer.id, {
        weight: adjustWeight(question.answer.weight, correct),
        timesCorrect: question.answer.timesCorrect + (correct ? 1 : 0),
        timesWrong: question.answer.timesWrong + (correct ? 0 : 1),
        lastSeen: Date.now(),
      });
    }

    if (correct) {
      setTotals((t) => ({ ...t, right: t.right + 1 }));
      setStreak((s) => s + 1);
      setTimeout(nextQuestion, 650);
    } else {
      setTotals((t) => ({ ...t, wrong: t.wrong + 1 }));
      setStreak(0);
      setTimeout(nextQuestion, 2000);
    }
  };

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <StatsBar
        accuracy={accuracy}
        streak={streak}
        total={totals.right + totals.wrong}
      />

      <div
        className={`flex-1 flex flex-col items-center justify-start pt-4 ${
          state === 'correct'
            ? 'animate-flash-green'
            : state === 'wrong'
            ? 'animate-flash-red'
            : ''
        }`}
      >
        <div
          key={question.answer.id}
          className="relative bg-white rounded-[2rem] shadow-xl border-4 border-brand-200 w-full px-6 py-8 flex flex-col items-center justify-center animate-bounce-in"
        >
          <div className="font-hangul text-5xl sm:text-6xl font-black text-brand-700 leading-tight text-center">
            {question.answer.korean}
          </div>
          <div className="mt-2 text-sm font-black text-pink-500 uppercase tracking-wider">
            {question.answer.romanization}
          </div>
          <button
            onClick={() => playWordAudio(question.answer.korean)}
            className="absolute bottom-3 right-3 btn-press bg-brand-500 text-white rounded-full w-11 h-11 text-lg shadow-lg"
            aria-label="Replay"
          >
            🔊
          </button>
        </div>

        {state === 'wrong' && (
          <div className="mt-3 bg-amber-100 border-2 border-amber-300 rounded-2xl px-4 py-2 text-center animate-wiggle">
            <div className="text-xs font-black text-amber-700 uppercase">Correct meaning</div>
            <div className="text-base font-black text-amber-900">{question.answer.english}</div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 w-full mt-4">
          {question.options.map((o) => {
            const isPicked = picked === o.id;
            const isCorrect = state !== 'idle' && o.id === question.answer.id;
            const isWrong = isPicked && state === 'wrong';
            return (
              <button
                key={o.id}
                onClick={() => handlePick(o)}
                disabled={state !== 'idle'}
                className={`btn-press rounded-2xl border-b-4 py-4 px-2 text-sm font-black shadow-sm transition ${
                  isCorrect
                    ? 'bg-emerald-400 border-emerald-600 text-white animate-pop'
                    : isWrong
                    ? 'bg-red-400 border-red-600 text-white'
                    : 'bg-white border-brand-200 text-brand-700 hover:bg-brand-50'
                }`}
              >
                {o.english}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function StatsBar({
  accuracy,
  streak,
  total,
}: {
  accuracy: number;
  streak: number;
  total: number;
}) {
  return (
    <div className="flex items-center justify-between mb-2">
      <div className="bg-white rounded-2xl px-3 py-2 shadow-sm border-2 border-brand-100">
        <div className="text-[9px] font-black text-brand-400 uppercase">Accuracy</div>
        <div className="text-base font-black text-brand-700">{accuracy}%</div>
      </div>
      <div className="bg-gradient-to-r from-orange-400 to-pink-500 rounded-2xl px-4 py-2 shadow-md">
        <div className="text-[9px] font-black text-white/80 uppercase">Streak</div>
        <div className="text-base font-black text-white flex items-center gap-1">
          {streak} {streak >= 3 && '🔥'}
        </div>
      </div>
      <div className="bg-white rounded-2xl px-3 py-2 shadow-sm border-2 border-brand-100">
        <div className="text-[9px] font-black text-brand-400 uppercase">Answered</div>
        <div className="text-base font-black text-brand-700">{total}</div>
      </div>
    </div>
  );
}

function Loading() {
  return (
    <div className="flex items-center justify-center h-[60vh]">
      <div className="text-4xl animate-bounce">✨</div>
    </div>
  );
}

function pickWeightedVocab(
  items: VocabularyItem[],
  excludeId?: number
): VocabularyItem {
  const pool = excludeId != null ? items.filter((i) => i.id !== excludeId) : items;
  const list = pool.length ? pool : items;
  const total = list.reduce((s, c) => s + c.weight, 0);
  let r = Math.random() * total;
  for (const c of list) {
    r -= c.weight;
    if (r <= 0) return c;
  }
  return list[list.length - 1];
}

function pickVocabDistractors(
  answer: VocabularyItem,
  all: VocabularyItem[],
  n: number
): VocabularyItem[] {
  const others = all.filter((c) => c.id !== answer.id);
  const sameLesson = others.filter((c) => c.lesson === answer.lesson);
  const primary = sameLesson.length >= n ? sameLesson : others;
  const seenEnglish = new Set<string>([answer.english]);
  const chosen: VocabularyItem[] = [];
  for (const c of shuffle(primary)) {
    if (seenEnglish.has(c.english)) continue;
    seenEnglish.add(c.english);
    chosen.push(c);
    if (chosen.length === n) break;
  }
  if (chosen.length < n) {
    for (const c of shuffle(others)) {
      if (chosen.length === n) break;
      if (seenEnglish.has(c.english)) continue;
      seenEnglish.add(c.english);
      chosen.push(c);
    }
  }
  return chosen;
}
