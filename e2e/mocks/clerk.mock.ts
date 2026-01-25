/**
 * Clerk Authentication Mocks
 *
 * This module provides utilities to mock Clerk authentication in tests.
 *
 * WHY MOCK AUTHENTICATION?
 * - Speed: Real auth flows are slow (network requests, UI interactions)
 * - Reliability: No dependency on external Clerk service
 * - Control: We can test any user state without real accounts
 * - Isolation: Tests don't affect each other's auth state
 *
 * HOW IT WORKS:
 * 1. We define mock users with specific roles (regular, admin)
 * 2. We inject these users via cookies/localStorage that our app recognizes
 * 3. The app's test mode checks for these test cookies and bypasses real auth
 */

import type { Page, BrowserContext } from '@playwright/test'

/**
 * Mock User Interface
 *
 * This matches the shape of Clerk's user object for the properties we use.
 * The publicMetadata.role property is how we determine admin access.
 */
export interface MockUser {
  id: string
  email: string
  firstName: string
  lastName: string
  publicMetadata: {
    role?: 'admin' | 'user'
  }
}

/**
 * Predefined Test Users
 *
 * These IDs MUST match what we seed in the test database.
 * This ensures the mocked auth user has corresponding database records.
 */
export const TEST_USERS = {
  /**
   * Regular user - can browse, add to cart, checkout
   * Cannot access admin routes
   */
  regular: {
    id: 'user_test_regular_123',
    email: 'testuser@example.com',
    firstName: 'Test',
    lastName: 'User',
    publicMetadata: { role: 'user' as const },
  } as MockUser,

  /**
   * Admin user - full access including admin dashboard
   * Can manage products, categories, and orders
   */
  admin: {
    id: 'user_test_admin_456',
    email: 'admin@example.com',
    firstName: 'Admin',
    lastName: 'User',
    publicMetadata: { role: 'admin' as const },
  } as MockUser,

  /**
   * Guest - no authentication
   * Used to test unauthenticated flows
   */
  guest: null,
} as const

/**
 * Mock Clerk Authentication via Cookies
 *
 * HOW THIS WORKS:
 * We set special cookies that our application recognizes in test mode.
 * When BYPASS_AUTH=true, the app checks for these cookies instead of
 * making real Clerk API calls.
 *
 * COOKIE STRUCTURE:
 * - __test_auth_user: JSON-encoded user object
 * - __test_auth_session: Session ID for the user
 *
 * @param context - Playwright browser context
 * @param user - Mock user to authenticate as (null for guest)
 */
export async function mockClerkAuth(
  context: BrowserContext,
  user: MockUser | null
): Promise<void> {
  if (!user) {
    // Clear any existing auth cookies for guest mode
    await context.clearCookies()
    return
  }

  // Set mock auth cookies
  await context.addCookies([
    {
      name: '__test_auth_user',
      value: encodeURIComponent(JSON.stringify(user)),
      domain: 'localhost',
      path: '/',
      httpOnly: false,
      secure: false,
      sameSite: 'Lax',
    },
    {
      name: '__test_auth_session',
      value: `test_session_${user.id}`,
      domain: 'localhost',
      path: '/',
      httpOnly: false,
      secure: false,
      sameSite: 'Lax',
    },
  ])
}

/**
 * Set up mock auth in localStorage
 *
 * Some parts of the app (like the cart store) check localStorage
 * for user information. This function sets up that state.
 *
 * @param page - Playwright page
 * @param user - Mock user
 */
export async function setupLocalStorageAuth(page: Page, user: MockUser | null): Promise<void> {
  if (!user) {
    // Clear auth-related localStorage for guest mode
    await page.evaluate(() => {
      localStorage.removeItem('__test_user')
      // Reset cart store to guest state
      const cartStore = JSON.parse(localStorage.getItem('cart-storage') || '{}')
      if (cartStore.state) {
        cartStore.state.lastSyncedUserId = null
        cartStore.state.hasEverSynced = false
        localStorage.setItem('cart-storage', JSON.stringify(cartStore))
      }
    })
    return
  }

  await page.evaluate((userData) => {
    // Set test user in localStorage
    localStorage.setItem('__test_user', JSON.stringify(userData))

    // Update cart store to recognize this user
    const cartStore = JSON.parse(localStorage.getItem('cart-storage') || '{}')
    cartStore.state = {
      ...cartStore.state,
      lastSyncedUserId: userData.id,
      hasEverSynced: true,
    }
    localStorage.setItem('cart-storage', JSON.stringify(cartStore))
  }, user)
}

/**
 * Intercept API requests and add mock auth headers
 *
 * For API route testing, we can intercept requests and add headers
 * that our server-side code recognizes in test mode.
 *
 * WHEN TO USE:
 * - Testing API routes that require authentication
 * - Testing admin-only endpoints
 *
 * @param page - Playwright page
 * @param user - Mock user for auth
 */
export async function interceptAPIWithAuth(page: Page, user: MockUser | null): Promise<void> {
  await page.route('**/api/**', async (route) => {
    const request = route.request()

    if (user) {
      // Add mock auth headers to API requests
      await route.continue({
        headers: {
          ...request.headers(),
          'x-test-user-id': user.id,
          'x-test-user-role': user.publicMetadata.role || 'user',
          'x-test-user-email': user.email,
        },
      })
    } else {
      // No auth - continue without modification
      await route.continue()
    }
  })
}

/**
 * Clear all authentication state
 *
 * USE BETWEEN TESTS to ensure clean state
 *
 * @param context - Browser context
 * @param page - Optional page for localStorage cleanup
 */
export async function clearAuthState(context: BrowserContext, page?: Page): Promise<void> {
  await context.clearCookies()

  if (page) {
    await page.evaluate(() => {
      localStorage.removeItem('__test_user')
      // Don't fully clear cart - just reset auth state
      const cartStore = JSON.parse(localStorage.getItem('cart-storage') || '{}')
      if (cartStore.state) {
        cartStore.state.lastSyncedUserId = null
        localStorage.setItem('cart-storage', JSON.stringify(cartStore))
      }
    })
  }
}

/**
 * Check if current page shows user as authenticated
 *
 * Useful for asserting auth state in tests
 *
 * @param page - Playwright page
 * @returns true if user appears logged in
 */
export async function isUserAuthenticated(page: Page): Promise<boolean> {
  // Check for Clerk's UserButton (visible when logged in)
  const userButton = page.locator('.cl-userButton-root')
  const signInButton = page.getByRole('button', { name: 'Sign In' })

  // If UserButton is visible and SignIn is not, user is authenticated
  const isUserButtonVisible = await userButton.isVisible().catch(() => false)
  const isSignInVisible = await signInButton.isVisible().catch(() => false)

  return isUserButtonVisible && !isSignInVisible
}
