import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // session.ts refuses to run without a real-length secret; tests use a throwaway one.
    env: { SESSION_SECRET: 'test-only-secret-that-is-at-least-32-characters-long' },
  },
});
