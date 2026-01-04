/**
 * Cart Sidebar Component Helper
 *
 * Provides methods for interacting with the cart sidebar (CartSidebar.tsx).
 *
 * KEY INTERACTIONS TESTED:
 * - Opening/closing sidebar
 * - Adding/removing items
 * - Updating quantities
 * - Proceeding to checkout
 * - Clearing cart
 */

import { Page, Locator, expect } from '@playwright/test'

export class CartSidebarComponent {
  readonly page: Page

  // ============================================
  // COMPONENT ELEMENTS
  // ============================================

  /** Sidebar container */
  readonly sidebar: Locator

  /** Backdrop overlay (for clicking outside to close) */
  readonly backdrop: Locator

  /** Close button (X) */
  readonly closeButton: Locator

  /** Cart items container */
  readonly itemsContainer: Locator

  /** Individual cart items */
  readonly cartItems: Locator

  /** Empty cart state */
  readonly emptyState: Locator

  /** Subtotal display */
  readonly subtotal: Locator

  /** Checkout button */
  readonly checkoutButton: Locator

  /** Clear cart button */
  readonly clearCartButton: Locator

  /** Continue shopping button (shown when empty) */
  readonly continueShoppingButton: Locator

  constructor(page: Page) {
    this.page = page

    // Sidebar structure (based on CartSidebar.tsx)
    this.sidebar = page.locator('aside[role="dialog"]')
    this.backdrop = page.locator('[class*="backdrop"]')
    // Close button is INSIDE the sidebar (not the backdrop)
    this.closeButton = this.sidebar.locator('button[aria-label="Close cart"]')

    // Cart content
    this.itemsContainer = page.locator('[class*="items"]')
    this.cartItems = page.locator('[class*="cartItem"]')

    // States
    this.emptyState = page.locator('text=Your cart is empty')

    // Actions - use totalPrice specifically (in the sidebar summary, not item subtotals)
    this.subtotal = this.sidebar.locator('[class*="totalPrice"]')
    this.checkoutButton = page.getByRole('link', { name: /Checkout|Proceed/i })
    this.clearCartButton = page.getByRole('button', { name: /Clear/i })
    this.continueShoppingButton = page.getByRole('button', { name: /Continue Shopping/i })
  }

  // ============================================
  // SIDEBAR STATE
  // ============================================

  /**
   * Check if sidebar is currently open
   */
  async isOpen(): Promise<boolean> {
    return await this.sidebar.isVisible()
  }

  /**
   * Check if cart is empty
   */
  async isEmpty(): Promise<boolean> {
    return await this.emptyState.isVisible()
  }

  // ============================================
  // OPENING/CLOSING
  // ============================================

  /**
   * Close sidebar by clicking X button
   */
  async close(): Promise<void> {
    await this.closeButton.click()
    await expect(this.sidebar).toBeHidden()
  }

  /**
   * Close sidebar by clicking backdrop
   */
  async closeWithBackdrop(): Promise<void> {
    // Click on the edge of the backdrop, not the sidebar
    await this.backdrop.click({ position: { x: 10, y: 100 } })
    await expect(this.sidebar).toBeHidden()
  }

  /**
   * Close sidebar by pressing Escape key
   */
  async closeWithEscape(): Promise<void> {
    await this.page.keyboard.press('Escape')
    await expect(this.sidebar).toBeHidden()
  }

  // ============================================
  // CART ITEM METHODS
  // ============================================

  /**
   * Get number of items in cart
   */
  async getItemCount(): Promise<number> {
    return await this.cartItems.count()
  }

  /**
   * Get a specific cart item by product name
   */
  getItem(productName: string): Locator {
    return this.cartItems.filter({ hasText: productName })
  }

  /**
   * Check if a specific product is in the cart
   */
  async hasItem(productName: string): Promise<boolean> {
    return await this.getItem(productName).isVisible()
  }

  /**
   * Get quantity of a specific item
   */
  async getItemQuantity(productName: string): Promise<number> {
    const item = this.getItem(productName)
    // Use span to avoid matching quantityButton or quantityControl
    const quantityEl = item.locator('span[class*="quantity"]')
    const text = await quantityEl.textContent()
    return parseInt(text || '0', 10)
  }

