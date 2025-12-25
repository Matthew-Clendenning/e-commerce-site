import { prisma } from '@/lib/prisma';
import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { validateProductId, validateQuantity } from '@/lib/validation';

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
        const body = await request.json();

        // STEP 1: Validate product ID format
        const validProductId = validateProductId(productId);
        if (!validProductId) {
            return NextResponse.json(
                { error: 'Invalid product ID' },
                { status: 400 }
            );
        }

        // STEP 2: Fetch the product to check stock
        const product = await prisma.product.findUnique({
            where: { id: validProductId }
        });

        if (!product) {
            return NextResponse.json(
                { error: 'Product not found' },
                { status: 404 }
            );
        }

        // STEP 3: Validate quantity using helper
        let validatedQuantity: number;
        try {
            validatedQuantity = validateQuantity(body.quantity, product.stock, 1000);
        } catch (error) {
            if (error instanceof Error) {
                return NextResponse.json(
                    { 
                        error: error.message,
                        maxQuantity: product.stock
                    },
                    { status: 400 }
                );
            }
            throw error;
        }

        // STEP 4: If quantity is 0, delete the item instead
        if (validatedQuantity === 0) {
            try {
                await prisma.cartItem.delete({
                    where: {
                        userId_productId: { userId, productId: validProductId }
                    }
                });

                return NextResponse.json({
                    success: true,
                    message: 'Item removed from cart'
                });
            } catch {
                // Cart item doesn't exist - that's fine, already removed
                return NextResponse.json({
                    success: true,
                    message: 'Item already removed from cart'
                });
            }
        }

        // STEP 5: Check if cart item exists
        const existingCartItem = await prisma.cartItem.findUnique({
            where: {
                userId_productId: { userId, productId: validProductId }
            }
        });

        if (!existingCartItem) {
            return NextResponse.json(
                { error: 'Item not in cart' },
                { status: 404 }
            );
        }

        // STEP 6: Update the quantity with validated value
        const updated = await prisma.cartItem.update({
            where: {
                userId_productId: { userId, productId: validProductId }
            },
            data: { quantity: validatedQuantity },
            include: { product: true }
        });

        return NextResponse.json({
            id: updated.product.id,
            name: updated.product.name,
            price: Number(updated.product.price),
            quantity: updated.quantity,
            imageUrl: updated.product.imageUrl,
            slug: updated.product.slug,
            stock: updated.product.stock
        });
    } catch (error) {
        console.error('Error updating cart item:', error);
        
        // Don't expose internal error details
        return NextResponse.json(
            { error: "Failed to update cart item" },
            { status: 500 }
        );
    }
}

// DELETE - Remove a specific item from cart
export async function DELETE(request: NextRequest, { params }: Props) {
    try {
        const { userId } = await auth();

        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { productId } = await params;

        // STEP 1: Validate product ID format
        const validProductId = validateProductId(productId);
        if (!validProductId) {
            return NextResponse.json(
                { error: 'Invalid product ID' },
                { status: 400 }
            );
        }

        // STEP 2: Try to delete (handle case where item doesn't exist)
        try {
            await prisma.cartItem.delete({
                where: {
                    userId_productId: { userId, productId: validProductId }
                }
            });

            return NextResponse.json({
                success: true,
                message: 'Item removed from cart'
            });
        } catch (error) {
            // Check if error is because item doesn't exist
            if (error && typeof error === 'object' && 'code' in error && error.code === 'P2025') {
                // Prisma error P2025: Record not found
                // This is actually fine - item already doesn't exist
                return NextResponse.json({
                    success: true,
                    message: 'Item already removed from cart'
                });
            }
            
            // Other error - re-throw
            throw error;
        }
    } catch (error) {
        console.error('Error removing cart item:', error);
        
        return NextResponse.json(
            { error: "Failed to remove cart item" },
            { status: 500 }
        );
    }
}