import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('../lib/speech', () => ({
  speak: vi.fn(),
}));

async function seedAll() {
  const { db } = await import('../db/db');
  const { HANGUL_CHARS, HANGUL_SETS } = await import('../data/hangul');
  await db.characters.clear();
  await db.sets.clear();
  await db.characters.bulkAdd(
    HANGUL_CHARS.map((c) => ({
      character: c.character,
      romanization: c.romanization,
      type: c.type,
      englishAnchor: c.englishAnchor,
      mnemonic: c.mnemonic,
      weight: 1.0,
      timesCorrect: 0,
      timesWrong: 0,
      lastSeen: 0,
      unlocked: 0,
    })),
  );
  await db.sets.bulkAdd(
    HANGUL_SETS.map((s) => ({
      setId: s.setId,
      name: s.name,
      characters: s.characters,
      order: s.order,
      completed: 0,
    })),
  );
}

beforeEach(() => {
  vi.resetModules();
});

afterEach(async () => {
  const { db } = await import('../db/db');
  try {
    await db.characters.clear();
    await db.sets.clear();
    db.close();
  } catch {
    /* ignore */
  }
  vi.restoreAllMocks();
});

describe('LearnMode progress map', () => {
  it('renders the first set as enabled and subsequent sets as locked', async () => {
    await seedAll();
    const { default: LearnMode } = await import('./LearnMode');
    render(<LearnMode />);
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Set 1\b/ })).toBeInTheDocument();
    });

    const firstBtn = screen.getByRole('button', { name: /Set 1\b/ });
    const secondBtn = screen.getByRole('button', { name: /Set 2\b/ });
    expect(firstBtn).not.toBeDisabled();
    expect(secondBtn).toBeDisabled();
  });

  it('unlocks the next set after marking the previous one completed', async () => {
    const { db } = await import('../db/db');
    await seedAll();
    await db.sets.update('vowels-1', { completed: 1 });
    const { default: LearnMode } = await import('./LearnMode');
    render(<LearnMode />);
    await waitFor(() => {
      const second = screen.getByRole('button', { name: /Set 2\b/ });
      expect(second).not.toBeDisabled();
    });
  });

  it('renders completed sets with a checkmark indicator', async () => {
    const { db } = await import('../db/db');
    await seedAll();
    await db.sets.update('vowels-1', { completed: 1 });
    const { default: LearnMode } = await import('./LearnMode');
    render(<LearnMode />);
    await waitFor(() => {
      const setLabel = screen.getByText(/^Set 1$/);
      const card = setLabel.closest('.rounded-3xl');
      expect(card).not.toBeNull();
      expect(card!.textContent).toMatch(/✅/);
    });
  });

  it('shows a Review button on completed sets', async () => {
    const { db } = await import('../db/db');
    await seedAll();
    await db.sets.update('vowels-1', { completed: 1 });
    const { default: LearnMode } = await import('./LearnMode');
    render(<LearnMode />);
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Review/i })).toBeInTheDocument();
    });
  });
});

describe('LearnMode review session', () => {
  it('opens a review session with a Review badge and "Done reviewing" final button, and does not modify the database on completion', async () => {
    const { db } = await import('../db/db');
    await seedAll();
    // Mark vowels-1 completed; record character unlocked state to verify it's untouched.
    await db.sets.update('vowels-1', { completed: 1 });
    await db.characters
      .where('character')
      .anyOf(['ㅏ', 'ㅓ', 'ㅗ', 'ㅜ', 'ㅡ'])
      .modify({ unlocked: 1 });
    const beforeUnlocked = (await db.characters.toArray())
      .filter((c) => c.unlocked)
      .map((c) => c.character)
      .sort();

    const { default: LearnMode } = await import('./LearnMode');
    const user = userEvent.setup();
    render(<LearnMode />);

    await waitFor(() =>
      expect(screen.getByRole('button', { name: /Review/i })).toBeInTheDocument(),
    );
    await user.click(screen.getByRole('button', { name: /Review/i }));

    await waitFor(() => expect(screen.getByText('1 / 5')).toBeInTheDocument());
    expect(screen.getByText(/^Review$/)).toBeInTheDocument();

    // Walk to the last card.
    await user.click(screen.getByRole('button', { name: /Next/i }));
    await user.click(screen.getByRole('button', { name: /Next/i }));
    await user.click(screen.getByRole('button', { name: /Next/i }));
    await user.click(screen.getByRole('button', { name: /Next/i }));
    await waitFor(() => expect(screen.getByText('5 / 5')).toBeInTheDocument());

    const finalBtn = screen.getByRole('button', { name: /Done reviewing/i });
    expect(finalBtn).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Complete Set/i })).toBeNull();

    await user.click(finalBtn);

    // Back on the progress map.
    await waitFor(() =>
      expect(screen.getByText(/Your Journey/i)).toBeInTheDocument(),
    );

    // DB state is unchanged: completed flag still 1, unlocked set unchanged.
    const set = await db.sets.get('vowels-1');
    expect(set!.completed).toBe(1);
    const afterUnlocked = (await db.characters.toArray())
      .filter((c) => c.unlocked)
      .map((c) => c.character)
      .sort();
    expect(afterUnlocked).toEqual(beforeUnlocked);
  });
});

describe('LearnMode learn session', () => {
  it('navigates through cards and completes the set at the end', async () => {
    const { db } = await import('../db/db');
    await seedAll();
    const { default: LearnMode } = await import('./LearnMode');
    const user = userEvent.setup();
    render(<LearnMode />);

    await waitFor(() => expect(screen.getByRole('button', { name: /Set 1\b/ })).toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: /Set 1\b/ }));

    await waitFor(() => expect(screen.getByText('1 / 5')).toBeInTheDocument());
    expect(screen.getByRole('button', { name: /Prev/i })).toBeDisabled();

    await user.click(screen.getByRole('button', { name: /Next/i }));
    await waitFor(() => expect(screen.getByText('2 / 5')).toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: /Next/i }));
    await waitFor(() => expect(screen.getByText('3 / 5')).toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: /Prev/i }));
    await waitFor(() => expect(screen.getByText('2 / 5')).toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: /Next/i }));
    await user.click(screen.getByRole('button', { name: /Next/i }));
    await user.click(screen.getByRole('button', { name: /Next/i }));
    await waitFor(() => expect(screen.getByText('5 / 5')).toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: /Complete Set/i }));

    await waitFor(async () => {
      const set = await db.sets.get('vowels-1');
      expect(set!.completed).toBe(1);
    });

    // All 5 characters in the set should now be unlocked
    const unlocked = await db.characters.where('unlocked').equals(1).toArray();
    const unlockedKeys = unlocked.map((c) => c.character).sort();
    expect(unlockedKeys).toEqual(['ㅏ', 'ㅓ', 'ㅗ', 'ㅜ', 'ㅡ'].sort());
  });

  it('returns to the progress map when Back is clicked', async () => {
    await seedAll();
    const { default: LearnMode } = await import('./LearnMode');
    const user = userEvent.setup();
    render(<LearnMode />);

    await waitFor(() => expect(screen.getByRole('button', { name: /Set 1\b/ })).toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: /Set 1\b/ }));

    await waitFor(() => expect(screen.getByText('1 / 5')).toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: /Back/i }));

    await waitFor(() => expect(screen.getByText(/Your Journey/i)).toBeInTheDocument());
  });
});