  /**
   * Increment item quantity
   */
  async incrementItem(productName: string): Promise<void> {
    const item = this.getItem(productName)
    const incrementBtn = item.locator('button[aria-label="Increase quantity"]')
    await incrementBtn.click()
  }

  /**
   * Decrement item quantity
   */
  async decrementItem(productName: string): Promise<void> {
    const item = this.getItem(productName)
    const decrementBtn = item.locator('button[aria-label="Decrease quantity"]')
    await decrementBtn.click()
  }

  /**
   * Remove item from cart (trash button)
   */
  async removeItem(productName: string): Promise<void> {
    const item = this.getItem(productName)
    const removeBtn = item.locator('button[aria-label="Remove from cart"]')
    await removeBtn.click()
  }

  /**
   * Get all item names in cart
   */
  async getItemNames(): Promise<string[]> {
    const items = await this.cartItems.all()
    const names: string[] = []

    for (const item of items) {
      const nameEl = item.locator('[class*="name"] a')
      const name = await nameEl.textContent()
      if (name) names.push(name.trim())
    }

    return names
  }

  // ============================================
  // TOTALS
  // ============================================

  /**
   * Get subtotal amount
   */
  async getSubtotal(): Promise<number> {
    const text = await this.subtotal.textContent()
    return parseFloat(text?.replace(/[^0-9.]/g, '') || '0')
  }

  // ============================================
  // ACTIONS
  // ============================================

  /**
   * Click checkout button
   */
  async proceedToCheckout(): Promise<void> {
    await this.checkoutButton.click()
    await this.page.waitForURL('/checkout')
  }

  /**
   * Clear all items from cart
   */
  async clearCart(): Promise<void> {
    await this.clearCartButton.click()
    // Wait for empty state
    await expect(this.emptyState).toBeVisible()
  }

  /**
   * Click continue shopping (from empty state)
   */
  async continueShopping(): Promise<void> {
    await this.continueShoppingButton.click()
    await expect(this.sidebar).toBeHidden()
  }

  // ============================================
  // ASSERTIONS
  // ============================================

  /**
   * Assert sidebar is visible
   */
  async expectOpen(): Promise<void> {
    await expect(this.sidebar).toBeVisible()
  }

  /**
   * Assert sidebar is hidden
   */
  async expectClosed(): Promise<void> {
    await expect(this.sidebar).toBeHidden()
  }

  /**
   * Assert cart is empty
   */
  async expectEmpty(): Promise<void> {
    await expect(this.emptyState).toBeVisible()
    await expect(this.checkoutButton).toBeHidden()
  }

  /**
   * Assert cart has items
   */
  async expectNotEmpty(): Promise<void> {
    await expect(this.emptyState).toBeHidden()
    await expect(this.cartItems.first()).toBeVisible()
  }

  /**
   * Assert specific item count
   */
  async expectItemCount(count: number): Promise<void> {
    await expect(this.cartItems).toHaveCount(count)
  }

  /**
   * Assert item is in cart
   */
  async expectItem(productName: string): Promise<void> {
    await expect(this.getItem(productName)).toBeVisible()
  }

  /**
   * Assert item is NOT in cart
   */
  async expectNoItem(productName: string): Promise<void> {
    await expect(this.getItem(productName)).toBeHidden()
  }

  /**
   * Assert item has specific quantity
   */
  async expectItemQuantity(productName: string, quantity: number): Promise<void> {
    const item = this.getItem(productName)
    // Use span to avoid matching quantityButton or quantityControl
    const quantityEl = item.locator('span[class*="quantity"]')
    await expect(quantityEl).toHaveText(`${quantity}`)
  }

  /**
   * Assert subtotal matches expected value
   */
  async expectSubtotal(expectedSubtotal: number): Promise<void> {
    await expect(this.subtotal).toContainText(`$${expectedSubtotal.toFixed(2)}`)
  }

  /**
   * Assert increment button is disabled (max stock reached)
   */
  async expectIncrementDisabled(productName: string): Promise<void> {
    const item = this.getItem(productName)
    const incrementBtn = item.locator('button[aria-label="Increase quantity"]')
    await expect(incrementBtn).toBeDisabled()
  }

  /**
   * Assert stock warning is shown
   */
  async expectStockWarning(productName: string): Promise<void> {
    const item = this.getItem(productName)
    const warning = item.locator('[class*="stockWarning"]')
    await expect(warning).toBeVisible()
  }
}
