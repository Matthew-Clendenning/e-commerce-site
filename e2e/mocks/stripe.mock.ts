/**
 * Stripe Payment Mocks
 *
 * This module provides utilities to mock Stripe payments in tests.
 *
 * WHY MOCK STRIPE?
 * - Cost: Real Stripe calls cost money (even in test mode, it adds up)
 * - Speed: Stripe redirects add several seconds to each test
 * - Reliability: No dependency on external Stripe service
 * - Control: We can simulate success, failure, and edge cases
 *
 * HOW IT WORKS:
 * 1. Intercept the /api/checkout route
 * 2. Return a mock session that redirects to our success page
 * 3. Skip the actual Stripe checkout flow
 *
 * FOR REAL STRIPE TESTING:
 * If you need to test real Stripe integration (recommended occasionally),
 * use Stripe's test mode with test card numbers. Don't use these mocks.
 */

import type { Page, Route } from '@playwright/test'

/**
 * Mock Stripe Session Response
 *
 * This matches the shape of what our /api/checkout endpoint returns
 */
interface MockCheckoutResponse {
  sessionId: string
  url: string
}

/**
 * Mock a successful Stripe checkout session
 *
 * WHAT THIS DOES:
 * - Intercepts POST /api/checkout
 * - Returns a fake session that redirects to /order/success
 * - Bypasses actual Stripe checkout completely
 *
 * WHEN TO USE:
 * - Testing the checkout flow without hitting Stripe
 * - Testing order success page behavior
 * - Speed-focused integration tests
 *
 * @param page - Playwright page
 */
export async function mockStripeCheckout(page: Page): Promise<void> {
  await page.route('**/api/checkout', async (route: Route) => {
    const request = route.request()

    if (request.method() === 'POST') {
      // Return mock successful checkout response
      const mockResponse: MockCheckoutResponse = {
        sessionId: 'cs_test_mock_session_123',
        // Redirect to success page instead of Stripe
        url: '/order/success?session_id=cs_test_mock_session_123',
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockResponse),
      })
    } else {
      // Pass through non-POST requests
      await route.continue()
    }
  })
}

/**
 * Mock a failed checkout (e.g., out of stock, invalid cart)
 *
 * WHEN TO USE:
 * - Testing error handling in checkout flow
 * - Testing UI behavior on checkout failure
 *
 * @param page - Playwright page
 * @param errorMessage - Error message to return
 */
export async function mockStripeCheckoutFailure(
  page: Page,
  errorMessage: string = 'Failed to create checkout session'
): Promise<void> {
  await page.route('**/api/checkout', async (route: Route) => {
    const request = route.request()

    if (request.method() === 'POST') {
      await route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({ error: errorMessage }),
      })
    } else {
      await route.continue()
    }
  })
}

/**
 * Intercept Stripe redirect
 *
 * If the app tries to redirect to checkout.stripe.com,
 * redirect to our success page instead.
 *
 * WHEN TO USE:
 * - If your checkout doesn't use our mock (e.g., testing real flow)
 * - As a safety net to prevent actual Stripe navigation
 *
 * @param page - Playwright page
 */
export async function interceptStripeRedirect(page: Page): Promise<void> {
  await page.route('https://checkout.stripe.com/**', async (route) => {
    // Instead of going to Stripe, redirect to success
    // This simulates a completed payment
    await route.fulfill({
      status: 302,
      headers: {
        location: '/order/success?session_id=cs_test_mock_session_123',
      },
    })
  })
}

/**
 * Simulate a Stripe webhook event
 *
 * After "completing" checkout, Stripe sends a webhook to confirm payment.
 * This function simulates that webhook for testing order completion flow.
 *
 * IMPORTANT: This only works if your webhook endpoint has test mode support.
 * In test mode, it should skip signature verification.
 *
 * WHEN TO USE:
 * - Testing order status updates after payment
 * - Testing stock decrement after purchase
 * - Testing cart clearing after successful payment
 *
 * @param page - Playwright page
 * @param orderId - The order ID to complete
 * @param userId - The user who placed the order
 */
export async function simulateStripeWebhook(
  page: Page,
  orderId: string,
  userId: string
): Promise<void> {
  // Create a mock checkout.session.completed event
  const webhookPayload = {
    type: 'checkout.session.completed',
    data: {
      object: {
        id: 'cs_test_mock_session_123',
        payment_intent: 'pi_test_mock_123',
        metadata: {
          orderId,
          userId,
        },
        customer_details: {
          email: 'testuser@example.com',
          name: 'Test User',
        },
        // Mock shipping details (collected by Stripe)
        shipping_details: {
          address: {
            line1: '123 Test Street',
            city: 'Test City',
            state: 'TS',
            postal_code: '12345',
            country: 'US',
          },
          name: 'Test User',
        },
      },
    },
  }

  // Send the webhook request
  // Note: In test mode, our webhook should check for x-test-webhook header
  // and skip signature verification
  await page.request.post('/api/webhooks/stripe', {
    headers: {
      'Content-Type': 'application/json',
      'x-test-webhook': 'true',
    },
    data: webhookPayload,
  })
}

/**
 * Set up complete Stripe test mode
 *
 * Combines all Stripe mocking for a complete checkout flow test.
 *
 * @param page - Playwright page
 */
export async function setupStripeTestMode(page: Page): Promise<void> {
  await mockStripeCheckout(page)
  await interceptStripeRedirect(page)
}

/**
 * Clear Stripe mocks
 *
 * Remove route interceptions to restore normal behavior.
 * Useful when switching from mocked to real tests.
 *
 * @param page - Playwright page
 */
export async function clearStripeMocks(page: Page): Promise<void> {
  await page.unroute('**/api/checkout')
  await page.unroute('https://checkout.stripe.com/**')
}

/**
 * Mock Stripe webhook for order cancellation
 *
 * Simulates what happens when a Stripe session expires or payment fails.
 *
 * @param page - Playwright page
 * @param orderId - The order ID to cancel
 */
export async function simulateStripePaymentFailure(page: Page, orderId: string): Promise<void> {
  const webhookPayload = {
    type: 'checkout.session.expired',
    data: {
      object: {
        id: 'cs_test_mock_session_123',
        metadata: {
          orderId,
        },
      },
    },
  }

  await page.request.post('/api/webhooks/stripe', {
    headers: {
      'Content-Type': 'application/json',
      'x-test-webhook': 'true',
    },
    data: webhookPayload,
  })
}
