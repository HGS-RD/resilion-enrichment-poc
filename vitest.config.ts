import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup/vitest.setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      reportsDirectory: './coverage',
      thresholds: {
        global: {
          branches: 99,
          functions: 99,
          lines: 99,
          statements: 99
        },
        // Specific thresholds for different file patterns
        './apps/web/lib/services/**': {
          branches: 100,
          functions: 100,
          lines: 100,
          statements: 100
        },
        './apps/web/app/api/**': {
          branches: 100,
          functions: 100,
          lines: 100,
          statements: 100
        }
      },
      exclude: [
        'node_modules/',
        'tests/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/coverage/**',
        'apps/web/.next/**',
        'apps/web/next.config.js',
        'apps/web/tailwind.config.js',
        'apps/web/postcss.config.js',
        'packages/ui/tailwind.config.js',
        'packages/ui/postcss.config.js',
        '**/*.stories.*',
        '**/*.test.*',
        '**/*.spec.*'
      ],
      include: [
        'apps/web/lib/**',
        'apps/web/app/**',
        'apps/web/components/**',
        'packages/ui/src/**'
      ]
    },
    // Test file patterns
    include: [
      'tests/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}',
      'apps/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}',
      'packages/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'
    ],
    // Test timeout
    testTimeout: 10000,
    hookTimeout: 10000
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './apps/web'),
      '@/lib': path.resolve(__dirname, './apps/web/lib'),
      '@/components': path.resolve(__dirname, './apps/web/components'),
      '@/app': path.resolve(__dirname, './apps/web/app'),
      '@workspace/ui': path.resolve(__dirname, './packages/ui/src')
    }
  }
});
