/**
 * End-to-End Shopping Flow Tests
 *
 * These tests simulate complete user journeys through the application.
 *
 * WHY E2E TESTS?
 * - Verify that multiple components work together
 * - Test realistic user scenarios
 * - Catch integration issues that unit tests miss
 * - Ensure the "happy path" works
 *
 * USER JOURNEYS TESTED:
 * 1. Guest browsing products
 * 2. Authenticated shopping and checkout
 * 3. Admin product management
 */

/* eslint-disable @typescript-eslint/no-unused-vars */
import { test, expect } from '../../fixtures'
import { ProductsPage } from '../../pages/products.page'
import { ProductDetailPage } from '../../pages/product-detail.page'
import { CheckoutPage } from '../../pages/checkout.page'
import { AdminPage } from '../../pages/admin.page'
import { CartSidebarComponent } from '../../components/cart-sidebar.component'

test.describe('E2E: Shopping Flows', () => {
  /**
   * Test: Guest user browses products
   *
   * USER STORY:
   * As a guest user,
   * I want to browse products and view details,
   * So I can decide what to buy before signing in.
   */
  test('guest can browse products and view details', async ({ page, testData }) => {
    const productsPage = new ProductsPage(page)
    const productDetailPage = new ProductDetailPage(page)

    // Step 1: Visit home page
    await page.goto('/')
    // Use exact: true to avoid matching "Browse All Products" CTA
    await expect(page.getByRole('link', { name: 'Products', exact: true })).toBeVisible()

    // Step 2: Navigate to products
    await productsPage.goto()
    await productsPage.expectHeading()

    // Step 3: Browse products, filter by category
    await productsPage.filterByCategory('Test Watches')
    const watchProducts = testData.products.filter(
      (p) => p.categoryId === testData.categories.watches.id
    )
    await productsPage.expectProductCount(watchProducts.length)

    // Step 4: View a product detail
    const product = watchProducts[0]
    await productsPage.clickProduct(product.name)

    // Step 5: Verify product detail page
    await productDetailPage.expectTitle(product.name)
    await productDetailPage.expectPrice(product.price)
  })

  /**
   * Test: User adds items to cart and begins checkout
   *
   * USER STORY:
   * As a logged-in user,
   * I want to add items to my cart and checkout,
   * So I can purchase products.
   *
   * NOTE: This test uses mocked Stripe to avoid real payments
   */
  test('authenticated user can add to cart and checkout', async ({
    page,
    testData,
    authenticatedUser: _authenticatedUser,
    stripeMocked: _stripeMocked,
  }) => {
    // Note: authenticatedUser fixture sets up auth, stripeMocked sets up Stripe mocking
    const productDetailPage = new ProductDetailPage(page)
    const cartSidebar = new CartSidebarComponent(page)
    const checkoutPage = new CheckoutPage(page)

    // Step 1: Find a product to buy
    const product = testData.products.find((p) => p.stock > 0)!

    // Step 2: Navigate to product and add to cart
    await productDetailPage.goto(product.slug)
    await productDetailPage.addToCart()

    // Step 3: Verify item in cart
    await cartSidebar.expectOpen()
    await cartSidebar.expectItem(product.name)

    // Step 4: Proceed to checkout
    await cartSidebar.proceedToCheckout()

    // Step 5: Verify checkout page
    await checkoutPage.expectLoaded()
    await checkoutPage.expectItem(product.name)

    // Step 6: Complete checkout (mocked)
    await checkoutPage.proceedToPayment()

    // Should redirect to success page (mocked Stripe)
    await expect(page).toHaveURL(/order\/success/)
  })

  /**
   * Test: Multiple items in cart
   *
   * USER STORY:
   * As a shopper,
   * I want to add multiple different items to my cart,
   * So I can purchase them all at once.
   */
  test('can add multiple items to cart', async ({ page, testData }) => {
    const productDetailPage = new ProductDetailPage(page)
    const cartSidebar = new CartSidebarComponent(page)

    // Get two different products
    const products = testData.products.filter((p) => p.stock > 0).slice(0, 2)

    if (products.length < 2) {
      test.skip()
      return
    }

    // Add first product
    await productDetailPage.goto(products[0].slug)
    await productDetailPage.addToCart()
    await cartSidebar.close()

    // Add second product
    await productDetailPage.goto(products[1].slug)
    await productDetailPage.addToCart()

    // Verify both items in cart
    await cartSidebar.expectItemCount(2)
    await cartSidebar.expectItem(products[0].name)
    await cartSidebar.expectItem(products[1].name)

    // Verify subtotal
    const expectedSubtotal = products[0].price + products[1].price
    await cartSidebar.expectSubtotal(expectedSubtotal)
  })

  /**
   * Test: Checkout requires authentication
   *
   * USER STORY:
   * As a security measure,
   * The system should require users to sign in before checkout,
   * So we can track orders and provide receipts.
   */
  test('checkout redirects unauthenticated users to sign-in', async ({ page }) => {
    // Try to access checkout directly without auth
    await page.goto('/checkout')

    // Should redirect to sign-in
    await expect(page).toHaveURL(/sign-in/)
  })
})

