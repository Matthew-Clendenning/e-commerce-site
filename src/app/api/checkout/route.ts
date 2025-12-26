import { NextResponse } from 'next/server'
import { auth, currentUser } from '@clerk/nextjs/server'
import { stripe } from '@/lib/stripe'
import { prisma } from '@/lib/prisma'

export async function POST(_request: Request) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const user = await currentUser()
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Get user's cart items
    const cartItems = await prisma.cartItem.findMany({
      where: { userId },
      include: {
        product: true
      }
    })

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

    // Create Stripe line items
    const lineItems = cartItems.map(item => ({
      price_data: {
        currency: 'usd',
        product_data: {
          name: item.product.name,
          description: item.product.description || undefined,
          images: item.product.imageUrl ? [item.product.imageUrl] : undefined,
        },
        unit_amount: Math.round(Number(item.product.price) * 100), // Convert to cents
      },
      quantity: item.quantity,
    }))

    // Calculate total
    const total = cartItems.reduce((sum, item) => {
      return sum + (Number(item.product.price) * item.quantity)
    }, 0)

    // Create pending order in database
    const order = await prisma.order.create({
      data: {
        userId,
        customerEmail: user.emailAddresses[0]?.emailAddress || '',
        customerName: `${user.firstName || ''} ${user.lastName || ''}`.trim() || null,
        total,
        status: 'PENDING',
        items: {
          create: cartItems.map(item => ({
            productId: item.product.id,
            name: item.product.name,
            price: item.product.price,
            quantity: item.quantity,
            imageUrl: item.product.imageUrl,
          }))
        }
      }
    })

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/order/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/cart`,
      customer_email: user.emailAddresses[0]?.emailAddress,
      metadata: {
        orderId: order.id,
        userId: userId,
      },
      billing_address_collection: 'required',
      shipping_address_collection: {
        allowed_countries: ['US', 'CA', 'GB'], // Add countries you ship to
      },
    })

    // Update order with Stripe session ID
    await prisma.order.update({
      where: { id: order.id },
      data: { stripeSessionId: session.id }
    })

    return NextResponse.json({ 
      sessionId: session.id,
      url: session.url 
    })

  } catch (error) {
    console.error('Checkout error:', error)
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    )
  }
}