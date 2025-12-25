import { prisma } from '@/lib/prisma'
import { auth, currentUser } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { validateProductId, validateQuantity } from '@/lib/validation'

// Maximum items that can be synced at once
const MAX_SYNC_ITEMS = 50

type SyncResult = {
  success: boolean
  synced: number
  skipped: number
  errors: Array<{ productId: string; reason: string }>
}

// POST - Sync guest cart to authenticated user
export async function POST(request: Request) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json(
        { error: 'Must be authenticated to sync cart' },
        { status: 401 }
      )
    }

    // Get user info from Clerk
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
    const { items } = body

    // STEP 1: Validate items array
    if (!Array.isArray(items)) {
      return NextResponse.json(
        { error: 'Items must be an array' },
        { status: 400 }
      )
    }

    // STEP 2: Enforce maximum items limit
    if (items.length === 0) {
      return NextResponse.json(
        { error: 'No items to sync' },
        { status: 400 }
      )
    }

    if (items.length > MAX_SYNC_ITEMS) {
      return NextResponse.json(
        { error: `Cannot sync more than ${MAX_SYNC_ITEMS} items at once` },
        { status: 400 }
      )
    }

    // STEP 3: Validate and collect product IDs
    const validatedItems: Array<{ productId: string; quantity: number }> = []
    const errors: Array<{ productId: string; reason: string }> = []

    for (const item of items) {
      // Validate product ID format
      let validProductId: string | null
      try {
        validProductId = validateProductId(item.id)
      } catch {
        errors.push({
          productId: String(item.id || 'unknown'),
          reason: 'Invalid product ID format'
        })
        continue
      }

      if (!validProductId) {
        errors.push({
          productId: String(item.id),
          reason: 'Invalid product ID'
        })
        continue
      }

      // Validate quantity type
      if (typeof item.quantity !== 'number' || !Number.isInteger(item.quantity)) {
        errors.push({
          productId: validProductId,
          reason: 'Quantity must be a valid integer'
        })
        continue
      }

      // Basic quantity validation (detailed validation happens later with stock check)
      if (item.quantity < 1) {
        errors.push({
          productId: validProductId,
          reason: 'Quantity must be at least 1'
        })
        continue
      }

      if (item.quantity > 1000) {
        errors.push({
          productId: validProductId,
          reason: 'Quantity cannot exceed 1000'
        })
        continue
      }

      validatedItems.push({
        productId: validProductId,
        quantity: item.quantity
      })
    }

    // If all items failed validation, return error
    if (validatedItems.length === 0) {
      return NextResponse.json(
        {
          error: 'No valid items to sync',
          errors
        },
        { status: 400 }
      )
    }

    // STEP 4: Fetch all products in ONE query (performance optimization)
    const productIds = validatedItems.map(item => item.productId)
    const products = await prisma.product.findMany({
      where: {
        id: { in: productIds }
      },
      select: {
        id: true,
        stock: true,
        name: true
      }
    })

    // Create a map for quick lookup
    const productMap = new Map(products.map(p => [p.id, p]))

    // STEP 5: Use transaction for atomic operation
    const result = await prisma.$transaction(async (tx) => {
      let syncedCount = 0

      for (const item of validatedItems) {
        const product = productMap.get(item.productId)

        // Product doesn't exist
        if (!product) {
          errors.push({
            productId: item.productId,
            reason: 'Product not found'
          })
          continue
        }

        // Product out of stock
        if (product.stock === 0) {
          errors.push({
            productId: item.productId,
            reason: 'Product out of stock'
          })
          continue
        }

        // Validate quantity against stock
        let validatedQuantity: number
        try {
          validatedQuantity = validateQuantity(item.quantity, product.stock, 1000)
        } catch (error) {
          errors.push({
            productId: item.productId,
            reason: error instanceof Error ? error.message : 'Invalid quantity'
          })
          continue
        }

        // Check if item already in cart
        const existing = await tx.cartItem.findUnique({
          where: {
            userId_productId: {
              userId,
              productId: product.id
            }
          }
        })

        if (existing) {
          // Merge: Add quantities together (respecting stock limit)
          const newQuantity = existing.quantity + validatedQuantity
          const finalQuantity = Math.min(newQuantity, product.stock)

          await tx.cartItem.update({
            where: {
              userId_productId: {
                userId,
                productId: product.id
              }
            },
            data: {
              quantity: finalQuantity
            }
          })
        } else {
          // Create new cart item
          await tx.cartItem.create({
            data: {
              userId,
              productId: product.id,
              quantity: validatedQuantity
            }
          })
        }

        syncedCount++
      }

      return syncedCount
    })

    // STEP 6: Return detailed result
    const response: SyncResult = {
      success: true,
      synced: result,
      skipped: errors.length,
      errors: errors.length > 0 ? errors : []
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error syncing cart:', error)
    return NextResponse.json(
      { error: 'Failed to sync cart' },
      { status: 500 }
    )
  }
}