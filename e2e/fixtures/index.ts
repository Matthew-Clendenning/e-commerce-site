/**
 * Playwright Test Fixtures
 *
 * WHAT ARE FIXTURES?
 * Fixtures are reusable setup/teardown logic that Playwright injects into tests.
 * Think of them as dependency injection for tests.
 *
 * WHY USE FIXTURES?
 * - DRY: Write setup logic once, use in many tests
 * - Isolation: Each test gets its own instance
 * - Composable: Fixtures can depend on other fixtures
 * - Type-safe: Full TypeScript support
 *
 * HOW TO USE:
 * Instead of importing { test } from '@playwright/test',
 * import { test } from '../fixtures' to get access to custom fixtures.
 *
 * Example:
 * ```
 * test('my test', async ({ page, authenticatedUser, testData }) => {
 *   // authenticatedUser is already logged in
 *   // testData contains seeded database records
 * })
 * ```
 */

/* eslint-disable react-hooks/rules-of-hooks */
import { test as base, expect } from '@playwright/test'
import type { MockUser } from '../mocks/clerk.mock'
import { mockClerkAuth, setupLocalStorageAuth, TEST_USERS } from '../mocks/clerk.mock'
import { setupStripeTestMode } from '../mocks/stripe.mock'
import type { TestData } from '../utils/test-database'
import { seedTestData } from '../utils/test-database'

// Import page objects (we'll create these next)
// import { HomePage } from '../pages/home.page'
// import { ProductsPage } from '../pages/products.page'
// ... etc

/**
 * Custom Test Fixtures Type Definition
 *
 * This defines all the custom fixtures available in our tests.
 * TypeScript will provide autocomplete and type checking for these.
 */
export type TestFixtures = {
  // ============================================
  // AUTHENTICATION FIXTURES
  // ============================================

  /**
   * A regular authenticated user
   * Use when testing user features (cart, checkout, orders)
   */
  authenticatedUser: MockUser

  /**
   * An admin authenticated user
   * Use when testing admin features (product/order management)
   */
  adminUser: MockUser

  // ============================================
  // DATA FIXTURES
  // ============================================

  /**
   * Test data seeded in the database
   * Contains categories, products, and users
   */
  testData: TestData

  // ============================================
  // UTILITY FIXTURES
  // ============================================

  /**
   * Stripe mocking already set up
   * Use for checkout flow tests
   */
  stripeMocked: void

  /**
   * Clear localStorage between tests
   */
  cleanLocalStorage: void
}

/**
 * Worker-level fixtures
 *
 * These are shared across all tests in a single worker process.
 * Use for expensive setup that should only run once per worker.
 */
export type WorkerFixtures = {
  /**
   * Test data available at worker level
   * Seeded once, shared by all tests in the worker
   */
  workerTestData: TestData
}

/**
 * Extended Test Object
 *
 * This extends Playwright's test with our custom fixtures.
 * All fixtures are automatically set up before each test that uses them.
 */
export const test = base.extend<TestFixtures, WorkerFixtures>({
  // ============================================
  // WORKER-LEVEL FIXTURES
  // ============================================

  /**
   * Seed test data once per worker
   *
   * WHY WORKER SCOPE?
   * - Database seeding is slow
   * - Tests in the same worker can share the same data
   * - Data is reset between workers (via global setup)
   */
  workerTestData: [
    async ({}, use) => {
      // This runs once when the worker starts
      // Global setup already seeded data, so we just need to fetch it
      const data = await seedTestData()
      await use(data)
      // Worker cleanup (optional)
    },
    { scope: 'worker' },
  ],

  // ============================================
  // TEST-LEVEL FIXTURES
  // ============================================

  /**
   * Provide test data to individual tests
   *
   * This just passes through the worker-level data.
   * Each test gets the same data reference.
   */
  testData: async ({ workerTestData }, use) => {
    await use(workerTestData)
  },

  /**
   * Set up authenticated regular user
   *
   * WHAT THIS DOES:
   * 1. Sets up mock auth cookies
   * 2. Sets up localStorage auth state
   * 3. Returns the mock user object
   *
   * The test receives an already-authenticated context.
   */
  authenticatedUser: async ({ context, page }, use) => {
    const user = TEST_USERS.regular

    // Set up mock authentication
    await mockClerkAuth(context, user)

    // Navigate to home to initialize localStorage
    await page.goto('/')
    await setupLocalStorageAuth(page, user)

    // Provide the user to the test
    await use(user)

    // Cleanup after test (optional)
    // Auth will be reset by the next test anyway
  },

  /**
   * Set up authenticated admin user
   *
   * Same as authenticatedUser but with admin role.
   * Use for tests that require admin access.
   */
  adminUser: async ({ context, page }, use) => {
    const user = TEST_USERS.admin

    // Set up mock authentication
    await mockClerkAuth(context, user)

    // Navigate to home to initialize localStorage
    await page.goto('/')
    await setupLocalStorageAuth(page, user)

    // Provide the admin user to the test
    await use(user)
  },

  /**
   * Set up Stripe mocking
   *
   * Use this fixture when testing checkout flows.
   * Stripe will be mocked automatically.
   */
  stripeMocked: async ({ page }, use) => {
    await setupStripeTestMode(page)
    await use()
  },

  /**
   * Clear localStorage before test
   *
   * Useful for tests that need a clean slate.
   * Especially cart-related tests.
   */
  cleanLocalStorage: async ({ page }, use) => {
    // Navigate first to have access to localStorage
    await page.goto('/')

    // Clear all localStorage
    await page.evaluate(() => {
      localStorage.clear()
    })

    await use()
  },
})

/**
 * Re-export expect for convenience
 *
 * Tests can import both test and expect from this file:
 * import { test, expect } from '../fixtures'
 */
export { expect }

/**
 * Re-export useful types and utilities
 */
export { TEST_USERS, type MockUser } from '../mocks/clerk.mock'
export type { TestData } from '../utils/test-database'
