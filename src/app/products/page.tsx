import type { Metadata } from 'next'
import { prisma } from '@/lib/prisma'
import ProductCard from '@/components/ProductCard'
import ProductsFilter from '@/components/ProductsFilter'
import styles from '../../styles/products.module.css'

export const metadata: Metadata = {
  title: 'Shop All Products',
  description: 'Browse our exclusive collection of premium accessories including watches, jewelry, and more.',
  openGraph: {
    title: 'Shop All Products | Premium Accessories',
    description: 'Browse our exclusive collection of premium accessories including watches, jewelry, and more.',
  },
}

type Props = {
  searchParams: Promise<{ category?: string }>
}

export default async function ProductsPage({ searchParams }: Props) {
  const params = await searchParams
  const categorySlug = params.category

  // Fetch categories
  const categories = await prisma.category.findMany({
    orderBy: { name: 'asc' }
  })

  // Fetch products based on category filter
  const products = await prisma.product.findMany({
    where: categorySlug ? {
      category: {
        slug: categorySlug
      }
    } : undefined,
    include: {
      category: true
    },
    orderBy: {
      createdAt: 'desc'
    }
  })

  // Convert price to number
  const productsWithNumberPrice = products.map(product => ({
    ...product,
    price: Number(product.price)
  }))

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1>Our Products</h1>
        <p>Discover our exclusive collection of premium accessories</p>
      </header>

      <ProductsFilter 
        categories={categories}
        selectedCategory={categorySlug || 'all'}
      />

      <div className={styles.count}>
        Showing {productsWithNumberPrice.length} {productsWithNumberPrice.length === 1 ? 'product' : 'products'}
      </div>

      {productsWithNumberPrice.length === 0 ? (
        <div className={styles.empty}>No products found</div>
      ) : (
        <div className={styles.grid}>
          {productsWithNumberPrice.map((product) => (
            <ProductCard key={product.id} {...product} />
          ))}
        </div>
      )}
    </div>
  )
}