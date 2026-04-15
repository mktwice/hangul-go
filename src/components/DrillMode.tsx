import { useEffect, useMemo, useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type HangulCharacter } from '../db/db';
import { speak } from '../lib/speech';
import { adjustWeight, pickDistractors, shuffle, weightedPick } from '../lib/drill';

interface Question {
  answer: HangulCharacter;
  options: HangulCharacter[];
}

export default function DrillMode() {
  const unlocked = useLiveQuery(
    () => db.characters.where('unlocked').equals(1).toArray(),
    []
  );
  const [question, setQuestion] = useState<Question | null>(null);
  const [state, setState] = useState<'idle' | 'correct' | 'wrong'>('idle');
  const [picked, setPicked] = useState<string | null>(null);
  const [streak, setStreak] = useState(0);
  const [totals, setTotals] = useState({ right: 0, wrong: 0 });
  const [confetti, setConfetti] = useState<number[]>([]);
  const lastCharRef = useRef<string | undefined>(undefined);

  const hasEnough = (unlocked?.length ?? 0) >= 4;

  const nextQuestion = useMemo(
    () => () => {
      if (!unlocked || unlocked.length < 4) return;
      const answer = weightedPick(unlocked, lastCharRef.current);
      lastCharRef.current = answer.character;
      const distractors = pickDistractors(answer, unlocked, 3);
      const options = shuffle([answer, ...distractors]);
      setQuestion({ answer, options });
      setPicked(null);
      setState('idle');
      setTimeout(() => speak(answer.character), 200);
    },
    [unlocked]
  );

  useEffect(() => {
    if (hasEnough && !question) nextQuestion();
  }, [hasEnough, question, nextQuestion]);

  if (!unlocked) return <div className="p-8 text-center">Loading…</div>;

  if (!hasEnough) {
    return (
      <div className="flex flex-col items-center justify-center h-[65vh] text-center px-8">
        <div className="text-6xl mb-4 animate-bounce-in">🔒</div>
        <h2 className="text-xl font-black text-brand-700 mb-2">Unlock drills in Learn Mode</h2>
        <p className="text-sm font-semibold text-brand-500">
          Complete at least one set of 5 characters to start drilling. You have{' '}
          <b>{unlocked.length}</b> unlocked so far.
        </p>
      </div>
    );
  }

  const accuracy =
    totals.right + totals.wrong === 0
      ? 100
      : Math.round((totals.right / (totals.right + totals.wrong)) * 100);

  const handlePick = async (option: HangulCharacter) => {
    if (state !== 'idle' || !question) return;
    const correct = option.character === question.answer.character;
    setPicked(option.character);
    setState(correct ? 'correct' : 'wrong');

    const updated = {
      weight: adjustWeight(question.answer.weight, correct),
      timesCorrect: question.answer.timesCorrect + (correct ? 1 : 0),
      timesWrong: question.answer.timesWrong + (correct ? 0 : 1),
      lastSeen: Date.now(),
    };
    await db.characters.update(question.answer.character, updated);

    if (correct) {
      setTotals((t) => ({ ...t, right: t.right + 1 }));
      setStreak((s) => {
        const ns = s + 1;
        if ([5, 10, 25, 50, 100].includes(ns)) {
          setConfetti((c) => [...c, Date.now()]);
          setTimeout(() => setConfetti((c) => c.slice(1)), 1200);
        }
        return ns;
      });
      setTimeout(() => nextQuestion(), 650);
    } else {
      setTotals((t) => ({ ...t, wrong: t.wrong + 1 }));
      setStreak(0);
      setTimeout(() => nextQuestion(), 2000);
    }
  };

  if (!question) return null;

  return (
    <div className="px-5 pt-2 flex flex-col h-full">
      <StatsBar accuracy={accuracy} streak={streak} total={totals.right + totals.wrong} />

      <div
        className={`flex-1 flex flex-col items-center justify-start pt-6 ${
          state === 'correct' ? 'animate-flash-green' : state === 'wrong' ? 'animate-flash-red' : ''
        }`}
      >
        <div
          key={question.answer.character}
          className="relative bg-white rounded-[2rem] shadow-xl border-4 border-brand-200 w-full aspect-square max-h-[42vh] flex items-center justify-center animate-bounce-in"
        >
          <div className="font-hangul text-[10rem] leading-none font-black text-brand-700">
            {question.answer.character}
          </div>
          <button
            onClick={() => speak(question.answer.character)}
            className="absolute bottom-3 right-3 btn-press bg-brand-500 text-white rounded-full w-12 h-12 text-xl shadow-lg"
            aria-label="Replay"
          >
            🔊
          </button>
          {confetti.map((k) => (
            <Burst key={k} />
          ))}
        </div>

        {state === 'wrong' && (
          <div className="mt-3 bg-amber-100 border-2 border-amber-300 rounded-2xl px-4 py-2 text-center animate-wiggle">
            <div className="text-xs font-black text-amber-700 uppercase">Correct answer</div>
            <div className="text-lg font-black text-amber-900">
              <span className="font-hangul">{question.answer.character}</span> ·{' '}
              {question.answer.romanization}
            </div>
            <div className="text-xs font-bold text-amber-900">{question.answer.englishAnchor}</div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 w-full mt-4">
          {question.options.map((o) => {
            const isPicked = picked === o.character;
            const isCorrect = state !== 'idle' && o.character === question.answer.character;
            const isWrong = isPicked && state === 'wrong';
            return (
              <button
                key={o.character}
                onClick={() => handlePick(o)}
                disabled={state !== 'idle'}
                className={`btn-press rounded-2xl border-b-4 py-5 text-xl font-black uppercase tracking-wider shadow-sm transition ${
                  isCorrect
                    ? 'bg-emerald-400 border-emerald-600 text-white animate-pop'
                    : isWrong
                    ? 'bg-red-400 border-red-600 text-white'
                    : 'bg-white border-brand-200 text-brand-700 hover:bg-brand-50'
                }`}
              >
                {o.romanization}
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

function Burst() {
  const emojis = ['🎉', '✨', '⭐', '💜', '🔥', '🎊'];
  const pieces = Array.from({ length: 14 }, (_, i) => ({
    id: i,
    left: Math.random() * 100,
    delay: Math.random() * 0.15,
    emoji: emojis[Math.floor(Math.random() * emojis.length)],
  }));
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {pieces.map((p) => (
        <span
          key={p.id}
          className="absolute bottom-0 text-2xl animate-float-up"
          style={{ left: `${p.left}%`, animationDelay: `${p.delay}s` }}
        >
          {p.emoji}
        </span>
      ))}
    </div>
  );
}
