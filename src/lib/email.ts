import { Resend } from 'resend'

// Lazy initialize Resend client to avoid build-time errors when API key is not set
let resendClient: Resend | null = null

function getResendClient(): Resend {
  if (!resendClient) {
    const apiKey = process.env.RESEND_API_KEY
    if (!apiKey) {
      throw new Error('RESEND_API_KEY environment variable is not set')
    }
    resendClient = new Resend(apiKey)
  }
  return resendClient
}

const FROM_EMAIL = process.env.FROM_EMAIL || 'orders@yourdomain.com'
const STORE_NAME = process.env.NEXT_PUBLIC_STORE_NAME || 'LuxeMarket'
const STORE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

/**
 * Sanitize a string for safe inclusion in HTML
 * Prevents XSS attacks by escaping special HTML characters
 */
function escapeHtml(unsafe: string | null | undefined): string {
  if (!unsafe) return ''
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

/**
 * Sanitize a URL for safe inclusion in href attributes
 * Only allows http, https, and mailto protocols
 */
function sanitizeUrl(url: string | null | undefined): string {
  if (!url) return '#'
  const trimmed = url.trim().toLowerCase()
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('mailto:')) {
    return url
  }
  return '#'
}

export type OrderEmailData = {
  orderId: string
  customerEmail: string
  customerName: string | null
  items: Array<{
    name: string
    quantity: number
    price: number
    imageUrl: string | null
  }>
  total: number
  shippingAddress?: {
    name?: string
    line1?: string
    line2?: string
    city?: string
    state?: string
    postalCode?: string
    country?: string
  }
}

export type ShippingEmailData = OrderEmailData & {
  trackingNumber: string
  carrier: string
  trackingUrl: string | null
  estimatedDelivery?: string
}

// Order Confirmation Email
export async function sendOrderConfirmationEmail(data: OrderEmailData) {
  const { orderId, customerEmail, customerName, items, total, shippingAddress } = data

  const orderUrl = `${STORE_URL}/orders/lookup?email=${encodeURIComponent(customerEmail)}&orderId=${encodeURIComponent(orderId)}`

  const itemsHtml = items.map(item => `
    <tr>
      <td style="padding: 16px; border-bottom: 1px solid #e5e5e5;">
        <div style="display: flex; align-items: center; gap: 12px;">
          ${item.imageUrl ? `<img src="${sanitizeUrl(item.imageUrl)}" alt="${escapeHtml(item.name)}" width="60" height="60" style="border-radius: 4px; object-fit: cover;" />` : ''}
          <div>
            <p style="margin: 0; font-weight: 500; color: #1a1a1a;">${escapeHtml(item.name)}</p>
            <p style="margin: 4px 0 0; color: #666; font-size: 14px;">Qty: ${item.quantity}</p>
          </div>
        </div>
      </td>
      <td style="padding: 16px; border-bottom: 1px solid #e5e5e5; text-align: right; font-weight: 500;">
        $${(item.price * item.quantity).toFixed(2)}
      </td>
    </tr>
  `).join('')

  const shippingHtml = shippingAddress ? `
    <div style="background: #f9f9f9; padding: 20px; margin-top: 24px;">
      <h3 style="margin: 0 0 12px; font-size: 14px; text-transform: uppercase; letter-spacing: 1px; color: #666;">Shipping Address</h3>
      <p style="margin: 0; color: #1a1a1a; line-height: 1.6;">
        ${shippingAddress.name ? `${escapeHtml(shippingAddress.name)}<br>` : ''}
        ${escapeHtml(shippingAddress.line1)}<br>
        ${shippingAddress.line2 ? `${escapeHtml(shippingAddress.line2)}<br>` : ''}
        ${escapeHtml(shippingAddress.city)}, ${escapeHtml(shippingAddress.state)} ${escapeHtml(shippingAddress.postalCode)}<br>
        ${escapeHtml(shippingAddress.country)}
      </p>
    </div>
  ` : ''

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
      <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <div style="background: #ffffff; border: 1px solid #e5e5e5;">
          <!-- Header -->
          <div style="padding: 32px; text-align: center; border-bottom: 1px solid #e5e5e5;">
            <h1 style="margin: 0; font-size: 24px; font-weight: 600; color: #1a1a1a; letter-spacing: 2px;">${STORE_NAME}</h1>
          </div>

          <!-- Content -->
          <div style="padding: 32px;">
            <h2 style="margin: 0 0 8px; font-size: 24px; font-weight: 400; color: #1a1a1a;">Thank you for your order!</h2>
            <p style="margin: 0 0 24px; color: #666; font-size: 16px;">
              Hi ${escapeHtml(customerName) || 'there'}, we've received your order and are getting it ready.
            </p>

            <div style="background: #f9f9f9; padding: 16px; margin-bottom: 24px;">
              <p style="margin: 0; font-size: 14px; color: #666;">
                <strong style="color: #1a1a1a;">Order Number:</strong> #${orderId.slice(-8)}
              </p>
            </div>

            <!-- Order Items -->
            <table style="width: 100%; border-collapse: collapse;">
              <thead>
                <tr>
                  <th style="padding: 12px 16px; text-align: left; border-bottom: 2px solid #1a1a1a; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; color: #666;">Item</th>
                  <th style="padding: 12px 16px; text-align: right; border-bottom: 2px solid #1a1a1a; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; color: #666;">Price</th>
                </tr>
              </thead>
              <tbody>
                ${itemsHtml}
              </tbody>
              <tfoot>
                <tr>
                  <td style="padding: 16px; font-weight: 600; font-size: 18px;">Total</td>
                  <td style="padding: 16px; text-align: right; font-weight: 600; font-size: 18px;">$${total.toFixed(2)}</td>
                </tr>
              </tfoot>
            </table>

            ${shippingHtml}

            <!-- CTA Button -->
            <div style="text-align: center; margin-top: 32px;">
              <a href="${sanitizeUrl(orderUrl)}" style="display: inline-block; padding: 16px 32px; background: #c9a962; color: #1a1a1a; text-decoration: none; font-weight: 600; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">
                Track Your Order
              </a>
            </div>
          </div>

          <!-- Footer -->
          <div style="padding: 24px 32px; background: #f9f9f9; text-align: center; border-top: 1px solid #e5e5e5;">
            <p style="margin: 0; font-size: 14px; color: #666;">
              Questions? Contact us at <a href="mailto:support@${STORE_NAME.toLowerCase()}.com" style="color: #c9a962;">support@${STORE_NAME.toLowerCase()}.com</a>
            </p>
            <p style="margin: 12px 0 0; font-size: 12px; color: #999;">
              &copy; ${new Date().getFullYear()} ${STORE_NAME}. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `

  try {
    const result = await getResendClient().emails.send({
      from: `${STORE_NAME} <${FROM_EMAIL}>`,
      to: customerEmail,
      subject: `Order Confirmed - #${orderId.slice(-8)}`,
      html,
    })

    // Check for API error in response (Resend returns { data, error } structure)
    if (result.error) {
      console.error('Order confirmation email failed:', result.error)
      return { success: false, error: result.error }
    }

    console.log('Order confirmation email sent:', result.data)
    return { success: true, data: result.data }
  } catch (error) {
    console.error('Failed to send order confirmation email:', error)
    return { success: false, error }
  }
}

