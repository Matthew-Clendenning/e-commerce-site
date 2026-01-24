import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { checkRateLimit, getIdentifier } from '@/lib/ratelimit'
import { validateEmail, validateId } from '@/lib/validation'

// Helper to format orders for frontend
function formatOrder(order: {
  id: string
  status: string
  total: unknown
  customerEmail: string
  customerName: string | null
  shippingAddress: unknown
  createdAt: Date
  updatedAt: Date
  isGuest: boolean
  items: Array<{
    id: string
    productId: string
    name: string
    price: unknown
    quantity: number
    imageUrl: string | null
  }>
}) {
  return {
    id: order.id,
    status: order.status,
    total: Number(order.total),
    customerEmail: order.customerEmail,
    customerName: order.customerName,
    shippingAddress: order.shippingAddress,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
    isGuest: order.isGuest,
    items: order.items.map(item => ({
      id: item.id,
      productId: item.productId,
      name: item.name,
      price: Number(item.price),
      quantity: item.quantity,
      imageUrl: item.imageUrl,
    }))
  }
}

// GET - Fetch user's orders or guest order lookup
export async function GET(request: Request) {
  try {
    const { userId } = await auth()
    const url = new URL(request.url)

    // Check for guest order lookup by guestToken
    const guestToken = url.searchParams.get('guestToken')
    if (guestToken) {
      // Rate limit guest lookup requests
      const identifier = getIdentifier(request, null)
      const { success, response } = await checkRateLimit(identifier, 'guestLookup')
      if (!success && response) {
        return response
      }

      // Validate guestToken format
      try {
        validateId(guestToken)
      } catch {
        return NextResponse.json(
          { error: 'Invalid guest token' },
          { status: 400 }
        )
      }

      const order = await prisma.order.findUnique({
        where: { guestToken },
        include: {
          items: true
        }
      })

      if (!order) {
        return NextResponse.json(
          { error: 'Order not found' },
          { status: 404 }
        )
      }

      return NextResponse.json(formatOrder(order))
    }

    // Check for guest order lookup by email + orderId
    const email = url.searchParams.get('email')
    const orderId = url.searchParams.get('orderId')
    if (email && orderId) {
      // Rate limit guest lookup requests
      const identifier = getIdentifier(request, null)
      const { success, response } = await checkRateLimit(identifier, 'guestLookup')
      if (!success && response) {
        return response
      }

      // Validate email
      if (!validateEmail(email)) {
        return NextResponse.json(
          { error: 'Invalid email format' },
          { status: 400 }
        )
      }

      // Validate orderId
      try {
        validateId(orderId)
      } catch {
        return NextResponse.json(
          { error: 'Invalid order ID format' },
          { status: 400 }
        )
      }

      const order = await prisma.order.findFirst({
        where: {
          id: orderId,
          customerEmail: email.toLowerCase(),
        },
        include: {
          items: true
        }
      })

      if (!order) {
        return NextResponse.json(
          { error: 'Order not found. Please check your email and order number.' },
          { status: 404 }
        )
      }

      return NextResponse.json(formatOrder(order))
    }

    // Authenticated user order fetch
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Rate limit API requests
    const identifier = getIdentifier(request, userId)
    const { success, response } = await checkRateLimit(identifier, 'api')
    if (!success && response) {
      return response
    }

    const orders = await prisma.order.findMany({
      where: { userId },
      include: {
        items: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    // Format for frontend
    const formattedOrders = orders.map(formatOrder)

    return NextResponse.json(formattedOrders)
  } catch {
    return NextResponse.json(
      { error: 'Failed to fetch orders' },
      { status: 500 }
    )
  }
}
