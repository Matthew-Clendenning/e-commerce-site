/**
 * Admin Dashboard Page Object
 *
 * Represents the /admin page for managing products, categories, and orders.
 *
 * KEY FEATURES TESTED:
 * - Admin access control
 * - Product CRUD operations
 * - Category management
 * - Order status updates
 */

import type { Page, Locator } from '@playwright/test'
import { expect } from '@playwright/test'
import { BasePage } from './base.page'

export class AdminPage extends BasePage {
  // ============================================
  // PAGE-SPECIFIC ELEMENTS
  // ============================================

  /** Page heading */
  readonly heading: Locator

  /** Tab buttons */
  readonly productsTab: Locator
  readonly categoriesTab: Locator
  readonly ordersTab: Locator

  /** Products section */
  readonly addProductButton: Locator
  readonly productTable: Locator
  readonly productRows: Locator

  /** Categories section */
  readonly addCategoryButton: Locator
  readonly categoryCards: Locator

  /** Orders section */
  readonly orderTable: Locator
  readonly orderRows: Locator

  /** Modal elements */
  readonly modal: Locator
  readonly modalTitle: Locator
  readonly modalClose: Locator

  /** Form fields (used in modals) */
  readonly nameInput: Locator
  readonly descriptionInput: Locator
  readonly priceInput: Locator
  readonly stockInput: Locator
  readonly categorySelect: Locator
  readonly imageUrlInput: Locator

  /** Loading state */
  readonly loadingIndicator: Locator

  constructor(page: Page) {
    super(page)

    // Page structure (based on admin/page.tsx)
    this.heading = page.getByRole('heading', { name: 'Admin Dashboard' })

    // Tabs
    this.productsTab = page.getByRole('button', { name: /Products/ })
    this.categoriesTab = page.getByRole('button', { name: /Categories/ })
    this.ordersTab = page.getByRole('button', { name: /Orders/ })

    // Products section
    this.addProductButton = page.getByRole('button', { name: /Add New Product/i })
    this.productTable = page.locator('table').first()
    this.productRows = this.productTable.locator('tbody tr')

    // Categories section
    this.addCategoryButton = page.getByRole('button', { name: /Add New Category/i })
    this.categoryCards = page.locator('[class*="categoryCard"]')

    // Orders section
    this.orderTable = page.locator('table')
    this.orderRows = this.orderTable.locator('tbody tr')

    // Modal
    this.modal = page.locator('[class*="modal"]')
    this.modalTitle = this.modal.locator('h2, h3').first()
    this.modalClose = this.modal.locator('button').filter({ hasText: /close|cancel|×/i })

    // Form inputs (generic, used in modals)
    this.nameInput = page.locator('input[placeholder*="name" i], input[name="name"]')
    this.descriptionInput = page.locator('textarea, input[name="description"]')
    this.priceInput = page.locator('input[type="number"][step="0.01"]')
    this.stockInput = page.locator('input[type="number"]:not([step])')
    this.categorySelect = page.locator('select')
    this.imageUrlInput = page.locator('input[placeholder*="http" i], input[name="imageUrl"]')

    // Loading
    this.loadingIndicator = page.locator('text=Loading')
  }

  // ============================================
  // NAVIGATION
  // ============================================

  /**
   * Navigate to admin page
   */
  async goto(): Promise<void> {
    await this.page.goto('/admin')
    await this.waitForPageLoad()
    // Wait for data to load
    await expect(this.loadingIndicator).toBeHidden({ timeout: 10000 })
  }

  // ============================================
  // TAB NAVIGATION
  // ============================================

  /**
   * Switch to Products tab
   */
  async switchToProducts(): Promise<void> {
    await this.productsTab.click()
    await expect(this.addProductButton).toBeVisible()
  }

  /**
   * Switch to Categories tab
   */
  async switchToCategories(): Promise<void> {
    await this.categoriesTab.click()
    await expect(this.addCategoryButton).toBeVisible()
  }

  /**
   * Switch to Orders tab
   */
  async switchToOrders(): Promise<void> {
    await this.ordersTab.click()
    await expect(this.orderTable).toBeVisible()
  }

  // ============================================
  // PRODUCT MANAGEMENT
  // ============================================

  /**
   * Open the create product modal
   */
  async openCreateProductModal(): Promise<void> {
    await this.addProductButton.click()
    await expect(this.modal).toBeVisible()
  }

  /**
   * Fill the product form
   */
  async fillProductForm(data: {
    name: string
    description?: string
    price: string
    stock?: string
    categoryId: string
    imageUrl?: string
  }): Promise<void> {
    await this.nameInput.fill(data.name)

    if (data.description) {
      await this.descriptionInput.fill(data.description)
    }

    await this.priceInput.fill(data.price)

    if (data.stock) {
      await this.stockInput.fill(data.stock)
    }

    await this.categorySelect.selectOption(data.categoryId)

    if (data.imageUrl) {
      await this.imageUrlInput.fill(data.imageUrl)
    }
  }

