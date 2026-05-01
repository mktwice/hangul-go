export type TabKey = 'learn' | 'drill' | 'vocab' | 'lessons' | 'practice' | 'dashboard';

const TABS: { key: TabKey; label: string; icon: string; active: boolean }[] = [
  { key: 'learn', label: 'Learn', icon: '📚', active: true },
  { key: 'drill', label: 'Drill', icon: '⚡', active: true },
  { key: 'vocab', label: 'Vocab', icon: '🗂️', active: true },
  { key: 'lessons', label: 'Lessons', icon: '🎓', active: true },
  { key: 'practice', label: 'Practice', icon: '💬', active: true },
  { key: 'dashboard', label: 'Stats', icon: '📊', active: true },
];

export default function TabBar({
  active,
  onChange,
}: {
  active: TabKey;
  onChange: (t: TabKey) => void;
}) {
  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-white/90 backdrop-blur-lg border-t border-brand-100 pb-[env(safe-area-inset-bottom)]">
      <ul className="flex justify-around items-stretch px-2 pt-2 pb-2">
        {TABS.map((t) => {
          const isActive = t.key === active;
          return (
            <li key={t.key} className="flex-1">
              <button
                disabled={!t.active}
                onClick={() => t.active && onChange(t.key)}
                className={`w-full flex flex-col items-center gap-0.5 py-1 rounded-xl btn-press ${
                  isActive
                    ? 'text-brand-700'
                    : t.active
                    ? 'text-brand-400'
                    : 'text-gray-300'
                }`}
              >
                <span className={`text-2xl ${isActive ? 'animate-pop' : ''}`}>{t.icon}</span>
                <span className="text-[10px] font-extrabold uppercase tracking-wide">
                  {t.label}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
