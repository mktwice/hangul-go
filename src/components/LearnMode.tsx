import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type HangulSet, type HangulCharacter } from '../db/db';
import { playCharacterAudio } from '../lib/speech';

export default function LearnMode() {
  const sets = useLiveQuery(() => db.sets.orderBy('order').toArray(), []);
  const chars = useLiveQuery(() => db.characters.toArray(), []);
  const [activeSetId, setActiveSetId] = useState<string | null>(null);

  if (!sets || !chars) return <LoadingBlob />;

  const activeSet = sets.find((s) => s.setId === activeSetId) || null;

  if (activeSet) {
    return (
      <LearnSession
        set={activeSet}
        chars={chars}
        onBack={() => setActiveSetId(null)}
        onComplete={async () => {
          await db.sets.update(activeSet.setId, { completed: 1 });
          await db.characters
            .where('character')
            .anyOf(activeSet.characters)
            .modify({ unlocked: 1 });
          setActiveSetId(null);
        }}
      />
    );
  }

  return <ProgressMap sets={sets} chars={chars} onPick={setActiveSetId} />;
}

function ProgressMap({
  sets,
  chars,
  onPick,
}: {
  sets: HangulSet[];
  chars: HangulCharacter[];
  onPick: (id: string) => void;
}) {
  const charByKey = new Map(chars.map((c) => [c.character, c]));
  const status = (s: HangulSet, idx: number): 'done' | 'open' | 'locked' => {
    if (s.completed) return 'done';
    if (idx === 0) return 'open';
    const prev = sets[idx - 1];
    return prev.completed ? 'open' : 'locked';
  };

  return (
    <div className="px-5 pt-2">
      <div className="mb-4">
        <h2 className="text-2xl font-black text-brand-700">Your Journey</h2>
        <p className="text-sm text-brand-500 font-semibold">
          Tap a set to learn it. Complete it to unlock drills!
        </p>
      </div>

      <div className="relative">
        {sets.map((s, idx) => {
          const st = status(s, idx);
          const locked = st === 'locked';
          const done = st === 'done';
          const offsetRow = idx % 2 === 0 ? 'justify-start' : 'justify-end';
          return (
            <div key={s.setId} className={`flex ${offsetRow} my-2`}>
              <button
                disabled={locked}
                onClick={() => onPick(s.setId)}
                className={`btn-press relative w-[78%] rounded-3xl p-4 text-left shadow-md border-4 transition ${
                  done
                    ? 'bg-gradient-to-br from-emerald-300 to-emerald-500 border-emerald-600 text-white'
                    : locked
                    ? 'bg-gray-100 border-gray-200 text-gray-400'
                    : 'bg-gradient-to-br from-brand-300 to-pink-400 border-brand-500 text-white'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-[11px] font-extrabold uppercase opacity-80">
                      Set {s.order}
                    </div>
                    <div className="text-lg font-black">{s.name}</div>
                  </div>
                  <div className="text-3xl">
                    {done ? '✅' : locked ? '🔒' : '✨'}
                  </div>
                </div>
                <div className="mt-2 flex gap-1 flex-wrap">
                  {s.characters.map((ch) => (
                    <span
                      key={ch}
                      className="font-hangul text-xl font-bold bg-white/30 rounded-lg px-2 py-0.5"
                    >
                      {ch}
                    </span>
                  ))}
                </div>
                {!locked && !done && (
                  <div className="mt-2 text-xs font-bold opacity-90">Tap to begin →</div>
                )}
              </button>
            </div>
          );
        })}
        <div className="mt-6 text-center text-xs text-brand-400 font-bold">
          {chars.filter((c) => c.unlocked).length} / {chars.length} characters unlocked
        </div>
        <CharByKeyHint charByKey={charByKey} />
      </div>
    </div>
  );
}

function CharByKeyHint({ charByKey }: { charByKey: Map<string, HangulCharacter> }) {
  // no-op; kept to suppress unused warning and leave hook for future use
  void charByKey;
  return null;
}

function LearnSession({
  set,
  chars,
  onBack,
  onComplete,
}: {
  set: HangulSet;
  chars: HangulCharacter[];
  onBack: () => void;
  onComplete: () => void;
}) {
  const [idx, setIdx] = useState(0);
  const cards = set.characters
    .map((ch) => chars.find((c) => c.character === ch))
    .filter((c): c is HangulCharacter => !!c);
  const card = cards[idx];

  useEffect(() => {
    if (card) {
      const t = setTimeout(() => playCharacterAudio(card.character), 250);
      return () => clearTimeout(t);
    }
  }, [card]);

  if (!card) return null;

  const isLast = idx === cards.length - 1;

  return (
    <div className="px-5 pt-2 flex flex-col h-full">
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={onBack}
          className="btn-press text-brand-600 font-extrabold text-sm bg-white/70 rounded-full px-4 py-2 shadow-sm"
        >
          ← Back
        </button>
        <div className="text-xs font-extrabold text-brand-500">
          {idx + 1} / {cards.length}
        </div>
      </div>

      <div className="h-2 bg-brand-100 rounded-full overflow-hidden mb-4">
        <div
          className="h-full bg-gradient-to-r from-brand-400 to-pink-400 transition-all duration-500"
          style={{ width: `${((idx + 1) / cards.length) * 100}%` }}
        />
      </div>

      <div
        key={card.character}
        className="flex-1 bg-white rounded-[2rem] shadow-xl border-4 border-brand-200 p-6 flex flex-col items-center animate-bounce-in"
      >
        <div className="font-hangul text-[11rem] leading-none font-black text-brand-700 mt-2">
          {card.character}
        </div>
        <div className="mt-2 text-2xl font-black text-pink-500 uppercase tracking-wider">
          {card.romanization}
        </div>

        <button
          onClick={() => playCharacterAudio(card.character)}
          className="mt-4 btn-press bg-brand-500 hover:bg-brand-600 text-white font-black text-sm rounded-full px-5 py-2 shadow-md flex items-center gap-2"
        >
          🔊 Replay sound
        </button>

        <div className="mt-5 w-full space-y-3">
          <div className="bg-amber-100 border-2 border-amber-300 rounded-2xl p-3">
            <div className="text-[10px] font-black text-amber-700 uppercase">Sound anchor</div>
            <div className="text-sm font-bold text-amber-900">{card.englishAnchor}</div>
          </div>
          {card.mnemonic && (
            <div className="bg-violet-100 border-2 border-violet-300 rounded-2xl p-3">
              <div className="text-[10px] font-black text-violet-700 uppercase">Mnemonic</div>
              <div className="text-sm font-bold text-violet-900">{card.mnemonic}</div>
            </div>
          )}
        </div>
      </div>

      <div className="flex gap-3 mt-4">
        <button
          disabled={idx === 0}
          onClick={() => setIdx((i) => Math.max(0, i - 1))}
          className="btn-press flex-1 bg-white text-brand-600 font-black rounded-2xl py-4 shadow disabled:opacity-40"
        >
          ← Prev
        </button>
        <button
          onClick={() => (isLast ? onComplete() : setIdx((i) => i + 1))}
          className="btn-press flex-[2] bg-gradient-to-r from-brand-500 to-pink-500 text-white font-black rounded-2xl py-4 shadow-lg"
        >
          {isLast ? '🎉 Complete Set' : 'Next →'}
        </button>
      </div>
    </div>
  );
}

function LoadingBlob() {
  return (
    <div className="flex items-center justify-center h-[60vh]">
      <div className="text-4xl animate-bounce">✨</div>
    </div>
  );
}
