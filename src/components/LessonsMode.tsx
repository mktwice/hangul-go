import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  db,
  type ExampleSentence,
  type HangulCharacter,
  type Lesson,
  type VocabularyItem,
} from '../db/db';
import { speak } from '../lib/speech';
import { renderMarkdown } from '../lib/markdown';

// ---------------------------------------------------------------------------
// Top-level view router (list / detail)
// ---------------------------------------------------------------------------

type View = { kind: 'list' } | { kind: 'detail'; id: number };

export default function LessonsMode() {
  const [view, setView] = useState<View>({ kind: 'list' });

  const handleCreate = useCallback(async () => {
    const lessons = await db.lessons.toArray();
    const nextNumber =
      lessons.reduce((m, l) => Math.max(m, l.lessonNumber), 0) + 1;
    const now = Date.now();
    const id = (await db.lessons.add({
      lessonNumber: nextNumber,
      title: '',
      topic: '',
      characterKeys: [],
      vocabIds: [],
      grammarNotes: '',
      exampleSentences: [],
      myNotes: '',
      questionsForNext: [],
      createdAt: now,
      updatedAt: now,
    })) as number;
    setView({ kind: 'detail', id });
  }, []);

  if (view.kind === 'detail') {
    return (
      <LessonDetail
        id={view.id}
        onBack={() => setView({ kind: 'list' })}
      />
    );
  }
  return (
    <LessonList
      onPick={(id) => setView({ kind: 'detail', id })}
      onCreate={handleCreate}
    />
  );
}

// ---------------------------------------------------------------------------
// List view
// ---------------------------------------------------------------------------

function LessonList({
  onPick,
  onCreate,
}: {
  onPick: (id: number) => void;
  onCreate: () => void;
}) {
  const lessons = useLiveQuery(
    () => db.lessons.orderBy('lessonNumber').toArray(),
    [],
  );

  if (!lessons) return <Loading />;

  return (
    <div className="px-5 pt-2 flex flex-col h-full">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-2xl font-black text-brand-700">📓 Lessons</h2>
          <p className="text-sm text-brand-500 font-semibold">
            Your Korean journey
          </p>
        </div>
        <button
          onClick={onCreate}
          className="btn-press flex-shrink-0 self-start bg-gradient-to-br from-brand-500 to-pink-500 text-white text-[11px] font-black uppercase tracking-wide rounded-full px-3 py-2 shadow-md"
        >
          + Add lesson
        </button>
      </div>

      <div className="flex-1 overflow-y-auto pb-4 space-y-3">
        {lessons.length === 0 ? (
          <EmptyJournal onCreate={onCreate} />
        ) : (
          lessons.map((l) => (
            <LessonCard key={l.id} lesson={l} onPick={() => onPick(l.id!)} />
          ))
        )}
      </div>
    </div>
  );
}

function LessonCard({
  lesson,
  onPick,
}: {
  lesson: Lesson;
  onPick: () => void;
}) {
  const myNotesPreview = lesson.myNotes
    .split('\n')
    .find((l) => l.trim())
    ?.slice(0, 80);

  return (
    <button
      onClick={onPick}
      className="btn-press w-full text-left bg-white rounded-3xl shadow-md border-4 border-brand-200 px-4 py-3 hover:bg-brand-50 transition"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="text-[10px] font-extrabold uppercase opacity-70 text-brand-500">
          Lesson {lesson.lessonNumber}
        </div>
        {lesson.date && (
          <div className="text-[10px] font-bold text-brand-400">{lesson.date}</div>
        )}
      </div>
      <div className="text-lg font-black text-brand-700 leading-tight">
        {lesson.title || <span className="opacity-50">Untitled</span>}
      </div>
      {lesson.topic && (
        <div className="mt-1 text-xs font-semibold text-brand-500 line-clamp-2">
          {lesson.topic}
        </div>
      )}
      <div className="mt-2 flex items-center gap-3 text-[11px] font-black text-brand-600">
        <span className="bg-brand-100 px-2 py-0.5 rounded-full">
          📚 {lesson.characterKeys.length} chars
        </span>
        <span className="bg-brand-100 px-2 py-0.5 rounded-full">
          🗂️ {lesson.vocabIds.length} words
        </span>
        {lesson.questionsForNext.length > 0 && (
          <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
            ❓ {lesson.questionsForNext.length}
          </span>
        )}
      </div>
      {myNotesPreview && (
        <div className="mt-2 text-xs italic text-brand-500 truncate">
          “{myNotesPreview}”
        </div>
      )}
    </button>
  );
}

