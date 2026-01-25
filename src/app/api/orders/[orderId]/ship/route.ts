import { NextResponse } from 'next/server'
import { auth, currentUser } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { createShippingLabel } from '@/lib/shipping'
import type { ShippingAddress } from '@/lib/shipping'
import { sendShippingNotificationEmail } from '@/lib/email'
import { getTrackingUrl } from '@/lib/tracking'

type Props = {
  params: Promise<{ orderId: string }>
}

// POST - Create shipping label and send notification
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
    if (order.status !== 'PROCESSING') {
      return NextResponse.json(
        { error: `Cannot ship order with status: ${order.status}` },
        { status: 400 }
      )
    }

    // Check if already shipped
    if (order.trackingNumber) {
      return NextResponse.json(
        { error: 'Order already has tracking number' },
        { status: 400 }
      )
    }

    // Parse shipping address from order
    const shippingData = order.shippingAddress as {
      address?: {
        line1?: string
        line2?: string
        city?: string
        state?: string
        postal_code?: string
        country?: string
      }
      name?: string
    } | null

    if (!shippingData?.address) {
      return NextResponse.json(
        { error: 'Order has no shipping address' },
        { status: 400 }
      )
    }

    const toAddress: ShippingAddress = {
      name: shippingData.name || order.customerName || 'Customer',
      street1: shippingData.address.line1 || '',
      street2: shippingData.address.line2 || '',
      city: shippingData.address.city || '',
      state: shippingData.address.state || '',
      zip: shippingData.address.postal_code || '',
      country: shippingData.address.country || 'US',
      email: order.customerEmail,
    }

    // Get optional parameters from request body
    const body = await request.json().catch(() => ({}))
    const { preferredCarrier, parcel } = body as {
      preferredCarrier?: string
      parcel?: {
        length: number
        width: number
        height: number
        weight: number
      }
    }

    // Create shipping label
    const labelResult = await createShippingLabel(toAddress, parcel, preferredCarrier)

    if (!labelResult.success || !labelResult.trackingNumber) {
      return NextResponse.json(
        { error: labelResult.error || 'Failed to create shipping label' },
        { status: 500 }
      )
    }

    // Update order with tracking info
    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: {
        status: 'SHIPPED',
        trackingNumber: labelResult.trackingNumber,
        shippingCarrier: labelResult.carrier as 'USPS' | 'UPS' | 'FEDEX' | 'DHL' | 'OTHER',
        shippedAt: new Date(),
      },
      include: { items: true }
    })

    // Send shipping notification email
    await sendShippingNotificationEmail({
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
      trackingNumber: labelResult.trackingNumber,
      carrier: labelResult.carrier || 'Carrier',
      trackingUrl: labelResult.trackingUrl || null,
      estimatedDelivery: labelResult.estimatedDelivery,
    })

    return NextResponse.json({
      success: true,
      trackingNumber: labelResult.trackingNumber,
      carrier: labelResult.carrier,
      labelUrl: labelResult.labelUrl,
      trackingUrl: labelResult.trackingUrl,
      estimatedDelivery: labelResult.estimatedDelivery,
      rate: labelResult.rate,
    })
  } catch (error) {
    console.error('Failed to ship order:', error)
    return NextResponse.json(
      { error: 'Failed to ship order' },
      { status: 500 }
    )
  }
}

// PATCH - Manual tracking update (without Shippo label creation)
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
    const { trackingNumber, carrier, sendEmail = true } = body as {
      trackingNumber: string
      carrier: 'USPS' | 'UPS' | 'FEDEX' | 'DHL' | 'OTHER'
      sendEmail?: boolean
    }

    if (!trackingNumber || !carrier) {
      return NextResponse.json(
        { error: 'Tracking number and carrier are required' },
        { status: 400 }
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

    // Update order with tracking info
    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: {
        status: 'SHIPPED',
        trackingNumber,
        shippingCarrier: carrier,
        shippedAt: new Date(),
      },
      include: { items: true }
    })

    // Send shipping notification email if requested
    if (sendEmail) {
      const trackingUrl = getTrackingUrl(carrier, trackingNumber)

      await sendShippingNotificationEmail({
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
        trackingNumber,
        carrier,
        trackingUrl,
      })
    }

    return NextResponse.json({
      success: true,
      trackingNumber,
      carrier,
      trackingUrl: getTrackingUrl(carrier, trackingNumber),
    })
  } catch (error) {
    console.error('Failed to update shipping:', error)
    return NextResponse.json(
      { error: 'Failed to update shipping' },
      { status: 500 }
    )
  }
}