// Shipping Notification Email
export async function sendShippingNotificationEmail(data: ShippingEmailData) {
  const { orderId, customerEmail, customerName, items, trackingNumber, carrier, trackingUrl, estimatedDelivery } = data

  const orderUrl = `${STORE_URL}/orders/lookup?email=${encodeURIComponent(customerEmail)}&orderId=${encodeURIComponent(orderId)}`

  const shippingItemsHtml = items.map(item => `
    <tr>
      <td style="padding: 12px; border-bottom: 1px solid #e5e5e5;">
        <p style="margin: 0; font-weight: 500; color: #1a1a1a;">${escapeHtml(item.name)}</p>
        <p style="margin: 4px 0 0; color: #666; font-size: 14px;">Qty: ${item.quantity}</p>
      </td>
    </tr>
  `).join('')

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
      <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <div style="background: #ffffff; border: 1px solid #e5e5e5;">
          <!-- Header -->
          <div style="padding: 32px; text-align: center; border-bottom: 1px solid #e5e5e5;">
            <h1 style="margin: 0; font-size: 24px; font-weight: 600; color: #1a1a1a; letter-spacing: 2px;">${STORE_NAME}</h1>
          </div>

          <!-- Content -->
          <div style="padding: 32px;">
            <div style="text-align: center; margin-bottom: 24px;">
              <div style="width: 64px; height: 64px; background: #2d5a3d; border-radius: 50%; margin: 0 auto 16px; display: flex; align-items: center; justify-content: center;">
                <span style="font-size: 32px;">📦</span>
              </div>
              <h2 style="margin: 0 0 8px; font-size: 24px; font-weight: 400; color: #1a1a1a;">Your order is on its way!</h2>
              <p style="margin: 0; color: #666; font-size: 16px;">
                Hi ${escapeHtml(customerName) || 'there'}, great news! Your order has been shipped.
              </p>
            </div>

            <!-- Tracking Info -->
            <div style="background: #f9f9f9; padding: 24px; margin-bottom: 24px; text-align: center;">
              <p style="margin: 0 0 8px; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; color: #666;">
                ${escapeHtml(carrier)} Tracking Number
              </p>
              <p style="margin: 0 0 16px; font-size: 18px; font-weight: 600; color: #1a1a1a; font-family: monospace;">
                ${escapeHtml(trackingNumber)}
              </p>
              ${estimatedDelivery ? `
                <p style="margin: 0 0 16px; font-size: 14px; color: #666;">
                  Estimated delivery: <strong style="color: #1a1a1a;">${escapeHtml(estimatedDelivery)}</strong>
                </p>
              ` : ''}
              ${trackingUrl ? `
                <a href="${sanitizeUrl(trackingUrl)}" target="_blank" style="display: inline-block; padding: 12px 24px; background: #c9a962; color: #1a1a1a; text-decoration: none; font-weight: 600; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">
                  Track Package
                </a>
              ` : ''}
            </div>

            <div style="background: #f9f9f9; padding: 16px; margin-bottom: 24px;">
              <p style="margin: 0; font-size: 14px; color: #666;">
                <strong style="color: #1a1a1a;">Order Number:</strong> #${orderId.slice(-8)}
              </p>
            </div>

            <!-- Order Items -->
            <h3 style="margin: 0 0 16px; font-size: 14px; text-transform: uppercase; letter-spacing: 1px; color: #666;">Items Shipped</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tbody>
                ${shippingItemsHtml}
              </tbody>
            </table>

            <!-- View Order Button -->
            <div style="text-align: center; margin-top: 32px;">
              <a href="${sanitizeUrl(orderUrl)}" style="display: inline-block; padding: 16px 32px; background: #1a1a1a; color: #ffffff; text-decoration: none; font-weight: 600; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">
                View Order Details
              </a>
            </div>
          </div>

          <!-- Footer -->
          <div style="padding: 24px 32px; background: #f9f9f9; text-align: center; border-top: 1px solid #e5e5e5;">
            <p style="margin: 0; font-size: 14px; color: #666;">
              Questions about your shipment? Contact us at <a href="mailto:support@${STORE_NAME.toLowerCase()}.com" style="color: #c9a962;">support@${STORE_NAME.toLowerCase()}.com</a>
            </p>
            <p style="margin: 12px 0 0; font-size: 12px; color: #999;">
              &copy; ${new Date().getFullYear()} ${STORE_NAME}. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `

  try {
    const result = await getResendClient().emails.send({
      from: `${STORE_NAME} <${FROM_EMAIL}>`,
      to: customerEmail,
      subject: `Your Order Has Shipped - #${orderId.slice(-8)}`,
      html,
    })

    // Check for API error in response
    if (result.error) {
      console.error('Shipping notification email failed:', result.error)
      return { success: false, error: result.error }
    }

    console.log('Shipping notification email sent:', result.data)
    return { success: true, data: result.data }
  } catch (error) {
    console.error('Failed to send shipping notification email:', error)
    return { success: false, error }
  }
}

