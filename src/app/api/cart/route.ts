import { prisma } from '@/lib/prisma';
import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

// GET - fetch user's cart
export async function GET() {
    try {
        const { userId } = await auth();

        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, {status: 401 });
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
    } catch (error) {
        console.error('Error fetching cart:', error);
        return NextResponse.json(
            { error: 'Failed to fetch cart' },
            { status: 500 }
        )
    }
}

// POST - Add item to cart
export async function POST(request: Request) {
    try {
        const { userId } = await auth();

        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, {status: 401 });
        }

        const { productId } = await request.json();

        // Check if item already in cart
        const existingCartItem = await prisma.cartItem.findUnique({
            where: {
                userId_productId: { // This uses our @unique contraint in Prisma schema
                    userId,
                    productId
                }
            }
        })

        if (existingCartItem) {
            // Item exists - increase quantity
            const updated = await prisma.cartItem.update({
                where: {
                    userId_productId: { userId, productId }
                },
                data: {
                    quantity: { increment: 1 } // Prisma's atomic increment
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
    } catch (error) {
        console.error('Error adding to cart:', error);
        return NextResponse.json(
            { error: 'Failed to add to cart' },
            { status: 500 }
        )
    }
}

// DELETE - Clear entire cart
export async function DELETE() {
    try {
        const { userId } = await auth();

        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, {status: 401 });
        }

        await prisma.cartItem.deleteMany({
            where: { userId }
        })

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error clearing cart:', error);
        return NextResponse.json(
            { error: 'Failed to clear cart' },
            { status: 500 }
        )
    }
}