'use client'

import { useRouter } from 'next/navigation'
import styles from '../styles/ProductsFilter.module.css'

type Category = {
  id: string
  name: string
  slug: string
}

type Props = {
  categories: Category[]
  selectedCategory: string
}

export default function ProductsFilter({ categories, selectedCategory }: Props) {
  const router = useRouter()

  const handleCategoryChange = (categorySlug: string) => {
    if (categorySlug === 'all') {
      router.push('/products')
    } else {
      router.push(`/products?category=${categorySlug}`)
    }
  }

  return (
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
  )
}