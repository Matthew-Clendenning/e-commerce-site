/**
 * Checkout Page Object
 *
 * Represents the /checkout page for reviewing and placing orders.
 *
 * KEY FEATURES TESTED:
 * - Order summary display
 * - Customer information
 * - Proceed to payment flow
 * - Error handling
 * - Authentication requirement
 */

import { Page, Locator, expect } from '@playwright/test'
import { BasePage } from './base.page'

export class CheckoutPage extends BasePage {
  // ============================================
  // PAGE-SPECIFIC ELEMENTS
  // ============================================

  /** Page heading */
  readonly heading: Locator

  /** Order summary section */
  readonly orderSummary: Locator
  readonly orderItems: Locator

  /** Price breakdown */
  readonly subtotal: Locator
  readonly tax: Locator
  readonly total: Locator

  /** Customer info section */
  readonly customerInfo: Locator
  readonly customerEmail: Locator
  readonly customerName: Locator

  /** Checkout button */
  readonly proceedToPaymentButton: Locator

  /** Error display */
  readonly errorMessage: Locator

  /** Loading state */
  readonly loadingIndicator: Locator

  constructor(page: Page) {
    super(page)

    // Page structure (based on checkout/page.tsx)
    this.heading = page.getByRole('heading', { name: 'Checkout' })

    // Order summary
    this.orderSummary = page.locator('[class*="orderSummary"]')
    // Get direct child divs of items container (these are the individual item cards)
    // The items container has class ending in "items", we want its direct div children
    this.orderItems = this.orderSummary.locator('[class*="items"] > div')

    // Price breakdown
    this.subtotal = page.locator('text=Subtotal').locator('..').locator('span').last()
    this.tax = page.locator('text=Tax').locator('..').locator('span').last()
    this.total = page.locator('[class*="finalTotal"]').locator('span').last()

    // Customer info
    this.customerInfo = page.locator('[class*="customerInfo"]')
    this.customerEmail = page.locator('[class*="infoRow"]').filter({ hasText: 'Email' }).locator('span').last()
    this.customerName = page.locator('[class*="infoRow"]').filter({ hasText: 'Name' }).locator('span').last()

    // Actions
    this.proceedToPaymentButton = page.getByRole('button', { name: /Proceed to Payment|Processing/i })

    // States
    this.errorMessage = page.locator('[class*="error"]')
    this.loadingIndicator = page.locator('text=Loading')
  }

  // ============================================
  // NAVIGATION
  // ============================================

  /**
   * Navigate to checkout page
   */
  async goto(): Promise<void> {
    await this.page.goto('/checkout')
    await this.waitForPageLoad()
  }

  // ============================================
  // ORDER SUMMARY METHODS
  // ============================================

  /**
   * Get the number of items in the order
   */
  async getItemCount(): Promise<number> {
    return await this.orderItems.count()
  }

  /**
   * Get names of all items in the order
   */
  async getItemNames(): Promise<string[]> {
    const items = await this.orderItems.all()
    const names: string[] = []

    for (const item of items) {
      const name = await item.locator('h3').textContent()
      if (name) names.push(name.trim())
    }

    return names
  }

  /**
   * Check if a specific item is in the order
   */
  async hasItem(productName: string): Promise<boolean> {
    const item = this.orderItems.filter({ hasText: productName })
    return await item.isVisible()
  }

  /**
   * Get quantity of a specific item
   */
  async getItemQuantity(productName: string): Promise<number> {
    const item = this.orderItems.filter({ hasText: productName })
    const quantityText = await item.locator('text=Quantity').textContent()
    const match = quantityText?.match(/(\d+)/)
    return match ? parseInt(match[1], 10) : 0
  }

  // ============================================
  // PRICE METHODS
  // ============================================

  /**
   * Get subtotal amount
   */
  async getSubtotal(): Promise<number> {
    const text = await this.subtotal.textContent()
    return parseFloat(text?.replace(/[^0-9.]/g, '') || '0')
  }

