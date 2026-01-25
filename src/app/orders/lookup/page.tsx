'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { SignInButton } from '@clerk/nextjs'
import { Package, Truck, CheckCircle, Clock, ExternalLink } from 'lucide-react'
import { getTrackingUrl, getCarrierName, getStatusSteps } from '@/lib/tracking'
import styles from '../../../styles/orders.module.css'

type OrderItem = {
  id: string
  productId: string
  name: string
  price: number
  quantity: number
  imageUrl: string | null
}

type ShippingAddress = {
  address?: {
    line1?: string
    line2?: string
    city?: string
    state?: string
    postal_code?: string
    country?: string
  }
  name?: string
}

type ShippingCarrier = 'USPS' | 'UPS' | 'FEDEX' | 'DHL' | 'OTHER' | null

type Order = {
  id: string
  status: string
  total: number
  customerEmail: string
  customerName: string | null
  shippingAddress: ShippingAddress | null
  createdAt: string
  items: OrderItem[]
  trackingNumber: string | null
  shippingCarrier: ShippingCarrier
  shippedAt: string | null
  deliveredAt: string | null
}

function LookupContent() {
  const searchParams = useSearchParams()

  const [email, setEmail] = useState('')
  const [orderId, setOrderId] = useState('')
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Pre-fill from URL params if available
  useEffect(() => {
    const urlEmail = searchParams.get('email')
    const urlOrderId = searchParams.get('orderId')

    if (urlEmail) setEmail(urlEmail)
    if (urlOrderId) setOrderId(urlOrderId)

    // Auto-search if both params are provided
    if (urlEmail && urlOrderId) {
      handleLookup(urlEmail, urlOrderId)
    }
  }, [searchParams])

  const handleLookup = async (lookupEmail?: string, lookupOrderId?: string) => {
    const emailToUse = lookupEmail || email
    const orderIdToUse = lookupOrderId || orderId

    if (!emailToUse || !orderIdToUse) {
      setError('Please enter both email and order number')
      return
    }

    setLoading(true)
    setError(null)
    setOrder(null)

    try {
      const response = await fetch(
        `/api/orders?email=${encodeURIComponent(emailToUse)}&orderId=${encodeURIComponent(orderIdToUse)}`
      )
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Order not found')
      }

      setOrder(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to find order')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    handleLookup()
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PROCESSING': return styles.statusProcessing
      case 'SHIPPED': return styles.statusShipped
      case 'DELIVERED': return styles.statusDelivered
      case 'CANCELLED': return styles.statusCancelled
      case 'REFUNDED': return styles.statusRefunded
      default: return styles.statusPending
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <h1>Track Your Order</h1>

        {!order ? (
          // Lookup Form
          <div className={styles.lookupSection}>
            <form onSubmit={handleSubmit} className={styles.lookupForm}>
              <div className={styles.formGroup}>
                <label htmlFor="email">Email Address</label>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter the email used for your order"
                  required
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="orderId">Order Number</label>
                <input
                  type="text"
                  id="orderId"
                  value={orderId}
                  onChange={(e) => setOrderId(e.target.value)}
                  placeholder="Enter your order number"
                  required
                />
              </div>

              {error && <div className={styles.errorMessage}>{error}</div>}

              <button
                type="submit"
                disabled={loading}
                className={styles.lookupSubmitButton}
              >
                {loading ? 'Looking up...' : 'Find Order'}
              </button>
            </form>

            <div className={styles.lookupHelp}>
              <p>
                Your order number can be found in your confirmation email.
              </p>
              <p className={styles.signInPrompt}>
                Have an account?{' '}
                <SignInButton mode="modal">
                  <button type="button" className={styles.linkButton}>
                    Sign in
                  </button>
                </SignInButton>
                {' '}to see all your orders.
              </p>
            </div>
          </div>
        ) : (
          // Order Details
          <div className={styles.orderResult}>
            <button
              onClick={() => setOrder(null)}
              className={styles.backButton}
            >
              &larr; Look up another order
            </button>

            <div className={styles.order}>
              <div className={styles.orderHeader}>
                <div className={styles.orderInfo}>
                  <h3>Order #{order.id.slice(-8)}</h3>
                  <p className={styles.orderDate}>
                    {new Date(order.createdAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                </div>
                <div className={styles.orderMeta}>
                  <span className={`${styles.status} ${getStatusColor(order.status)}`}>
                    {order.status}
                  </span>
                  <span className={styles.total}>${order.total.toFixed(2)}</span>
                </div>
              </div>

              {/* Tracking Timeline */}
              {order.status !== 'CANCELLED' && (
                <div className={styles.trackingSection}>
                  <div className={styles.timeline}>
                    {getStatusSteps(order.status).map((step, index) => (
                      <div
                        key={step.key}
                        className={`${styles.timelineStep} ${step.completed ? styles.completed : ''} ${step.current ? styles.current : ''}`}
                      >
                        <div className={styles.timelineIcon}>
                          {step.key === 'PENDING' && <Clock size={16} />}
                          {step.key === 'PROCESSING' && <Package size={16} />}
                          {step.key === 'SHIPPED' && <Truck size={16} />}
                          {step.key === 'DELIVERED' && <CheckCircle size={16} />}
                        </div>
                        <div className={styles.timelineContent}>
                          <span className={styles.timelineLabel}>{step.label}</span>
                          {step.current && (
                            <span className={styles.timelineDate}>
                              {step.key === 'SHIPPED' && order.shippedAt
                                ? new Date(order.shippedAt).toLocaleDateString()
                                : step.key === 'DELIVERED' && order.deliveredAt
                                ? new Date(order.deliveredAt).toLocaleDateString()
                                : ''}
                            </span>
                          )}
                        </div>
                        {index < 3 && <div className={styles.timelineConnector} />}
                      </div>
                    ))}
                  </div>

                  {/* Tracking Number */}
                  {order.trackingNumber && (
                    <div className={styles.trackingInfo}>
                      <span className={styles.trackingLabel}>
                        Tracking ({getCarrierName(order.shippingCarrier)}):
                      </span>
                      <span className={styles.trackingNumber}>{order.trackingNumber}</span>
                      {getTrackingUrl(order.shippingCarrier, order.trackingNumber) && (
                        <a
                          href={getTrackingUrl(order.shippingCarrier, order.trackingNumber)!}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={styles.trackButton}
                        >
                          Track Package <ExternalLink size={14} />
                        </a>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Shipping Address */}
              {order.shippingAddress?.address && (
                <div className={styles.shippingInfo}>
                  <strong>Shipping to:</strong>
                  <span>
                    {order.shippingAddress.name && `${order.shippingAddress.name}, `}
                    {order.shippingAddress.address.line1}
                    {order.shippingAddress.address.line2 && `, ${order.shippingAddress.address.line2}`}
                    {order.shippingAddress.address.city && `, ${order.shippingAddress.address.city}`}
                    {order.shippingAddress.address.state && `, ${order.shippingAddress.address.state}`}
                    {order.shippingAddress.address.postal_code && ` ${order.shippingAddress.address.postal_code}`}
                  </span>
                </div>
              )}

              <div className={styles.orderItems}>
                {order.items.map(item => (
                  <div key={item.id} className={styles.item}>
                    {item.imageUrl && (
                      <Image
                        src={item.imageUrl}
                        alt={item.name}
                        width={60}
                        height={60}
                        className={styles.itemImage}
                      />
                    )}
                    <div className={styles.itemDetails}>
                      <h4>{item.name}</h4>
                      <p>Quantity: {item.quantity}</p>
                    </div>
                    <div className={styles.itemPrice}>
                      ${(item.price * item.quantity).toFixed(2)}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className={styles.createAccountPrompt}>
              <p>Want to track all your orders in one place?</p>
              <SignInButton mode="modal">
                <button className={styles.signInButton}>
                  Create an Account
                </button>
              </SignInButton>
            </div>
          </div>
        )}

        <Link href="/" className={styles.continueShoppingLink}>
          Continue Shopping
        </Link>
      </div>
    </div>
  )
}

export default function LookupPage() {
  return (
    <Suspense fallback={
      <div className={styles.container}>
        <div className={styles.loading}>Loading...</div>
      </div>
    }>
      <LookupContent />
    </Suspense>
  )
}
