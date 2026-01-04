import { defineConfig, devices } from '@playwright/test'
import path from 'path'
import dotenv from 'dotenv'

/**
 * Playwright Configuration for E-Commerce Store
 *
 * This configuration sets up comprehensive E2E testing with:
 * - Multiple browser support (Desktop + Mobile)
 * - Next.js webServer integration
 * - Test parallelization
 * - Artifact collection (screenshots, videos, traces)
 */

// Load test environment variables
// Load .env.test.local first (contains secrets, overrides base config)
// Then .env.test (base test config)
dotenv.config({ path: '.env.test.local' })
dotenv.config({ path: '.env.test' })

export default defineConfig({
  // Directory containing test files
  testDir: './e2e/tests',

  // Run tests in parallel for faster execution
  fullyParallel: true,

  // Fail the build on CI if you accidentally left test.only in the source code
  forbidOnly: !!process.env.CI,

  // Retry failed tests on CI to handle flakiness
  retries: process.env.CI ? 2 : 0,

  // Limit parallel workers on CI to avoid resource issues
  workers: process.env.CI ? 1 : undefined,

  // Reporter configuration - different for local vs CI
  reporter: [
    // Always generate HTML report
    ['html', { outputFolder: 'playwright-report' }],
    // JSON report for programmatic access
    ['json', { outputFile: 'test-results/results.json' }],
    // GitHub annotations in CI, list output locally
    process.env.CI ? ['github'] : ['list'],
  ],

  // Global test timeout (30 seconds per test)
  timeout: 30000,

  // Assertion timeout
  expect: {
    timeout: 5000,
  },

  // Shared settings for all browser projects
  use: {
    // Base URL - all page.goto() calls will be relative to this
    baseURL: process.env.TEST_BASE_URL || 'http://localhost:3000',

    // Collect trace when test fails on first retry
    trace: 'on-first-retry',

    // Capture screenshot only when test fails
    screenshot: 'only-on-failure',

    // Record video on first retry (helps debug flaky tests)
    video: 'on-first-retry',

    // Maximum time for actions like click(), fill(), etc.
    actionTimeout: 10000,

    // Maximum time for navigation
    navigationTimeout: 30000,
  },

  // Configure browser projects
  projects: [
    // ============================================
    // DESKTOP BROWSERS
    // ============================================
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
      },
    },

    {
      name: 'firefox',
      use: {
        ...devices['Desktop Firefox'],
      },
    },

    {
      name: 'webkit',
      use: {
        ...devices['Desktop Safari'],
      },
    },

    // ============================================
    // MOBILE BROWSERS
    // ============================================
    {
      name: 'Mobile Chrome',
      use: {
        ...devices['Pixel 5'],
      },
    },

    {
      name: 'Mobile Safari',
      use: {
        ...devices['iPhone 12'],
      },
    },
  ],

  // Web server configuration for Next.js
  // Playwright will start the dev server before running tests
  webServer: {
    // Command to start the development server in test mode
    command: 'npm run dev:test',
    // URL to wait for before starting tests
    url: 'http://localhost:3000',
    // Reuse existing server when running locally (faster iterations)
    reuseExistingServer: !process.env.CI,
    // Timeout for server startup (2 minutes)
    timeout: 120000,
    // Environment variables for the server process
    env: {
      NODE_ENV: 'test',
    },
  },

  // Output directory for test artifacts (screenshots, videos, traces)
  outputDir: 'test-results',

  // Global setup and teardown scripts
  globalSetup: path.join(__dirname, 'e2e/global-setup.ts'),
  globalTeardown: path.join(__dirname, 'e2e/global-teardown.ts'),
})
