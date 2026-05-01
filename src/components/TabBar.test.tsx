import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TabBar from './TabBar';

describe('TabBar', () => {
  it('invokes onChange when an enabled tab is clicked', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<TabBar active="learn" onChange={onChange} />);
    await user.click(screen.getByRole('button', { name: /drill/i }));
    expect(onChange).toHaveBeenCalledWith('drill');
  });

  it('renders all six tabs as enabled now that every phase is live', () => {
    const onChange = vi.fn();
    render(<TabBar active="learn" onChange={onChange} />);
    for (const name of [/learn/i, /drill/i, /vocab/i, /lessons/i, /practice/i, /stats/i]) {
      expect(screen.getByRole('button', { name })).not.toBeDisabled();
    }
  });

  it('renders the active tab and other enabled tabs with distinct styling classes', () => {
    const onChange = vi.fn();
    render(<TabBar active="learn" onChange={onChange} />);
    const activeBtn = screen.getByRole('button', { name: /learn/i });
    const otherEnabledBtn = screen.getByRole('button', { name: /drill/i });
    expect(activeBtn.className).toMatch(/text-brand-700/);
    expect(otherEnabledBtn.className).toMatch(/text-brand-400/);
  });
});
