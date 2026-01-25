import { prisma } from '@/lib/prisma'
import { auth, currentUser } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { validateProductId } from '@/lib/validation'
import { checkRateLimit, getIdentifier } from '@/lib/ratelimit'

// GET - fetch user's favorites
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

        const favorites = await prisma.favorite.findMany({
            where: { userId },
            include: {
                product: {
                    include: {
                        category: true
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        })

        const formattedFavorites = favorites.map(fav => ({
            id: fav.product.id,
            name: fav.product.name,
            slug: fav.product.slug,
            price: Number(fav.product.price),
            imageUrl: fav.product.imageUrl,
            stock: fav.product.stock,
            category: {
                name: fav.product.category.name,
                slug: fav.product.category.slug
            },
            addedAt: fav.createdAt
        }))

        return NextResponse.json(formattedFavorites)
    } catch {
        return NextResponse.json(
            { error: 'Failed to fetch favorites' },
            { status: 500 }
        )
    }
}

// POST - add product to favorites
export async function POST(request: Request) {
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

        // Check if already favorited
        const existingFavorite = await prisma.favorite.findUnique({
            where: {
                userId_productId: {
                    userId,
                    productId
                }
            }
        })

        if (existingFavorite) {
            return NextResponse.json({ error: 'Product already in favorites' }, { status: 400 })
        }

        // Create favorite
        const favorite = await prisma.favorite.create({
            data: {
                userId,
                productId
            },
            include: {
                product: {
                    include: {
                        category: true
                    }
                }
            }
        })

        return NextResponse.json({
            id: favorite.product.id,
            name: favorite.product.name,
            slug: favorite.product.slug,
            price: Number(favorite.product.price),
            imageUrl: favorite.product.imageUrl,
            stock: favorite.product.stock,
            category: {
                name: favorite.product.category.name,
                slug: favorite.product.category.slug
            },
            addedAt: favorite.createdAt
        })
    } catch {
        return NextResponse.json(
            { error: 'Failed to add to favorites' },
            { status: 500 }
        )
    }
}
