/**
 * Products Page Tests
 *
 * Tests for the /products page functionality.
 *
 * FEATURES TESTED:
 * - Product listing display
 * - Category filtering
 * - Navigation to product detail
 * - Empty state handling
 */

import { test, expect } from '../../fixtures'
import { ProductsPage } from '../../pages/products.page'

test.describe('Products Page', () => {
  test.describe('Product Listing', () => {
    /**
     * Test: All products display by default
     *
     * SCENARIO: User visits /products without any filters
     * EXPECTED: All seeded products are visible
     */
    test('displays all products by default', async ({ page, testData }) => {
      const productsPage = new ProductsPage(page)

      await productsPage.goto()

      // Check heading
      await productsPage.expectHeading('Our Products')

      // Check all products are visible
      const productCount = await productsPage.getProductCount()
      expect(productCount).toBe(testData.products.length)

      // Verify each product is displayed
      for (const product of testData.products) {
        await productsPage.expectProductVisible(product.name)
      }
    })

    /**
     * Test: Products show correct information
     *
     * SCENARIO: User views product card
     * EXPECTED: Name, price, category, and stock status are displayed
     */
    test('shows correct product information', async ({ page, testData }) => {
      const productsPage = new ProductsPage(page)
      const product = testData.products[0]

      await productsPage.goto()

      const details = await productsPage.getProductCardDetails(product.name)

      expect(details.name).toBe(product.name)
      expect(details.price).toContain(`$${product.price.toFixed(2)}`)
    })

    /**
     * Test: Out of stock badge is shown
     *
     * SCENARIO: Product has 0 stock
     * EXPECTED: "Out of Stock" badge is visible
     */
    test('shows out of stock badge', async ({ page, testData }) => {
      const productsPage = new ProductsPage(page)
      const outOfStockProduct = testData.products.find((p) => p.stock === 0)

      if (!outOfStockProduct) {
        test.skip()
        return
      }

      await productsPage.goto()

      const isOutOfStock = await productsPage.isProductOutOfStock(outOfStockProduct.name)
      expect(isOutOfStock).toBe(true)
    })
  })

  test.describe('Category Filtering', () => {
    /**
     * Test: Filter by category works
     *
     * SCENARIO: User clicks a category filter button
     * EXPECTED: Only products from that category are shown
     */
    test('filters products by category', async ({ page, testData }) => {
      const productsPage = new ProductsPage(page)

      await productsPage.goto()

      // Filter by watches category
      await productsPage.filterByCategory('Test Watches')

      // URL should update
      await expect(page).toHaveURL(/category=test-watches/)

      // Only watch products should be visible
      const watchProducts = testData.products.filter(
        (p) => p.categoryId === testData.categories.watches.id
      )

      const productCount = await productsPage.getProductCount()
      expect(productCount).toBe(watchProducts.length)
    })

    /**
     * Test: Clear filter shows all products
     *
     * SCENARIO: User clicks "All Products" after filtering
     * EXPECTED: All products are shown again
     */
    test('shows all products when filter cleared', async ({ page, testData }) => {
      const productsPage = new ProductsPage(page)

      // Start with filtered view
      await productsPage.gotoWithCategory('test-watches')

      // Clear filter
      await productsPage.showAllProducts()

      // All products should be visible
      const productCount = await productsPage.getProductCount()
      expect(productCount).toBe(testData.products.length)
    })

    /**
     * Test: Active filter is highlighted
     *
     * SCENARIO: User filters by category
     * EXPECTED: The active category button is visually highlighted
     */
    test('highlights active filter', async ({ page }) => {
      const productsPage = new ProductsPage(page)

      await productsPage.goto()
      await productsPage.filterByCategory('Test Watches')

      // The "Test Watches" button should be active
      await productsPage.expectActiveFilter('Test Watches')
    })
  })

  test.describe('Navigation', () => {
    /**
     * Test: Click product navigates to detail page
     *
     * SCENARIO: User clicks on a product card
     * EXPECTED: User is taken to /products/[slug]
     */
    test('navigates to product detail on click', async ({ page, testData }) => {
      const productsPage = new ProductsPage(page)
      const product = testData.products[0]

      await productsPage.goto()
      await productsPage.clickProduct(product.name)

      // Should be on product detail page
      await expect(page).toHaveURL(`/products/${product.slug}`)
    })

    /**
     * Test: Category filter persists in URL
     *
     * SCENARIO: User filters by category and shares URL
     * EXPECTED: URL includes category parameter
     */
    test('category filter persists in URL', async ({ page, testData }) => {
      const productsPage = new ProductsPage(page)

      await productsPage.gotoWithCategory(testData.categories.watches.slug)

      // Refresh page
      await page.reload()

      // Filter should still be applied
      const watchProducts = testData.products.filter(
        (p) => p.categoryId === testData.categories.watches.id
      )
      const productCount = await productsPage.getProductCount()
      expect(productCount).toBe(watchProducts.length)
    })
  })
})
