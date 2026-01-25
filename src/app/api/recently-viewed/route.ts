import { prisma } from '@/lib/prisma'
import { auth, currentUser } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { validateProductId } from '@/lib/validation'
import { checkRateLimit, getIdentifier } from '@/lib/ratelimit'

const MAX_RECENTLY_VIEWED = 20

// GET - fetch user's recently viewed products
export async function GET(request: Request) {
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

        const recentlyViewed = await prisma.recentlyViewed.findMany({
            where: { userId },
            include: {
                product: {
                    include: {
                        category: true
                    }
                }
            },
            orderBy: {
                viewedAt: 'desc'
            },
            take: MAX_RECENTLY_VIEWED
        })

        const formattedItems = recentlyViewed.map(item => ({
            id: item.product.id,
            name: item.product.name,
            slug: item.product.slug,
            price: Number(item.product.price),
            imageUrl: item.product.imageUrl,
            stock: item.product.stock,
            category: {
                name: item.product.category.name,
                slug: item.product.category.slug
            },
            viewedAt: item.viewedAt
        }))

        return NextResponse.json(formattedItems)
    } catch {
        return NextResponse.json(
            { error: 'Failed to fetch recently viewed' },
            { status: 500 }
        )
    }
}

// POST - record a product view
export async function POST(request: Request) {
    try {
        const { userId } = await auth()

        if (!userId) {
            // For non-authenticated users, just return success
            // The frontend can handle local storage for guests
            return NextResponse.json({ success: true })
        }

        const identifier = getIdentifier(request, userId)
        const { success, response } = await checkRateLimit(identifier, 'cart')
        if (!success && response) {
            return response
        }

        const clerkUser = await currentUser()

        if (!clerkUser) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 })
        }

        // Ensure user exists in database
        await prisma.user.upsert({
            where: { id: userId },
            update: {
                email: clerkUser.emailAddresses[0]?.emailAddress || '',
                name: `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim() || null,
            },
            create: {
                id: userId,
                email: clerkUser.emailAddresses[0]?.emailAddress || '',
                name: `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim() || null,
            }
        })

        const body = await request.json()
        const productId = validateProductId(body.productId)

        if (!productId) {
            return NextResponse.json({ error: 'Invalid product ID' }, { status: 400 })
        }

        // Verify product exists
        const product = await prisma.product.findUnique({
            where: { id: productId }
        })

        if (!product) {
            return NextResponse.json({ error: 'Product not found' }, { status: 404 })
        }

        // Upsert the view (create or update timestamp)
        await prisma.recentlyViewed.upsert({
            where: {
                userId_productId: {
                    userId,
                    productId
                }
            },
            update: {
                viewedAt: new Date()
            },
            create: {
                userId,
                productId
            }
        })

        // Clean up old views (keep only MAX_RECENTLY_VIEWED)
        const allViews = await prisma.recentlyViewed.findMany({
            where: { userId },
            orderBy: { viewedAt: 'desc' },
            select: { id: true }
        })

        if (allViews.length > MAX_RECENTLY_VIEWED) {
            const idsToDelete = allViews.slice(MAX_RECENTLY_VIEWED).map(v => v.id)
            await prisma.recentlyViewed.deleteMany({
                where: {
                    id: { in: idsToDelete }
                }
            })
        }

        return NextResponse.json({ success: true })
    } catch {
        return NextResponse.json(
            { error: 'Failed to record view' },
            { status: 500 }
        )
    }
}
