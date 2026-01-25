'use client'

import AddToCartButton from './AddToCartButton'
import FavoriteButton from './FavoriteButton'
import styles from '../styles/ProductActions.module.css'

type Product = {
    id: string
    name: string
    price: number
    imageUrl: string | null
    slug: string
    stock: number
}

type ProductActionsProps = {
    product: Product
}

export default function ProductActions({ product }: ProductActionsProps) {
    return (
        <div className={styles.actions}>
            <AddToCartButton
                product={product}
                disabled={product.stock === 0}
            />
            <FavoriteButton
                productId={product.id}
                size="large"
                showLabel
                className={styles.favoriteButton}
            />
        </div>
    )
}
