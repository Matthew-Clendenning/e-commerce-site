import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import {
  validateCategoryName,
  validateCategoryDescription,
  validateId
} from '@/lib/validation'
import { checkRateLimit, getIdentifier } from '@/lib/ratelimit'

// GET - Public endpoint
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const validId = validateId(id)

    const category = await prisma.category.findUnique({
      where: { id: validId },
      include: {
        _count: {
          select: { products: true }
        }
      }
    })

    if (!category) {
      return NextResponse.json(
        { error: 'Category not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(category)
  } catch (error) {
    if (error instanceof Error && error.message.includes('Invalid ID')) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json(
      { error: 'Failed to fetch category' },
      { status: 500 }
    )
  }
}

// PATCH - Admin only
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // CRITICAL: Require admin access
    await requireAdmin()

    // Rate limit admin operations
    const identifier = getIdentifier(request)
    const { success, response } = await checkRateLimit(identifier, 'admin')
    if (!success && response) {
      return response
    }

    const { id } = await params
    const validId = validateId(id)

    // Check if category exists
    const existingCategory = await prisma.category.findUnique({
      where: { id: validId }
    })

    if (!existingCategory) {
      return NextResponse.json(
        { error: 'Category not found' },
        { status: 404 }
      )
    }

    const body = await request.json()

    // Build validated update data
    const updateData: {
      name?: string
      slug?: string
      description?: string | null
    } = {}

    if (body.name !== undefined) {
      const name = validateCategoryName(body.name)
      updateData.name = name
      
      // Regenerate slug from new name
      const slug = name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '')
      
      // Check if new slug conflicts with another category
      if (slug !== existingCategory.slug) {
        const slugExists = await prisma.category.findUnique({
          where: { slug }
        })
        
        if (slugExists) {
          return NextResponse.json(
            { error: 'A category with this name already exists' },
            { status: 400 }
          )
        }
        
        updateData.slug = slug
      }
    }

    if (body.description !== undefined) {
      updateData.description = validateCategoryDescription(body.description)
    }

    const category = await prisma.category.update({
      where: { id: validId },
      data: updateData,
      include: {
        _count: {
          select: { products: true }
        }
      }
    })

    return NextResponse.json(category)
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
      { error: 'Failed to update category' },
      { status: 500 }
    )
  }
}

// DELETE - Admin only
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // CRITICAL: Require admin access
    await requireAdmin()

    // Rate limit admin operations
    const identifier = getIdentifier(request)
    const { success, response } = await checkRateLimit(identifier, 'admin')
    if (!success && response) {
      return response
    }

    const { id } = await params
    const validId = validateId(id)

    // Check if category exists
    const existingCategory = await prisma.category.findUnique({
      where: { id: validId },
      include: {
        _count: {
          select: { products: true }
        }
      }
    })

    if (!existingCategory) {
      return NextResponse.json(
        { error: 'Category not found' },
        { status: 404 }
      )
    }

    // Check if category has products
    if (existingCategory._count.products > 0) {
      return NextResponse.json(
        { 
          error: `Cannot delete category with ${existingCategory._count.products} products. Please move or delete products first.` 
        },
        { status: 400 }
      )
    }

    await prisma.category.delete({
      where: { id: validId }
    })

    return NextResponse.json({
      success: true,
      message: 'Category deleted successfully'
    })
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Unauthorized') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
      if (error.message === 'Forbidden: Admin access required') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }

    return NextResponse.json(
      { error: 'Failed to delete category' },
      { status: 500 }
    )
  }
}