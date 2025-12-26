'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import styles from './orders.module.css'

type OrderItem = {
  id: string
  productId: string
  name: string
  price: number
  quantity: number
  imageUrl: string | null
}

type Order = {
  id: string
  status: string
  total: number
  customerEmail: string
  customerName: string | null
  createdAt: string
  items: OrderItem[]
}

export default function OrdersPage() {
  const { isLoaded, isSignedIn } = useAuth()
  const router = useRouter()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.push('/sign-in?redirect_url=/orders')
    }
  }, [isLoaded, isSignedIn, router])

  useEffect(() => {
    if (isSignedIn) {
      fetchOrders()
    }
  }, [isSignedIn])

  const fetchOrders = async () => {
    try {
      const response = await fetch('/api/orders')
      const data = await response.json()
      setOrders(data)
    } catch (error) {
      console.error('Error fetching orders:', error)
    } finally {
      setLoading(false)
    }
  }

  if (!isLoaded || !isSignedIn) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Loading...</div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Loading your orders...</div>
      </div>
    )
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