import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import SearchBar from './SearchBar'
import styles from '../styles/CategoryNav.module.css'

export default async function CategoryNav() {
  const categories = await prisma.category.findMany({
    orderBy: { name: 'asc' }
  })

  return (
    <div className={styles.categoryNav}>
      <div className={styles.container}>
        <SearchBar />
        <Link href="/products" className={styles.link}>
          All
        </Link>
        {categories.map((category) => (
          <Link
            key={category.id}
            href={`/products?category=${category.slug}`}
            className={styles.link}
          >
            {category.name}
          </Link>
        ))}
      </div>
    </div>
  )
}
