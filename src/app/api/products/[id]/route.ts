import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import {
  validatePrice,
  validateStock,
  validateProductName,
  validateDescription,
  validateId
} from '@/lib/validation'
import { checkRateLimit, getIdentifier } from '@/lib/ratelimit'

// GET - Public endpoint (anyone can view products)
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    // Validate ID format
    const validId = validateId(id)

    const product = await prisma.product.findUnique({
      where: { id: validId },
      include: {
        category: true
      }
    })

    if (!product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      ...product,
      price: Number(product.price)
    })
  } catch {
    return NextResponse.json(
      { error: 'Failed to fetch product' },
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
    
    // Check if product exists
    const existingProduct = await prisma.product.findUnique({
      where: { id: validId }
    })
    
    if (!existingProduct) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      )
    }

    const body = await request.json()

    // Build validated update data
    const updateData: {
      stock?: number
      price?: number
      name?: string
      description?: string | null
    } = {}

    // Validate each field if provided
    if (body.stock !== undefined) {
      updateData.stock = validateStock(body.stock)
    }
    
    if (body.price !== undefined) {
      updateData.price = validatePrice(body.price)
    }
    
    if (body.name !== undefined) {
      updateData.name = validateProductName(body.name)
    }
    
    if (body.description !== undefined) {
      updateData.description = validateDescription(body.description)
    }

    const product = await prisma.product.update({
      where: { id: validId },
      data: updateData,
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
      { error: 'Failed to update product' },
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

    // Check if product exists
    const existingProduct = await prisma.product.findUnique({
      where: { id: validId },
      include: {
        orderItems: true,
        cartItems: true
      }
    })

    if (!existingProduct) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      )
    }

    // Check if product is part of any orders (preserve order history)
    if (existingProduct.orderItems.length > 0) {
      return NextResponse.json(
        {
          error: `Cannot delete product: It is part of ${existingProduct.orderItems.length} order(s). Consider setting stock to 0 instead.`
        },
        { status: 400 }
      )
    }

    // Use a transaction to delete cart items first, then the product
    await prisma.$transaction([
      // Delete any cart items referencing this product
      prisma.cartItem.deleteMany({
        where: { productId: validId }
      }),
      // Then delete the product
      prisma.product.delete({
        where: { id: validId }
      })
    ])

    return NextResponse.json({
      success: true,
      message: 'Product deleted successfully'
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
      { error: 'Failed to delete product' },
      { status: 500 }
    )
  }
}