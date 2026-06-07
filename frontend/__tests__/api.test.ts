import { describe, it, expect, vi } from 'vitest';
import { getXsrfToken, extractErrorMessage, apiFetch } from '../lib/api';

describe('getXsrfToken', () => {
  it('returns null when no XSRF-TOKEN cookie exists', () => {
    Object.defineProperty(document, 'cookie', {
      value: '',
      writable: true,
    });
    expect(getXsrfToken()).toBeNull();
  });

  it('returns decoded token when cookie exists', () => {
    Object.defineProperty(document, 'cookie', {
      value: 'XSRF-TOKEN=abc%20test; other=value',
      writable: true,
    });
    expect(getXsrfToken()).toBe('abc test');
    Object.defineProperty(document, 'cookie', {
      value: '',
      writable: true,
    });
  });
});

describe('extractErrorMessage', () => {
  it('extracts string payload directly', () => {
    expect((extractErrorMessage as any)('Something failed')).toBe('Something failed');
  });

  it('extracts error message from object', () => {
    expect((extractErrorMessage as any)({ message: 'Server error' })).toBe('Server error');
  });

  it('extracts error from error field', () => {
    expect((extractErrorMessage as any)({ error: 'Unauthorized' })).toBe('Unauthorized');
  });

  it('extracts validation errors', () => {
    expect(
      (extractErrorMessage as any)({
        errors: { name: ['Name is required'], email: ['Email is invalid'] },
      })
    ).toBe('Name is required. Email is invalid');
  });

  it('returns default for unknown payload', () => {
    expect((extractErrorMessage as any)(null)).toBe('Request failed');
  });
});