  /**
   * Get tax amount
   */
  async getTax(): Promise<number> {
    const text = await this.tax.textContent()
    return parseFloat(text?.replace(/[^0-9.]/g, '') || '0')
  }

  /**
   * Get total amount
   */
  async getTotal(): Promise<number> {
    const text = await this.total.textContent()
    return parseFloat(text?.replace(/[^0-9.]/g, '') || '0')
  }

  // ============================================
  // CUSTOMER INFO METHODS
  // ============================================

  /**
   * Get displayed customer email
   */
  async getCustomerEmail(): Promise<string> {
    return (await this.customerEmail.textContent()) || ''
  }

  /**
   * Get displayed customer name
   */
  async getCustomerName(): Promise<string> {
    return (await this.customerName.textContent()) || ''
  }

  // ============================================
  // CHECKOUT ACTIONS
  // ============================================

  /**
   * Click proceed to payment button
   */
  async proceedToPayment(): Promise<void> {
    await expect(this.proceedToPaymentButton).toBeEnabled()
    await this.proceedToPaymentButton.click()
  }

  /**
   * Complete checkout and wait for redirect
   * Used with mocked Stripe
   */
  async completeCheckout(): Promise<void> {
    await this.proceedToPayment()

    // Wait for either Stripe redirect or success page
    await this.page.waitForURL(/stripe\.com|order\/success/, { timeout: 10000 })
  }

  /**
   * Check if checkout button is in processing state
   */
  async isProcessing(): Promise<boolean> {
    const text = await this.proceedToPaymentButton.textContent()
    return text?.toLowerCase().includes('processing') || false
  }

  // ============================================
  // ERROR HANDLING
  // ============================================

  /**
   * Check if an error is displayed
   */
  async hasError(): Promise<boolean> {
    return await this.errorMessage.isVisible()
  }

  /**
   * Get the error message text
   */
  async getErrorMessage(): Promise<string> {
    return (await this.errorMessage.textContent()) || ''
  }

  // ============================================
  // ASSERTIONS
  // ============================================

  /**
   * Assert checkout page is fully loaded
   */
  async expectLoaded(): Promise<void> {
    await expect(this.loadingIndicator).toBeHidden()
    await expect(this.heading).toBeVisible()
    await expect(this.orderSummary).toBeVisible()
  }

  /**
   * Assert loading state is shown
   */
  async expectLoading(): Promise<void> {
    await expect(this.loadingIndicator).toBeVisible()
  }

  /**
   * Assert specific item is in order
   */
  async expectItem(productName: string): Promise<void> {
    const item = this.orderItems.filter({ hasText: productName })
    await expect(item).toBeVisible()
  }

  /**
   * Assert total matches expected value
   */
  async expectTotal(expectedTotal: number): Promise<void> {
    await expect(this.total).toContainText(`$${expectedTotal.toFixed(2)}`)
  }

  /**
   * Assert error message is displayed
   */
  async expectError(message?: string): Promise<void> {
    await expect(this.errorMessage).toBeVisible()
    if (message) {
      await expect(this.errorMessage).toContainText(message)
    }
  }

  /**
   * Assert no error is displayed
   */
  async expectNoError(): Promise<void> {
    await expect(this.errorMessage).toBeHidden()
  }

  /**
   * Assert button is in processing state
   */
  async expectProcessingState(): Promise<void> {
    await expect(this.proceedToPaymentButton).toContainText(/Processing/i)
    await expect(this.proceedToPaymentButton).toBeDisabled()
  }

  /**
   * Assert button is ready
   */
  async expectReadyState(): Promise<void> {
    await expect(this.proceedToPaymentButton).toContainText(/Proceed to Payment/i)
    await expect(this.proceedToPaymentButton).toBeEnabled()
  }

  /**
   * Assert redirected to sign-in (for unauthenticated users)
   */
  async expectRedirectedToSignIn(): Promise<void> {
    await this.page.waitForURL(/sign-in.*redirect_url.*checkout/)
  }

  /**
   * Assert redirected to cart (empty cart)
   */
  async expectRedirectedToCart(): Promise<void> {
    await this.page.waitForURL('/cart')
  }
}
