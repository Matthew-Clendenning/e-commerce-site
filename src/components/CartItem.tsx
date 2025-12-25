'use client'

import { useCartStore } from '@/store/cartStore'
import Image from 'next/image'
import Link from 'next/link'
import styles from './CartItem.module.css'

type CartItemProps = {
    item: {
        id: string
        name: string
        price: number
        quantity: number
        imageUrl: string | null
        slug: string
        stock: number
    }
}

export default function CartItem({ item }: CartItemProps) {
    // Get functions from store
    const { updateQuantity, removeItem } = useCartStore()

    // Calculate subtotal for this item
    const subtotal = item.price * item.quantity

    // Handler function
    const handleIncrement = () => {
        if (item.quantity < item.stock) {
            updateQuantity(item.id, item.quantity + 1)
        }
    }

    const handleDecrement = () => {
        if (item.quantity > 1) {
            updateQuantity(item.id, item.quantity - 1)
        } else {
            // If quantity would become 0, remove the item
            removeItem(item.id)
        }
    }

    const handleRemove = () => {
        removeItem(item.id)
    }

    return (
        <div className={styles.cartItem}>
            {/* Product Image */}
            <Link href={`/products/${item.slug}`} className={styles.imageLink}>
                {item.imageUrl ? (
                    <Image
                        src={item.imageUrl}
                        alt={item.name}
                        width={80}
                        height={80}
                        className={styles.image}
                    />
                ) : (
                    <div className={styles.placeholder}>No Image</div>
                )}
            </Link>

            {/* Product Details */}
            <div className={styles.details}>
                <Link href={`/products/${item.slug}`} className={styles.name}>
                    {item.name}
                </Link>
                <div className={styles.price}>${item.price.toFixed(2)}</div>

                {/* Quantity Controls */}
                <div className={styles.quantityControl}>
                    <button
                        onClick={handleDecrement}
                        className={styles.quantityButton}
                        aria-label="Decrease quantity"
                    >
                        -
                    </button>
                    <span className={styles.quantity}>{item.quantity}</span>
                    <button
                        onClick={handleIncrement}
                        className={styles.quantityButton}
                        disabled={item.quantity >= item.stock}
                        aria-label="Increase quantity"
                    >
                        +
                    </button>
                </div>

                {/* Stock warning */}
                {item.quantity >= item.stock && (
                    <div className={styles.stockWarning}>
                        Max quantity reached
                    </div>
                )}
            </div>

            {/* Right side (subtotal & remove) */}
            <div className={styles.actions}>
                <div className={styles.subtotal}>${subtotal.toFixed(2)}</div>
                <button
                    onClick={handleRemove}
                    className={styles.removeButton}
                    aria-label="Remove from cart"
                >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    </svg>
                </button>
            </div>
        </div>
    )
}