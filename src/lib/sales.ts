import { prisma } from './prisma'
import type { Sale, SaleCategory, Category, Product } from '@prisma/client'

export type SaleWithCategories = Sale & {
  categories: (SaleCategory & {
    category: Category & {
      products: Pick<Product, 'id' | 'imageUrl'>[]
    }
  })[]
}

export type ActiveSaleInfo = {
  saleId: string
  saleName: string
  tagline: string
  discount: number
  endDate: Date
  bannerUrl: string | null
  categoryIds: string[]
  categoryImages: string[]
}

/**
 * Fetches all currently active sales with their associated categories
 */
export async function getActiveSales(): Promise<SaleWithCategories[]> {
  const now = new Date()

  return prisma.sale.findMany({
    where: {
      isActive: true,
      startDate: { lte: now },
      endDate: { gt: now }
    },
    include: {
      categories: {
        include: {
          category: {
            include: {
              products: {
                select: {
                  id: true,
                  imageUrl: true
                },
                where: {
                  imageUrl: { not: null }
                },
                take: 4
              }
            }
          }
        }
      }
    },
    orderBy: { endDate: 'asc' }
  })
}

/**
 * Fetches active sale info for a specific category
 */
export async function getSaleForCategory(categoryId: string): Promise<{
  discount: number
  saleName: string
  endDate: Date
} | null> {
  const now = new Date()

  const saleCategory = await prisma.saleCategory.findFirst({
    where: {
      categoryId,
      sale: {
        isActive: true,
        startDate: { lte: now },
        endDate: { gt: now }
      }
    },
    include: {
      sale: {
        select: {
          discount: true,
          name: true,
          endDate: true
        }
      }
    }
  })

  if (!saleCategory) return null

  return {
    discount: saleCategory.sale.discount,
    saleName: saleCategory.sale.name,
    endDate: saleCategory.sale.endDate
  }
}

/**
 * Gets the active discount for a category (returns percentage)
 */
export async function getCategoryDiscount(categoryId: string): Promise<number> {
  const sale = await getSaleForCategory(categoryId)
  return sale?.discount ?? 0
}

/**
 * Gets a map of category IDs to their active sale discounts
 */
export async function getCategoryDiscountMap(): Promise<Map<string, number>> {
  const now = new Date()

  const saleCategories = await prisma.saleCategory.findMany({
    where: {
      sale: {
        isActive: true,
        startDate: { lte: now },
        endDate: { gt: now }
      }
    },
    include: {
      sale: {
        select: { discount: true }
      }
    }
  })

  const map = new Map<string, number>()
  for (const sc of saleCategories) {
    // If a category is in multiple sales, use the highest discount
    const existing = map.get(sc.categoryId) ?? 0
    if (sc.sale.discount > existing) {
      map.set(sc.categoryId, sc.sale.discount)
    }
  }

  return map
}

/**
 * Calculates the effective discount for a product
 * Priority: product-level discount > category sale discount
 */
export function calculateEffectiveDiscount(
  productDiscount: number | null,
  categoryDiscount: number
): number {
  // Product-level discount takes priority if it exists
  if (productDiscount !== null && productDiscount > 0) {
    return productDiscount
  }
  return categoryDiscount
}

/**
 * Calculates the sale price given an original price and discount percentage
 */
export function calculateSalePrice(originalPrice: number, discountPercent: number): number {
  if (discountPercent <= 0 || discountPercent > 100) {
    return originalPrice
  }
  return originalPrice * (1 - discountPercent / 100)
}

/**
 * Formats a price for display
 */
export function formatPrice(price: number): string {
  return `$${price.toFixed(2)}`
}

/**
 * Fetches a sale by ID with all related data
 */
export async function getSaleById(saleId: string) {
  return prisma.sale.findUnique({
    where: { id: saleId },
    include: {
      categories: {
        include: {
          category: true
        }
      }
    }
  })
}

/**
 * Fetches all sales (for admin panel)
 */
export async function getAllSales() {
  return prisma.sale.findMany({
    include: {
      categories: {
        include: {
          category: true
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  })
}
