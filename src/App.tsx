import { useState } from 'react';
import LearnMode from './components/LearnMode';
import DrillMode from './components/DrillMode';
import VocabMode from './components/VocabMode';
import StatsMode from './components/StatsMode';
import TabBar, { type TabKey } from './components/TabBar';

export default function App() {
  const [tab, setTab] = useState<TabKey>('learn');

  return (
    <div className="min-h-full flex flex-col max-w-md mx-auto relative">
      <header className="pt-6 pb-2 px-5 flex items-center justify-between">
        <h1 className="font-hangul text-2xl font-black text-brand-700 tracking-tight">
          한글 <span className="text-pink-500">Go</span>
        </h1>
        <span className="text-xs font-bold text-brand-500 bg-white/60 px-2 py-1 rounded-full">
          Phase 1
        </span>
      </header>

      <main className="flex-1 pb-24">
        {tab === 'learn' && <LearnMode />}
        {tab === 'drill' && <DrillMode />}
        {tab === 'vocab' && <VocabMode />}
        {tab === 'dashboard' && <StatsMode />}
        {tab !== 'learn' &&
          tab !== 'drill' &&
          tab !== 'vocab' &&
          tab !== 'dashboard' && <ComingSoon tab={tab} />}
      </main>

      <TabBar active={tab} onChange={setTab} />
    </div>
  );
}

function ComingSoon({ tab }: { tab: TabKey }) {
  return (
    <div className="flex flex-col items-center justify-center h-[60vh] text-center px-8">
      <div className="text-6xl mb-4 animate-bounce-in">🚧</div>
      <h2 className="text-xl font-extrabold text-brand-700 mb-2 capitalize">{tab}</h2>
      <p className="text-sm text-brand-500">Coming in a future phase!</p>
    </div>
  );
}
