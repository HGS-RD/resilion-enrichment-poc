import { defineConfig } from 'vitest/config'
import { resolve } from 'path'

export default defineConfig({
  test: {
    name: 'integration',
    root: '.',
    environment: 'node',
    setupFiles: ['./tests/setup/vitest.setup.ts'],
    include: ['tests/integration/**/*.test.ts'],
    exclude: ['tests/unit/**/*', 'tests/e2e/**/*'],
    testTimeout: 30000,
    hookTimeout: 10000,
    teardownTimeout: 5000,
    globals: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      reportsDirectory: './coverage/integration',
      include: [
        'apps/web/app/api/**/*',
        'apps/web/lib/repositories/**/*',
        'apps/web/lib/services/**/*'
      ],
      exclude: [
        'node_modules/**',
        'tests/**',
        '**/*.d.ts',
        '**/*.config.*',
        '**/coverage/**'
      ],
      thresholds: {
        global: {
          branches: 70,
          functions: 70,
          lines: 70,
          statements: 70
        }
      }
    }
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './apps/web'),
      '@ui': resolve(__dirname, './packages/ui/src')
    }
  }
})
