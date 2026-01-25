import { prisma } from '@/lib/prisma'
import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { validateProductId } from '@/lib/validation'
import { checkRateLimit, getIdentifier } from '@/lib/ratelimit'

type Props = {
    params: Promise<{ productId: string }>
}

// DELETE - remove product from favorites
export async function DELETE(request: Request, { params }: Props) {
    try {
        const { userId } = await auth()

        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const identifier = getIdentifier(request, userId)
        const { success, response } = await checkRateLimit(identifier, 'cart')
        if (!success && response) {
            return response
        }

        const { productId: rawProductId } = await params
        const productId = validateProductId(rawProductId)

        if (!productId) {
            return NextResponse.json({ error: 'Invalid product ID' }, { status: 400 })
        }

        // Delete favorite
        await prisma.favorite.delete({
            where: {
                userId_productId: {
                    userId,
                    productId
                }
            }
        })

        return NextResponse.json({ success: true })
    } catch (error) {
        // Handle case where favorite doesn't exist
        if (error instanceof Error && error.message.includes('Record to delete does not exist')) {
            return NextResponse.json({ error: 'Favorite not found' }, { status: 404 })
        }
        return NextResponse.json(
            { error: 'Failed to remove from favorites' },
            { status: 500 }
        )
    }
}

// GET - check if product is favorited
export async function GET(_request: Request, { params }: Props) {
    try {
        const { userId } = await auth()

        if (!userId) {
            return NextResponse.json({ isFavorited: false })
        }

        const { productId: rawProductId } = await params
        const productId = validateProductId(rawProductId)

        if (!productId) {
            return NextResponse.json({ error: 'Invalid product ID' }, { status: 400 })
        }

        const favorite = await prisma.favorite.findUnique({
            where: {
                userId_productId: {
                    userId,
                    productId
                }
            }
        })

        return NextResponse.json({ isFavorited: !!favorite })
    } catch {
        return NextResponse.json(
            { error: 'Failed to check favorite status' },
            { status: 500 }
        )
    }
}
