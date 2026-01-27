import { prisma } from '@/lib/prisma'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { checkRateLimit, getIdentifier } from '@/lib/ratelimit'

/**
 * GET - Fetch all sales (public for homepage display, returns all for admin)
 */
export async function GET() {
  try {
    const sales = await prisma.sale.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        categories: {
          include: {
            category: true
          }
        }
      }
    })

    return NextResponse.json(sales)
  } catch {
    return NextResponse.json(
      { error: 'Failed to fetch sales' },
      { status: 500 }
    )
  }
}

/**
 * POST - Create a new sale (Admin only)
 */
export async function POST(request: NextRequest) {
  try {
    await requireAdmin()

    const identifier = getIdentifier(request)
    const { success, response } = await checkRateLimit(identifier, 'admin')
    if (!success && response) {
      return response
    }

    const body = await request.json()

    // Validate required fields
    if (!body.name || typeof body.name !== 'string' || body.name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Sale name is required' },
        { status: 400 }
      )
    }

    if (typeof body.discount !== 'number' || body.discount < 1 || body.discount > 100) {
      return NextResponse.json(
        { error: 'Discount must be a number between 1 and 100' },
        { status: 400 }
      )
    }

    if (!body.endDate) {
      return NextResponse.json(
        { error: 'End date is required' },
        { status: 400 }
      )
    }

    const endDate = new Date(body.endDate)
    if (isNaN(endDate.getTime())) {
      return NextResponse.json(
        { error: 'Invalid end date' },
        { status: 400 }
      )
    }

    if (!Array.isArray(body.categoryIds) || body.categoryIds.length === 0) {
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

    const startDate = body.startDate ? new Date(body.startDate) : new Date()

    const sale = await prisma.sale.create({
      data: {
        name: body.name.trim(),
        tagline: body.tagline?.trim() || '',
        discount: body.discount,
        startDate,
        endDate,
        bannerUrl: body.bannerUrl || null,
        isActive: true,
        categories: {
          create: body.categoryIds.map((categoryId: string) => ({
            categoryId
          }))
        }
      },
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
    }

    return NextResponse.json(
      { error: 'Failed to create sale' },
      { status: 500 }
    )
  }
}
