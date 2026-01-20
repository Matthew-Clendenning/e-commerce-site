import { prisma } from '@/lib/prisma'
import { auth, currentUser } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { validateProductId } from '@/lib/validation'
import { checkRateLimit, getIdentifier } from '@/lib/ratelimit'

// GET - fetch user's cart
export async function GET(request: Request) {
    try {
        const { userId } = await auth();

        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, {status: 401 });
        }

        // Rate limit cart operations
        const identifier = getIdentifier(request, userId)
        const { success, response } = await checkRateLimit(identifier, 'cart')
        if (!success && response) {
            return response
        }

        // Fetch cart items with product details
        const cartItems = await prisma.cartItem.findMany({
            where: { userId },
            include: {
                product: {
                    include: {
                        category: true
                    }
                }
            }
        })

        // Transform to match our frontend cart structure
        const formattedItems = cartItems.map(item => ({
            id: item.product.id,
            name: item.product.name,
            price: Number(item.product.price), // Convert Decimal to number
            quantity: item.quantity,
            imageUrl: item.product.imageUrl,
            slug: item.product.slug,
            stock: item.product.stock
        }))

        return NextResponse.json(formattedItems);
    } catch {
        return NextResponse.json(
            { error: 'Failed to fetch cart' },
            { status: 500 }
        )
    }
}

// POST - Add item to cart (UPDATED WITH VALIDATION)
export async function POST(request: Request) {
    try {
        const { userId } = await auth();

        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, {status: 401 });
        }

        // Rate limit cart operations
        const identifier = getIdentifier(request, userId)
        const { success, response } = await checkRateLimit(identifier, 'cart')
        if (!success && response) {
            return response
        }

        const clerkUser = await currentUser();

        if (!clerkUser) {
            return NextResponse.json({ error: 'User not found' }, {status: 404 });
        }

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
        });

        const body = await request.json();
        
        // STEP 1: VALIDATE PRODUCT ID
        const productId = validateProductId(body.productId)
        if (!productId) {
            return NextResponse.json({ error: 'Invalid product ID' }, { status: 400 })
        }

        // STEP 2: FETCH PRODUCT FROM DATABASE (never trust client!)
        const product = await prisma.product.findUnique({
            where: { id: productId }
        })

        if (!product) {
            return NextResponse.json({ error: 'Product not found' }, { status: 404 })
        }

        // STEP 3: CHECK STOCK AVAILABILITY
        if (product.stock === 0) {
            return NextResponse.json({ error: 'Product out of stock' }, { status: 400 })
        }

        // STEP 4: Check if item already in cart
        const existingCartItem = await prisma.cartItem.findUnique({
            where: {
                userId_productId: {
                    userId,
                    productId
                }
            }
        })

        if (existingCartItem) {
            // STEP 5: Validate new quantity won't exceed stock
            const newQuantity = existingCartItem.quantity + 1
            
            if (newQuantity > product.stock) {
                return NextResponse.json({ 
                    error: 'Cannot add more items - stock limit reached' 
                }, { status: 400 })
            }

            // Item exists - increase quantity
            const updated = await prisma.cartItem.update({
                where: {
                    userId_productId: { userId, productId }
                },
                data: {
                    quantity: { increment: 1 }
                },
                include: {
                    product: true
                }
            })

            return NextResponse.json({
                id: updated.product.id,
                name: updated.product.name,
                price: Number(updated.product.price),
                quantity: updated.quantity,
                imageUrl: updated.product.imageUrl,
                slug: updated.product.slug,
                stock: updated.product.stock
            })
        } else {
            // New item - create cart entry
            const created = await prisma.cartItem.create({
                data: {
                    userId,
                    productId,
                    quantity: 1
                },
                include: {
                    product: true
                }
            })

            return NextResponse.json({
                id: created.product.id,
                name: created.product.name,
                price: Number(created.product.price),
                quantity: created.quantity,
                imageUrl: created.product.imageUrl,
                slug: created.product.slug,
                stock: created.product.stock
            })
        }
    } catch {
        return NextResponse.json(
            { error: 'Failed to add to cart' },
            { status: 500 }
        )
    }
}

// DELETE - Clear entire cart
export async function DELETE(request: Request) {
    try {
        const { userId } = await auth();

        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, {status: 401 });
        }

        // Rate limit cart operations
        const identifier = getIdentifier(request, userId)
        const { success, response } = await checkRateLimit(identifier, 'cart')
        if (!success && response) {
            return response
        }

        await prisma.cartItem.deleteMany({
            where: { userId }
        })

        return NextResponse.json({ success: true });
    } catch {
        return NextResponse.json(
            { error: 'Failed to clear cart' },
            { status: 500 }
        )
    }
}