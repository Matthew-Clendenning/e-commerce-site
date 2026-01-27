import { prisma } from '@/lib/prisma'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { validateId } from '@/lib/validation'
import { checkRateLimit, getIdentifier } from '@/lib/ratelimit'

/**
 * GET - Fetch a single sale by ID
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const validId = validateId(id)

    const sale = await prisma.sale.findUnique({
      where: { id: validId },
      include: {
        categories: {
          include: {
            category: true
          }
        }
      }
    })

    if (!sale) {
      return NextResponse.json(
        { error: 'Sale not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(sale)
  } catch (error) {
    if (error instanceof Error && error.message.includes('Invalid ID')) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json(
      { error: 'Failed to fetch sale' },
      { status: 500 }
    )
  }
}

/**
 * PATCH - Update a sale (Admin only)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin()

    const identifier = getIdentifier(request)
    const { success, response } = await checkRateLimit(identifier, 'admin')
    if (!success && response) {
      return response
    }

    const { id } = await params
    const validId = validateId(id)

    const existingSale = await prisma.sale.findUnique({
      where: { id: validId },
      include: { categories: true }
    })

    if (!existingSale) {
      return NextResponse.json(
        { error: 'Sale not found' },
        { status: 404 }
      )
    }

    const body = await request.json()

    // Build update data
    const updateData: {
      name?: string
      tagline?: string
      discount?: number
      startDate?: Date
      endDate?: Date
      isActive?: boolean
      bannerUrl?: string | null
    } = {}

    if (body.name !== undefined) {
      if (typeof body.name !== 'string' || body.name.trim().length === 0) {
        return NextResponse.json(
          { error: 'Sale name cannot be empty' },
          { status: 400 }
        )
      }
      updateData.name = body.name.trim()
    }

    if (body.tagline !== undefined) {
      updateData.tagline = body.tagline?.trim() || ''
    }

    if (body.discount !== undefined) {
      if (typeof body.discount !== 'number' || body.discount < 1 || body.discount > 100) {
        return NextResponse.json(
          { error: 'Discount must be a number between 1 and 100' },
          { status: 400 }
        )
      }
      updateData.discount = body.discount
    }

    if (body.startDate !== undefined) {
      const startDate = new Date(body.startDate)
      if (isNaN(startDate.getTime())) {
        return NextResponse.json(
          { error: 'Invalid start date' },
          { status: 400 }
        )
      }
      updateData.startDate = startDate
    }

    if (body.endDate !== undefined) {
      const endDate = new Date(body.endDate)
      if (isNaN(endDate.getTime())) {
        return NextResponse.json(
          { error: 'Invalid end date' },
          { status: 400 }
        )
      }
      updateData.endDate = endDate
    }

    if (body.isActive !== undefined) {
      updateData.isActive = Boolean(body.isActive)
    }

    if (body.bannerUrl !== undefined) {
      updateData.bannerUrl = body.bannerUrl || null
    }

    // Handle category updates
    if (Array.isArray(body.categoryIds)) {
      if (body.categoryIds.length === 0) {
        return NextResponse.json(
          { error: 'At least one category is required' },
          { status: 400 }
        )
      }

      // Validate categories exist
      const categories = await prisma.category.findMany({
        where: { id: { in: body.categoryIds } }
      })

      if (categories.length !== body.categoryIds.length) {
        return NextResponse.json(
          { error: 'One or more categories not found' },
          { status: 400 }
        )
      }

      // Delete existing category associations and create new ones
      await prisma.saleCategory.deleteMany({
        where: { saleId: validId }
      })

      await prisma.saleCategory.createMany({
        data: body.categoryIds.map((categoryId: string) => ({
          saleId: validId,
          categoryId
        }))
      })
    }

    const sale = await prisma.sale.update({
      where: { id: validId },
      data: updateData,
      include: {
        categories: {
          include: {
            category: true
          }
        }
      }
    })

    return NextResponse.json(sale)
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Unauthorized') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
      if (error.message === 'Forbidden: Admin access required') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
      if (error.message.includes('Invalid ID')) {
        return NextResponse.json({ error: error.message }, { status: 400 })
      }
    }

    return NextResponse.json(
      { error: 'Failed to update sale' },
      { status: 500 }
    )
  }
}

/**
 * DELETE - Delete a sale (Admin only)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin()

    const identifier = getIdentifier(request)
    const { success, response } = await checkRateLimit(identifier, 'admin')
    if (!success && response) {
      return response
    }

    const { id } = await params
    const validId = validateId(id)

    const existingSale = await prisma.sale.findUnique({
      where: { id: validId }
    })

    if (!existingSale) {
      return NextResponse.json(
        { error: 'Sale not found' },
        { status: 404 }
      )
    }

    // Delete the sale (cascade will handle SaleCategory)
    await prisma.sale.delete({
      where: { id: validId }
    })

    return NextResponse.json({
      success: true,
      message: 'Sale deleted successfully'
    })
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Unauthorized') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
      if (error.message === 'Forbidden: Admin access required') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
      if (error.message.includes('Invalid ID')) {
        return NextResponse.json({ error: error.message }, { status: 400 })
      }
    }

    return NextResponse.json(
      { error: 'Failed to delete sale' },
      { status: 500 }
    )
  }
}
