import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import LoginPage from '../app/login/page';
import { useRouter } from 'next/navigation';

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
}));

vi.mock('../lib/api', () => ({
  apiFetch: vi.fn(),
  getCsrfCookie: vi.fn(),
  getXsrfToken: vi.fn(),
}));

import { apiFetch, getCsrfCookie } from '../lib/api';

describe('LoginPage', () => {
  it('renders login form', () => {
    const mockPush = vi.fn();
    (useRouter as any).mockReturnValue({ push: mockPush });

    render(<LoginPage />);
    expect(screen.getByText('Welcome back')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('you@example.com')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('••••••••')).toBeInTheDocument();
  });

  it('shows error on invalid credentials', async () => {
    const mockPush = vi.fn();
    (useRouter as any).mockReturnValue({ push: mockPush });
    (apiFetch as any).mockRejectedValue(new Error('Wrong credentials'));
    (getCsrfCookie as any).mockResolvedValue(undefined);

    render(<LoginPage />);
    fireEvent.change(screen.getByPlaceholderText('you@example.com'), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByPlaceholderText('••••••••'), { target: { value: 'wrongpass' } });
    fireEvent.click(screen.getByText('Sign in'));

    await waitFor(() => {
      expect(screen.getByText('Wrong credentials')).toBeInTheDocument();
    });
  });

  it('redirects on successful login', async () => {
    const mockPush = vi.fn();
    (useRouter as any).mockReturnValue({ push: mockPush });
    (apiFetch as any).mockResolvedValue({ user: { id: 1, name: 'Test' } });
    (getCsrfCookie as any).mockResolvedValue(undefined);

    render(<LoginPage />);
    fireEvent.change(screen.getByPlaceholderText('you@example.com'), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByPlaceholderText('••••••••'), { target: { value: 'password123' } });
    fireEvent.click(screen.getByText('Sign in'));

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/');
    });
  });
});
