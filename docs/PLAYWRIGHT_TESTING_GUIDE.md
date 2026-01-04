# Playwright Testing Guide for E-Commerce Store

## Introduction

Welcome! This guide explains the Playwright testing setup I created for your e-commerce store. I've written it as if I were teaching you in person, explaining not just *what* each piece does, but *why* we built it this way.

By the end of this guide, you'll understand:
- Why we chose Playwright over other testing tools
- How each configuration option affects your tests
- The Page Object Model pattern and why it matters
- How fixtures provide dependency injection
- Authentication and payment mocking strategies
- Database testing best practices
- How to run, debug, and extend these tests

---

## Table of Contents

1. [Why Playwright?](#1-why-playwright)
2. [Project Structure](#2-project-structure)
3. [Configuration Deep Dive](#3-configuration-deep-dive)
4. [Page Object Model Pattern](#4-page-object-model-pattern)
5. [Fixtures Explained](#5-fixtures-explained)
6. [Authentication Mocking](#6-authentication-mocking)
7. [Database Testing Strategy](#7-database-testing-strategy)
8. [Stripe Payment Mocking](#8-stripe-payment-mocking)
9. [Writing Tests](#9-writing-tests)
10. [Running Tests](#10-running-tests)
11. [Debugging Tests](#11-debugging-tests)
12. [CI/CD Integration](#12-cicd-integration)
13. [Best Practices](#13-best-practices)
14. [Common Gotchas](#14-common-gotchas)

---

## 1. Why Playwright?

### Comparison with Other Tools

| Feature | Playwright | Cypress | Jest + Testing Library |
|---------|------------|---------|------------------------|
| **Browser Support** | Chromium, Firefox, WebKit | Chromium, Firefox, WebKit | JSDOM (simulated) |
| **Multi-tab/window** | ✅ Native | ❌ Limited | N/A |
| **Network Interception** | ✅ Powerful | ✅ Good | ❌ Manual mocking |
| **Speed** | ⚡ Fast (parallel) | 🐌 Slower (sequential) | ⚡ Very fast |
| **Real Browser** | ✅ Yes | ✅ Yes | ❌ No |
| **TypeScript** | ✅ First-class | ✅ Good | ✅ Good |
| **Auto-wait** | ✅ Built-in | ✅ Built-in | ❌ Manual |

### Why Playwright for Next.js?

1. **Real Browsers**: Tests run in actual Chrome, Firefox, and Safari - not simulations
2. **Auto-waiting**: Automatically waits for elements to be ready (no more `sleep()` calls!)
3. **Parallel Execution**: Tests run simultaneously across workers - 5x faster than sequential
4. **Network Interception**: Easily mock API responses, which is perfect for testing without hitting real Stripe
5. **Trace Viewer**: Record and replay test failures with screenshots at every step
6. **webServer Option**: Automatically starts your Next.js dev server before tests

---

## 2. Project Structure

Here's what I created and why:

```
e2e/
├── fixtures/           # Dependency injection for tests
│   └── index.ts        # Combined fixtures (auth, data, pages)
│
├── mocks/              # Fake implementations of external services
│   ├── clerk.mock.ts   # Authentication mocking
│   └── stripe.mock.ts  # Payment mocking
│
├── pages/              # Page Object Models
│   ├── base.page.ts    # Common functionality (navigation, toasts)
│   ├── products.page.ts
│   ├── product-detail.page.ts
│   ├── checkout.page.ts
│   └── admin.page.ts
│
├── components/         # Component-level helpers
│   └── cart-sidebar.component.ts
│
├── tests/              # Actual test files
│   ├── smoke/          # Quick sanity checks
│   ├── pages/          # Page-specific tests
│   ├── components/     # Component interaction tests
│   ├── api/            # API endpoint tests
│   └── e2e/            # Full user journey tests
│
├── utils/              # Helper utilities
│   └── test-database.ts
│
├── global-setup.ts     # Runs once before ALL tests
└── global-teardown.ts  # Runs once after ALL tests
```

### Why This Structure?

**Separation of Concerns**: Each folder has one job:
- `fixtures/` - Setup and teardown logic
- `mocks/` - Fake external services
- `pages/` - Page interactions
- `tests/` - Test specifications

**Scalability**: As your app grows, add new pages to `pages/`, new tests to `tests/`. The structure scales naturally.

**Maintainability**: When a selector changes, you update ONE file (the page object), not every test that uses that element.

---

## 3. Configuration Deep Dive

Let's walk through `playwright.config.ts` line by line:

```typescript
// playwright.config.ts

import { defineConfig, devices } from '@playwright/test'
import path from 'path'
import dotenv from 'dotenv'

// Load test environment variables from .env.test
dotenv.config({ path: '.env.test' })
```

**Why load .env.test?** We use different configuration for tests:
- Separate test database
- Test mode flags
- Mock API keys

```typescript
export default defineConfig({
  testDir: './e2e/tests',  // Where to find test files
```

**testDir**: Playwright only looks here for `*.spec.ts` files. Keeps test code separate from page objects.

```typescript
  fullyParallel: true,
```

**fullyParallel**: Tests run simultaneously! If you have 10 tests and 4 CPU cores, 4 tests run at once. This makes your test suite 4x faster.

**Important**: Tests must be independent! If Test A assumes Test B ran first, parallel execution breaks them.

```typescript
  forbidOnly: !!process.env.CI,
```

**forbidOnly**: In CI, if someone accidentally left `test.only()` in the code, the build fails. This prevents "I thought all tests passed" when really only one test ran.

```typescript
  retries: process.env.CI ? 2 : 0,
```

**retries**: In CI, retry failed tests twice. This handles "flaky" tests that sometimes fail due to timing issues. Locally, we want immediate feedback, so no retries.

```typescript
  workers: process.env.CI ? 1 : undefined,
```

**workers**: In CI, use 1 worker (sequential execution). This is more reliable but slower. Locally, use all available CPU cores (undefined = auto-detect).

**Why single worker in CI?** CI machines often have limited resources. Parallel tests might fight for memory/CPU and cause false failures.

```typescript
  webServer: {
    command: 'npm run dev:test',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
```

**webServer**: This is magic! Playwright:
1. Runs `npm run dev:test` to start your Next.js server
2. Waits until `localhost:3000` responds
3. Then runs tests
4. Kills the server when done

**reuseExistingServer**: Locally, if you already have `npm run dev` running, Playwright uses it. In CI, always start fresh.

```typescript
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
    { name: 'Mobile Chrome', use: { ...devices['Pixel 5'] } },
    { name: 'Mobile Safari', use: { ...devices['iPhone 12'] } },
  ],
```

**projects**: Each project is a different browser/device configuration. Your tests run on ALL of them. This catches browser-specific bugs.

**devices**: Pre-configured device settings (viewport size, user agent, touch support, etc.)

---

## 4. Page Object Model Pattern

### The Problem Without Page Objects

```typescript
// BAD: Selectors scattered everywhere
test('add to cart', async ({ page }) => {
  await page.click('[class*="addToCart"]')
  await page.click('[class*="sidebar"] button:has-text("+")')
  await expect(page.locator('[class*="quantity"]')).toContainText('2')
})
```

**Problems**:
1. If `.addToCart` changes to `.add-to-cart-btn`, you update 50 tests
2. Hard to understand what the test does
3. Duplicate selectors across tests

### The Solution: Page Objects

```typescript
// GOOD: Page object encapsulates selectors
class ProductDetailPage {
  readonly addToCartButton: Locator

  constructor(page: Page) {
    this.addToCartButton = page.locator('[class*="addToCart"]')
  }

  async addToCart(): Promise<void> {
    await this.addToCartButton.click()
  }
}

// Test is now readable
test('add to cart', async ({ page }) => {
  const productPage = new ProductDetailPage(page)
  await productPage.addToCart()
})
```

**Benefits**:
1. Selector changes? Update ONE place
2. Tests read like user stories
3. IDE autocomplete shows available actions

### Anatomy of a Page Object

```typescript
export class ProductsPage extends BasePage {
  // 1. LOCATORS: Define elements once
  readonly heading: Locator
  readonly productCards: Locator
  readonly filterButtons: Locator

  constructor(page: Page) {
    super(page)
    // 2. SELECTORS: How to find elements
    this.heading = page.getByRole('heading', { level: 1 })
    this.productCards = page.locator('[class*="productCard"]')
    this.filterButtons = page.locator('[class*="filters"] button')
  }

  // 3. NAVIGATION: How to get to this page
  async goto(): Promise<void> {
    await this.page.goto('/products')
  }

  // 4. ACTIONS: Things users can do
  async filterByCategory(name: string): Promise<void> {
    await this.filterButtons.filter({ hasText: name }).click()
  }

  // 5. QUERIES: Get information from the page
  async getProductCount(): Promise<number> {
    return await this.productCards.count()
  }

  // 6. ASSERTIONS: Verify page state
  async expectProductVisible(name: string): Promise<void> {
    await expect(this.productCards.filter({ hasText: name })).toBeVisible()
  }
}
```

---

## 5. Fixtures Explained

### What Are Fixtures?

Fixtures are Playwright's way of doing dependency injection for tests. Instead of setting up test data in `beforeEach`, you declare what you need and Playwright provides it.

### Without Fixtures (Old Way)

```typescript
test.describe('Cart tests', () => {
  let testData: TestData

  test.beforeEach(async () => {
    testData = await seedDatabase()
    await mockAuth()
  })

  test('test 1', async () => {
    // Use testData
  })
})
```

**Problems**:
- Verbose setup in every describe block
- Easy to forget setup
- Hard to share between files

### With Fixtures (Better Way)

```typescript
// Define fixture once in fixtures/index.ts
export const test = base.extend<{ testData: TestData }>({
  testData: async ({}, use) => {
    const data = await seedTestData()
    await use(data)  // Provide to test
    // Cleanup happens here
  },
})

// Use in any test file
test('test 1', async ({ testData }) => {
  // testData is automatically provided!
})
```

### How Fixtures Work

```typescript
testData: async ({ }, use) => {
  // SETUP: Runs before test
  const data = await seedTestData()

  await use(data)  // TEST RUNS HERE with `data` available

  // TEARDOWN: Runs after test (even if test fails)
  await cleanupData()
}
```

The `use()` function is the magic. Everything before it is setup, everything after is teardown.

### Fixture Scopes

```typescript
// TEST scope (default): Fresh instance for each test
testData: async ({}, use) => { ... }

// WORKER scope: Shared across all tests in a worker process
workerTestData: [
  async ({}, use) => { ... },
  { scope: 'worker' }
]
```

**Use worker scope** for expensive setup that doesn't change between tests (like seeding a database).

### Fixture Dependencies

Fixtures can depend on other fixtures:

```typescript
// authenticatedUser depends on context and page
authenticatedUser: async ({ context, page }, use) => {
  await mockClerkAuth(context, TEST_USERS.regular)
  await page.goto('/')
  await use(TEST_USERS.regular)
}
```

---

## 6. Authentication Mocking

### Why Mock Authentication?

Real Clerk authentication:
- Requires network requests (slow)
- Needs real accounts (maintenance)
- Can fail due to rate limits
- Can't test edge cases easily

Mocked authentication:
- Instant (no network)
- Full control over user state
- Test any role (admin, guest, banned user)
- Reliable and deterministic

### How Our Mock Works

```typescript
// e2e/mocks/clerk.mock.ts

export const TEST_USERS = {
  regular: {
    id: 'user_test_regular_123',
    email: 'testuser@example.com',
    publicMetadata: { role: 'user' },
  },
  admin: {
    id: 'user_test_admin_456',
    email: 'admin@example.com',
    publicMetadata: { role: 'admin' },
  },
}
```

**Important**: These IDs MUST match what you seed in the test database. The mock user needs a corresponding database record.

### The Mock Process

1. **Set cookies** that our app recognizes in test mode
2. **Set localStorage** for client-side state
3. App code checks for test cookies and skips real Clerk

```typescript
export async function mockClerkAuth(context: BrowserContext, user: MockUser): Promise<void> {
  await context.addCookies([
    {
      name: '__test_auth_user',
      value: encodeURIComponent(JSON.stringify(user)),
      domain: 'localhost',
      path: '/',
    },
  ])
}
```

### When to Use Real Auth

For most tests, mock auth is fine. Use real Clerk testing for:
- Testing the actual sign-in flow
- Verifying OAuth integrations
- Testing session expiration
- One-time verification that mocks match reality

---

## 7. Database Testing Strategy

### Why a Separate Test Database?

**Problem**: If tests use your development database:
- Tests might delete your dev data
- Dev data might cause tests to fail
- Can't reset to known state

**Solution**: Dedicated `ecommerce_test` database

### Our Strategy: Reset + Seed

```typescript
// Before all tests (global-setup.ts)
await resetDatabase()  // Clear everything
await seedTestData()   // Add known test data
```

### The Reset Function

```typescript
export async function resetDatabase(): Promise<void> {
  await prisma.$transaction([
    // Delete in order of dependencies (children first)
    prisma.orderItem.deleteMany(),
    prisma.order.deleteMany(),
    prisma.cartItem.deleteMany(),
    prisma.product.deleteMany(),
    prisma.category.deleteMany(),
    prisma.user.deleteMany(),
  ])
}
```

**Why this order?** Foreign keys! Can't delete a Category that has Products. Delete Products first.

### The Seed Function

```typescript
export async function seedTestData(): Promise<TestData> {
  // Create categories
  const watches = await prisma.category.create({
    data: { name: 'Test Watches', slug: 'test-watches' }
  })

  // Create products with specific IDs we can reference in tests
  const silverWatch = await prisma.product.create({
    data: {
      name: 'Test Silver Watch',
      slug: 'test-silver-watch',
      price: 199.99,
      stock: 10,
      categoryId: watches.id,
    }
  })

  // Return data so tests can reference it
  return {
    categories: { watches },
    products: [silverWatch, ...],
  }
}
```

### Test Data Best Practices

1. **Predictable names**: `Test Silver Watch` not `Watch 1`
2. **Cover edge cases**: Include out-of-stock item (stock: 0)
3. **Minimal but sufficient**: Don't seed 1000 products
4. **Documented**: Comments explain why each item exists

---

## 8. Stripe Payment Mocking

### Why Mock Stripe?

1. **Cost**: Even test mode Stripe calls add up
2. **Speed**: Stripe redirects take 5+ seconds
3. **Reliability**: No external dependency
4. **Control**: Test success, failure, timeout scenarios

### Our Mocking Strategy

```typescript
// Intercept the checkout API call
await page.route('**/api/checkout', async (route) => {
  // Instead of creating real Stripe session, return mock
  await route.fulfill({
    status: 200,
    body: JSON.stringify({
      sessionId: 'cs_test_mock_123',
      url: '/order/success?session_id=cs_test_mock_123',
    }),
  })
})
```

**What this does**:
- When app calls `/api/checkout`, intercept the request
- Return a fake response that skips Stripe entirely
- Redirect to success page immediately

### Testing Payment Failures

```typescript
export async function mockStripeCheckoutFailure(page: Page): Promise<void> {
  await page.route('**/api/checkout', async (route) => {
    await route.fulfill({
      status: 400,
      body: JSON.stringify({ error: 'Payment failed' }),
    })
  })
}
```

Now you can test how your app handles checkout errors!

---

## 9. Writing Tests

### Test Structure

```typescript
test.describe('Feature Area', () => {
  test.describe('Specific Scenario', () => {
    test('user action results in expected outcome', async ({ page }) => {
      // Arrange: Set up test state
      // Act: Perform user action
      // Assert: Verify result
    })
  })
})
```

### Good Test Names

```typescript
// BAD: Vague
test('products work', ...)

// GOOD: Specific action and outcome
test('filtering by category shows only products from that category', ...)
```

### Using Page Objects in Tests

```typescript
test('can add product to cart', async ({ page, testData }) => {
  // Create page objects
  const productsPage = new ProductsPage(page)
  const productDetailPage = new ProductDetailPage(page)
  const cartSidebar = new CartSidebarComponent(page)

  // Use page object methods
  await productsPage.goto()
  await productsPage.clickProduct(testData.products[0].name)
  await productDetailPage.addToCart()

  // Assert using page object helpers
  await cartSidebar.expectItem(testData.products[0].name)
})
```

---

## 10. Running Tests

### Basic Commands

```bash
# Run all tests
npm run test:e2e

# Run with UI mode (interactive)
npm run test:e2e:ui

# Run with browser visible
npm run test:e2e:headed

# Run specific test file
npx playwright test products.spec.ts

# Run tests matching pattern
npx playwright test -g "add to cart"

# Run only smoke tests
npx playwright test --grep @smoke
```

### Filtering Tests

```bash
# Only run chromium
npm run test:e2e:chromium

# Run specific project
npx playwright test --project=firefox

# Skip slow tests
npx playwright test --grep-invert @slow
```

### Viewing Reports

```bash
# Open last test report in browser
npm run test:e2e:report
```

---

## 11. Debugging Tests

### UI Mode (Best for Development)

```bash
npm run test:e2e:ui
```

This opens an interactive UI where you can:
- See tests in a tree view
- Watch tests run in real-time
- Time-travel through test steps
- Inspect DOM at each step
- Re-run failed tests

### Debug Mode

```bash
npm run test:e2e:debug
```

Opens browser DevTools and pauses at each Playwright command.

### Trace Viewer

When tests fail, Playwright records a trace. To view:

```bash
npx playwright show-trace test-results/test-name/trace.zip
```

The trace shows:
- Screenshots at every step
- Network requests
- Console logs
- Action timeline

### Adding Debug Output

```typescript
test('my test', async ({ page }) => {
  // Pause test and open inspector
  await page.pause()

  // Take screenshot
  await page.screenshot({ path: 'debug.png' })

  // Log to console
  console.log(await page.content())
})
```

---

## 12. CI/CD Integration

### GitHub Actions Workflow

The `.github/workflows/e2e-tests.yml` file:

1. **Starts PostgreSQL** as a service container
2. **Installs dependencies** with npm ci (faster than npm install)
3. **Installs only Chromium** (not all browsers - faster)
4. **Sets up database** with Prisma
5. **Runs tests** with environment variables
6. **Uploads reports** as artifacts

### Viewing CI Results

1. Go to GitHub Actions tab
2. Click on workflow run
3. Download `playwright-report` artifact
4. Unzip and open `index.html`

### When Tests Fail in CI

1. Download `test-results` artifact
2. Look for screenshots/videos of failure
3. Or download trace file and use Trace Viewer

---

## 13. Best Practices

### DO:

✅ **Use page objects** for all selectors
✅ **Use semantic selectors** (`getByRole`, `getByText`) over CSS classes
✅ **Test user behavior**, not implementation
✅ **Keep tests independent** - no shared state
✅ **Use fixtures** for setup/teardown
✅ **Write descriptive test names**
✅ **Test one thing per test**

### DON'T:

❌ **Don't use `sleep()`** - use Playwright's auto-waiting
❌ **Don't test external services** (mock them)
❌ **Don't share state between tests**
❌ **Don't test internal implementation details**
❌ **Don't write flaky tests** (fix or skip them)

### Selector Priority

1. `getByRole('button', { name: 'Submit' })` - Best: semantic, accessible
2. `getByText('Submit')` - Good: user-visible
3. `getByTestId('submit-btn')` - OK: stable, but not semantic
4. `locator('.submit-button')` - Avoid: tied to implementation
5. `locator('#submit')` - Avoid: IDs often change

---

## 14. Common Gotchas

### 1. Tests Pass Locally, Fail in CI

**Cause**: Timing differences, race conditions
**Solution**: Use proper waits, don't rely on animation timing

```typescript
// BAD
await page.click('button')
await page.waitForTimeout(1000)  // Hope modal opened

// GOOD
await page.click('button')
await expect(page.locator('.modal')).toBeVisible()  // Wait for modal
```

### 2. Flaky Tests

**Cause**: Network timing, animations, async operations
**Solution**: Use Playwright's built-in waiting

```typescript
// BAD
const count = await page.locator('.items').count()
expect(count).toBe(5)  // Might not be loaded yet!

// GOOD
await expect(page.locator('.items')).toHaveCount(5)  // Waits automatically
```

### 3. Tests Affect Each Other

**Cause**: Shared state (database, localStorage)
**Solution**: Reset state in fixtures, use worker-scoped fixtures carefully

### 4. Slow Tests

**Causes**:
- Too many full browser tests (use API tests where possible)
- Not running in parallel
- Waiting for animations

**Solutions**:
- Use `fullyParallel: true`
- Disable animations in test: `page.addStyleTag({ content: '* { animation: none !important; }' })`
- Mock slow API calls

### 5. Can't Find Element

**Cause**: Element not loaded, wrong selector, element in iframe
**Solution**: Use Playwright's locator picker in UI mode

```bash
npm run test:e2e:ui
# Click "Pick locator" button
# Click element in page
# Copy suggested selector
```

---

## Summary

You now have a complete testing setup with:
- **Playwright** for browser automation
- **Page Object Model** for maintainable selectors
- **Fixtures** for clean test setup
- **Mocked auth** for fast, reliable tests
- **Mocked Stripe** for payment flow testing
- **Separate test database** for isolation
- **CI/CD integration** for automated testing

### Next Steps

1. Run `npm run test:e2e:ui` to explore the tests
2. Add a new test in an existing spec file
3. Create a new page object for a page not yet covered
4. Run tests in CI via a pull request

Happy testing! 🎭
