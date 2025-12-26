'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useCartStore } from '@/store/cartStore'
import { useUser } from '@clerk/nextjs'
import Image from 'next/image'
import styles from './checkout.module.css'

export default function CheckoutPage() {
  const router = useRouter()
  const { user, isLoaded } = useUser()
  const { items, totalPrice } = useCartStore()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Redirect if not signed in
  useEffect(() => {
    if (isLoaded && !user) {
      router.push('/sign-in?redirect_url=/checkout')
    }
  }, [isLoaded, user, router])

  // Redirect if cart is empty
  useEffect(() => {
    if (items.length === 0) {
      router.push('/cart')
    }
  }, [items, router])

  const handleCheckout = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create checkout session')
      }

      // Redirect to Stripe Checkout
      if (data.url) {
        window.location.href = data.url
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setLoading(false)
    }
  }

  if (!isLoaded || !user || items.length === 0) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Loading...</div>
      </div>
    )
  }

  const total = totalPrice()
  const tax = total * 0.08 // 8% tax (adjust based on your region)
  const finalTotal = total + tax

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <h1>Checkout</h1>

        <div className={styles.layout}>
          {/* Order Summary */}
          <div className={styles.orderSummary}>
            <h2>Order Summary</h2>
            
            <div className={styles.items}>
              {items.map(item => (
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
                    <h3>{item.name}</h3>
                    <p>Quantity: {item.quantity}</p>
                  </div>
                  <div className={styles.itemPrice}>
                    ${(item.price * item.quantity).toFixed(2)}
                  </div>
                </div>
              ))}
            </div>

            <div className={styles.totals}>
              <div className={styles.totalRow}>
                <span>Subtotal</span>
                <span>${total.toFixed(2)}</span>
              </div>
              <div className={styles.totalRow}>
                <span>Estimated Tax</span>
                <span>${tax.toFixed(2)}</span>
              </div>
              <div className={styles.totalRow + ' ' + styles.finalTotal}>
                <span>Total</span>
                <span>${finalTotal.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Customer Info */}
          <div className={styles.customerInfo}>
            <h2>Customer Information</h2>
            
            <div className={styles.infoCard}>
              <div className={styles.infoRow}>
                <strong>Email:</strong>
                <span>{user.emailAddresses[0]?.emailAddress}</span>
              </div>
              <div className={styles.infoRow}>
                <strong>Name:</strong>
                <span>
                  {user.firstName} {user.lastName}
                </span>
              </div>
            </div>

            <p className={styles.infoText}>
              You&apos;ll provide your shipping address in the next step.
            </p>

            {error && (
              <div className={styles.error}>
                {error}
              </div>
            )}

            <button
              onClick={handleCheckout}
              disabled={loading}
              className={styles.checkoutButton}
            >
              {loading ? 'Processing...' : 'Proceed to Payment'}
            </button>

            <p className={styles.secureText}>
              🔒 Secure checkout powered by Stripe
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}