// Delivery Confirmation Email
export async function sendDeliveryConfirmationEmail(data: OrderEmailData) {
  const { orderId, customerEmail, customerName, items } = data

  const shopUrl = `${STORE_URL}/products`

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
      <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <div style="background: #ffffff; border: 1px solid #e5e5e5;">
          <!-- Header -->
          <div style="padding: 32px; text-align: center; border-bottom: 1px solid #e5e5e5;">
            <h1 style="margin: 0; font-size: 24px; font-weight: 600; color: #1a1a1a; letter-spacing: 2px;">${STORE_NAME}</h1>
          </div>

          <!-- Content -->
          <div style="padding: 32px; text-align: center;">
            <div style="width: 64px; height: 64px; background: #2d5a3d; border-radius: 50%; margin: 0 auto 16px; display: flex; align-items: center; justify-content: center;">
              <span style="font-size: 32px;">✓</span>
            </div>
            <h2 style="margin: 0 0 8px; font-size: 24px; font-weight: 400; color: #1a1a1a;">Your order has been delivered!</h2>
            <p style="margin: 0 0 24px; color: #666; font-size: 16px;">
              Hi ${escapeHtml(customerName) || 'there'}, your order #${escapeHtml(orderId.slice(-8))} has been delivered.
            </p>

            <p style="margin: 0 0 32px; color: #666; font-size: 16px;">
              We hope you love your ${items.length === 1 ? 'item' : 'items'}! If you have any questions or concerns, please don't hesitate to reach out.
            </p>

            <!-- CTA Button -->
            <a href="${sanitizeUrl(shopUrl)}" style="display: inline-block; padding: 16px 32px; background: #c9a962; color: #1a1a1a; text-decoration: none; font-weight: 600; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">
              Shop Again
            </a>
          </div>

          <!-- Footer -->
          <div style="padding: 24px 32px; background: #f9f9f9; text-align: center; border-top: 1px solid #e5e5e5;">
            <p style="margin: 0; font-size: 14px; color: #666;">
              Thank you for shopping with us!
            </p>
            <p style="margin: 12px 0 0; font-size: 12px; color: #999;">
              &copy; ${new Date().getFullYear()} ${STORE_NAME}. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `

  try {
    const result = await getResendClient().emails.send({
      from: `${STORE_NAME} <${FROM_EMAIL}>`,
      to: customerEmail,
      subject: `Your Order Has Been Delivered - #${orderId.slice(-8)}`,
      html,
    })

    // Check for API error in response
    if (result.error) {
      console.error('Delivery confirmation email failed:', result.error)
      return { success: false, error: result.error }
    }

    console.log('Delivery confirmation email sent:', result.data)
    return { success: true, data: result.data }
  } catch (error) {
    console.error('Failed to send delivery confirmation email:', error)
    return { success: false, error }
  }
}
