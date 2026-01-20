import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth'
import { validateId } from '@/lib/validation'
import { checkRateLimit, getIdentifier } from '@/lib/ratelimit'

type Props = {
    params: Promise<{ orderId: string }>
}

// Update order status
export async function PATCH(request: NextRequest, { params }: Props) {
    try {
        await requireAdmin()

        // Rate limit admin operations
        const identifier = getIdentifier(request)
        const { success, response } = await checkRateLimit(identifier, 'admin')
        if (!success && response) {
            return response
        }

        const { orderId } = await params

        // Validate orderId format
        const validOrderId = validateId(orderId)

        const body = await request.json()
        const { status } = body

        // Validate status
        const validStatuses = ['PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED']
        if (!validStatuses.includes(status)) {
            return NextResponse.json(
                { error: 'Invalid status' },
                { status: 400 }
            )
        }

        // Update order
        const updatedOrder = await prisma.order.update({
            where: { id: validOrderId },
            data: { status },
            include: {
                items: true,
                user: {
                    select: {
                        email: true,
                        name: true,
                    }
                }
            }
        })

        return NextResponse.json({
            id: updatedOrder.id,
            status: updatedOrder.status,
            total: Number(updatedOrder.total),
            customerEmail: updatedOrder.customerEmail,
            customerName: updatedOrder.customerName,
            updatedAt: updatedOrder.updatedAt,
        })
    } catch (error) {
        if (error instanceof Error) {
            if (error.message === 'Unauthorized') {
                return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
            }
            if (error.message === 'Forbidden: Admin access required') {
                return NextResponse.json({ error: 'Forbidden '}, { status: 403 })
            }
        }

        return NextResponse.json(
            { error: 'Failed to update order' },
            { status: 500 }
        )
    }
}

// Get single order details
export async function GET(request: NextRequest, { params }: Props) {
    try {
        await requireAdmin()

        // Rate limit admin operations
        const identifier = getIdentifier(request)
        const { success, response } = await checkRateLimit(identifier, 'admin')
        if (!success && response) {
            return response
        }

        const { orderId } = await params

        // Validate orderId format
        const validOrderId = validateId(orderId)

        const order = await prisma.order.findUnique({
            where: { id: validOrderId },
            include: {
                user: {
                    select: {
                        id: true,
                        email: true,
                        name: true,
                    }
                },
                items: {
                    include: {
                        product: true
                    }
                }
            }
        })

        if (!order) {
            return NextResponse.json(
                { error: 'Order not found' },
                { status: 404 }
            )
        }

        return NextResponse.json({
            id: order.id,
            status: order.status,
            total: Number(order.total),
            customerEamil: order.customerEmail,
            customerName: order.customerName,
            shippingAddress: order.shippingAddress,
            createdAt: order.createdAt,
            updatedAt: order.updatedAt,
            user: order.user,
            items: order.items.map(item => ({
                id: item.id,
                productId: item.productId,
                name: item.name,
                price: Number(item.price),
                quantity: item.quantity,
                imageUrl: item.imageUrl,
            }))
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
            { error: 'Failed to fetch order' },
            { status: 500 }
        )
    }
}