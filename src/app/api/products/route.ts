import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import type { Product, Category } from '@prisma/client'
import {
  validatePrice,
  validateStock,
  validateProductName,
  validateDescription,
  validateId
} from '@/lib/validation'
import { checkRateLimit, getIdentifier } from '@/lib/ratelimit'

type ProductWithCategory = Product & {
  category: Category
}

// GET - Public endpoint
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const category = searchParams.get('category')

    const products = await prisma.product.findMany({
      where: category ? {
        category: {
          slug: category
        }
      } : undefined,
      include: {
        category: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    const productsWithNumberPrice = products.map((product: ProductWithCategory) => ({
      ...product,
      price: Number(product.price)
    }))

    return NextResponse.json(productsWithNumberPrice)
  } catch {
    return NextResponse.json(
      { error: 'Failed to fetch products' },
      { status: 500 }
    )
  }
}

// POST - Admin only
export async function POST(request: NextRequest) {
  try {
    // CRITICAL: Require admin access
    await requireAdmin()

    // Rate limit admin operations
    const identifier = getIdentifier(request)
    const { success, response } = await checkRateLimit(identifier, 'admin')
    if (!success && response) {
      return response
    }

    const body = await request.json()

    // Validate required fields exist
    if (!body.name || !body.price || !body.categoryId) {
      return NextResponse.json(
        { error: 'Name, price, and category are required' },
        { status: 400 }
      )
    }

    // Validate and sanitize all inputs
    const name = validateProductName(body.name)
    const price = validatePrice(body.price)
    const stock = validateStock(body.stock ?? 0)
    const categoryId = validateId(body.categoryId)
    const description = validateDescription(body.description)
    const imageUrl = body.imageUrl ? String(body.imageUrl).trim() : null

    // Verify category exists
    const category = await prisma.category.findUnique({
      where: { id: categoryId }
    })

    if (!category) {
      return NextResponse.json(
        { error: 'Category not found' },
        { status: 404 }
      )
    }

    // Generate slug from name
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')

    // Check if slug already exists
    const existingProduct = await prisma.product.findUnique({
      where: { slug }
    })

    if (existingProduct) {
      return NextResponse.json(
        { error: 'A product with this name already exists' },
        { status: 400 }
      )
    }

    const product = await prisma.product.create({
      data: {
        name,
        slug,
        description,
        price,
        stock,
        categoryId,
        imageUrl,
      },
      include: {
        category: true
      }
    })

    return NextResponse.json({
      ...product,
      price: Number(product.price)
    })
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Unauthorized') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
      if (error.message === 'Forbidden: Admin access required') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
      if (error.message.includes('must be') || error.message.includes('cannot')) {
        return NextResponse.json({ error: error.message }, { status: 400 })
      }
    }

    return NextResponse.json(
      { error: 'Failed to create product' },
      { status: 500 }
    )
  }
}