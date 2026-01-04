/**
 * Cart Component Tests
 *
 * Tests for cart-related components and interactions.
 *
 * FEATURES TESTED:
 * - Adding items to cart
 * - Removing items from cart
 * - Updating quantities
 * - Cart sidebar behavior
 * - Stock limit enforcement
 */

import { test, expect } from '../../fixtures'
import { ProductDetailPage } from '../../pages/product-detail.page'
import { CartSidebarComponent } from '../../components/cart-sidebar.component'

test.describe('Cart Functionality', () => {
  test.describe('Adding Items', () => {
    /**
     * Test: Add to cart shows success toast
     *
     * SCENARIO: User clicks "Add to Cart" on a product
     * EXPECTED: Success toast notification appears
     */
    test('shows toast notification when adding item', async ({ page, testData }) => {
      const productPage = new ProductDetailPage(page)
      const product = testData.products.find((p) => p.stock > 0)!

      await productPage.goto(product.slug)
      await productPage.addToCartWithConfirmation()

      // Toast was already verified by addToCartWithConfirmation
      // Cart sidebar should also open
      const cartSidebar = new CartSidebarComponent(page)
      await cartSidebar.expectOpen()
    })

    /**
     * Test: Adding same product increases quantity
     *
     * SCENARIO: User adds the same product twice
     * EXPECTED: Quantity increases to 2 instead of duplicate entry
     */
    test('increases quantity when adding same product', async ({ page, testData }) => {
      const productPage = new ProductDetailPage(page)
      const cartSidebar = new CartSidebarComponent(page)
      const product = testData.products.find((p) => p.stock > 2)!

      await productPage.goto(product.slug)

      // Add first time
      await productPage.addToCart()
      await cartSidebar.expectItemQuantity(product.name, 1)

      // Close cart and add again
      await cartSidebar.close()
      await productPage.addToCart()

      // Quantity should be 2
      await cartSidebar.expectItemQuantity(product.name, 2)
    })

    /**
     * Test: Cannot add out of stock items
     *
     * SCENARIO: Product has 0 stock
     * EXPECTED: Add to cart button is disabled
     */
    test('cannot add out of stock item', async ({ page, testData }) => {
      const productPage = new ProductDetailPage(page)
      const outOfStockProduct = testData.products.find((p) => p.stock === 0)

      if (!outOfStockProduct) {
        test.skip()
        return
      }

      await productPage.goto(outOfStockProduct.slug)
      await productPage.expectOutOfStock()

      // Button should be disabled
      const isEnabled = await productPage.isAddToCartEnabled()
      expect(isEnabled).toBe(false)
    })
  })

  test.describe('Cart Sidebar', () => {
    /**
     * Test: Cart sidebar opens when item added
     *
     * SCENARIO: User adds item to cart
     * EXPECTED: Cart sidebar automatically opens
     */
    test('opens automatically when item added', async ({ page, testData }) => {
      const productPage = new ProductDetailPage(page)
      const cartSidebar = new CartSidebarComponent(page)
      const product = testData.products.find((p) => p.stock > 0)!

      await productPage.goto(product.slug)

      // Sidebar should be closed initially
      await cartSidebar.expectClosed()

      // Add to cart
      await productPage.clickAddToCart()

      // Sidebar should open
      await cartSidebar.expectOpen()
    })

    /**
     * Test: Close cart with X button
     *
     * SCENARIO: User clicks X button on cart sidebar
     * EXPECTED: Sidebar closes
     */
    test('closes with X button', async ({ page, testData }) => {
      const productPage = new ProductDetailPage(page)
      const cartSidebar = new CartSidebarComponent(page)
      const product = testData.products.find((p) => p.stock > 0)!

      await productPage.goto(product.slug)
      await productPage.addToCart()
      await cartSidebar.expectOpen()

      await cartSidebar.close()
      await cartSidebar.expectClosed()
    })

    /**
     * Test: Close cart with Escape key
     *
     * SCENARIO: User presses Escape key with cart open
     * EXPECTED: Sidebar closes
     */
    test('closes with Escape key', async ({ page, testData }) => {
      const productPage = new ProductDetailPage(page)
      const cartSidebar = new CartSidebarComponent(page)
      const product = testData.products.find((p) => p.stock > 0)!

      await productPage.goto(product.slug)
      await productPage.addToCart()
      await cartSidebar.expectOpen()

      await cartSidebar.closeWithEscape()
      await cartSidebar.expectClosed()
    })

    /**
     * Test: Close cart by clicking backdrop
     *
     * SCENARIO: User clicks outside the cart sidebar
     * EXPECTED: Sidebar closes
     */
    test('closes when clicking backdrop', async ({ page, testData }) => {
      const productPage = new ProductDetailPage(page)
      const cartSidebar = new CartSidebarComponent(page)
      const product = testData.products.find((p) => p.stock > 0)!

      await productPage.goto(product.slug)
      await productPage.addToCart()
      await cartSidebar.expectOpen()

      await cartSidebar.closeWithBackdrop()
      await cartSidebar.expectClosed()
    })
  })

  test.describe('Quantity Management', () => {
    /**
     * Test: Increment quantity
     *
     * SCENARIO: User clicks + button on cart item
     * EXPECTED: Quantity increases by 1
     */
    test('increments item quantity', async ({ page, testData }) => {
      const productPage = new ProductDetailPage(page)
      const cartSidebar = new CartSidebarComponent(page)
      const product = testData.products.find((p) => p.stock > 2)!

      await productPage.goto(product.slug)
      await productPage.addToCart()

      await cartSidebar.incrementItem(product.name)
      await cartSidebar.expectItemQuantity(product.name, 2)
    })

    /**
     * Test: Decrement quantity
     *
     * SCENARIO: User clicks - button on cart item with qty > 1
     * EXPECTED: Quantity decreases by 1
     */
    test('decrements item quantity', async ({ page, testData }) => {
      const productPage = new ProductDetailPage(page)
      const cartSidebar = new CartSidebarComponent(page)
      const product = testData.products.find((p) => p.stock > 2)!

      await productPage.goto(product.slug)
      await productPage.addToCart()

      // Increase to 2 first
      await cartSidebar.incrementItem(product.name)
      await cartSidebar.expectItemQuantity(product.name, 2)

      // Decrease back to 1
      await cartSidebar.decrementItem(product.name)
      await cartSidebar.expectItemQuantity(product.name, 1)
    })

    /**
     * Test: Cannot exceed stock limit
     *
     * SCENARIO: Item quantity reaches stock limit
     * EXPECTED: Increment button becomes disabled
     */
    test('cannot exceed stock limit', async ({ page, testData }) => {
      const productPage = new ProductDetailPage(page)
      const cartSidebar = new CartSidebarComponent(page)

      // Find product with low stock (easier to test)
      const product = testData.products.find((p) => p.stock > 0 && p.stock <= 5)!

      await productPage.goto(product.slug)
      await productPage.addToCart()

      // Increment to max
      for (let i = 1; i < product.stock; i++) {
        await cartSidebar.incrementItem(product.name)
      }

      // Should be at max now
      await cartSidebar.expectItemQuantity(product.name, product.stock)
      await cartSidebar.expectIncrementDisabled(product.name)
    })
  })

  test.describe('Removing Items', () => {
    /**
     * Test: Remove item with trash button
     *
     * SCENARIO: User clicks remove button on cart item
     * EXPECTED: Item is removed, toast shows confirmation
     */
    test('removes item from cart', async ({ page, testData }) => {
      const productPage = new ProductDetailPage(page)
      const cartSidebar = new CartSidebarComponent(page)
      const product = testData.products.find((p) => p.stock > 0)!

      await productPage.goto(product.slug)
      await productPage.addToCart()
      await cartSidebar.expectItem(product.name)

      await cartSidebar.removeItem(product.name)

      // Item should be gone
      await cartSidebar.expectNoItem(product.name)
      await cartSidebar.expectEmpty()
    })

    /**
     * Test: Clear entire cart
     *
     * SCENARIO: User clicks "Clear Cart" button
     * EXPECTED: All items removed, cart shows empty state
     */
    test('clears entire cart', async ({ page, testData }) => {
      const productPage = new ProductDetailPage(page)
      const cartSidebar = new CartSidebarComponent(page)
      const product = testData.products.find((p) => p.stock > 0)!

      await productPage.goto(product.slug)
      await productPage.addToCart()

      await cartSidebar.clearCart()
      await cartSidebar.expectEmpty()
    })
  })

  test.describe('Cart Subtotal', () => {
    /**
     * Test: Subtotal updates correctly
     *
     * SCENARIO: User adds items and changes quantities
     * EXPECTED: Subtotal reflects correct total price
     */
    test('calculates correct subtotal', async ({ page, testData }) => {
      const productPage = new ProductDetailPage(page)
      const cartSidebar = new CartSidebarComponent(page)
      const product = testData.products.find((p) => p.stock > 2)!

      await productPage.goto(product.slug)
      await productPage.addToCart()

      // Initial subtotal should be product price
      await cartSidebar.expectSubtotal(product.price)

      // Increment to qty 2
      await cartSidebar.incrementItem(product.name)

      // Subtotal should be price * 2
      await cartSidebar.expectSubtotal(product.price * 2)
    })
  })
})