function EmptyJournal({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center h-[55vh] text-center px-8">
      <div className="text-6xl mb-4 animate-bounce-in">📖</div>
      <h2 className="text-xl font-black text-brand-700 mb-2">
        Your journal is empty
      </h2>
      <p className="text-sm font-semibold text-brand-500 mb-4">
        Add your first lesson to start tracking your progress.
      </p>
      <button
        onClick={onCreate}
        className="btn-press bg-gradient-to-br from-brand-500 to-pink-500 text-white text-sm font-black uppercase tracking-wide rounded-full px-4 py-2 shadow-md"
      >
        + Add lesson
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Detail view
// ---------------------------------------------------------------------------

function LessonDetail({ id, onBack }: { id: number; onBack: () => void }) {
  const lesson = useLiveQuery(() => db.lessons.get(id), [id]);
  const [previewChar, setPreviewChar] = useState<HangulCharacter | null>(null);
  const [previewVocab, setPreviewVocab] = useState<VocabularyItem | null>(null);
  const [editingChars, setEditingChars] = useState(false);
  const [editingVocab, setEditingVocab] = useState(false);

  const updateField = useCallback(
    async <K extends keyof Lesson>(key: K, value: Lesson[K]) => {
      await db.lessons.update(id, {
        [key]: value,
        updatedAt: Date.now(),
      } as Partial<Lesson>);
    },
    [id],
  );

  const handleDelete = useCallback(async () => {
    const ok = confirm(
      'Delete this lesson? Vocab and characters stay — only the lesson entry is removed.',
    );
    if (!ok) return;
    await db.lessons.delete(id);
    onBack();
  }, [id, onBack]);

  if (!lesson) return <Loading />;

  return (
    <div className="px-5 pt-2 flex flex-col h-full">
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={onBack}
          className="btn-press text-brand-600 font-extrabold text-sm bg-white/70 rounded-full px-4 py-2 shadow-sm"
        >
          ← Back
        </button>
        <div className="text-[10px] font-extrabold uppercase opacity-70 text-brand-500">
          Lesson {lesson.lessonNumber}
        </div>
        <button
          onClick={handleDelete}
          className="btn-press text-red-500 text-sm font-extrabold bg-white/70 rounded-full px-3 py-2 shadow-sm"
          aria-label="Delete lesson"
        >
          🗑
        </button>
      </div>

      <div className="flex-1 overflow-y-auto pb-6 space-y-4">
        <TitleTopicDateBlock lesson={lesson} updateField={updateField} />
        <CharsSection
          lesson={lesson}
          onEdit={() => setEditingChars(true)}
          onPickChar={setPreviewChar}
        />
        <VocabSection
          lesson={lesson}
          onEdit={() => setEditingVocab(true)}
          onPickVocab={setPreviewVocab}
        />
        <MarkdownSection
          label="Grammar Notes"
          value={lesson.grammarNotes}
          onChange={(v) => updateField('grammarNotes', v)}
        />
        <ExampleSentencesSection lesson={lesson} updateField={updateField} />
        <MarkdownSection
          label="My Notes"
          value={lesson.myNotes}
          onChange={(v) => updateField('myNotes', v)}
        />
        <QuestionsSection lesson={lesson} updateField={updateField} />
      </div>

      {editingChars && (
        <CharsPicker
          selected={lesson.characterKeys}
          onClose={() => setEditingChars(false)}
          onSave={async (keys) => {
            await updateField('characterKeys', keys);
            setEditingChars(false);
          }}
        />
      )}
      {editingVocab && (
        <VocabPicker
          selected={lesson.vocabIds}
          onClose={() => setEditingVocab(false)}
          onSave={async (ids) => {
            await updateField('vocabIds', ids);
            setEditingVocab(false);
          }}
        />
      )}
      {previewChar && (
        <CharPreview
          char={previewChar}
          onClose={() => setPreviewChar(null)}
        />
      )}
      {previewVocab && (
        <VocabPreview
          word={previewVocab}
          onClose={() => setPreviewVocab(null)}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Header section: title / topic / date — autosave on blur
// ---------------------------------------------------------------------------

function TitleTopicDateBlock({
  lesson,
  updateField,
}: {
  lesson: Lesson;
  updateField: <K extends keyof Lesson>(key: K, value: Lesson[K]) => Promise<void>;
}) {
  return (
    <div className="bg-white rounded-3xl shadow-sm border-2 border-brand-100 p-4 space-y-3">
      <BlurInput
        label="Title"
        value={lesson.title}
        placeholder="Lesson title"
        onCommit={(v) => updateField('title', v)}
        large
      />
      <BlurInput
        label="Topic"
        value={lesson.topic}
        placeholder="What was this lesson about?"
        onCommit={(v) => updateField('topic', v)}
        multiline
      />
      <BlurInput
        label="Date"
        type="date"
        value={lesson.date ?? ''}
        onCommit={(v) => updateField('date', v || undefined)}
      />
    </div>
  );
}

function BlurInput({
  label,
  value,
  placeholder,
  type = 'text',
  multiline,
  large,
  onCommit,
}: {
  label: string;
  value: string;
  placeholder?: string;
  type?: string;
  multiline?: boolean;
  large?: boolean;
  onCommit: (v: string) => void;
}) {
  const [local, setLocal] = useState(value);
  // Keep local in sync if the underlying record changes from elsewhere.
  useEffect(() => setLocal(value), [value]);

  const sharedClass = `w-full bg-brand-50 border-2 border-brand-200 rounded-xl px-3 py-2 text-brand-800 font-bold focus:outline-none focus:border-brand-400 ${
    large ? 'text-lg' : 'text-sm'
  }`;

  return (
    <div>
      <div className="text-[10px] font-extrabold uppercase tracking-wide text-brand-500 mb-1">
        {label}
      </div>
      {multiline ? (
        <textarea
          value={local}
          placeholder={placeholder}
          onChange={(e) => setLocal(e.target.value)}
          onBlur={() => local !== value && onCommit(local)}
          rows={2}
          className={sharedClass}
        />
      ) : (
        <input
          type={type}
          value={local}
          placeholder={placeholder}
          onChange={(e) => setLocal(e.target.value)}
          onBlur={() => local !== value && onCommit(local)}
          className={sharedClass}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Characters section + picker + preview
// ---------------------------------------------------------------------------

function CharsSection({
  lesson,
  onEdit,
  onPickChar,
}: {
  lesson: Lesson;
  onEdit: () => void;
  onPickChar: (c: HangulCharacter) => void;
}) {
  const all = useLiveQuery(() => db.characters.toArray(), []);
  const lookup = useMemo(
    () => new Map((all ?? []).map((c) => [c.character, c])),
    [all],
  );

  return (
    <Section
      title="Characters"
      action={
        <button
          onClick={onEdit}
          className="btn-press text-[10px] font-black uppercase tracking-wide bg-brand-100 text-brand-600 rounded-full px-2 py-1"
        >
          Edit
        </button>
      }
    >
      {lesson.characterKeys.length === 0 ? (
        <div className="text-xs italic text-brand-400">None yet — tap Edit to add.</div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {lesson.characterKeys.map((k) => {
            const c = lookup.get(k);
            if (!c) {
              return (
                <span
                  key={k}
                  className="font-hangul text-xl font-bold bg-gray-100 text-gray-400 rounded-lg px-3 py-1"
                >
                  {k}
                </span>
              );
            }
            return (
              <button
                key={k}
                onClick={() => onPickChar(c)}
                className="btn-press font-hangul text-xl font-bold bg-brand-100 text-brand-700 rounded-lg px-3 py-1 hover:bg-brand-200"
              >
                {k}
              </button>
            );
          })}
        </div>
      )}
    </Section>
  );
}

function CharsPicker({
  selected,
  onSave,
  onClose,
}: {
  selected: string[];
  onSave: (keys: string[]) => void;
  onClose: () => void;
}) {
  const sets = useLiveQuery(() => db.sets.orderBy('order').toArray(), []);
  const all = useLiveQuery(() => db.characters.toArray(), []);
  const [draft, setDraft] = useState<Set<string>>(new Set(selected));

  const lookup = useMemo(
    () => new Map((all ?? []).map((c) => [c.character, c])),
    [all],
  );

  const toggle = (k: string) => {
    setDraft((s) => {
      const ns = new Set(s);
      if (ns.has(k)) ns.delete(k);
      else ns.add(k);
      return ns;
    });
  };

  return (
    <Modal title="Select characters" onClose={onClose}>
      <div className="flex-1 overflow-y-auto px-1 py-2 space-y-3">
        {(sets ?? []).map((s) => (
          <div key={s.setId}>
            <div className="text-[10px] font-extrabold uppercase tracking-wide text-brand-500 mb-1">
              {s.name}
            </div>
            <div className="flex flex-wrap gap-2">
              {s.characters.map((k) => {
                const c = lookup.get(k);
                const isSelected = draft.has(k);
                return (
                  <button
                    key={k}
                    onClick={() => toggle(k)}
                    className={`btn-press font-hangul text-xl font-bold rounded-lg px-3 py-1 border-2 transition ${
                      isSelected
                        ? 'bg-brand-500 text-white border-brand-600'
                        : 'bg-white text-brand-700 border-brand-200 hover:bg-brand-50'
                    }`}
                  >
                    {k}
                    {c && (
                      <span className="ml-1 text-[10px] font-black opacity-80">
                        {c.romanization}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      <ModalActions
        onClose={onClose}
        onSave={() => onSave([...draft])}
        saveLabel={`Save (${draft.size})`}
      />
    </Modal>
  );
}

function CharPreview({
  char,
  onClose,
}: {
  char: HangulCharacter;
  onClose: () => void;
}) {
  return (
    <Modal title={`Character — ${char.romanization}`} onClose={onClose}>
      <div className="flex flex-col items-center py-4 px-2">
        <div className="font-hangul text-9xl font-black text-brand-700 leading-none">
          {char.character}
        </div>
        <div className="mt-2 text-xl font-black text-pink-500 uppercase tracking-wider">
          {char.romanization}
        </div>
        <button
          onClick={() => speak(char.character)}
          className="mt-3 btn-press bg-brand-500 text-white font-black text-xs rounded-full px-4 py-2 shadow-md"
        >
          🔊 Replay sound
        </button>
        <div className="mt-4 w-full space-y-2">
          <div className="bg-amber-100 border-2 border-amber-300 rounded-2xl p-3">
            <div className="text-[10px] font-black text-amber-700 uppercase">
              Sound anchor
            </div>
            <div className="text-sm font-bold text-amber-900">
              {char.englishAnchor}
            </div>
          </div>
          {char.mnemonic && (
            <div className="bg-violet-100 border-2 border-violet-300 rounded-2xl p-3">
              <div className="text-[10px] font-black text-violet-700 uppercase">
                Mnemonic
              </div>
              <div className="text-sm font-bold text-violet-900">
                {char.mnemonic}
              </div>
            </div>
          )}
        </div>
      </div>
      <ModalActions onClose={onClose} />
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Vocab section + picker + preview
// ---------------------------------------------------------------------------

function VocabSection({
  lesson,
  onEdit,
  onPickVocab,
}: {
  lesson: Lesson;
  onEdit: () => void;
  onPickVocab: (v: VocabularyItem) => void;
}) {
  const items = useLiveQuery(
    () => db.vocabulary.bulkGet(lesson.vocabIds),
    [lesson.vocabIds.join(',')],
  );

  return (
    <Section
      title="Vocab"
      action={
        <button
          onClick={onEdit}
          className="btn-press text-[10px] font-black uppercase tracking-wide bg-brand-100 text-brand-600 rounded-full px-2 py-1"
        >
          Edit
        </button>
      }
    >
      {lesson.vocabIds.length === 0 ? (
        <div className="text-xs italic text-brand-400">None yet — tap Edit to add.</div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {(items ?? []).map((v) =>
            v ? (
              <button
                key={v.id}
                onClick={() => onPickVocab(v)}
                className="btn-press text-left bg-brand-100 hover:bg-brand-200 rounded-xl px-3 py-1.5"
              >
                <div className="font-hangul text-base font-black text-brand-700 leading-tight">
                  {v.korean}
                </div>
                <div className="text-[10px] font-bold text-brand-500 italic">
                  {v.english}
                </div>
              </button>
            ) : null,
          )}
        </div>
      )}
    </Section>
  );
}

function VocabPicker({
  selected,
  onSave,
  onClose,
}: {
  selected: number[];
  onSave: (ids: number[]) => void;
  onClose: () => void;
}) {
  const all = useLiveQuery(() => db.vocabulary.toArray(), []);
  const [draft, setDraft] = useState<Set<number>>(new Set(selected));

  const grouped = useMemo(() => {
    const m = new Map<number, VocabularyItem[]>();
    for (const v of all ?? []) {
      if (!m.has(v.lesson)) m.set(v.lesson, []);
      m.get(v.lesson)!.push(v);
    }
    return [...m.entries()].sort((a, b) => a[0] - b[0]);
  }, [all]);

  const toggle = (id: number) => {
    setDraft((s) => {
      const ns = new Set(s);
      if (ns.has(id)) ns.delete(id);
      else ns.add(id);
      return ns;
    });
  };

  return (
    <Modal title="Select vocab" onClose={onClose}>
      <div className="flex-1 overflow-y-auto px-1 py-2 space-y-3">
        {grouped.map(([lessonNum, words]) => (
          <div key={lessonNum}>
            <div className="text-[10px] font-extrabold uppercase tracking-wide text-brand-500 mb-1">
              Lesson {lessonNum}
            </div>
            <div className="flex flex-wrap gap-2">
              {words.map((v) => {
                const isSelected = v.id != null && draft.has(v.id);
                return (
                  <button
                    key={v.id}
                    onClick={() => v.id != null && toggle(v.id)}
                    className={`btn-press text-left rounded-xl px-3 py-1.5 border-2 transition ${
                      isSelected
                        ? 'bg-brand-500 text-white border-brand-600'
                        : 'bg-white text-brand-700 border-brand-200 hover:bg-brand-50'
                    }`}
                  >
                    <div className="font-hangul text-base font-black leading-tight">
                      {v.korean}
                    </div>
                    <div className={`text-[10px] font-bold italic ${
                      isSelected ? 'text-white/90' : 'text-brand-500'
                    }`}>
                      {v.english}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      <ModalActions
        onClose={onClose}
        onSave={() => onSave([...draft])}
        saveLabel={`Save (${draft.size})`}
      />
    </Modal>
  );
}

function VocabPreview({
  word,
  onClose,
}: {
  word: VocabularyItem;
  onClose: () => void;
}) {
  return (
    <Modal title={`Vocab — ${word.english}`} onClose={onClose}>
      <div className="flex flex-col items-center py-4 px-2">
        {word.imageData && (
          <img
            src={word.imageData}
            alt={word.english}
            className="w-32 h-32 rounded-3xl border-4 border-brand-200 mb-3 object-cover"
          />
        )}
        <div className="font-hangul text-5xl font-black text-brand-700 leading-tight text-center">
          {word.korean}
        </div>
        <div className="mt-1 text-base font-black text-pink-500 uppercase tracking-wider">
          {word.romanization}
        </div>
        <div className="mt-2 text-sm font-bold text-brand-500 italic">
          {word.english}
        </div>
        <button
          onClick={() => speak(word.korean)}
          className="mt-3 btn-press bg-brand-500 text-white font-black text-xs rounded-full px-4 py-2 shadow-md"
        >
          🔊 Play
        </button>
      </div>
      <ModalActions onClose={onClose} />
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Markdown section (grammar notes, my notes) — toggle Edit / Preview
// ---------------------------------------------------------------------------

function MarkdownSection({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => Promise<void>;
}) {
  const [mode, setMode] = useState<'edit' | 'preview'>(value ? 'preview' : 'edit');
  const [local, setLocal] = useState(value);
  useEffect(() => setLocal(value), [value]);

  const commit = () => {
    if (local !== value) onChange(local);
  };

  const action = (
    <div className="flex bg-brand-100 rounded-full p-0.5 text-[10px] font-black uppercase">
      <button
        onClick={() => {
          commit();
          setMode('edit');
        }}
        className={`px-2 py-0.5 rounded-full ${
          mode === 'edit' ? 'bg-white text-brand-700 shadow-sm' : 'text-brand-500'
        }`}
      >
        Edit
      </button>
      <button
        onClick={() => {
          commit();
          setMode('preview');
        }}
        className={`px-2 py-0.5 rounded-full ${
          mode === 'preview' ? 'bg-white text-brand-700 shadow-sm' : 'text-brand-500'
        }`}
      >
        Preview
      </button>
    </div>
  );

  return (
    <Section title={label} action={action}>
      {mode === 'edit' ? (
        <textarea
          value={local}
          onChange={(e) => setLocal(e.target.value)}
          onBlur={commit}
          placeholder="Supports **bold**, *italic*, # heading, - list"
          rows={5}
          className="w-full bg-brand-50 border-2 border-brand-200 rounded-xl px-3 py-2 text-sm text-brand-800 font-mono focus:outline-none focus:border-brand-400"
        />
      ) : value.trim() === '' ? (
        <div className="text-xs italic text-brand-400">Nothing yet — switch to Edit.</div>
      ) : (
        <div className="space-y-2">{renderMarkdown(value)}</div>
      )}
    </Section>
  );
}

// ---------------------------------------------------------------------------
// Example sentences
// ---------------------------------------------------------------------------

function ExampleSentencesSection({
  lesson,
  updateField,
}: {
  lesson: Lesson;
  updateField: <K extends keyof Lesson>(key: K, value: Lesson[K]) => Promise<void>;
}) {
  const [draftKo, setDraftKo] = useState('');
  const [draftEn, setDraftEn] = useState('');

  const add = async () => {
    const ko = draftKo.trim();
    const en = draftEn.trim();
    if (!ko && !en) return;
    await updateField('exampleSentences', [
      ...lesson.exampleSentences,
      { korean: ko, english: en },
    ]);
    setDraftKo('');
    setDraftEn('');
  };

  const remove = async (idx: number) => {
    const next = lesson.exampleSentences.filter((_, i) => i !== idx);
    await updateField('exampleSentences', next);
  };

  const updateAt = async (idx: number, patch: Partial<ExampleSentence>) => {
    const next = lesson.exampleSentences.map((s, i) =>
      i === idx ? { ...s, ...patch } : s,
    );
    await updateField('exampleSentences', next);
  };

  return (
    <Section title="Example Sentences">
      <div className="space-y-2">
        {lesson.exampleSentences.map((s, idx) => (
          <ExampleSentenceRow
            key={idx}
            sentence={s}
            onCommit={(patch) => updateAt(idx, patch)}
            onRemove={() => remove(idx)}
          />
        ))}
        <div className="rounded-2xl border-2 border-dashed border-brand-200 p-2 space-y-2">
          <input
            value={draftKo}
            onChange={(e) => setDraftKo(e.target.value)}
            placeholder="안녕하세요"
            className="w-full font-hangul text-base font-bold bg-transparent border-b-2 border-brand-100 px-2 py-1 focus:outline-none focus:border-brand-400"
          />
          <input
            value={draftEn}
            onChange={(e) => setDraftEn(e.target.value)}
            placeholder="Hello"
            className="w-full text-sm italic text-brand-700 bg-transparent border-b-2 border-brand-100 px-2 py-1 focus:outline-none focus:border-brand-400"
          />
          <button
            onClick={add}
            disabled={!draftKo.trim() && !draftEn.trim()}
            className="btn-press w-full bg-brand-500 disabled:opacity-50 text-white text-xs font-black uppercase tracking-wide rounded-xl py-1.5"
          >
            + Add sentence
          </button>
        </div>
      </div>
    </Section>
  );
}

function ExampleSentenceRow({
  sentence,
  onCommit,
  onRemove,
}: {
  sentence: ExampleSentence;
  onCommit: (patch: Partial<ExampleSentence>) => Promise<void>;
  onRemove: () => Promise<void>;
}) {
  const [ko, setKo] = useState(sentence.korean);
  const [en, setEn] = useState(sentence.english);
  useEffect(() => setKo(sentence.korean), [sentence.korean]);
  useEffect(() => setEn(sentence.english), [sentence.english]);

  return (
    <div className="rounded-2xl bg-brand-50 border-2 border-brand-200 p-2">
      <div className="flex items-start gap-2">
        <div className="flex-1 space-y-1">
          <input
            value={ko}
            onChange={(e) => setKo(e.target.value)}
            onBlur={() => ko !== sentence.korean && onCommit({ korean: ko })}
            className="w-full font-hangul text-base font-bold text-brand-700 bg-transparent border-b border-transparent focus:outline-none focus:border-brand-300"
          />
          <input
            value={en}
            onChange={(e) => setEn(e.target.value)}
            onBlur={() => en !== sentence.english && onCommit({ english: en })}
            className="w-full text-sm italic text-brand-600 bg-transparent border-b border-transparent focus:outline-none focus:border-brand-300"
          />
        </div>
        <div className="flex flex-col gap-1 flex-shrink-0">
          <button
            onClick={() => speak(sentence.korean)}
            disabled={!sentence.korean}
            aria-label="Play Korean"
            className="btn-press bg-brand-500 disabled:opacity-40 text-white rounded-full w-8 h-8 text-sm shadow-sm"
          >
            🔊
          </button>
          <button
            onClick={onRemove}
            aria-label="Remove sentence"
            className="btn-press bg-white text-red-500 border-2 border-red-200 rounded-full w-8 h-8 text-sm"
          >
            ×
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Questions for next class — string list, tap × to delete
// ---------------------------------------------------------------------------

function QuestionsSection({
  lesson,
  updateField,
}: {
  lesson: Lesson;
  updateField: <K extends keyof Lesson>(key: K, value: Lesson[K]) => Promise<void>;
}) {
  const [draft, setDraft] = useState('');

  const add = async () => {
    const text = draft.trim();
    if (!text) return;
    await updateField('questionsForNext', [...lesson.questionsForNext, text]);
    setDraft('');
  };

  const remove = async (idx: number) => {
    await updateField(
      'questionsForNext',
      lesson.questionsForNext.filter((_, i) => i !== idx),
    );
  };

  return (
    <Section title="Questions for Next Class">
      <ul className="space-y-1.5">
        {lesson.questionsForNext.map((q, idx) => (
          <li
            key={idx}
            className="flex items-center gap-2 bg-amber-50 border-2 border-amber-200 rounded-xl px-2 py-1.5"
          >
            <span className="text-amber-600 text-base">☐</span>
            <span className="flex-1 text-sm font-semibold text-amber-900">
              {q}
            </span>
            <button
              onClick={() => remove(idx)}
              aria-label="Remove question"
              className="btn-press text-red-500 text-base font-black w-6 h-6 rounded-full hover:bg-red-100"
            >
              ×
            </button>
          </li>
        ))}
      </ul>
      <div className="mt-2 flex gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && add()}
          placeholder="Add a question…"
          className="flex-1 bg-brand-50 border-2 border-brand-200 rounded-xl px-3 py-2 text-sm text-brand-800 focus:outline-none focus:border-brand-400"
        />
        <button
          onClick={add}
          disabled={!draft.trim()}
          className="btn-press bg-brand-500 disabled:opacity-50 text-white text-xs font-black uppercase tracking-wide rounded-xl px-3"
        >
          Add
        </button>
      </div>
    </Section>
  );
}

// ---------------------------------------------------------------------------
// Shared layout primitives
// ---------------------------------------------------------------------------

function Section({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="bg-white rounded-3xl shadow-sm border-2 border-brand-100 p-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-[10px] font-extrabold uppercase tracking-wide text-brand-500">
          {title}
        </h3>
        {action}
      </div>
      {children}
    </section>
  );
}

function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-30 bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center px-3 pb-3 pt-12"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-white rounded-3xl shadow-2xl flex flex-col max-h-[85vh]"
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
        <div className="flex-1 flex flex-col min-h-0 px-3 pt-2 pb-3">
          {children}
        </div>
      </div>
    </div>
  );
}

function ModalActions({
  onClose,
  onSave,
  saveLabel,
}: {
  onClose: () => void;
  onSave?: () => void;
  saveLabel?: string;
}) {
  return (
    <div className="flex gap-2 mt-3">
      <button
        onClick={onClose}
        className="btn-press flex-1 bg-white border-2 border-brand-200 text-brand-600 font-black rounded-2xl py-2 text-sm"
      >
        {onSave ? 'Cancel' : 'Close'}
      </button>
      {onSave && (
        <button
          onClick={onSave}
          className="btn-press flex-1 bg-gradient-to-r from-brand-500 to-pink-500 text-white font-black rounded-2xl py-2 text-sm"
        >
          {saveLabel ?? 'Save'}
        </button>
      )}
    </div>
  );
}

function Loading() {
  return (
    <div className="flex items-center justify-center h-[60vh]">
      <div className="text-4xl animate-bounce">📓</div>
    </div>
  );
}
