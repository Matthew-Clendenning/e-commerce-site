'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useCartStore } from '@/store/cartStore'
import { useUser, SignInButton } from '@clerk/nextjs'
import Image from 'next/image'
import { toast } from 'sonner'
import styles from '../../styles/checkout.module.css'

/**
 * Get test user from cookie (for E2E testing)
 * Only works when BYPASS_AUTH is enabled in test mode
 */
function getTestUser(): { email: string; firstName: string; lastName: string } | null {
  if (typeof document === 'undefined') return null

  const cookies = document.cookie.split(';').reduce((acc, cookie) => {
    const [key, val] = cookie.trim().split('=')
    acc[key] = val
    return acc
  }, {} as Record<string, string>)

  const testUserCookie = cookies['__test_auth_user']
  if (!testUserCookie) return null

  try {
    return JSON.parse(decodeURIComponent(testUserCookie))
  } catch {
    return null
  }
}

export default function CheckoutPage() {
  const router = useRouter()
  const { user, isLoaded } = useUser()
  const { items, totalPrice, hasHydrated } = useCartStore()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [testUser, setTestUser] = useState<ReturnType<typeof getTestUser>>(null)

  // Guest checkout form state
  const [guestEmail, setGuestEmail] = useState('')
  const [guestName, setGuestName] = useState('')
  const [emailError, setEmailError] = useState<string | null>(null)

  // Check for test user on mount
  useEffect(() => {
    setTestUser(getTestUser())
  }, [])

  // The effective user is either Clerk user or test user
  const effectiveUser = user || testUser
  const isGuest = !effectiveUser

  // Redirect if cart is empty (only after hydration completes)
  useEffect(() => {
    if (hasHydrated && items.length === 0) {
      router.push('/cart')
    }
  }, [hasHydrated, items, router])

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  const handleCheckout = async () => {
    setLoading(true)
    setError(null)
    setEmailError(null)

    // Validate guest email if not authenticated
    if (isGuest) {
      if (!guestEmail) {
        setEmailError('Email is required')
        setLoading(false)
        return
      }
      if (!validateEmail(guestEmail)) {
        setEmailError('Please enter a valid email address')
        setLoading(false)
        return
      }
    }

    try {
      const body: Record<string, unknown> = {}

      if (isGuest) {
        // For guest checkout, send cart items and customer info
        body.email = guestEmail
        body.name = guestName || undefined
        body.items = items.map(item => ({
          id: item.id,
          quantity: item.quantity
        }))
      }

      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create checkout session')
      }

      // Store guestToken in sessionStorage for success page
      if (data.guestToken) {
        sessionStorage.setItem('guestToken', data.guestToken)
        sessionStorage.setItem('guestEmail', guestEmail)
      }

      // Redirect to Stripe Checkout
      if (data.url) {
        window.location.href = data.url
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Something went wrong'
      setError(errorMessage)
      toast.error(errorMessage)
      setLoading(false)
    }
  }

  if (!isLoaded || !hasHydrated || items.length === 0) {
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

            {effectiveUser ? (
              // Authenticated user info
              <div className={styles.infoCard}>
                <div className={styles.infoRow}>
                  <strong>Email:</strong>
                  <span>{user?.emailAddresses?.[0]?.emailAddress || testUser?.email}</span>
                </div>
                <div className={styles.infoRow}>
                  <strong>Name:</strong>
                  <span>
                    {user?.firstName || testUser?.firstName} {user?.lastName || testUser?.lastName}
                  </span>
                </div>
              </div>
            ) : (
              // Guest checkout form
              <div className={styles.guestForm}>
                <div className={styles.formGroup}>
                  <label htmlFor="email">Email *</label>
                  <input
                    type="email"
                    id="email"
                    value={guestEmail}
                    onChange={(e) => {
                      setGuestEmail(e.target.value)
                      setEmailError(null)
                    }}
                    placeholder="your@email.com"
                    className={emailError ? styles.inputError : ''}
                  />
                  {emailError && <span className={styles.fieldError}>{emailError}</span>}
                </div>
                <div className={styles.formGroup}>
                  <label htmlFor="name">Name (optional)</label>
                  <input
                    type="text"
                    id="name"
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                    placeholder="Your name"
                  />
                </div>
                <p className={styles.signInLink}>
                  Already have an account?{' '}
                  <SignInButton mode="modal">
                    <button type="button" className={styles.linkButton}>Sign in</button>
                  </SignInButton>
                </p>
              </div>
            )}

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
              Secure checkout powered by Stripe
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
