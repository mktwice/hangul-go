import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type HangulCharacter, type HangulSet } from '../db/db';
import { seedDatabase } from '../db/seed';

export default function StatsMode() {
  const chars = useLiveQuery(() => db.characters.toArray(), []);
  const sets = useLiveQuery(() => db.sets.orderBy('order').toArray(), []);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [resetting, setResetting] = useState(false);

  if (!chars || !sets) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-4xl animate-bounce">✨</div>
      </div>
    );
  }

  const unlockedChars = chars.filter((c) => c.unlocked);
  const totalCorrect = chars.reduce((s, c) => s + c.timesCorrect, 0);
  const totalWrong = chars.reduce((s, c) => s + c.timesWrong, 0);
  const totalAnswered = totalCorrect + totalWrong;
  const accuracy =
    totalAnswered === 0 ? 0 : Math.round((totalCorrect / totalAnswered) * 100);
  const setsDone = sets.filter((s) => s.completed).length;

  const problem = unlockedChars
    .filter((c) => c.weight > 1.0)
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 5);

  const mastered = unlockedChars
    .filter((c) => c.timesCorrect >= 3)
    .sort((a, b) => a.weight - b.weight)
    .slice(0, 5);

  const charByKey = new Map(chars.map((c) => [c.character, c]));

  const doReset = async () => {
    setResetting(true);
    try {
      await db.transaction('rw', db.characters, db.sets, async () => {
        await db.characters.clear();
        await db.sets.clear();
      });
      await seedDatabase();
    } finally {
      setResetting(false);
      setConfirmOpen(false);
    }
  };

  return (
    <div className="px-5 pt-2 pb-4">
      <div className="mb-4">
        <h2 className="text-2xl font-black text-brand-700">Your Stats</h2>
        <p className="text-sm text-brand-500 font-semibold">
          Track your Hangul journey at a glance.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-6">
        <OverviewCard
          label="Unlocked"
          value={`${unlockedChars.length} / ${chars.length}`}
          gradient="from-brand-400 to-pink-400"
          icon="🔓"
        />
        <OverviewCard
          label="Drills answered"
          value={String(totalAnswered)}
          gradient="from-sky-400 to-indigo-400"
          icon="⚡"
        />
        <OverviewCard
          label="Accuracy"
          value={`${accuracy}%`}
          gradient="from-emerald-400 to-teal-400"
          icon="🎯"
        />
        <OverviewCard
          label="Sets complete"
          value={`${setsDone} / ${sets.length}`}
          gradient="from-orange-400 to-pink-400"
          icon="🏅"
        />
      </div>

      <Section title="Needs work" emoji="🎯">
        {problem.length === 0 ? (
          <EmptyState
            emoji="🌟"
            title="You're crushing it!"
            subtitle="No weak spots right now."
          />
        ) : (
          <div className="space-y-2">
            {problem.map((c) => (
              <CharRow key={c.character} c={c} accent="amber" />
            ))}
          </div>
        )}
      </Section>

      <Section title="Mastered" emoji="💎">
        {mastered.length === 0 ? (
          <EmptyState
            emoji="🌱"
            title="Still growing"
            subtitle="Answer at least 3 drills correctly to start mastering characters."
          />
        ) : (
          <div className="space-y-2">
            {mastered.map((c) => (
              <CharRow key={c.character} c={c} accent="emerald" />
            ))}
          </div>
        )}
      </Section>

      <Section title="Your journey" emoji="🗺️">
        <div className="space-y-2">
          {sets.map((s, idx) => (
            <SetRow
              key={s.setId}
              set={s}
              status={setStatus(sets, idx)}
              chars={s.characters
                .map((ch) => charByKey.get(ch))
                .filter((c): c is HangulCharacter => !!c)}
            />
          ))}
        </div>
      </Section>

      <div className="mt-8 pt-5 border-t-2 border-dashed border-red-200">
        <div className="text-[10px] font-black text-red-500 uppercase tracking-wider mb-2">
          Danger zone
        </div>
        <button
          onClick={() => setConfirmOpen(true)}
          className="btn-press w-full bg-white border-2 border-red-300 text-red-600 font-black rounded-2xl py-3 shadow-sm hover:bg-red-50"
        >
          🧨 Reset all progress
        </button>
      </div>

      {confirmOpen && (
        <ConfirmModal
          busy={resetting}
          onCancel={() => !resetting && setConfirmOpen(false)}
          onConfirm={doReset}
        />
      )}
    </div>
  );
}

function setStatus(
  sets: HangulSet[],
  idx: number
): 'done' | 'open' | 'locked' {
  const s = sets[idx];
  if (s.completed) return 'done';
  if (idx === 0) return 'open';
  return sets[idx - 1].completed ? 'open' : 'locked';
}

function OverviewCard({
  label,
  value,
  gradient,
  icon,
}: {
  label: string;
  value: string;
  gradient: string;
  icon: string;
}) {
  return (
    <div
      className={`bg-gradient-to-br ${gradient} text-white rounded-2xl p-3 shadow-md border-2 border-white/30`}
    >
      <div className="flex items-center justify-between">
        <div className="text-[10px] font-black uppercase tracking-wider opacity-90">
          {label}
        </div>
        <div className="text-xl">{icon}</div>
      </div>
      <div className="text-2xl font-black mt-1">{value}</div>
    </div>
  );
}

