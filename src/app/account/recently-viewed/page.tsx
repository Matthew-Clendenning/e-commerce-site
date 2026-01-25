import type { Metadata } from 'next'
import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { Clock } from 'lucide-react'
import ProductCard from '@/components/ProductCard'
import styles from '../../../styles/account.module.css'

export const metadata: Metadata = {
  title: 'Recently Viewed',
  description: 'Products you have viewed recently'
}

export default async function RecentlyViewedPage() {
  const { userId } = await auth()

  if (!userId) {
    redirect('/sign-in')
  }

  const recentlyViewed = await prisma.recentlyViewed.findMany({
    where: { userId },
    include: {
      product: {
        include: {
          category: true
        }
      }
    },
    orderBy: {
      viewedAt: 'desc'
    },
    take: 20
  })

  return (
    <div className={styles.container}>
      <nav className={styles.breadcrumb}>
        <Link href="/">Home</Link>
        <span>/</span>
        <Link href="/account">Account</Link>
        <span>/</span>
        <span>Recently Viewed</span>
      </nav>

      <div className={styles.header}>
        <h1 className={styles.title}>Recently Viewed</h1>
        <p className={styles.subtitle}>
          {recentlyViewed.length} {recentlyViewed.length === 1 ? 'product' : 'products'}
        </p>
      </div>

      {recentlyViewed.length === 0 ? (
        <div className={styles.emptyState}>
          <Clock size={48} className={styles.emptyIcon} />
          <h2 className={styles.emptyTitle}>No recently viewed products</h2>
          <p className={styles.emptyText}>
            Products you view will appear here for easy access
          </p>
          <Link href="/products" className={styles.emptyButton}>
            Browse Products
          </Link>
        </div>
      ) : (
        <div className={styles.productGrid}>
          {recentlyViewed.map((item) => (
            <ProductCard
              key={item.product.id}
              id={item.product.id}
              name={item.product.name}
              slug={item.product.slug}
              description={item.product.description}
              price={Number(item.product.price)}
              imageUrl={item.product.imageUrl}
              stock={item.product.stock}
              category={{
                name: item.product.category.name,
                slug: item.product.category.slug
              }}
            />
          ))}
        </div>
      )}
    </div>
  )
}
