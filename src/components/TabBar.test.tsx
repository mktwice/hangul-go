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

  it('does not invoke onChange when a disabled tab is clicked', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<TabBar active="learn" onChange={onChange} />);
    await user.click(screen.getByRole('button', { name: /vocab/i }));
    expect(onChange).not.toHaveBeenCalled();
  });

  it('disables inactive tabs via the disabled attribute', () => {
    const onChange = vi.fn();
    render(<TabBar active="learn" onChange={onChange} />);
    expect(screen.getByRole('button', { name: /vocab/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /lessons/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /practice/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /stats/i })).toBeDisabled();
  });

  it('renders active and enabled tabs with distinct styling classes', () => {
    const onChange = vi.fn();
    render(<TabBar active="learn" onChange={onChange} />);
    const activeBtn = screen.getByRole('button', { name: /learn/i });
    const enabledBtn = screen.getByRole('button', { name: /drill/i });
    const disabledBtn = screen.getByRole('button', { name: /vocab/i });
    expect(activeBtn.className).toMatch(/text-brand-700/);
    expect(enabledBtn.className).toMatch(/text-brand-400/);
    expect(disabledBtn.className).toMatch(/text-gray-300/);
  });
});