test.describe('E2E: Admin Flows', () => {
  /**
   * Test: Admin can create a new product
   *
   * USER STORY:
   * As an admin,
   * I want to add new products to the store,
   * So customers can purchase them.
   */
  test.skip('admin can create product', async ({ page, testData, adminUser: _adminUser }) => {
    const adminPage = new AdminPage(page)

    // Navigate to admin
    await adminPage.goto()
    await adminPage.expectLoaded()

    // Switch to products tab
    await adminPage.switchToProducts()

    // Create new product
    await adminPage.createProduct({
      name: 'New Test Product',
      description: 'Created by E2E test',
      price: '149.99',
      stock: '25',
      categoryId: testData.categories.watches.id,
    })

    // Verify product appears in table
    await adminPage.expectProductInTable('New Test Product')
  })

  /**
   * Test: Non-admin users cannot access admin page
   *
   * USER STORY:
   * As a security measure,
   * Regular users should not be able to access admin features,
   * So store data is protected.
   */
  test('non-admin cannot access admin page', async ({ page, authenticatedUser: _authenticatedUser }) => {
    // Try to access admin as regular user
    await page.goto('/admin')

    // Should be redirected away
    await expect(page).not.toHaveURL('/admin')
  })
})

test.describe('E2E: Error Handling', () => {
  /**
   * Test: Graceful handling of empty cart checkout
   *
   * USER STORY:
   * If a user somehow gets to checkout with an empty cart,
   * They should be redirected appropriately,
   * Rather than seeing an error.
   */
  test('empty cart redirects from checkout', async ({ page, authenticatedUser: _authenticatedUser }) => {
    // First navigate to a page to set up the context
    await page.goto('/')

    // Clear the cart in localStorage before navigating to checkout
    await page.evaluate(() => {
      // Clear any existing cart state
      localStorage.setItem(
        'cart-storage',
        JSON.stringify({ state: { items: [] }, version: 0 })
      )
    })

    // Navigate to checkout with empty cart
    await page.goto('/checkout')

    // Wait for the redirect to /cart (the checkout page redirects empty carts)
    // Use waitForURL with a longer timeout since it's an async redirect
    await page.waitForURL('/cart', { timeout: 10000 })
  })

  /**
   * Test: 404 page for non-existent product
   *
   * USER STORY:
   * If a user visits a product URL that doesn't exist,
   * They should see a helpful error page,
   * Not a blank page or server error.
   */
  test('shows 404 for non-existent product', async ({ page }) => {
    const response = await page.goto('/products/this-product-does-not-exist')

    // Should show 404 or redirect
    // The exact behavior depends on your Next.js config
    expect(response?.status()).toBeGreaterThanOrEqual(400)
  })
})
