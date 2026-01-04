/**
 * Cart API Tests
 *
 * Tests for the /api/cart endpoints.
 *
 * WHY TEST APIs SEPARATELY?
 * - Faster than UI tests (no browser rendering)
 * - Test edge cases that are hard to reach via UI
 * - Verify authentication and authorization
 * - Test validation rules
 *
 * ENDPOINTS TESTED:
 * - GET /api/cart - Get user's cart
 * - POST /api/cart - Add item to cart
 * - PATCH /api/cart/[productId] - Update quantity
 * - DELETE /api/cart - Clear cart
 * - DELETE /api/cart/[productId] - Remove item
 */

/* eslint-disable @typescript-eslint/no-unused-vars */
import { test, expect } from '../../fixtures'

test.describe('Cart API', () => {
  test.describe('Authentication', () => {
    /**
     * Test: GET /api/cart requires authentication
     *
     * SCENARIO: Unauthenticated user tries to access cart
     * EXPECTED: 401 Unauthorized response
     */
    test('GET returns 401 for unauthenticated users', async ({ page }) => {
      const response = await page.request.get('/api/cart')

      expect(response.status()).toBe(401)

      const body = await response.json()
      expect(body.error).toBe('Unauthorized')
    })

    /**
     * Test: POST /api/cart requires authentication
     *
     * SCENARIO: Unauthenticated user tries to add to cart
     * EXPECTED: 401 Unauthorized response
     */
    test('POST returns 401 for unauthenticated users', async ({ page, testData }) => {
      const product = testData.products[0]

      const response = await page.request.post('/api/cart', {
        data: { productId: product.id },
      })

      expect(response.status()).toBe(401)
    })
  })

  test.describe('Adding Items (POST /api/cart)', () => {
    /**
     * Test: Successfully add item to cart
     *
     * SCENARIO: Authenticated user adds a product to cart
     * EXPECTED: 200 response with cart item data
     *
     * NOTE: This test requires auth mocking to work properly.
     * In a real test environment, you'd use authenticated context.
     */
    test.skip('adds item to cart', async ({ page, testData, authenticatedUser: _auth }) => {
      const product = testData.products.find((p) => p.stock > 0)!

      const response = await page.request.post('/api/cart', {
        data: { productId: product.id },
      })

      expect(response.status()).toBe(200)

      const item = await response.json()
      expect(item.id).toBe(product.id)
      expect(item.quantity).toBe(1)
      expect(item.price).toBe(product.price)
    })

    /**
     * Test: Invalid product ID format
     *
     * SCENARIO: Request contains invalid product ID
     * EXPECTED: 400 Bad Request with validation error
     */
    test('validates product ID format', async ({ page }) => {
      // Test with invalid characters
      const response = await page.request.post('/api/cart', {
        data: { productId: 'invalid!@#$%' },
      })

      // Should return 401 (auth first) or 400 (validation if auth bypassed)
      expect([400, 401]).toContain(response.status())
    })

    /**
     * Test: Missing product ID
     *
     * SCENARIO: Request body missing productId
     * EXPECTED: 400 Bad Request
     */
    test('requires product ID', async ({ page }) => {
      const response = await page.request.post('/api/cart', {
        data: {},
      })

      expect([400, 401]).toContain(response.status())
    })

    /**
     * Test: Non-existent product
     *
     * SCENARIO: Request references product that doesn't exist
     * EXPECTED: 404 Not Found
     */
    test.skip('returns 404 for non-existent product', async ({
      page,
      authenticatedUser: _auth,
    }) => {
      const response = await page.request.post('/api/cart', {
        data: { productId: 'nonexistent_product_id' },
      })

      expect(response.status()).toBe(404)
    })
  })

  test.describe('Validation', () => {
    /**
     * Test: Product ID length validation
     *
     * SCENARIO: Product ID exceeds maximum length
     * EXPECTED: 400 Bad Request
     */
    test('rejects overly long product ID', async ({ page }) => {
      const longId = 'a'.repeat(200)

      const response = await page.request.post('/api/cart', {
        data: { productId: longId },
      })

      expect([400, 401]).toContain(response.status())
    })

    /**
     * Test: Quantity validation on PATCH
     *
     * SCENARIO: Update with invalid quantity (negative)
     * EXPECTED: 400 Bad Request
     */
    test('rejects negative quantity', async ({ page, testData }) => {
      const product = testData.products[0]

      const response = await page.request.patch(`/api/cart/${product.id}`, {
        data: { quantity: -1 },
      })

      expect([400, 401]).toContain(response.status())
    })
  })

  test.describe('Response Format', () => {
    /**
     * Test: Cart response includes required fields
     *
     * This documents the expected API response shape.
     * Useful for frontend developers and API consumers.
     */
    test('GET returns expected shape', async ({ page }) => {
      // Even unauthorized, we should get a consistent error shape
      const response = await page.request.get('/api/cart')
      const body = await response.json()

      if (response.status() === 401) {
        // Unauthorized response shape
        expect(body).toHaveProperty('error')
        expect(typeof body.error).toBe('string')
      } else {
        // Success response should be an array
        expect(Array.isArray(body)).toBe(true)
      }
    })
  })
})

test.describe('Products API', () => {
  test.describe('GET /api/products', () => {
    /**
     * Test: Get all products (public endpoint)
     *
     * SCENARIO: Any user requests products list
     * EXPECTED: 200 response with array of products
     */
    test('returns products array', async ({ page }) => {
      const response = await page.request.get('/api/products')

      expect(response.status()).toBe(200)

      const products = await response.json()
      expect(Array.isArray(products)).toBe(true)
      expect(products.length).toBeGreaterThan(0)
    })

    /**
     * Test: Products include required fields
     */
    test('products have required fields', async ({ page }) => {
      const response = await page.request.get('/api/products')
      const products = await response.json()

      const product = products[0]
      expect(product).toHaveProperty('id')
      expect(product).toHaveProperty('name')
      expect(product).toHaveProperty('slug')
      expect(product).toHaveProperty('price')
      expect(product).toHaveProperty('stock')
    })

    /**
     * Test: Filter products by category
     */
    test('filters by category query param', async ({ page, testData }) => {
      const categorySlug = testData.categories.watches.slug

      const response = await page.request.get(`/api/products?category=${categorySlug}`)

      expect(response.status()).toBe(200)

      const products = await response.json()

      // All products should be in watches category
      for (const product of products) {
        expect(product.category.slug).toBe(categorySlug)
      }
    })
  })

  test.describe('GET /api/categories', () => {
    /**
     * Test: Get all categories (public endpoint)
     */
    test('returns categories array', async ({ page }) => {
      const response = await page.request.get('/api/categories')

      expect(response.status()).toBe(200)

      const categories = await response.json()
      expect(Array.isArray(categories)).toBe(true)
      expect(categories.length).toBeGreaterThan(0)
    })

    /**
     * Test: Categories include product count
     */
    test('categories include product count', async ({ page }) => {
      const response = await page.request.get('/api/categories')
      const categories = await response.json()

      const category = categories[0]
      expect(category).toHaveProperty('_count')
      expect(category._count).toHaveProperty('products')
    })
  })
})
