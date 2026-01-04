'use client'

import { useCartStore } from '@/store/cartStore'
import { useState } from 'react'
import { toast } from 'sonner'
import styles from '../styles/AddToCartButton.module.css'

type Props = {
    product: {
        id: string
        name: string
        price: number
        imageUrl: string | null
        slug: string
        stock: number
    }
    disabled?: boolean
}

export default function AddToCartButton({ product, disabled }: Props) {
    const { addItem, toggleCart } = useCartStore()
    const [isAdding, setIsAdding] = useState(false)

    const handleAddToCart = async () => {
        setIsAdding(true)

        await addItem({
            id: product.id,
            name: product.name,
            price: product.price,
            imageUrl: product.imageUrl,
            slug: product.slug,
            stock: product.stock
        })

        toast.success(`${product.name} added to cart`)
        toggleCart()
        setIsAdding(false)
    }

    return (
        <button
            onClick={handleAddToCart}
            disabled={disabled || isAdding}
            className={styles.addToCart}
        >
            {isAdding ? 'Adding...' : disabled ? 'Out of stock' : 'Add to cart'}
        </button>
    )
}