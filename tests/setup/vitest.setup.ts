import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock environment variables for testing
process.env.NODE_ENV = process.env.NODE_ENV || 'test';
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://test:test@localhost:5432/test_db';
process.env.PINECONE_API_KEY = process.env.PINECONE_API_KEY || 'test-pinecone-key';
process.env.PINECONE_ENVIRONMENT = process.env.PINECONE_ENVIRONMENT || 'test-environment';
process.env.OPENAI_API_KEY = process.env.OPENAI_API_KEY || 'test-openai-key';

// Mock Next.js router
vi.mock('next/router', () => ({
  useRouter: () => ({
    push: vi.fn(),
    pathname: '/',
    query: {},
    asPath: '/',
  }),
}));

// Mock Next.js navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}));

// Mock fetch globally
global.fetch = vi.fn();

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: vi.fn(),
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
};

// Setup DOM cleanup
afterEach(() => {
  vi.clearAllMocks();
  vi.resetAllMocks();
});

// Global test utilities
global.testUtils = {
  mockFetch: (response: any, status = 200) => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: status >= 200 && status < 300,
      status,
      json: async () => response,
      text: async () => JSON.stringify(response),
    });
  },
  mockFetchError: (error: string) => {
    (global.fetch as any).mockRejectedValueOnce(new Error(error));
  },
};

// Extend global types
declare global {
  var testUtils: {
    mockFetch: (response: any, status?: number) => void;
    mockFetchError: (error: string) => void;
  };
}
