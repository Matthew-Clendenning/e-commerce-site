'use client'

import { useEffect, useState } from 'react'
import { useAuth, SignInButton } from '@clerk/nextjs'
import Link from 'next/link'
import Image from 'next/image'
import styles from '../../styles/orders.module.css'

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

type Order = {
  id: string
  status: string
  total: number
  customerEmail: string
  customerName: string | null
  shippingAddress: ShippingAddress | null
  createdAt: string
  items: OrderItem[]
}

export default function OrdersPage() {
  const { isLoaded, isSignedIn } = useAuth()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (isSignedIn) {
      fetchOrders()
    } else if (isLoaded) {
      setLoading(false)
    }
  }, [isLoaded, isSignedIn])

  const fetchOrders = async () => {
    try {
      const response = await fetch('/api/orders')
      const data = await response.json()
      setOrders(data)
    } catch {
      // Error fetching orders
    } finally {
      setLoading(false)
    }
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

  // Show loading state
  if (!isLoaded || loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Loading...</div>
      </div>
    )
  }

  // Show auth options for unauthenticated users
  if (!isSignedIn) {
    return (
      <div className={styles.container}>
        <div className={styles.content}>
          <h1>My Orders</h1>

          <div className={styles.authOptions}>
            <div className={styles.option}>
              <h2>Have an account?</h2>
              <p>Sign in to view all your orders and order history.</p>
              <SignInButton mode="modal">
                <button className={styles.signInButton}>Sign In</button>
              </SignInButton>
            </div>

            <div className={styles.divider}>
              <span>or</span>
            </div>

            <div className={styles.option}>
              <h2>Guest Order?</h2>
              <p>Look up your order using your email and order number.</p>
              <Link href="/orders/lookup" className={styles.lookupButton}>
                Track Guest Order
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <h1>My Orders</h1>

        {orders.length === 0 ? (
          <div className={styles.empty}>
            <p>You haven&apos;t placed any orders yet.</p>
            <Link href="/" className={styles.shopButton}>
                Start Shopping
            </Link>
          </div>
        ) : (
          <div className={styles.orders}>
            {orders.map(order => (
              <div key={order.id} className={styles.order}>
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
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
