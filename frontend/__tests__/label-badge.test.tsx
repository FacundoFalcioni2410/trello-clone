import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LabelBadge } from '../app/boards/[id]/components/LabelBadge';

describe('LabelBadge', () => {
  it('renders red label', () => {
    render(<LabelBadge color="red" />);
    const badge = screen.getByTitle('red');
    expect(badge).toHaveClass('bg-red-500');
  });

  it('renders blue label', () => {
    render(<LabelBadge color="blue" />);
    const badge = screen.getByTitle('blue');
    expect(badge).toHaveClass('bg-blue-500');
  });

  it('returns null for unknown color', () => {
    const { container } = render(<LabelBadge color="unknown" />);
    expect(container.firstChild).toBeNull();
  });
});
