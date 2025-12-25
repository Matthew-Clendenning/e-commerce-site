import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { 
  validateCategoryName, 
  validateCategoryDescription 
} from '@/lib/validation'

// GET - Public endpoint (anyone can view categories)
export async function GET() {
  try {
    const categories = await prisma.category.findMany({
      orderBy: {
        name: 'asc'
      },
      include: {
        _count: {
          select: { products: true }
        }
      }
    })

    return NextResponse.json(categories)
  } catch (error) {
    console.error('Error fetching categories:', error)
    
    // Don't expose internal errors
    return NextResponse.json(
      { error: 'Failed to fetch categories' },
      { status: 500 }
    )
  }
}

// POST - Admin only
export async function POST(request: NextRequest) {
  try {
    // CRITICAL: Require admin access
    await requireAdmin()

    const body = await request.json()

    // Validate required fields
    if (!body.name) {
      return NextResponse.json(
        { error: 'Category name is required' },
        { status: 400 }
      )
    }

    // Validate and sanitize inputs
    const name = validateCategoryName(body.name)
    const description = validateCategoryDescription(body.description)

    // Generate slug from validated name
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')

    // Additional slug validation
    if (slug.length === 0) {
      return NextResponse.json(
        { error: 'Invalid category name - cannot generate valid slug' },
        { status: 400 }
      )
    }

    // Check if slug already exists
    const existingCategory = await prisma.category.findUnique({
      where: { slug }
    })

    if (existingCategory) {
      return NextResponse.json(
        { error: 'A category with this name already exists' },
        { status: 400 }
      )
    }

    const category = await prisma.category.create({
      data: {
        name,
        slug,
        description,
      },
      include: {
        _count: {
          select: { products: true }
        }
      }
    })

    return NextResponse.json(category)
  } catch (error) {
    console.error('Error creating category:', error)

    // Handle specific error types
    if (error instanceof Error) {
      if (error.message === 'Unauthorized') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
      if (error.message === 'Forbidden: Admin access required') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
      if (error.message.includes('must be') || error.message.includes('cannot')) {
        // Validation error - safe to expose
        return NextResponse.json({ error: error.message }, { status: 400 })
      }
    }

    // Generic error - don't expose details
    return NextResponse.json(
      { error: 'Failed to create category' },
      { status: 500 }
    )
  }
}