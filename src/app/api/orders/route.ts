import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { checkRateLimit, getIdentifier } from '@/lib/ratelimit'

// GET - Fetch user's orders
export async function GET(request: Request) {
  try {
    const { userId } = await auth()

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
        items: {
          include: {
            product: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    // Format for frontend
    const formattedOrders = orders.map(order => ({
      id: order.id,
      status: order.status,
      total: Number(order.total),
      customerEmail: order.customerEmail,
      customerName: order.customerName,
      shippingAddress: order.shippingAddress,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      items: order.items.map(item => ({
        id: item.id,
        productId: item.productId,
        name: item.name,
        price: Number(item.price),
        quantity: item.quantity,
        imageUrl: item.imageUrl,
      }))
    }))

    return NextResponse.json(formattedOrders)
  } catch {
    return NextResponse.json(
      { error: 'Failed to fetch orders' },
      { status: 500 }
    )
  }
}