import { NextResponse } from 'next/server'
import { auth, currentUser } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'

type Props = {
  params: Promise<{ orderId: string }>
}

// GET - Get tracking info for an order
export async function GET(request: Request, { params }: Props) {
  try {
    const { orderId } = await params
    const { searchParams } = new URL(request.url)
    const email = searchParams.get('email')
    const guestToken = searchParams.get('guestToken')

    const { userId } = await auth()

    // Build query based on authentication method
    let order

    if (userId) {
      // Authenticated user
      order = await prisma.order.findFirst({
        where: {
          id: orderId,
          userId
        },
        select: {
          id: true,
          status: true,
          trackingNumber: true,
          shippingCarrier: true,
          shippedAt: true,
          deliveredAt: true,
          createdAt: true,
          updatedAt: true
        }
      })
    } else if (email && guestToken) {
      // Guest lookup
      order = await prisma.order.findFirst({
        where: {
          id: orderId,
          customerEmail: email,
          guestToken
        },
        select: {
          id: true,
          status: true,
          trackingNumber: true,
          shippingCarrier: true,
          shippedAt: true,
          deliveredAt: true,
          createdAt: true,
          updatedAt: true
        }
      })
    } else {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    if (!order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(order)
  } catch {
    return NextResponse.json(
      { error: 'Failed to fetch tracking info' },
      { status: 500 }
    )
  }
}

// PATCH - Update tracking info (admin only)
export async function PATCH(request: Request, { params }: Props) {
  try {
    const { orderId } = await params
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check if user is admin
    const user = await currentUser()
    const isAdmin = user?.publicMetadata?.role === 'admin'

    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { trackingNumber, shippingCarrier, status } = body

    // Validate carrier if provided
    const validCarriers = ['USPS', 'UPS', 'FEDEX', 'DHL', 'OTHER']
    if (shippingCarrier && !validCarriers.includes(shippingCarrier)) {
      return NextResponse.json(
        { error: 'Invalid shipping carrier' },
        { status: 400 }
      )
    }

    // Build update data
    const updateData: {
      trackingNumber?: string
      shippingCarrier?: 'USPS' | 'UPS' | 'FEDEX' | 'DHL' | 'OTHER'
      status?: 'PENDING' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED'
      shippedAt?: Date
      deliveredAt?: Date
    } = {}

    if (trackingNumber !== undefined) {
      updateData.trackingNumber = trackingNumber
    }

    if (shippingCarrier) {
      updateData.shippingCarrier = shippingCarrier
    }

    if (status) {
      updateData.status = status

      // Auto-set timestamps based on status
      if (status === 'SHIPPED' && !updateData.shippedAt) {
        updateData.shippedAt = new Date()
      }
      if (status === 'DELIVERED' && !updateData.deliveredAt) {
        updateData.deliveredAt = new Date()
      }
    }

    // If adding tracking number, auto-set status to SHIPPED
    if (trackingNumber && !status) {
      const existingOrder = await prisma.order.findUnique({
        where: { id: orderId },
        select: { status: true }
      })

      if (existingOrder?.status === 'PROCESSING') {
        updateData.status = 'SHIPPED'
        updateData.shippedAt = new Date()
      }
    }

    const order = await prisma.order.update({
      where: { id: orderId },
      data: updateData,
      select: {
        id: true,
        status: true,
        trackingNumber: true,
        shippingCarrier: true,
        shippedAt: true,
        deliveredAt: true
      }
    })

    return NextResponse.json(order)
  } catch (error) {
    console.error('Failed to update tracking:', error)
    return NextResponse.json(
      { error: 'Failed to update tracking info' },
      { status: 500 }
    )
  }
}
