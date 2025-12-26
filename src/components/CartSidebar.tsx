'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { useCartStore } from '@/store/cartStore'
import CartItem from './CartItem'
import styles from '../styles/CartSidebar.module.css'

export default function CartSidebar() {
    // Get store data
    const { items, isOpen, toggleCart, loadCart, totalPrice, clearCart } = useCartStore()

    // Load cart from database when component mounts
    useEffect(() => {
        loadCart()
    }, [loadCart])

    // Handle Escape key
    useEffect(() => {
        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape' && isOpen) {
                toggleCart()
            }
        }

        window.addEventListener('keydown', handleEscape)
        return () => window.removeEventListener('keydown', handleEscape)
    }, [isOpen, toggleCart])

    // Prevent body scroll when cart is open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden'
        } else {
            document.body.style.overflow = 'unset'
        }

        return () => {
            document.body.style.overflow = 'unset'
        }
    }, [isOpen])

    // Don't render anything if cart is closed
    if (!isOpen) return null

    const total = totalPrice()

    return (
        <>
            {/* Backdrop (dark overlay) */}
            <div
                className={styles.backdrop}
                onClick={toggleCart}
                aria-label="Close cart"
            />

            {/* Sidebar panel */}
            <aside className={styles.sidebar} role="dialog" aria-modal="true">
                {/* Header */}
                <div className={styles.header}>
                    <h2>Shopping Cart</h2>
                    <button
                        onClick={toggleCart}
                        className={styles.closeButton}
                        aria-label="Close cart"
                    >
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                    </button>
                </div>

                {/* Cart content */}
                <div className={styles.content}>
                    {items.length === 0 ? (
                        // Empty state
                        <div className={styles.empty}>
                            <svg className={styles.emptyIcon} width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                <circle cx="9" cy="21" r="1" />
                                <circle cx="20" cy="21" r="1" />
                                <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
                            </svg>
                            <h3>Your cart is empty</h3>
                            <p>Add some products to get started!</p>
                            <button onClick={toggleCart} className={styles.shopButton}>
                                Continue Shopping
                            </button>
                        </div>
                    ) : (
                        // Cart items list
                        <>
                            <div className={styles.items}>
                                {items.map((item) => (
                                    <CartItem key={item.id} item={item} />
                                ))}
                            </div>

                            {/* Cart summary */}
                            <div className={styles.summary}>
                                <div className={styles.total}>
                                    <span>Subtotal:</span>
                                    <span className={styles.totalPrice}>${total.toFixed(2)}</span>
                                </div>

                                <Link 
                                    href="/checkout" 
                                    className={styles.checkoutButton}
                                    onClick={() => toggleCart()}
                                >
                                    Proceed to Checkout
                                </Link>

                                <button
                                    onClick={clearCart}
                                    className={styles.clearButton}
                                    aria-label="Clear cart"
                                >
                                    Clear Cart
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </aside>
        </>
    )
}