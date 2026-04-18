import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('../lib/speech', () => ({
  speak: vi.fn(),
}));

async function seedUnlocked(count: number) {
  const { db } = await import('../db/db');
  const { HANGUL_CHARS } = await import('../data/hangul');
  await db.characters.clear();
  await db.sets.clear();
  await db.characters.bulkAdd(
    HANGUL_CHARS.slice(0, count).map((c) => ({
      character: c.character,
      romanization: c.romanization,
      type: c.type,
      englishAnchor: c.englishAnchor,
      mnemonic: c.mnemonic,
      weight: 1.0,
      timesCorrect: 0,
      timesWrong: 0,
      lastSeen: 0,
      unlocked: 1,
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

describe('DrillMode', () => {
  it('shows the lock screen when fewer than 4 characters are unlocked', async () => {
    await seedUnlocked(2);
    const { default: DrillMode } = await import('./DrillMode');
    render(<DrillMode />);
    expect(await screen.findByText(/Unlock drills in Learn Mode/i)).toBeInTheDocument();
  });

  it('shows the quiz UI with four options once enough characters are unlocked', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    await seedUnlocked(8);
    const { default: DrillMode } = await import('./DrillMode');
    render(<DrillMode />);
    await waitFor(() => {
      expect(screen.getByLabelText(/Replay/i)).toBeInTheDocument();
    });
    const stats = screen.getByText(/accuracy/i).parentElement!;
    expect(stats).toBeInTheDocument();
    const replay = screen.getByLabelText(/Replay/i);
    const card = replay.parentElement!;
    // 4 option buttons + 1 replay button = 5 buttons
    const allButtons = screen.getAllByRole('button');
    expect(allButtons.length).toBe(5);
    expect(card.textContent).toBeTruthy();
  });

  it('updates the database weight downward on a correct pick', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    await seedUnlocked(6);
    const { db } = await import('../db/db');
    const { default: DrillMode } = await import('./DrillMode');
    const user = userEvent.setup();
    render(<DrillMode />);

    // Wait for the question to render
    await waitFor(() => {
      expect(screen.getByLabelText(/Replay/i)).toBeInTheDocument();
    });

    // Find the answer by reading the big Hangul character on the card
    const replay = screen.getByLabelText(/Replay/i);
    const card = replay.parentElement!;
    const answerChar = card.querySelector('.font-hangul')!.textContent!;
    const answerBefore = await db.characters.get(answerChar);
    expect(answerBefore).toBeDefined();

    // Click the option button whose text matches the answer's romanization
    const buttons = screen.getAllByRole('button');
    const answerButton = buttons.find(
      (b) => b.textContent?.trim().toLowerCase() === answerBefore!.romanization.toLowerCase(),
    )!;
    expect(answerButton).toBeDefined();
    await user.click(answerButton);

    await waitFor(async () => {
      const after = await db.characters.get(answerChar);
      expect(after!.weight).toBeLessThan(answerBefore!.weight);
      expect(after!.timesCorrect).toBe(1);
      expect(after!.timesWrong).toBe(0);
      expect(after!.lastSeen).toBeGreaterThan(0);
    });
  });

  it('updates the database weight upward on a wrong pick and reveals the correct answer', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    await seedUnlocked(6);
    const { db } = await import('../db/db');
    const { default: DrillMode } = await import('./DrillMode');
    const user = userEvent.setup();
    render(<DrillMode />);

    await waitFor(() => {
      expect(screen.getByLabelText(/Replay/i)).toBeInTheDocument();
    });

    const replay = screen.getByLabelText(/Replay/i);
    const card = replay.parentElement!;
    const answerChar = card.querySelector('.font-hangul')!.textContent!;
    const answerBefore = await db.characters.get(answerChar);

    const buttons = screen.getAllByRole('button');
    const wrongButton = buttons.find(
      (b) =>
        b !== replay &&
        b.textContent &&
        b.textContent.trim().toLowerCase() !== answerBefore!.romanization.toLowerCase(),
    )!;
    await user.click(wrongButton);

    await waitFor(() => {
      expect(screen.getByText(/Correct answer/i)).toBeInTheDocument();
    });

    const after = await db.characters.get(answerChar);
    expect(after!.weight).toBeGreaterThan(answerBefore!.weight);
    expect(after!.timesWrong).toBe(1);
    expect(after!.timesCorrect).toBe(0);
  });

  it('ignores subsequent picks during feedback state', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    await seedUnlocked(6);
    const { db } = await import('../db/db');
    const { default: DrillMode } = await import('./DrillMode');
    const user = userEvent.setup();
    render(<DrillMode />);

    await waitFor(() => expect(screen.getByLabelText(/Replay/i)).toBeInTheDocument());

    const replay = screen.getByLabelText(/Replay/i);
    const card = replay.parentElement!;
    const answerChar = card.querySelector('.font-hangul')!.textContent!;
    const answerBefore = await db.characters.get(answerChar);

    const buttons = screen.getAllByRole('button');
    const answerButton = buttons.find(
      (b) => b.textContent?.trim().toLowerCase() === answerBefore!.romanization.toLowerCase(),
    )!;
    await user.click(answerButton);

    await waitFor(async () => {
      const after = await db.characters.get(answerChar);
      expect(after!.timesCorrect).toBe(1);
    });

    // Clicking another option while feedback is displayed should not cause a second update
    const other = buttons.find((b) => b !== replay && b !== answerButton)!;
    await act(async () => {
      other.click();
    });
    const still = await db.characters.get(answerChar);
    expect(still!.timesCorrect).toBe(1);
  });
});
