import { prisma } from '@/lib/prisma';
import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';

type Props = {
    params: Promise<{ productId: string }>
}

// PATCH - Update quantity of a specific item
export async function PATCH(request: NextRequest, { params }: Props) {
    try {
        const { userId } = await auth();

        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { productId } = await params;
        const { quantity } = await request.json();

        // Validate quantity
        if (quantity < 0 ) {
            return NextResponse.json(
                {error: 'Quantity must be positive' },
                { status: 400 }
            )
        }

        // If quantity is 0, delete the item instead
        if (quantity === 0) {
            await prisma.cartItem.delete({
                where: {
                    userId_productId: { userId, productId }
                }
            })

            return NextResponse.json({
                success: true,
                message: 'Item removed from cart'
            })
        }

        // Update the quantity
        const updated = await prisma.cartItem.update({
            where: {
                userId_productId: { userId, productId }
            },
            data: { quantity },
            include: { product: true }
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
    } catch (error) {
        console.error('Error updating cart item:', error);
        return NextResponse.json(
            { error: "Failed to update cart item" },
            { status: 500 }
        )
    }
}

//DELETE - Remove a specific item from cart
export async function DELETE(request: NextRequest, { params }: Props) {
    try {
        const { userId } = await auth()

        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const { productId } = await params

        // Delete the item from the cart
        await prisma.cartItem.delete({
            where: {
                userId_productId: { userId, productId }
            }
        })

        return NextResponse.json({
            success: true,
            message: 'Item removed from cart'
        })
    } catch (error) {
        console.error('Error removing cart item:', error)
        return NextResponse.json(
            { error: "Failed to remove cart item" },
            { status: 500 }
        )
    }
}