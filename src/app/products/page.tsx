'use client'

import { useEffect, useState } from 'react'
import ProductCard from '@/components/ProductCard'
import styles from './products.module.css'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Shop All Products',
  description: 'Browse our exclusive collection of premium accessories including watches, jewelry, and more.',
  openGraph: {
    title: 'Shop All Products | Premium Accessories',
    description: 'Browse our complete collection of premium accessories including watches, jewelry, and more.',
    images: ['/og-products.jpg'],
  },
}

type Product = {
  id: string
  name: string
  slug: string
  description: string | null
  price: number
  imageUrl: string | null
  stock: number
  category: {
    id: string
    name: string
    slug: string
  }
}

type Category = {
  id: string
  name: string
  slug: string
  description: string | null
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchCategories()
    fetchProducts()
  }, [])

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/categories')
      const data = await response.json()
      setCategories(data)
    } catch (error) {
      console.error('Error fetching categories:', error)
    }
  }

  const fetchProducts = async (category?: string) => {
    setLoading(true)
    try {
      const url = category && category !== 'all' 
        ? `/api/products?category=${category}` 
        : '/api/products'
      const response = await fetch(url)
      const data = await response.json()
      setProducts(data)
    } catch (error) {
      console.error('Error fetching products:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCategoryChange = (categorySlug: string) => {
    setSelectedCategory(categorySlug)
    fetchProducts(categorySlug === 'all' ? undefined : categorySlug)
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1>Our Products</h1>
        <p>Discover our exclusive collection of premium accessories</p>
      </header>

      <div className={styles.filters}>
        <button
          className={selectedCategory === 'all' ? styles.filterActive : styles.filter}
          onClick={() => handleCategoryChange('all')}
        >
          All Products
        </button>
        {categories.map((category) => (
          <button
            key={category.id}
            className={selectedCategory === category.slug ? styles.filterActive : styles.filter}
            onClick={() => handleCategoryChange(category.slug)}
          >
            {category.name}
          </button>
        ))}
      </div>

      {loading ? (
        <div className={styles.loading}>Loading products...</div>
      ) : products.length === 0 ? (
        <div className={styles.empty}>No products found</div>
      ) : (
        <>
          <div className={styles.count}>
            Showing {products.length} {products.length === 1 ? 'product' : 'products'}
          </div>
          <div className={styles.grid}>
            {products.map((product) => (
              <ProductCard key={product.id} {...product} />
            ))}
          </div>
        </>
      )}
    </div>
  )
}