function Section({
  title,
  emoji,
  children,
}: {
  title: string;
  emoji: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-6">
      <div className="flex items-center gap-2 mb-2">
        <div className="text-lg">{emoji}</div>
        <h3 className="text-base font-black text-brand-700 uppercase tracking-wide">
          {title}
        </h3>
      </div>
      {children}
    </section>
  );
}

function CharRow({
  c,
  accent,
}: {
  c: HangulCharacter;
  accent: 'amber' | 'emerald';
}) {
  const palette =
    accent === 'amber'
      ? {
          bg: 'bg-amber-50',
          border: 'border-amber-200',
          badgeBg: 'bg-amber-100',
          badgeText: 'text-amber-800',
          char: 'text-amber-900',
        }
      : {
          bg: 'bg-emerald-50',
          border: 'border-emerald-200',
          badgeBg: 'bg-emerald-100',
          badgeText: 'text-emerald-800',
          char: 'text-emerald-900',
        };
  return (
    <div
      className={`flex items-center gap-3 ${palette.bg} border-2 ${palette.border} rounded-2xl p-3`}
    >
      <div
        className={`font-hangul text-4xl font-black ${palette.char} w-14 text-center`}
      >
        {c.character}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2">
          <div className="text-sm font-black text-brand-700 uppercase tracking-wider">
            {c.romanization}
          </div>
          <div
            className={`text-[10px] font-black px-2 py-0.5 rounded-full ${palette.badgeBg} ${palette.badgeText}`}
          >
            {c.timesCorrect} ✓ · {c.timesWrong} ✗
          </div>
        </div>
        <div className="text-xs text-brand-500 font-semibold truncate">
          {c.englishAnchor}
        </div>
      </div>
    </div>
  );
}

function SetRow({
  set,
  status,
  chars,
}: {
  set: HangulSet;
  status: 'done' | 'open' | 'locked';
  chars: HangulCharacter[];
}) {
  const correct = chars.reduce((s, c) => s + c.timesCorrect, 0);
  const wrong = chars.reduce((s, c) => s + c.timesWrong, 0);
  const total = correct + wrong;
  const acc = total === 0 ? null : Math.round((correct / total) * 100);

  const chip =
    status === 'done'
      ? {
          label: 'Done',
          icon: '✅',
          bg: 'bg-emerald-100',
          border: 'border-emerald-300',
          text: 'text-emerald-800',
        }
      : status === 'open'
      ? {
          label: 'In progress',
          icon: '✨',
          bg: 'bg-brand-100',
          border: 'border-brand-300',
          text: 'text-brand-800',
        }
      : {
          label: 'Locked',
          icon: '🔒',
          bg: 'bg-gray-100',
          border: 'border-gray-200',
          text: 'text-gray-500',
        };

  return (
    <div
      className={`flex items-center gap-3 rounded-2xl p-3 border-2 ${chip.bg} ${chip.border}`}
    >
      <div className="text-2xl">{chip.icon}</div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <div className={`text-sm font-black ${chip.text}`}>
            {set.order}. {set.name}
          </div>
          {status === 'done' && acc !== null && (
            <div
              className={`text-[10px] font-black px-2 py-0.5 rounded-full bg-white/70 ${chip.text}`}
            >
              {acc}% acc
            </div>
          )}
        </div>
        <div className="mt-1 flex gap-1 flex-wrap">
          {set.characters.map((ch) => (
            <span
              key={ch}
              className={`font-hangul text-sm font-bold bg-white/70 rounded-md px-1.5 py-0.5 ${chip.text}`}
            >
              {ch}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function EmptyState({
  emoji,
  title,
  subtitle,
}: {
  emoji: string;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="bg-white/70 border-2 border-dashed border-brand-200 rounded-2xl p-4 text-center">
      <div className="text-3xl mb-1">{emoji}</div>
      <div className="text-sm font-black text-brand-700">{title}</div>
      <div className="text-xs font-semibold text-brand-500">{subtitle}</div>
    </div>
  );
}

function ConfirmModal({
  busy,
  onCancel,
  onConfirm,
}: {
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center px-6"
      onClick={onCancel}
    >
      <div
        className="bg-white rounded-3xl shadow-2xl border-4 border-red-200 w-full max-w-sm p-6 animate-bounce-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-5xl text-center mb-2">🧨</div>
        <h3 className="text-xl font-black text-red-600 text-center">
          Reset all progress?
        </h3>
        <p className="text-sm font-semibold text-brand-500 text-center mt-2">
          This wipes every unlocked character, streak, and set. You'll start
          again from zero. This can't be undone.
        </p>
        <div className="flex gap-3 mt-5">
          <button
            onClick={onCancel}
            disabled={busy}
            className="btn-press flex-1 bg-white text-brand-600 font-black rounded-2xl py-3 border-2 border-brand-200 disabled:opacity-40"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={busy}
            className="btn-press flex-1 bg-red-500 text-white font-black rounded-2xl py-3 shadow-md disabled:opacity-60"
          >
            {busy ? 'Resetting…' : 'Yes, reset'}
          </button>
        </div>
      </div>
    </div>
  );
}
