'use client'

import { useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useCartStore } from '@/store/cartStore'
import styles from '../../../styles/success.module.css'

function SuccessContent() {
  const searchParams = useSearchParams()
  const { clearLocalCart } = useCartStore()
  
  // Derive sessionId directly from searchParams
  const sessionId = searchParams.get('session_id')

  useEffect(() => {
    // Clear the local cart after successful payment
    if (sessionId) {
      clearLocalCart()
    }
  }, [sessionId, clearLocalCart])

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
        <p className={styles.submessage}>
          You&apos;ll receive an email confirmation shortly with your order details.
        </p>

        <div className={styles.actions}>
          <Link href="/orders" className={styles.ordersButton}>
            View My Orders
          </Link>
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