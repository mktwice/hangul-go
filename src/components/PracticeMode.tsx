import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  db,
  type Conversation,
  type ConversationCorrection,
  type ConversationTurn,
  type ConversationVocabItem,
  type VocabularyItem,
} from '../db/db';
import { speak } from '../lib/speech';
import { SCENARIOS, type Scenario, getScenarioById } from '../data/scenarios';

// ---------------------------------------------------------------------------
// Daily request counter — localStorage, resets at local midnight
// ---------------------------------------------------------------------------

const DAILY_KEY = 'hangul-go.practice.dailyCount';
const DAILY_CAP = 200;

function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function readDailyCount(): number {
  try {
    const raw = localStorage.getItem(DAILY_KEY);
    if (!raw) return 0;
    const { date, count } = JSON.parse(raw) as { date: string; count: number };
    return date === todayKey() ? count : 0;
  } catch {
    return 0;
  }
}

function bumpDailyCount(): number {
  const next = readDailyCount() + 1;
  localStorage.setItem(DAILY_KEY, JSON.stringify({ date: todayKey(), count: next }));
  return next;
}

// ---------------------------------------------------------------------------
// API client
// ---------------------------------------------------------------------------

interface ChatApiResponse {
  response_korean: string;
  response_english: string;
  user_correction: {
    original: string;
    corrected: string;
    explanation_in_english: string;
  } | null;
  scenario_should_end: boolean;
  new_vocab_introduced: ConversationVocabItem[];
}

interface ChatApiError {
  error: string;
  message?: string;
  setupHint?: string;
}

async function callPracticeChat(args: {
  scenarioId: string;
  history: ConversationTurn[];
  userMessage: string;
  userVocab: ConversationVocabItem[];
  hintRequest?: boolean;
}): Promise<ChatApiResponse> {
  const wireHistory = args.history.map((m) => ({
    role: m.role,
    text: m.korean,
  }));
  const res = await fetch('/api/practice-chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      scenarioId: args.scenarioId,
      history: wireHistory,
      userMessage: args.userMessage,
      userVocab: args.userVocab,
      hintRequest: args.hintRequest ?? false,
    }),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as ChatApiError | null;
    const err = new Error(
      body?.message ?? body?.error ?? `Request failed (${res.status})`,
    ) as Error & { setupHint?: string; status?: number };
    err.setupHint = body?.setupHint;
    err.status = res.status;
    throw err;
  }
  return (await res.json()) as ChatApiResponse;
}

// ---------------------------------------------------------------------------
// Top-level view router
// ---------------------------------------------------------------------------

type View =
  | { kind: 'picker' }
  | { kind: 'chat'; conversationId: number }
  | { kind: 'summary'; conversationId: number }
  | { kind: 'past' }
  | { kind: 'past-detail'; conversationId: number };

export default function PracticeMode() {
  const [view, setView] = useState<View>({ kind: 'picker' });

  switch (view.kind) {
    case 'picker':
      return (
        <PracticePicker
          onStart={async (scenario) => {
            const id = await startConversation(scenario);
            setView({ kind: 'chat', conversationId: id });
          }}
          onPast={() => setView({ kind: 'past' })}
        />
      );
    case 'chat':
      return (
        <ChatView
          conversationId={view.conversationId}
          onEnd={() =>
            setView({ kind: 'summary', conversationId: view.conversationId })
          }
          onBack={() => setView({ kind: 'picker' })}
        />
      );
    case 'summary':
      return (
        <SummaryView
          conversationId={view.conversationId}
          onPickerBack={() => setView({ kind: 'picker' })}
          onPracticeAgain={async () => {
            const conv = await db.conversations.get(view.conversationId);
            if (!conv) return;
            const scenario = getScenarioById(conv.scenarioId);
            if (!scenario) return;
            const id = await startConversation(scenario);
            setView({ kind: 'chat', conversationId: id });
          }}
        />
      );
    case 'past':
      return (
        <PastConversations
          onPick={(id) => setView({ kind: 'past-detail', conversationId: id })}
          onBack={() => setView({ kind: 'picker' })}
        />
      );
    case 'past-detail':
      return (
        <ChatView
          conversationId={view.conversationId}
          readOnly
          onEnd={() => setView({ kind: 'past' })}
          onBack={() => setView({ kind: 'past' })}
        />
      );
  }
}

