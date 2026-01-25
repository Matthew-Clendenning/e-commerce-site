import { NextResponse } from 'next/server'
import { auth, currentUser } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { sendDeliveryConfirmationEmail } from '@/lib/email'

type Props = {
  params: Promise<{ orderId: string }>
}

// POST - Mark order as delivered and send confirmation email
export async function POST(request: Request, { params }: Props) {
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

    // Get the order
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true }
    })

    if (!order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      )
    }

    // Check if order is in correct state
    if (order.status !== 'SHIPPED') {
      return NextResponse.json(
        { error: `Cannot mark as delivered - order status is: ${order.status}` },
        { status: 400 }
      )
    }

    // Get optional parameter
    const body = await request.json().catch(() => ({}))
    const { sendEmail = true } = body as { sendEmail?: boolean }

    // Update order status
    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: {
        status: 'DELIVERED',
        deliveredAt: new Date(),
      },
      include: { items: true }
    })

    // Send delivery confirmation email if requested
    if (sendEmail) {
      await sendDeliveryConfirmationEmail({
        orderId: order.id,
        customerEmail: order.customerEmail,
        customerName: order.customerName,
        items: updatedOrder.items.map(item => ({
          name: item.name,
          quantity: item.quantity,
          price: Number(item.price),
          imageUrl: item.imageUrl,
        })),
        total: Number(order.total),
      })
    }

    return NextResponse.json({
      success: true,
      status: 'DELIVERED',
      deliveredAt: updatedOrder.deliveredAt,
    })
  } catch (error) {
    console.error('Failed to mark order as delivered:', error)
    return NextResponse.json(
      { error: 'Failed to mark order as delivered' },
      { status: 500 }
    )
  }
}
