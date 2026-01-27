import { NextResponse } from 'next/server'
import { auth, currentUser } from '@clerk/nextjs/server'
import { stripe } from '@/lib/stripe'
import { prisma } from '@/lib/prisma'
import { checkRateLimit, getIdentifier } from '@/lib/ratelimit'
import { validateEmail, validateGuestCartItems, validateGuestName } from '@/lib/validation'
import { getCategoryDiscountMap, calculateEffectiveDiscount, calculateSalePrice } from '@/lib/sales'
import type { Product } from '@prisma/client'

// Type for cart items with product data
type CartItemWithProduct = {
  id: string
  quantity: number
  createdAt: Date
  updatedAt: Date
  userId: string
  productId: string
  product: Product
}

export async function POST(request: Request) {
  try {
    const { userId } = await auth()

    // Rate limit checkout attempts
    const identifier = getIdentifier(request, userId)
    const { success, response } = await checkRateLimit(identifier, 'checkout')
    if (!success && response) {
      return response
    }

    // Parse request body for guest checkout
    const body = await request.json().catch(() => ({}))

    // Determine if this is a guest checkout or authenticated checkout
    const isGuest = !userId

    let customerEmail: string
    let customerName: string | null = null
    let cartItems: CartItemWithProduct[]

    if (isGuest) {
      // Guest checkout - validate inputs
      const { email, name, items } = body as {
        email?: unknown
        name?: unknown
        items?: unknown
      }

      // Validate email
      if (!validateEmail(email)) {
        return NextResponse.json(
          { error: 'Valid email is required for guest checkout' },
          { status: 400 }
        )
      }
      customerEmail = email

      // Validate name (optional)
      try {
        customerName = validateGuestName(name)
      } catch (err) {
        return NextResponse.json(
          { error: err instanceof Error ? err.message : 'Invalid name' },
          { status: 400 }
        )
      }

      // Validate cart items
      const validatedItems = validateGuestCartItems(items)
      if (!validatedItems) {
        return NextResponse.json(
          { error: 'Invalid cart items' },
          { status: 400 }
        )
      }

      // Fetch products from database (never trust client prices)
      const productIds = validatedItems.map(item => item.id)
      const products = await prisma.product.findMany({
        where: { id: { in: productIds } }
      })

      // Build cart items from validated data
      const builtItems: CartItemWithProduct[] = []
      for (const item of validatedItems) {
        const product = products.find(p => p.id === item.id)
        if (!product) {
          return NextResponse.json(
            { error: `Product not found: ${item.id}` },
            { status: 400 }
          )
        }
        builtItems.push({
          id: `guest-${item.id}`,
          quantity: item.quantity,
          createdAt: new Date(),
          updatedAt: new Date(),
          userId: '',
          productId: item.id,
          product
        })
      }
      cartItems = builtItems

      // Check all products exist
      if (cartItems.length !== validatedItems.length) {
        return NextResponse.json(
          { error: 'One or more products not found' },
          { status: 400 }
        )
      }
    } else {
      // Authenticated checkout
      const user = await currentUser()
      if (!user) {
        return NextResponse.json(
          { error: 'User not found' },
          { status: 404 }
        )
      }

      customerEmail = user.emailAddresses[0]?.emailAddress || ''
      customerName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || null

      // Get user's cart items from database
      cartItems = await prisma.cartItem.findMany({
        where: { userId },
        include: {
          product: true
        }
      })
    }

    if (cartItems.length === 0) {
      return NextResponse.json(
        { error: 'Cart is empty' },
        { status: 400 }
      )
    }

    // Validate stock availability
    for (const item of cartItems) {
      if (item.product.stock < item.quantity) {
        return NextResponse.json(
          {
            error: `Insufficient stock for ${item.product.name}. Only ${item.product.stock} available.`
          },
          { status: 400 }
        )
      }
    }

    // Fetch active category discounts for applying to prices
    const categoryDiscountMap = await getCategoryDiscountMap()

    // Create Stripe line items with discount prices applied
    const lineItems = cartItems.map(item => {
      const originalPrice = Number(item.product.price)
      const categoryDiscount = categoryDiscountMap.get(item.product.categoryId) ?? 0
      const productDiscount = item.product.discountPercent
      const effectiveDiscount = calculateEffectiveDiscount(productDiscount, categoryDiscount)
      const finalPrice = effectiveDiscount > 0
        ? calculateSalePrice(originalPrice, effectiveDiscount)
        : originalPrice

      // Build product name with discount info if applicable
      const productName = effectiveDiscount > 0
        ? `${item.product.name} (${effectiveDiscount}% OFF)`
        : item.product.name

      return {
        price_data: {
          currency: 'usd',
          product_data: {
            name: productName,
            description: item.product.description || undefined,
            images: item.product.imageUrl ? [item.product.imageUrl] : undefined,
          },
          unit_amount: Math.round(finalPrice * 100), // Convert to cents
        },
        quantity: item.quantity,
      }
    })

    // Calculate total with discounts applied
    const total = cartItems.reduce((sum, item) => {
      const originalPrice = Number(item.product.price)
      const categoryDiscount = categoryDiscountMap.get(item.product.categoryId) ?? 0
      const productDiscount = item.product.discountPercent
      const effectiveDiscount = calculateEffectiveDiscount(productDiscount, categoryDiscount)
      const finalPrice = effectiveDiscount > 0
        ? calculateSalePrice(originalPrice, effectiveDiscount)
        : originalPrice
      return sum + (finalPrice * item.quantity)
    }, 0)

    // Create pending order in database (with discounted prices)
    const order = await prisma.order.create({
      data: {
        userId: isGuest ? null : userId,
        isGuest,
        customerEmail,
        customerName,
        total,
        status: 'PENDING',
        items: {
          create: cartItems.map(item => {
            const originalPrice = Number(item.product.price)
            const categoryDiscount = categoryDiscountMap.get(item.product.categoryId) ?? 0
            const productDiscount = item.product.discountPercent
            const effectiveDiscount = calculateEffectiveDiscount(productDiscount, categoryDiscount)
            const finalPrice = effectiveDiscount > 0
              ? calculateSalePrice(originalPrice, effectiveDiscount)
              : originalPrice

            return {
              productId: item.product.id,
              name: item.product.name,
              price: finalPrice, // Store the discounted price
              quantity: item.quantity,
              imageUrl: item.product.imageUrl,
            }
          })
        }
      }
    })

    // Shipping options: Free shipping over $50, otherwise $5.99 flat rate
    const FREE_SHIPPING_THRESHOLD = 50
    const FLAT_RATE_SHIPPING = 599 // $5.99 in cents

    const shippingOptions = total >= FREE_SHIPPING_THRESHOLD
      ? [
          {
            shipping_rate_data: {
              type: 'fixed_amount' as const,
              fixed_amount: { amount: 0, currency: 'usd' },
              display_name: 'Free Shipping',
              delivery_estimate: {
                minimum: { unit: 'business_day' as const, value: 5 },
                maximum: { unit: 'business_day' as const, value: 7 },
              },
            },
          },
        ]
      : [
          {
            shipping_rate_data: {
              type: 'fixed_amount' as const,
              fixed_amount: { amount: FLAT_RATE_SHIPPING, currency: 'usd' },
              display_name: 'Standard Shipping',
              delivery_estimate: {
                minimum: { unit: 'business_day' as const, value: 5 },
                maximum: { unit: 'business_day' as const, value: 7 },
              },
            },
          },
        ]

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/order/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/checkout`,
      customer_email: customerEmail,
      metadata: {
        orderId: order.id,
        userId: userId || '',
        isGuest: isGuest ? 'true' : 'false',
        guestToken: order.guestToken || '',
      },
      billing_address_collection: 'required',
      shipping_address_collection: {
        allowed_countries: ['US'],
      },
      shipping_options: shippingOptions,
    })

    // Update order with Stripe session ID
    await prisma.order.update({
      where: { id: order.id },
      data: { stripeSessionId: session.id }
    })

    return NextResponse.json({
      sessionId: session.id,
      url: session.url,
      guestToken: isGuest ? order.guestToken : undefined,
    })

  } catch (err) {
    console.error('Checkout error:', err)
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    )
  }
}
