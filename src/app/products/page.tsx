import type { Metadata } from 'next'
import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { getCategoryDiscountMap } from '@/lib/sales'
import ProductCard from '@/components/ProductCard'
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
  searchParams: Promise<{ category?: string; search?: string }>
}

export default async function ProductsPage({ searchParams }: Props) {
  const params = await searchParams
  const categorySlug = params.category
  const searchQuery = params.search?.trim()

  // Get category name for title if filtering
  const category = categorySlug
    ? await prisma.category.findUnique({ where: { slug: categorySlug } })
    : null

  // Build where clause based on filters
  const whereClause: Prisma.ProductWhereInput = {}

  if (categorySlug) {
    whereClause.category = { slug: categorySlug }
  }

  if (searchQuery) {
    whereClause.OR = [
      { name: { contains: searchQuery, mode: 'insensitive' } },
      { description: { contains: searchQuery, mode: 'insensitive' } },
    ]
  }

  // Fetch products and active category discounts in parallel
  const [products, categoryDiscountMap] = await Promise.all([
    prisma.product.findMany({
      where: Object.keys(whereClause).length > 0 ? whereClause : undefined,
      include: {
        category: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    }),
    getCategoryDiscountMap()
  ])

  // Convert price to number and add discount info
  const productsWithNumberPrice = products.map(product => ({
    ...product,
    price: Number(product.price),
    productDiscount: product.discountPercent,
    categoryDiscount: categoryDiscountMap.get(product.categoryId) ?? 0
  }))

  // Determine page title
  let pageTitle = 'Our Products'
  if (searchQuery) {
    pageTitle = `Search results for "${searchQuery}"`
  } else if (category) {
    pageTitle = category.name
  }

  // Only group by category when showing all products (no search, no category filter)
  const showGroupedByCategory = !categorySlug && !searchQuery
  const productsByCategory = showGroupedByCategory
    ? productsWithNumberPrice.reduce((acc, product) => {
        const catName = product.category?.name || 'Uncategorized'
        const catDescription = product.category?.description || null
        if (!acc[catName]) {
          acc[catName] = { description: catDescription, products: [] }
        }
        acc[catName].products.push(product)
        return acc
      }, {} as Record<string, { description: string | null; products: typeof productsWithNumberPrice }>)
    : null

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1>{pageTitle}</h1>
      </header>

      {productsWithNumberPrice.length === 0 ? (
        <div className={styles.empty}>
          {searchQuery ? `No products found for "${searchQuery}"` : 'No products found'}
        </div>
      ) : showGroupedByCategory ? (
        // All products view - group by category with dividers
        <div className={styles.categoryGroups}>
          {Object.entries(productsByCategory!).map(([categoryName, { description, products: categoryProducts }], index) => (
            <section key={categoryName} className={styles.categorySection}>
              {index > 0 && <div className={styles.categoryDivider} />}
              <div className={styles.categoryHeader}>
                <h2 className={styles.categoryName}>{categoryName}</h2>
                {description && (
                  <p className={styles.categoryDescription}>{description}</p>
                )}
              </div>
              <div className={styles.grid}>
                {categoryProducts.map((product) => (
                  <ProductCard
                    key={product.id}
                    id={product.id}
                    name={product.name}
                    slug={product.slug}
                    description={product.description}
                    price={product.price}
                    imageUrl={product.imageUrl}
                    stock={product.stock}
                    category={product.category}
                    productDiscount={product.productDiscount}
                    categoryDiscount={product.categoryDiscount}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : (
        // Search results or category view - show flat grid
        <div className={styles.grid}>
          {productsWithNumberPrice.map((product) => (
            <ProductCard
              key={product.id}
              id={product.id}
              name={product.name}
              slug={product.slug}
              description={product.description}
              price={product.price}
              imageUrl={product.imageUrl}
              stock={product.stock}
              category={product.category}
              productDiscount={product.productDiscount}
              categoryDiscount={product.categoryDiscount}
            />
          ))}
        </div>
      )}
    </div>
  )
}