import { useState } from 'react';
import LearnMode from './components/LearnMode';
import DrillMode from './components/DrillMode';
import VocabMode from './components/VocabMode';
import LessonsMode from './components/LessonsMode';
import PracticeMode from './components/PracticeMode';
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
        {tab === 'lessons' && <LessonsMode />}
        {tab === 'practice' && <PracticeMode />}
        {tab === 'dashboard' && <StatsMode />}
      </main>

      <TabBar active={tab} onChange={setTab} />
    </div>
  );
}
