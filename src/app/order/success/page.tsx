'use client'

import { useEffect, useState, Suspense, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useCartStore } from '@/store/cartStore'
import { useUser, SignUpButton } from '@clerk/nextjs'
import styles from '../../../styles/success.module.css'

type OrderDetails = {
  id: string
  status: string
  total: number
  customerEmail: string
  customerName: string | null
  isGuest: boolean
  createdAt: string
  items: Array<{
    id: string
    name: string
    price: number
    quantity: number
  }>
}

function SuccessContent() {
  const searchParams = useSearchParams()
  const { clearLocalCart } = useCartStore()
  const { user, isLoaded: userLoaded } = useUser()

  const [order, setOrder] = useState<OrderDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [linkingOrders, setLinkingOrders] = useState(false)
  const [ordersLinked, setOrdersLinked] = useState(false)

  // Derive sessionId directly from searchParams
  const sessionId = searchParams.get('session_id')

  // Get guest token from sessionStorage
  const [guestToken, setGuestToken] = useState<string | null>(null)
  const [guestEmail, setGuestEmail] = useState<string | null>(null)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setGuestToken(sessionStorage.getItem('guestToken'))
      setGuestEmail(sessionStorage.getItem('guestEmail'))
    }
  }, [])

  // Fetch order details
  const fetchOrder = useCallback(async () => {
    if (!guestToken) {
      setLoading(false)
      return
    }

    try {
      const response = await fetch(`/api/orders?guestToken=${guestToken}`)
      if (response.ok) {
        const data = await response.json()
        setOrder(data)
      }
    } catch {
      // Failed to fetch order details
    } finally {
      setLoading(false)
    }
  }, [guestToken])

  useEffect(() => {
    // Clear the local cart after successful payment
    if (sessionId) {
      clearLocalCart()
    }
  }, [sessionId, clearLocalCart])

  useEffect(() => {
    if (guestToken) {
      fetchOrder()
    } else {
      setLoading(false)
    }
  }, [guestToken, fetchOrder])

  // Link guest orders when user signs up
  const linkGuestOrders = async () => {
    if (!user || ordersLinked || linkingOrders) return

    setLinkingOrders(true)
    try {
      const response = await fetch('/api/guest/link-account', {
        method: 'POST',
      })
      if (response.ok) {
        setOrdersLinked(true)
        // Clear guest session data
        sessionStorage.removeItem('guestToken')
        sessionStorage.removeItem('guestEmail')
      }
    } catch {
      // Failed to link orders
    } finally {
      setLinkingOrders(false)
    }
  }

  // Auto-link orders when user is signed in and was a guest
  useEffect(() => {
    if (userLoaded && user && guestToken && !ordersLinked) {
      linkGuestOrders()
    }
  }, [userLoaded, user, guestToken, ordersLinked])

  if (!sessionId) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>
          <h1>Invalid Session</h1>
          <p>No order session found.</p>
          <Link href="/" className={styles.homeButton}>
            Return to Home
          </Link>
        </div>
      </div>
    )
  }

  const isGuestOrder = guestToken && !user

  return (
    <div className={styles.container}>
      <div className={styles.success}>
        <div className={styles.checkmark}>
          <svg width="80" height="80" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="#22c55e" strokeWidth="2" fill="none"/>
            <path d="M8 12.5l2.5 2.5L16 9" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>

        <h1>Order Successful!</h1>
        <p className={styles.message}>
          Thank you for your purchase. Your order has been received and is being processed.
        </p>

        {/* Order Details */}
        {order && !loading && (
          <div className={styles.orderDetails}>
            <div className={styles.orderRow}>
              <span>Order Number:</span>
              <strong>#{order.id.slice(-8).toUpperCase()}</strong>
            </div>
            <div className={styles.orderRow}>
              <span>Total:</span>
              <strong>${order.total.toFixed(2)}</strong>
            </div>
            <div className={styles.orderRow}>
              <span>Email:</span>
              <strong>{order.customerEmail}</strong>
            </div>
          </div>
        )}

        <p className={styles.submessage}>
          {guestEmail || order?.customerEmail
            ? `A confirmation email will be sent to ${guestEmail || order?.customerEmail}.`
            : "You'll receive an email confirmation shortly with your order details."}
        </p>

        {/* Account Creation Prompt for Guests */}
        {isGuestOrder && (
          <div className={styles.accountPrompt}>
            <p>Create an account to easily track your orders and checkout faster next time.</p>
            <SignUpButton mode="modal">
              <button className={styles.createAccountButton}>
                Create Account
              </button>
            </SignUpButton>
          </div>
        )}

        {/* Show linked status */}
        {ordersLinked && (
          <p className={styles.linkedMessage}>
            Your order has been linked to your account.
          </p>
        )}

        <div className={styles.actions}>
          {user ? (
            <Link href="/orders" className={styles.ordersButton}>
              View My Orders
            </Link>
          ) : order ? (
            <Link
              href={`/orders/lookup?orderId=${order.id}&email=${encodeURIComponent(order.customerEmail)}`}
              className={styles.ordersButton}
            >
              Track This Order
            </Link>
          ) : null}
          <Link href="/" className={styles.homeButton}>
            Continue Shopping
          </Link>
        </div>
      </div>
    </div>
  )
}

export default function SuccessPage() {
  return (
    <Suspense fallback={
      <div className={styles.container}>
        <div className={styles.loading}>Loading...</div>
      </div>
    }>
      <SuccessContent />
    </Suspense>
  )
}
