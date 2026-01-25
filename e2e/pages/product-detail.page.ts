/**
 * Product Detail Page Object
 *
 * Represents the /products/[slug] page for viewing a single product.
 *
 * KEY FEATURES TESTED:
 * - Product information display
 * - Add to cart functionality
 * - Out of stock handling
 * - Breadcrumb navigation
 */

import type { Page, Locator } from '@playwright/test'
import { expect } from '@playwright/test'
import { BasePage } from './base.page'

export class ProductDetailPage extends BasePage {
  // ============================================
  // PAGE-SPECIFIC ELEMENTS
  // ============================================

  /** Product title (H1) */
  readonly productTitle: Locator

  /** Product price display */
  readonly productPrice: Locator

  /** Product description */
  readonly productDescription: Locator

  /** Stock status indicator */
  readonly stockStatus: Locator

  /** Add to cart button */
  readonly addToCartButton: Locator

  /** Product image */
  readonly productImage: Locator

  /** Category badge */
  readonly categoryBadge: Locator

  /** Breadcrumb navigation */
  readonly breadcrumb: Locator

  /** Features list */
  readonly featuresList: Locator

  constructor(page: Page) {
    super(page)

    // Product information selectors (based on products/[slug]/page.tsx)
    this.productTitle = page.locator('h1')
    this.productPrice = page.locator('[class*="price"]').first()
    this.productDescription = page.locator('[class*="description"]')
    this.stockStatus = page.locator('[class*="stock"]')
    this.productImage = page.locator('[class*="productImage"] img')
    this.categoryBadge = page.locator('[class*="category"]').first()
    this.breadcrumb = page.locator('[class*="breadcrumb"]')
    this.featuresList = page.locator('[class*="features"]')

    // Add to cart button (based on AddToCartButton.tsx)
    this.addToCartButton = page.locator('[class*="addToCart"]')
  }

  // ============================================
  // NAVIGATION
  // ============================================

  /**
   * Navigate to a specific product page
   *
   * @param slug - Product slug (e.g., 'test-silver-watch')
   */
  async goto(slug: string): Promise<void> {
    await this.page.goto(`/products/${slug}`)
    await this.waitForPageLoad()
  }

  // ============================================
  // PRODUCT INFORMATION METHODS
  // ============================================

  /**
   * Get the product title text
   */
  async getTitle(): Promise<string> {
    return (await this.productTitle.textContent()) || ''
  }

  /**
   * Get the product price as a number
   */
  async getPrice(): Promise<number> {
    const priceText = await this.productPrice.textContent()
    // Remove currency symbol and parse
    return parseFloat(priceText?.replace(/[^0-9.]/g, '') || '0')
  }

  /**
   * Get the product description
   */
  async getDescription(): Promise<string> {
    return (await this.productDescription.textContent()) || ''
  }

  /**
   * Get the current stock count
   */
  async getStockCount(): Promise<number> {
    const stockText = await this.stockStatus.textContent()
    // Parse "10 available" or similar
    const match = stockText?.match(/(\d+)/)
    return match ? parseInt(match[1], 10) : 0
  }

  /**
   * Check if product is in stock
   */
  async isInStock(): Promise<boolean> {
    const stockText = await this.stockStatus.textContent()
    return stockText?.toLowerCase().includes('in stock') || false
  }

  /**
   * Check if product is out of stock
   */
  async isOutOfStock(): Promise<boolean> {
    const stockText = await this.stockStatus.textContent()
    return stockText?.toLowerCase().includes('out of stock') || false
  }

  // ============================================
  // ADD TO CART METHODS
  // ============================================

  /**
   * Click the add to cart button
   * Does not wait for completion
   */
  async clickAddToCart(): Promise<void> {
    await expect(this.addToCartButton).toBeEnabled()
    await this.addToCartButton.click()
  }

  /**
   * Add to cart and wait for success
   * Waits for button to return to normal state
   */
  async addToCart(): Promise<void> {
    await this.clickAddToCart()

    // Wait for "Adding..." state
    await expect(this.addToCartButton).toContainText(/Adding/i)

    // Wait for button to return to normal
    await expect(this.addToCartButton).toContainText(/Add to cart/i, { timeout: 5000 })
  }

  /**
   * Add to cart and verify toast
   * Complete flow with toast confirmation
   */
  async addToCartWithConfirmation(): Promise<void> {
    const title = await this.getTitle()
    await this.addToCart()
    await this.expectToast(`${title} added to cart`)
  }

  /**
   * Check if add to cart button is enabled
   */
  async isAddToCartEnabled(): Promise<boolean> {
    return await this.addToCartButton.isEnabled()
  }

  /**
   * Check if add to cart button shows "Out of stock"
   */
  async isAddToCartDisabledOutOfStock(): Promise<boolean> {
    const text = await this.addToCartButton.textContent()
    const isDisabled = await this.addToCartButton.isDisabled()
    return isDisabled && (text?.toLowerCase().includes('out of stock') || false)
  }

  // ============================================
  // ASSERTIONS
  // ============================================

  /**
   * Assert product title matches
   */
  async expectTitle(expectedTitle: string): Promise<void> {
    await expect(this.productTitle).toContainText(expectedTitle)
  }

  /**
   * Assert product price matches
   */
  async expectPrice(expectedPrice: number): Promise<void> {
    await expect(this.productPrice).toContainText(`$${expectedPrice.toFixed(2)}`)
  }

  /**
   * Assert product is in stock
   */
  async expectInStock(): Promise<void> {
    await expect(this.stockStatus).toContainText(/in stock/i)
    await expect(this.addToCartButton).toBeEnabled()
  }

  /**
   * Assert product is out of stock
   */
  async expectOutOfStock(): Promise<void> {
    await expect(this.stockStatus).toContainText(/out of stock/i)
    await expect(this.addToCartButton).toBeDisabled()
    await expect(this.addToCartButton).toContainText(/out of stock/i)
  }

  /**
   * Assert breadcrumb shows correct path
   */
  async expectBreadcrumb(items: string[]): Promise<void> {
    for (const item of items) {
      await expect(this.breadcrumb).toContainText(item)
    }
  }

  /**
   * Assert category badge shows correct category
   */
  async expectCategory(categoryName: string): Promise<void> {
    await expect(this.categoryBadge).toContainText(categoryName)
  }

  /**
   * Assert add to cart button is in adding state
   */
  async expectAddingState(): Promise<void> {
    await expect(this.addToCartButton).toContainText(/Adding/i)
    await expect(this.addToCartButton).toBeDisabled()
  }

  /**
   * Assert add to cart button is in normal state
   */
  async expectReadyToAddState(): Promise<void> {
    await expect(this.addToCartButton).toContainText(/Add to cart/i)
    await expect(this.addToCartButton).toBeEnabled()
  }

  // ============================================
  // BREADCRUMB NAVIGATION
  // ============================================

  /**
   * Click a breadcrumb link to navigate
   *
   * @param linkText - Text of the breadcrumb link
   */
  async clickBreadcrumb(linkText: string): Promise<void> {
    const link = this.breadcrumb.getByRole('link', { name: linkText })
    await link.click()
  }

  /**
   * Navigate to products via breadcrumb
   */
  async goToProductsViaBreadcrumb(): Promise<void> {
    await this.clickBreadcrumb('Products')
    await this.page.waitForURL('/products')
  }

  /**
   * Navigate to home via breadcrumb
   */
  async goToHomeViaBreadcrumb(): Promise<void> {
    await this.clickBreadcrumb('Home')
    await this.page.waitForURL('/')
  }
}