// ---------------------------------------------------------------------------
// Picker view
// ---------------------------------------------------------------------------

function PracticePicker({
  onStart,
  onPast,
}: {
  onStart: (s: Scenario) => void;
  onPast: () => void;
}) {
  const [count, setCount] = useState(readDailyCount());
  // Re-read on focus to keep the counter accurate after a midnight crossover.
  useEffect(() => {
    const refresh = () => setCount(readDailyCount());
    window.addEventListener('focus', refresh);
    return () => window.removeEventListener('focus', refresh);
  }, []);

  return (
    <div className="px-5 pt-2 flex flex-col h-full">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-2xl font-black text-brand-700">💬 Practice</h2>
          <p className="text-sm text-brand-500 font-semibold">
            Talk in Korean. Pick a scenario to start.
          </p>
        </div>
        <div className="text-right text-[10px] font-black text-brand-500 bg-brand-100 rounded-full px-3 py-1 self-start">
          {count} / {DAILY_CAP} today
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pb-4 space-y-3">
        {SCENARIOS.map((s) => (
          <button
            key={s.id}
            onClick={() => onStart(s)}
            className="btn-press w-full text-left bg-white rounded-3xl shadow-md border-4 border-brand-200 px-4 py-3 hover:bg-brand-50 transition"
          >
            <div className="text-[10px] font-extrabold uppercase opacity-70 text-brand-500">
              Scenario
            </div>
            <div className="text-lg font-black text-brand-700">{s.title}</div>
            <div className="mt-1 text-xs font-semibold text-brand-500">
              {s.description}
            </div>
            <div className="mt-2 inline-block text-[10px] font-black text-brand-600 bg-brand-100 rounded-full px-2 py-0.5">
              You'll talk to: {s.partnerRole}
            </div>
          </button>
        ))}
        <button
          onClick={onPast}
          className="btn-press w-full text-left bg-white/70 rounded-2xl border-2 border-dashed border-brand-300 px-4 py-3 text-brand-600 text-sm font-black"
        >
          📜 Past conversations →
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Chat view — used for both active chats and read-only past replay
// ---------------------------------------------------------------------------

function ChatView({
  conversationId,
  readOnly,
  onEnd,
  onBack,
}: {
  conversationId: number;
  readOnly?: boolean;
  onEnd: () => void;
  onBack: () => void;
}) {
  const conversation = useLiveQuery(
    () => db.conversations.get(conversationId),
    [conversationId],
  );
  const vocab = useLiveQuery(() => db.vocabulary.toArray(), []);

  const [draft, setDraft] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<{ message: string; setupHint?: string } | null>(
    null,
  );
  const [hint, setHint] = useState<string | null>(null);
  const [isHinting, setIsHinting] = useState(false);
  const [tapped, setTapped] = useState<{ korean: string; english: string } | null>(
    null,
  );
  const [revealed, setRevealed] = useState<Set<number>>(new Set());
  const [showEndPrompt, setShowEndPrompt] = useState(false);
  const [dailyCount, setDailyCount] = useState(readDailyCount());

  const scrollRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll to the bottom on new messages.
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [conversation?.messages.length]);

  const wordLookup = useMemo(() => {
    const m = new Map<string, string>();
    for (const v of vocab ?? []) m.set(v.korean, v.english);
    for (const turn of conversation?.messages ?? []) {
      if (turn.role === 'assistant' && turn.newVocab) {
        for (const nv of turn.newVocab) m.set(nv.korean, nv.english);
      }
    }
    return m;
  }, [vocab, conversation?.messages]);

  const handleTapWord = useCallback(
    (word: string) => {
      const cleaned = word.replace(/^[?!.,;:。、？！「」『』"'(){}]+|[?!.,;:。、？！「」『』"'(){}]+$/g, '');
      if (!cleaned) return;
      const english = wordLookup.get(cleaned);
      if (!english) {
        // Fall back: maybe the word minus a common particle suffix is in the
        // lookup. Strip a one-char Korean particle and try again.
        const stripped = cleaned.replace(/[은는이가을를에서의도와과로으]$/, '');
        if (stripped !== cleaned) {
          const english2 = wordLookup.get(stripped);
          if (english2) {
            setTapped({ korean: stripped, english: english2 });
            return;
          }
        }
        setTapped({ korean: cleaned, english: '(not in your vocab yet)' });
        return;
      }
      setTapped({ korean: cleaned, english });
    },
    [wordLookup],
  );

  const handleSend = useCallback(async () => {
    if (!conversation || !draft.trim() || isSending || readOnly) return;
    if (dailyCount >= DAILY_CAP) {
      setError({
        message: `Daily limit reached (${DAILY_CAP} messages). Come back tomorrow to keep practicing.`,
      });
      return;
    }

    const userText = draft.trim();
    const now = Date.now();
    const userTurn: ConversationTurn = {
      role: 'user',
      korean: userText,
      timestamp: now,
    };

    setIsSending(true);
    setError(null);
    setHint(null);

    // Optimistically commit the user turn so the bubble shows up before the
    // network round-trip finishes.
    await db.conversations.update(conversationId, {
      messages: [...conversation.messages, userTurn],
    });
    setDraft('');
    setDailyCount(bumpDailyCount());

    try {
      const userVocab = (vocab ?? []).map((v) => ({
        korean: v.korean,
        english: v.english,
      }));
      const data = await callPracticeChat({
        scenarioId: conversation.scenarioId,
        history: conversation.messages,
        userMessage: userText,
        userVocab,
      });

      // Re-read the conversation to get the latest state (the user turn we
      // just wrote is in there) and append the assistant turn + correction.
      const fresh = await db.conversations.get(conversationId);
      if (!fresh) return;

      const messages = [...fresh.messages];
      if (data.user_correction) {
        const lastUserIdx = messages
          .map((m, i) => ({ m, i }))
          .reverse()
          .find((x) => x.m.role === 'user')?.i;
        if (lastUserIdx != null) {
          messages[lastUserIdx] = {
            ...messages[lastUserIdx],
            correction: {
              original: data.user_correction.original,
              corrected: data.user_correction.corrected,
              explanation: data.user_correction.explanation_in_english,
            },
          };
        }
      }

      messages.push({
        role: 'assistant',
        korean: data.response_korean,
        english: data.response_english,
        newVocab: data.new_vocab_introduced,
        timestamp: Date.now(),
      });

      await db.conversations.update(conversationId, { messages });

      if (data.scenario_should_end) {
        setShowEndPrompt(true);
      }
    } catch (e) {
      const err = e as Error & { setupHint?: string };
      setError({ message: err.message, setupHint: err.setupHint });
    } finally {
      setIsSending(false);
    }
  }, [conversation, draft, isSending, readOnly, conversationId, vocab, dailyCount]);

  const handleHint = useCallback(async () => {
    if (!conversation || isSending || isHinting || readOnly) return;
    setIsHinting(true);
    setError(null);
    try {
      const userVocab = (vocab ?? []).map((v) => ({
        korean: v.korean,
        english: v.english,
      }));
      const data = await callPracticeChat({
        scenarioId: conversation.scenarioId,
        history: conversation.messages,
        userMessage: draft.trim() || '(no draft yet — give a starting nudge)',
        userVocab,
        hintRequest: true,
      });
      setHint(data.response_english);
    } catch (e) {
      const err = e as Error & { setupHint?: string };
      setError({ message: err.message, setupHint: err.setupHint });
    } finally {
      setIsHinting(false);
    }
  }, [conversation, isSending, isHinting, readOnly, vocab, draft]);

  const handleEnd = useCallback(async () => {
    if (!conversation) return;
    const mistakesSummary: ConversationCorrection[] = conversation.messages
      .filter((m) => m.role === 'user' && m.correction)
      .map((m) => m.correction!) as ConversationCorrection[];

    const newVocabSeen = new Map<string, string>();
    for (const m of conversation.messages) {
      if (m.role === 'assistant' && m.newVocab) {
        for (const v of m.newVocab) newVocabSeen.set(v.korean, v.english);
      }
    }
    const newVocabLearned: ConversationVocabItem[] = [...newVocabSeen.entries()].map(
      ([korean, english]) => ({ korean, english }),
    );

    await db.conversations.update(conversationId, {
      endedAt: Date.now(),
      mistakesSummary,
      newVocabLearned,
    });
    onEnd();
  }, [conversation, conversationId, onEnd]);

  if (!conversation) return <Loading />;

  return (
    <div className="px-3 pt-2 flex flex-col h-full">
      <div className="flex items-center justify-between gap-2 mb-2 px-2">
        <button
          onClick={onBack}
          className="btn-press text-brand-600 font-extrabold text-xs bg-white/70 rounded-full px-3 py-1.5 shadow-sm"
        >
          ← Back
        </button>
        <div className="flex-1 text-center min-w-0">
          <div className="text-sm font-black text-brand-700 truncate">
            {conversation.scenarioTitle}
          </div>
          {!readOnly && (
            <div className="text-[10px] font-black text-brand-400">
              {dailyCount} / {DAILY_CAP} today
            </div>
          )}
        </div>
        {!readOnly ? (
          <button
            onClick={handleEnd}
            className="btn-press text-red-500 text-xs font-black bg-white/70 rounded-full px-3 py-1.5 shadow-sm"
          >
            End
          </button>
        ) : (
          <div className="text-[10px] font-black text-brand-400 bg-white/70 rounded-full px-3 py-1.5">
            Read-only
          </div>
        )}
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-1 space-y-3 pb-2">
        {conversation.messages.map((m, idx) => (
          <MessageBubble
            key={`${m.timestamp}-${idx}`}
            turn={m}
            index={idx}
            revealed={revealed.has(idx)}
            onToggleRevealed={() => {
              setRevealed((s) => {
                const ns = new Set(s);
                if (ns.has(idx)) ns.delete(idx);
                else ns.add(idx);
                return ns;
              });
            }}
            onTapWord={handleTapWord}
          />
        ))}
        {isSending && <TypingDots />}
      </div>

      {error && (
        <div className="mx-1 mb-2 bg-red-50 border-2 border-red-200 rounded-2xl px-3 py-2 text-xs text-red-700 font-bold">
          <div>{error.message}</div>
          {error.setupHint && (
            <div className="mt-1 text-red-600 font-semibold">{error.setupHint}</div>
          )}
        </div>
      )}

      {hint && !readOnly && (
        <div className="mx-1 mb-2 bg-amber-50 border-2 border-amber-300 rounded-2xl px-3 py-2 text-xs text-amber-900 font-semibold flex items-start gap-2">
          <div className="flex-1">
            <span className="font-black uppercase text-[10px] tracking-wide">
              Hint:
            </span>{' '}
            {hint}
          </div>
          <button
            onClick={() => setHint(null)}
            aria-label="Dismiss hint"
            className="btn-press text-amber-700 text-base font-black w-6 h-6 rounded-full"
          >
            ×
          </button>
        </div>
      )}

      {!readOnly && (
        <div className="px-1 pb-2 flex items-center gap-2">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Type in Korean…"
            disabled={isSending || dailyCount >= DAILY_CAP}
            className="flex-1 font-hangul text-base font-bold bg-white border-2 border-brand-200 rounded-full px-4 py-2 focus:outline-none focus:border-brand-400 disabled:opacity-60"
          />
          <button
            onClick={handleHint}
            disabled={isSending || isHinting}
            aria-label="Get a hint"
            className="btn-press flex-shrink-0 bg-amber-200 text-amber-800 font-black text-xs rounded-full w-10 h-10 disabled:opacity-50"
            title="Stuck? Get a hint."
          >
            💡
          </button>
          <button
            onClick={handleSend}
            disabled={!draft.trim() || isSending || dailyCount >= DAILY_CAP}
            className="btn-press flex-shrink-0 bg-gradient-to-r from-brand-500 to-pink-500 disabled:opacity-50 text-white font-black text-xs rounded-full w-12 h-10"
          >
            Send
          </button>
        </div>
      )}

      {tapped && (
        <WordModal
          korean={tapped.korean}
          english={tapped.english}
          onClose={() => setTapped(null)}
        />
      )}

      {showEndPrompt && !readOnly && (
        <EndPromptModal
          onCancel={() => setShowEndPrompt(false)}
          onConfirm={() => {
            setShowEndPrompt(false);
            handleEnd();
          }}
        />
      )}
    </div>
  );
}

function MessageBubble({
  turn,
  index,
  revealed,
  onToggleRevealed,
  onTapWord,
}: {
  turn: ConversationTurn;
  index: number;
  revealed: boolean;
  onToggleRevealed: () => void;
  onTapWord: (word: string) => void;
}) {
  const isAssistant = turn.role === 'assistant';
  // Hint placeholders that came back with empty Korean shouldn't render as
  // actual messages (defensive — we don't append hints to messages, but
  // re-opened past conversations from earlier broken builds may have them).
  if (isAssistant && !turn.korean) return null;

  return (
    <div
      className={`flex ${isAssistant ? 'justify-start' : 'justify-end'} animate-bounce-in`}
    >
      <div className="max-w-[80%]">
        <div
          className={`rounded-2xl px-3 py-2 shadow-sm ${
            isAssistant
              ? 'bg-white border-2 border-brand-200 text-brand-800'
              : 'bg-gradient-to-br from-brand-500 to-pink-500 text-white'
          }`}
        >
          <KoreanLine
            text={turn.korean}
            interactive={isAssistant}
            onTapWord={onTapWord}
            className={`font-hangul text-lg font-bold leading-snug ${
              isAssistant ? 'text-brand-700' : 'text-white'
            }`}
          />
          {isAssistant && turn.english && (
            <div className="mt-1">
              {revealed ? (
                <div className="text-xs italic text-brand-500">{turn.english}</div>
              ) : (
                <button
                  onClick={onToggleRevealed}
                  className="btn-press text-[10px] font-black uppercase tracking-wide text-brand-400 bg-brand-50 rounded-full px-2 py-0.5"
                >
                  Show translation
                </button>
              )}
            </div>
          )}
          {isAssistant && (
            <button
              onClick={() => speak(turn.korean)}
              aria-label="Play Korean"
              className="btn-press mt-1 text-base"
            >
              🔊
            </button>
          )}
        </div>
        {!isAssistant && turn.correction && (
          <div className="mt-1 bg-amber-50 border-2 border-amber-300 rounded-2xl px-3 py-2 text-xs">
            <div className="font-black text-amber-700 uppercase text-[9px] tracking-wide">
              Try
            </div>
            <div className="font-hangul font-bold text-amber-900">
              {turn.correction.corrected}
            </div>
            <div className="mt-0.5 text-amber-700 font-semibold">
              {turn.correction.explanation}
            </div>
          </div>
        )}
      </div>
      {/* Anchor for tooltip alignment if we add positioning later */}
      <span className="sr-only">{`message-${index}`}</span>
    </div>
  );
}

function KoreanLine({
  text,
  interactive,
  onTapWord,
  className,
}: {
  text: string;
  interactive: boolean;
  onTapWord: (word: string) => void;
  className: string;
}) {
  if (!interactive) {
    return <div className={className}>{text}</div>;
  }
  const tokens = text.split(/(\s+)/);
  return (
    <div className={className}>
      {tokens.map((tok, i) => {
        if (/^\s*$/.test(tok)) return <span key={i}>{tok}</span>;
        return (
          <button
            key={i}
            onClick={() => onTapWord(tok)}
            className="hover:bg-brand-100 active:bg-brand-200 rounded px-0.5 -mx-0.5 transition-colors"
          >
            {tok}
          </button>
        );
      })}
    </div>
  );
}

function TypingDots() {
  return (
    <div className="flex justify-start">
      <div className="bg-white border-2 border-brand-200 rounded-2xl px-3 py-2 shadow-sm">
        <div className="flex gap-1">
          <span className="w-1.5 h-1.5 bg-brand-400 rounded-full animate-bounce" />
          <span
            className="w-1.5 h-1.5 bg-brand-400 rounded-full animate-bounce"
            style={{ animationDelay: '0.15s' }}
          />
          <span
            className="w-1.5 h-1.5 bg-brand-400 rounded-full animate-bounce"
            style={{ animationDelay: '0.3s' }}
          />
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Summary view
// ---------------------------------------------------------------------------

function SummaryView({
  conversationId,
  onPickerBack,
  onPracticeAgain,
}: {
  conversationId: number;
  onPickerBack: () => void;
  onPracticeAgain: () => void;
}) {
  const conversation = useLiveQuery(
    () => db.conversations.get(conversationId),
    [conversationId],
  );
  const allVocab = useLiveQuery(() => db.vocabulary.toArray(), []);
  const [adding, setAdding] = useState<Set<string>>(new Set());

  const existingKorean = useMemo(
    () => new Set((allVocab ?? []).map((v) => v.korean)),
    [allVocab],
  );

  const handleAddVocab = async (item: ConversationVocabItem) => {
    if (existingKorean.has(item.korean)) return;
    setAdding((s) => new Set(s).add(item.korean));
    await db.vocabulary.add({
      korean: item.korean,
      romanization: '',
      english: item.english,
      lesson: 0, // signals "user-added from a practice conversation"
      weight: 1.0,
      timesCorrect: 0,
      timesWrong: 0,
      lastSeen: 0,
      imageUrl: '',
    } as VocabularyItem);
  };

  if (!conversation) return <Loading />;

  return (
    <div className="px-5 pt-2 flex flex-col h-full">
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={onPickerBack}
          className="btn-press text-brand-600 font-extrabold text-xs bg-white/70 rounded-full px-3 py-1.5 shadow-sm"
        >
          ← Done
        </button>
        <div className="text-sm font-black text-brand-700">Conversation summary</div>
        <div className="w-8" />
      </div>

      <div className="flex-1 overflow-y-auto pb-4 space-y-4">
        <div className="bg-white rounded-3xl shadow-sm border-2 border-brand-100 p-4">
          <div className="text-[10px] font-extrabold uppercase tracking-wide text-brand-500 mb-1">
            Scenario
          </div>
          <div className="text-lg font-black text-brand-700">
            {conversation.scenarioTitle}
          </div>
          <div className="text-xs font-bold text-brand-500 mt-1">
            {conversation.messages.length} messages exchanged
          </div>
        </div>

        <Section title="Mistakes & corrections">
          {conversation.mistakesSummary.length === 0 ? (
            <div className="text-xs italic text-brand-400">
              No corrections — well done.
            </div>
          ) : (
            <ul className="space-y-2">
              {conversation.mistakesSummary.map((c, i) => (
                <li
                  key={i}
                  className="bg-amber-50 border-2 border-amber-200 rounded-2xl px-3 py-2"
                >
                  <div className="text-[10px] font-black uppercase text-amber-700">
                    You wrote
                  </div>
                  <div className="font-hangul font-bold text-amber-900 line-through">
                    {c.original}
                  </div>
                  <div className="mt-1 text-[10px] font-black uppercase text-emerald-700">
                    Try
                  </div>
                  <div className="font-hangul font-bold text-emerald-800">
                    {c.corrected}
                  </div>
                  <div className="mt-1 text-xs text-amber-700 font-semibold">
                    {c.explanation}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section title="New vocab introduced">
          {conversation.newVocabLearned.length === 0 ? (
            <div className="text-xs italic text-brand-400">
              No new vocab this round.
            </div>
          ) : (
            <ul className="space-y-2">
              {conversation.newVocabLearned.map((v) => {
                const exists = existingKorean.has(v.korean);
                const isAdding = adding.has(v.korean);
                return (
                  <li
                    key={v.korean}
                    className="flex items-center justify-between gap-2 bg-brand-50 border-2 border-brand-200 rounded-2xl px-3 py-2"
                  >
                    <div className="min-w-0">
                      <div className="font-hangul text-base font-black text-brand-700">
                        {v.korean}
                      </div>
                      <div className="text-xs font-bold text-brand-500 italic">
                        {v.english}
                      </div>
                    </div>
                    <button
                      onClick={() => handleAddVocab(v)}
                      disabled={exists || isAdding}
                      className="btn-press flex-shrink-0 bg-gradient-to-br from-brand-500 to-pink-500 disabled:from-emerald-400 disabled:to-emerald-400 disabled:opacity-100 text-white text-[10px] font-black uppercase tracking-wide rounded-full px-3 py-1.5"
                    >
                      {exists ? '✓ In bank' : isAdding ? 'Adding…' : '+ Add'}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </Section>

        <div className="flex gap-2">
          <button
            onClick={onPickerBack}
            className="btn-press flex-1 bg-white border-2 border-brand-200 text-brand-600 font-black rounded-2xl py-3 text-sm"
          >
            Back to picker
          </button>
          <button
            onClick={onPracticeAgain}
            className="btn-press flex-1 bg-gradient-to-r from-brand-500 to-pink-500 text-white font-black rounded-2xl py-3 text-sm"
          >
            Practice again
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Past conversations list
// ---------------------------------------------------------------------------

function PastConversations({
  onPick,
  onBack,
}: {
  onPick: (id: number) => void;
  onBack: () => void;
}) {
  const conversations = useLiveQuery(
    () => db.conversations.orderBy('startedAt').reverse().toArray(),
    [],
  );

  if (!conversations) return <Loading />;

  return (
    <div className="px-5 pt-2 flex flex-col h-full">
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={onBack}
          className="btn-press text-brand-600 font-extrabold text-xs bg-white/70 rounded-full px-3 py-1.5 shadow-sm"
        >
          ← Back
        </button>
        <div className="text-sm font-black text-brand-700">Past conversations</div>
        <div className="w-8" />
      </div>

      <div className="flex-1 overflow-y-auto pb-4 space-y-2">
        {conversations.length === 0 ? (
          <div className="text-center text-sm italic text-brand-400 py-12">
            No conversations yet — start one from the picker.
          </div>
        ) : (
          conversations.map((c) => {
            const ended = c.endedAt != null;
            const date = new Date(c.startedAt);
            const dateStr = `${date.toLocaleDateString()} ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
            return (
              <button
                key={c.id}
                onClick={() => c.id != null && onPick(c.id)}
                className="btn-press w-full text-left bg-white rounded-2xl shadow-sm border-2 border-brand-100 px-4 py-3 hover:bg-brand-50"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="text-sm font-black text-brand-700 truncate">
                    {c.scenarioTitle}
                  </div>
                  <div className="text-[10px] font-bold text-brand-400 flex-shrink-0">
                    {dateStr}
                  </div>
                </div>
                <div className="mt-1 flex items-center gap-2 text-[10px] font-black text-brand-600">
                  <span className="bg-brand-100 px-2 py-0.5 rounded-full">
                    {c.messages.length} msgs
                  </span>
                  {!ended && (
                    <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                      In progress
                    </span>
                  )}
                  {ended && c.mistakesSummary.length > 0 && (
                    <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                      {c.mistakesSummary.length} corrections
                    </span>
                  )}
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Modals & helpers
// ---------------------------------------------------------------------------

function WordModal({
  korean,
  english,
  onClose,
}: {
  korean: string;
  english: string;
  onClose: () => void;
}) {
  return (
    <ModalShell title="Word" onClose={onClose}>
      <div className="flex flex-col items-center py-3">
        <div className="font-hangul text-4xl font-black text-brand-700">
          {korean}
        </div>
        <div className="mt-2 text-sm font-bold text-brand-500 italic">{english}</div>
        <button
          onClick={() => speak(korean)}
          className="mt-3 btn-press bg-brand-500 text-white font-black text-xs rounded-full px-4 py-2 shadow-md"
        >
          🔊 Play
        </button>
      </div>
      <button
        onClick={onClose}
        className="btn-press w-full bg-white border-2 border-brand-200 text-brand-600 font-black rounded-2xl py-2 text-sm"
      >
        Close
      </button>
    </ModalShell>
  );
}

function EndPromptModal({
  onCancel,
  onConfirm,
}: {
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <ModalShell title="End scenario?" onClose={onCancel}>
      <div className="text-sm text-brand-700 font-semibold py-2 px-1">
        The conversation has reached a natural end. Wrap it up and see your
        summary?
      </div>
      <div className="flex gap-2 mt-2">
        <button
          onClick={onCancel}
          className="btn-press flex-1 bg-white border-2 border-brand-200 text-brand-600 font-black rounded-2xl py-2 text-sm"
        >
          Keep going
        </button>
        <button
          onClick={onConfirm}
          className="btn-press flex-1 bg-gradient-to-r from-brand-500 to-pink-500 text-white font-black rounded-2xl py-2 text-sm"
        >
          End & summarize
        </button>
      </div>
    </ModalShell>
  );
}

function ModalShell({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-30 bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center px-3 pb-3 pt-12"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-white rounded-3xl shadow-2xl flex flex-col"
      >
        <div className="flex items-center justify-between px-4 py-3 border-b-2 border-brand-100">
          <h2 className="text-base font-black text-brand-700">{title}</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="btn-press text-brand-500 text-xl font-black w-8 h-8 rounded-full hover:bg-brand-50"
          >
            ×
          </button>
        </div>
        <div className="px-3 pt-2 pb-3">{children}</div>
      </div>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="bg-white rounded-3xl shadow-sm border-2 border-brand-100 p-4">
      <h3 className="text-[10px] font-extrabold uppercase tracking-wide text-brand-500 mb-2">
        {title}
      </h3>
      {children}
    </section>
  );
}

function Loading() {
  return (
    <div className="flex items-center justify-center h-[60vh]">
      <div className="text-4xl animate-bounce">💬</div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Conversation lifecycle helpers
// ---------------------------------------------------------------------------

async function startConversation(scenario: Scenario): Promise<number> {
  const now = Date.now();
  const id = (await db.conversations.add({
    scenarioId: scenario.id,
    scenarioTitle: scenario.title,
    startedAt: now,
    messages: [
      {
        role: 'assistant',
        korean: scenario.partnerOpener,
        timestamp: now,
      },
    ],
    mistakesSummary: [],
    newVocabLearned: [],
  })) as number;
  return id;
}
