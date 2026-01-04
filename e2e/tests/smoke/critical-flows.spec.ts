/**
 * Smoke Tests - Critical User Flows
 *
 * These tests verify the most important user flows work.
 * They run quickly and catch major issues early.
 *
 * WHAT ARE SMOKE TESTS?
 * Smoke tests are quick, high-level tests that verify basic functionality.
 * The name comes from hardware testing - if you turn it on and smoke comes out,
 * you know something is very wrong without needing detailed tests.
 *
 * WHEN TO RUN:
 * - After every deploy
 * - Before running full test suite
 * - As a quick sanity check during development
 *
 * WHAT THEY TEST:
 * - Home page loads
 * - Products page displays items
 * - Add to cart works
 * - Basic navigation works
 */

import { test, expect } from '../../fixtures'
import { ProductsPage } from '../../pages/products.page'
import { ProductDetailPage } from '../../pages/product-detail.page'
import { CartSidebarComponent } from '../../components/cart-sidebar.component'

test.describe('Smoke Tests @smoke', () => {
  /**
   * Test 1: Home page loads successfully
   *
   * WHY THIS TEST?
   * If the home page doesn't load, nothing else matters.
   * This catches build errors, runtime crashes, and major config issues.
   */
  test('home page loads', async ({ page }) => {
    // Navigate to home page
    await page.goto('/')

    // Verify page has loaded (not blank)
    await expect(page).toHaveTitle(/Premium Accessories/)

    // Verify navigation is visible
    await expect(page.getByRole('link', { name: 'Home' })).toBeVisible()
    // Use exact: true to avoid matching "Browse All Products" CTA
    await expect(page.getByRole('link', { name: 'Products', exact: true })).toBeVisible()

    // Verify main content is present
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  })

  /**
   * Test 2: Products page displays items
   *
   * WHY THIS TEST?
   * Products are the core of an e-commerce site.
   * If products don't display, users can't shop.
   */
  test('products page displays items', async ({ page, testData }) => {
    const productsPage = new ProductsPage(page)

    // Navigate to products
    await productsPage.goto()

    // Verify page title
    await productsPage.expectHeading('Our Products')

    // Verify products are displayed
    const productCount = await productsPage.getProductCount()
    expect(productCount).toBeGreaterThan(0)

    // Verify at least one seeded product is visible
    const firstProduct = testData.products[0]
    await productsPage.expectProductVisible(firstProduct.name)
  })

  /**
   * Test 3: Add to cart flow works
   *
   * WHY THIS TEST?
   * The add-to-cart flow is the critical path to purchase.
   * If users can't add items to cart, they can't buy anything.
   */
  test('can add product to cart', async ({ page, testData }) => {
    const productDetailPage = new ProductDetailPage(page)
    const cartSidebar = new CartSidebarComponent(page)

    // Get a product that's in stock
    const product = testData.products.find((p) => p.stock > 0)!

    // Navigate to product
    await productDetailPage.goto(product.slug)

    // Verify product page loaded
    await productDetailPage.expectTitle(product.name)
    await productDetailPage.expectInStock()

    // Add to cart
    await productDetailPage.clickAddToCart()

    // Verify cart sidebar opens with item
    await cartSidebar.expectOpen()
    await cartSidebar.expectItem(product.name)
    await cartSidebar.expectItemQuantity(product.name, 1)
  })

  /**
   * Test 4: Navigation between pages works
   *
   * WHY THIS TEST?
   * If navigation is broken, users get stuck.
   * This ensures basic routing and links work.
   */
  test('navigation between pages works', async ({ page }) => {
    // Start at home
    await page.goto('/')

    // Navigate to products (use exact: true to avoid matching "Browse All Products" CTA)
    await page.getByRole('link', { name: 'Products', exact: true }).click()
    await expect(page).toHaveURL('/products')

    // Navigate back to home
    await page.getByRole('link', { name: 'Home' }).click()
    await expect(page).toHaveURL('/')
  })

  /**
   * Test 5: Out of stock items are handled correctly
   *
   * WHY THIS TEST?
   * Selling out-of-stock items leads to unhappy customers.
   * The UI should clearly prevent adding them to cart.
   */
  test('out of stock items show correct state', async ({ page, testData }) => {
    const productDetailPage = new ProductDetailPage(page)

    // Find out of stock product
    const outOfStockProduct = testData.products.find((p) => p.stock === 0)

    if (!outOfStockProduct) {
      test.skip()
      return
    }

    // Navigate to product
    await productDetailPage.goto(outOfStockProduct.slug)

    // Verify out of stock state
    await productDetailPage.expectOutOfStock()
  })
})
