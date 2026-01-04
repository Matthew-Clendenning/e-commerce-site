/**
 * Products Page Object
 *
 * Represents the /products page where users browse all products.
 *
 * KEY FEATURES TESTED:
 * - Product grid display
 * - Category filtering
 * - Product card interactions
 * - Empty state handling
 */

import { Page, Locator, expect } from '@playwright/test'
import { BasePage } from './base.page'

export class ProductsPage extends BasePage {
  // ============================================
  // PAGE-SPECIFIC ELEMENTS
  // ============================================

  /** Main page heading */
  readonly heading: Locator

  /** Container for product cards */
  readonly productGrid: Locator

  /** Individual product cards */
  readonly productCards: Locator

  /** Category filter buttons */
  readonly filterContainer: Locator
  readonly filterButtons: Locator
  readonly allProductsFilter: Locator

  /** Product count display */
  readonly productCount: Locator

  /** Empty state message */
  readonly emptyState: Locator

  constructor(page: Page) {
    super(page)

    // Page structure selectors (based on products/page.tsx)
    this.heading = page.getByRole('heading', { level: 1 })
    this.productGrid = page.locator('[class*="grid"]').first()
    // ProductCard uses styles.card, so we look for links with "card" class inside the grid
    this.productCards = this.productGrid.locator('a[class*="card"]')

    // Filter selectors (based on ProductsFilter.tsx)
    this.filterContainer = page.locator('[class*="filters"]')
    this.filterButtons = this.filterContainer.locator('button')
    this.allProductsFilter = page.getByRole('button', { name: 'All Products' })

    // Count and empty state
    this.productCount = page.locator('[class*="count"]')
    this.emptyState = page.locator('text=No products found')
  }

  // ============================================
  // NAVIGATION
  // ============================================

  /**
   * Navigate to the products page
   */
  async goto(): Promise<void> {
    await this.page.goto('/products')
    await this.waitForPageLoad()
  }

  /**
   * Navigate to products page with category filter
   *
   * @param categorySlug - Category slug to filter by
   */
  async gotoWithCategory(categorySlug: string): Promise<void> {
    await this.page.goto(`/products?category=${categorySlug}`)
    await this.waitForPageLoad()
  }

  // ============================================
  // PRODUCT LISTING METHODS
  // ============================================

  /**
   * Get the number of visible product cards
   */
  async getProductCount(): Promise<number> {
    return await this.productCards.count()
  }

  /**
   * Get all product names currently displayed
   */
  async getProductNames(): Promise<string[]> {
    const cards = await this.productCards.all()
    const names: string[] = []

    for (const card of cards) {
      // ProductCard uses styles.title for the name (h3 element)
      const nameEl = card.locator('h3[class*="title"]')
      const name = await nameEl.textContent()
      if (name) names.push(name.trim())
    }

    return names
  }

  /**
   * Click on a specific product card by name
   *
   * @param productName - The product name to click
   */
  async clickProduct(productName: string): Promise<void> {
    const card = this.productCards.filter({ hasText: productName })
    await card.click()
    await this.page.waitForURL(/\/products\/.+/)
  }

  /**
   * Check if a specific product is visible
   *
   * @param productName - Product name to check
   */
  async isProductVisible(productName: string): Promise<boolean> {
    const card = this.productCards.filter({ hasText: productName })
    return await card.isVisible()
  }

  // ============================================
  // FILTERING METHODS
  // ============================================

  /**
   * Filter products by category
   *
   * @param categoryName - Display name of the category
   */
  async filterByCategory(categoryName: string): Promise<void> {
    const filterButton = this.filterButtons.filter({ hasText: categoryName })
    await filterButton.click()

    // Wait for URL to update
    await this.page.waitForURL(/category=|\/products$/)
    await this.waitForPageLoad()
  }

  /**
   * Clear filter and show all products
   */
  async showAllProducts(): Promise<void> {
    await this.allProductsFilter.click()
    await this.page.waitForURL('/products')
    await this.waitForPageLoad()
  }

  /**
   * Get the currently active filter name
   */
  async getActiveFilter(): Promise<string | null> {
    const activeButton = this.filterButtons.locator('[class*="active"]')

    if ((await activeButton.count()) === 0) {
      return null
    }

    return await activeButton.textContent()
  }

  /**
   * Get all available category filter names
   */
  async getAvailableFilters(): Promise<string[]> {
    const buttons = await this.filterButtons.all()
    const names: string[] = []

    for (const button of buttons) {
      const name = await button.textContent()
      if (name) names.push(name.trim())
    }

    return names
  }

  // ============================================
  // ASSERTIONS
  // ============================================

  /**
   * Assert that a product is visible in the grid
   */
  async expectProductVisible(productName: string): Promise<void> {
    const card = this.productCards.filter({ hasText: productName })
    await expect(card).toBeVisible()
  }

  /**
   * Assert that a product is NOT visible
   */
  async expectProductNotVisible(productName: string): Promise<void> {
    const card = this.productCards.filter({ hasText: productName })
    await expect(card).toBeHidden()
  }

  /**
   * Assert specific product count is displayed
   */
  async expectProductCount(count: number): Promise<void> {
    // Check displayed count text
    await expect(this.productCount).toContainText(`${count}`)
    // Also verify actual card count matches
    await expect(this.productCards).toHaveCount(count)
  }

  /**
   * Assert a specific filter is active (highlighted)
   */
  async expectActiveFilter(categoryName: string): Promise<void> {
    const button = this.filterButtons.filter({ hasText: categoryName })
    await expect(button).toHaveClass(/active|filterActive/)
  }

  /**
   * Assert empty state is shown
   */
  async expectEmptyState(): Promise<void> {
    await expect(this.emptyState).toBeVisible()
  }

  /**
   * Assert page heading is correct
   */
  async expectHeading(text: string = 'Our Products'): Promise<void> {
    await expect(this.heading).toContainText(text)
  }

  // ============================================
  // PRODUCT CARD METHODS
  // ============================================

  /**
   * Get details from a specific product card
   *
   * @param productName - Name of the product
   * @returns Object with product details
   */
  async getProductCardDetails(productName: string): Promise<{
    name: string
    price: string
    category: string
    inStock: boolean
  }> {
    const card = this.productCards.filter({ hasText: productName })

    return {
      // ProductCard uses styles.title for the name (h3 element)
      name: (await card.locator('h3[class*="title"]').textContent()) || '',
      price: (await card.locator('[class*="price"]').textContent()) || '',
      category: (await card.locator('[class*="category"]').textContent()) || '',
      // Check for the outOfStock badge div specifically (not the stock span text)
      inStock: !(await card.locator('div[class*="outOfStock"]').isVisible()),
    }
  }

  /**
   * Check if a product shows "Out of Stock" badge
   */
  async isProductOutOfStock(productName: string): Promise<boolean> {
    const card = this.productCards.filter({ hasText: productName })
    // Use the specific outOfStock badge div class, not text matching
    const outOfStockBadge = card.locator('div[class*="outOfStock"]')
    return await outOfStockBadge.isVisible()
  }
}
