/**
 * Base Page Object
 *
 * WHAT IS THE PAGE OBJECT MODEL (POM)?
 * POM is a design pattern that creates an abstraction layer over web pages.
 * Instead of interacting with raw selectors in tests, we use page objects
 * that expose meaningful methods and properties.
 *
 * WHY USE PAGE OBJECTS?
 * 1. Maintainability: If a selector changes, update one place, not every test
 * 2. Readability: Tests read like user stories (productsPage.filterByCategory('watches'))
 * 3. Reusability: Common actions are written once and shared
 * 4. Abstraction: Tests don't need to know implementation details
 *
 * STRUCTURE:
 * - Properties: Locators for page elements
 * - Methods: Actions you can perform on the page
 * - Assertions: Common checks specific to the page
 */

import { Page, Locator, expect } from '@playwright/test'

/**
 * Base Page Class
 *
 * All page objects extend this class to inherit common functionality.
 * This includes navigation elements, cart interactions, and toast handling.
 */
export abstract class BasePage {
  // ============================================
  // CORE PROPERTIES
  // ============================================

  /**
   * The Playwright page instance
   * Used for all browser interactions
   */
  readonly page: Page

  // ============================================
  // NAVIGATION ELEMENTS
  // These are present on every page (from Navigation.tsx)
  // ============================================

  readonly navigation: Locator
  readonly homeLink: Locator
  readonly productsLink: Locator
  readonly adminLink: Locator
  readonly cartButton: Locator
  readonly signInButton: Locator
  readonly userButton: Locator

  // ============================================
  // TOAST NOTIFICATION ELEMENTS
  // From Sonner toast library (in layout.tsx)
  // ============================================

  readonly toastContainer: Locator

  constructor(page: Page) {
    this.page = page

    // Navigation selectors (based on Navigation.tsx structure)
    this.navigation = page.locator('nav')
    this.homeLink = page.getByRole('link', { name: 'Home' })
    this.productsLink = page.getByRole('link', { name: 'Products' })
    this.adminLink = page.getByRole('link', { name: 'Admin' })
    this.cartButton = page.locator('[class*="cartButton"]')
    this.signInButton = page.getByRole('button', { name: /sign in/i })
    this.userButton = page.locator('.cl-userButton-root')

    // Sonner toast container
    this.toastContainer = page.locator('[data-sonner-toaster]')
  }

  // ============================================
  // ABSTRACT METHODS
  // Each page object must implement these
  // ============================================

  /**
   * Navigate to this page
   * Each page object defines its own URL
   * @param identifier - Optional identifier (e.g., slug, id) for pages that need it
   */
  abstract goto(identifier?: string): Promise<void>

  // ============================================
  // NAVIGATION METHODS
  // ============================================

  /**
   * Wait for the page to fully load
   * Waits for network requests to settle
   */
  async waitForPageLoad(): Promise<void> {
    await this.page.waitForLoadState('networkidle')
  }

  /**
   * Navigate to home page
   */
  async goToHome(): Promise<void> {
    await this.homeLink.click()
    await this.page.waitForURL('/')
  }

  /**
   * Navigate to products page
   */
  async goToProducts(): Promise<void> {
    await this.productsLink.click()
    await this.page.waitForURL('/products')
  }

  /**
   * Navigate to admin page (if visible)
   */
  async goToAdmin(): Promise<void> {
    await this.adminLink.click()
    await this.page.waitForURL('/admin')
  }

  // ============================================
  // CART METHODS
  // ============================================

  /**
   * Get the current cart item count
   * Returns 0 if badge is not visible
   */
  async getCartCount(): Promise<number> {
    const badge = this.cartButton.locator('span')

    // Check if badge exists
    if ((await badge.count()) === 0) {
      return 0
    }

    const text = await badge.textContent()

    // Handle "99+" display
    if (text?.includes('+')) {
      return 100 // Or parse the number before +
    }

    return parseInt(text || '0', 10)
  }

  /**
   * Open the cart sidebar
   */
  async openCart(): Promise<void> {
    await this.cartButton.click()
    // Wait for sidebar to be visible
    await expect(this.page.locator('[class*="sidebar"]')).toBeVisible()
  }

  // ============================================
  // AUTHENTICATION METHODS
  // ============================================

  /**
   * Check if user appears to be signed in
   * Based on presence of UserButton vs SignIn button
   */
  async isSignedIn(): Promise<boolean> {
    // In real Clerk, UserButton is visible when signed in
    // Our mock might show something different
    const isUserButtonVisible = await this.userButton.isVisible().catch(() => false)
    return isUserButtonVisible
  }

  /**
   * Check if Admin link is visible (user has admin role)
   */
  async isAdmin(): Promise<boolean> {
    return await this.adminLink.isVisible()
  }

  /**
   * Click sign in button (when not authenticated)
   */
  async clickSignIn(): Promise<void> {
    await this.signInButton.click()
  }

  // ============================================
  // TOAST NOTIFICATION METHODS
  // ============================================

  /**
   * Assert that a toast with specific message appears
   *
   * @param message - The message to look for (partial match)
   * @param type - Optional toast type (success, error, info)
   */
  async expectToast(message: string, type?: 'success' | 'error' | 'info'): Promise<void> {
    const toast = this.page.locator('[data-sonner-toast]').filter({ hasText: message })

    await expect(toast).toBeVisible({ timeout: 5000 })

    // Optionally check toast type via data attribute
    if (type) {
      await expect(toast).toHaveAttribute('data-type', type)
    }
  }

  /**
   * Wait for toast to disappear
   * Useful when testing multiple sequential actions
   */
  async waitForToastToDismiss(): Promise<void> {
    await expect(this.page.locator('[data-sonner-toast]')).toBeHidden({ timeout: 6000 })
  }

  /**
   * Assert no toast is currently visible
   */
  async expectNoToast(): Promise<void> {
    await expect(this.page.locator('[data-sonner-toast]')).toBeHidden()
  }

  // ============================================
  // UTILITY METHODS
  // ============================================

  /**
   * Get current URL path (without base URL)
   */
  async getCurrentPath(): Promise<string> {
    const url = new URL(this.page.url())
    return url.pathname
  }

  /**
   * Take a screenshot (useful for debugging)
   *
   * @param name - Screenshot filename
   */
  async screenshot(name: string): Promise<void> {
    await this.page.screenshot({ path: `test-results/screenshots/${name}.png` })
  }

  /**
   * Wait for a specific URL pattern
   *
   * @param urlPattern - String or regex to match
   */
  async waitForUrl(urlPattern: string | RegExp): Promise<void> {
    await this.page.waitForURL(urlPattern)
  }
}
