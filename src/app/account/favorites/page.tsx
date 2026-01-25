import type { Metadata } from 'next'
import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { Heart } from 'lucide-react'
import ProductCard from '@/components/ProductCard'
import styles from '../../../styles/account.module.css'

export const metadata: Metadata = {
  title: 'Favorites',
  description: 'Your saved favorite products'
}

export default async function FavoritesPage() {
  const { userId } = await auth()

  if (!userId) {
    redirect('/sign-in')
  }

  const favorites = await prisma.favorite.findMany({
    where: { userId },
    include: {
      product: {
        include: {
          category: true
        }
      }
    },
    orderBy: {
      createdAt: 'desc'
    }
  })

  return (
    <div className={styles.container}>
      <nav className={styles.breadcrumb}>
        <Link href="/">Home</Link>
        <span>/</span>
        <Link href="/account">Account</Link>
        <span>/</span>
        <span>Favorites</span>
      </nav>

      <div className={styles.header}>
        <h1 className={styles.title}>Favorites</h1>
        <p className={styles.subtitle}>
          {favorites.length} {favorites.length === 1 ? 'item' : 'items'} saved
        </p>
      </div>

      {favorites.length === 0 ? (
        <div className={styles.emptyState}>
          <Heart size={48} className={styles.emptyIcon} />
          <h2 className={styles.emptyTitle}>No favorites yet</h2>
          <p className={styles.emptyText}>
            Start adding products to your favorites by clicking the heart icon
          </p>
          <Link href="/products" className={styles.emptyButton}>
            Browse Products
          </Link>
        </div>
      ) : (
        <div className={styles.productGrid}>
          {favorites.map((fav) => (
            <ProductCard
              key={fav.product.id}
              id={fav.product.id}
              name={fav.product.name}
              slug={fav.product.slug}
              description={fav.product.description}
              price={Number(fav.product.price)}
              imageUrl={fav.product.imageUrl}
              stock={fav.product.stock}
              category={{
                name: fav.product.category.name,
                slug: fav.product.category.slug
              }}
            />
          ))}
        </div>
      )}
    </div>
  )
}