  /**
   * Submit the product form
   */
  async submitProductForm(): Promise<void> {
    const submitButton = this.modal.getByRole('button', { name: /Create|Save/i })
    await submitButton.click()
    // Wait for modal to close
    await expect(this.modal).toBeHidden({ timeout: 5000 })
  }

  /**
   * Create a new product (complete flow)
   */
  async createProduct(data: {
    name: string
    description?: string
    price: string
    stock?: string
    categoryId: string
    imageUrl?: string
  }): Promise<void> {
    await this.openCreateProductModal()
    await this.fillProductForm(data)
    await this.submitProductForm()
  }

  /**
   * Find a product row by name
   */
  getProductRow(productName: string): Locator {
    return this.productRows.filter({ hasText: productName })
  }

  /**
   * Click edit on a product
   */
  async editProduct(productName: string): Promise<void> {
    const row = this.getProductRow(productName)
    await row.getByRole('button', { name: /Edit/i }).click()
  }

  /**
   * Delete a product
   */
  async deleteProduct(productName: string): Promise<void> {
    // First click edit to show delete button
    await this.editProduct(productName)

    // Set up dialog handler
    this.page.once('dialog', (dialog) => dialog.accept())

    // Click delete
    const row = this.getProductRow(productName)
    await row.getByRole('button', { name: /Delete/i }).click()
  }

  /**
   * Get product count from table
   */
  async getProductCount(): Promise<number> {
    return await this.productRows.count()
  }

  // ============================================
  // CATEGORY MANAGEMENT
  // ============================================

  /**
   * Open create category modal
   */
  async openCreateCategoryModal(): Promise<void> {
    await this.addCategoryButton.click()
    await expect(this.modal).toBeVisible()
  }

  /**
   * Fill category form
   */
  async fillCategoryForm(data: { name: string; description?: string }): Promise<void> {
    await this.nameInput.fill(data.name)
    if (data.description) {
      await this.descriptionInput.fill(data.description)
    }
  }

  /**
   * Submit category form
   */
  async submitCategoryForm(): Promise<void> {
    const submitButton = this.modal.getByRole('button', { name: /Create|Save/i })
    await submitButton.click()
    await expect(this.modal).toBeHidden({ timeout: 5000 })
  }

  /**
   * Create a new category
   */
  async createCategory(data: { name: string; description?: string }): Promise<void> {
    await this.openCreateCategoryModal()
    await this.fillCategoryForm(data)
    await this.submitCategoryForm()
  }

  /**
   * Get category count
   */
  async getCategoryCount(): Promise<number> {
    return await this.categoryCards.count()
  }

  // ============================================
  // ORDER MANAGEMENT
  // ============================================

  /**
   * Find an order row by ID (partial match)
   */
  getOrderRow(orderId: string): Locator {
    return this.orderRows.filter({ hasText: orderId })
  }

  /**
   * Open order details modal
   */
  async viewOrderDetails(orderId: string): Promise<void> {
    const row = this.getOrderRow(orderId)
    await row.getByRole('button', { name: /View Details/i }).click()
    await expect(this.modal).toBeVisible()
  }

  /**
   * Update order status from modal
   */
  async updateOrderStatus(status: string): Promise<void> {
    const statusSelect = this.modal.locator('select')
    await statusSelect.selectOption(status)
  }

  /**
   * Close the modal
   */
  async closeModal(): Promise<void> {
    await this.modalClose.click()
    await expect(this.modal).toBeHidden()
  }

  /**
   * Get order count
   */
  async getOrderCount(): Promise<number> {
    return await this.orderRows.count()
  }

  // ============================================
  // ASSERTIONS
  // ============================================

  /**
   * Assert admin page is loaded
   */
  async expectLoaded(): Promise<void> {
    await expect(this.loadingIndicator).toBeHidden()
    await expect(this.heading).toBeVisible()
  }

  /**
   * Assert loading state
   */
  async expectLoading(): Promise<void> {
    await expect(this.loadingIndicator).toBeVisible()
  }

  /**
   * Assert product exists in table
   */
  async expectProductInTable(productName: string): Promise<void> {
    const row = this.getProductRow(productName)
    await expect(row).toBeVisible()
  }

  /**
   * Assert product does NOT exist in table
   */
  async expectProductNotInTable(productName: string): Promise<void> {
    const row = this.getProductRow(productName)
    await expect(row).toBeHidden()
  }

  /**
   * Assert modal is visible with title
   */
  async expectModalWithTitle(title: string): Promise<void> {
    await expect(this.modal).toBeVisible()
    await expect(this.modalTitle).toContainText(title)
  }

  /**
   * Assert unauthorized (redirected away)
   */
  async expectUnauthorized(): Promise<void> {
    // Should redirect to home or unauthorized page
    await expect(this.page).not.toHaveURL('/admin')
  }

  /**
   * Assert redirected to sign in
   */
  async expectRedirectedToSignIn(): Promise<void> {
    await this.page.waitForURL(/sign-in/)
  }
}
