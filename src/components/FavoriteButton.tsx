'use client'

import { useState, useEffect } from 'react'
import { useUser } from '@clerk/nextjs'
import { Heart } from 'lucide-react'
import { useFavoritesStore } from '@/store/favoritesStore'
import styles from '../styles/FavoriteButton.module.css'

type FavoriteButtonProps = {
    productId: string
    className?: string
    size?: 'small' | 'medium' | 'large'
    showLabel?: boolean
}

export default function FavoriteButton({
    productId,
    className = '',
    size = 'medium',
    showLabel = false
}: FavoriteButtonProps) {
    const { isSignedIn } = useUser()
    const { isFavorited, addFavorite, removeFavorite, loadFavorites } = useFavoritesStore()
    const [isLoading, setIsLoading] = useState(false)
    const [hasLoaded, setHasLoaded] = useState(false)

    const favorited = isFavorited(productId)

    // Load favorites on mount if signed in
    useEffect(() => {
        if (isSignedIn && !hasLoaded) {
            loadFavorites()
            setHasLoaded(true)
        }
    }, [isSignedIn, hasLoaded, loadFavorites])

    const handleClick = async (e: React.MouseEvent) => {
        e.preventDefault()
        e.stopPropagation()

        if (!isSignedIn) {
            // Could redirect to sign in or show a toast
            return
        }

        if (isLoading) return

        setIsLoading(true)
        try {
            if (favorited) {
                await removeFavorite(productId)
            } else {
                await addFavorite(productId)
            }
        } finally {
            setIsLoading(false)
        }
    }

    const iconSize = size === 'small' ? 16 : size === 'large' ? 24 : 20

    return (
        <button
            className={`${styles.button} ${styles[size]} ${favorited ? styles.favorited : ''} ${isLoading ? styles.loading : ''} ${className}`}
            onClick={handleClick}
            disabled={isLoading || !isSignedIn}
            aria-label={favorited ? 'Remove from favorites' : 'Add to favorites'}
            title={!isSignedIn ? 'Sign in to save favorites' : favorited ? 'Remove from favorites' : 'Add to favorites'}
        >
            <Heart
                size={iconSize}
                className={styles.icon}
                fill={favorited ? 'currentColor' : 'none'}
            />
            {showLabel && (
                <span className={styles.label}>
                    {favorited ? 'Saved' : 'Save'}
                </span>
            )}
        </button>
    )
}
