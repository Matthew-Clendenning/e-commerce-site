import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import Stripe from 'stripe'
import { stripe } from '@/lib/stripe'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'

// IMPORTANT: This disables Next.js body parsing so we can verify the webhook signature
export const runtime = 'nodejs'

export async function POST(request: Request) {
  const body = await request.text()
  const headersList = await headers()
  const signature = headersList.get('stripe-signature')

  if (!signature) {
    return NextResponse.json(
      { error: 'No signature' },
      { status: 400 }
    )
  }

  let event: Stripe.Event

  try {
    // Verify webhook signature
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch {
    return NextResponse.json(
      { error: 'Invalid signature' },
      { status: 400 }
    )
  }

  // Handle the event
  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;

        const orderId = session.metadata?.orderId;
        const userId = session.metadata?.userId;
        const isGuest = session.metadata?.isGuest === 'true';
        const customerEmail = session.customer_email;

        if (!orderId) {
          return NextResponse.json({ error: 'Missing order ID' }, { status: 400 });
        }

        // For guest orders, check if email matches an existing user (soft account linking)
        let linkedUserId: string | null = null;
        if (isGuest && customerEmail) {
          const existingUser = await prisma.user.findUnique({
            where: { email: customerEmail }
          });
          if (existingUser) {
            linkedUserId = existingUser.id;
          }
        }

        await prisma.order.update({
          where: { id: orderId },
          data: {
            status: 'PROCESSING',
            stripePaymentIntent: session.payment_intent as string,
            // Use collected_information for newer Stripe versions
            shippingAddress: (session.collected_information?.shipping_details ?? null) as unknown as Prisma.InputJsonValue,
            // Soft link to existing user if email matches
            ...(linkedUserId ? { userId: linkedUserId, isGuest: false } : {}),
          },
        });

        // Get order items to reduce stock
        const order = await prisma.order.findUnique({
          where: { id: orderId },
          include: { items: true }
        })

        if (!order) {
          return NextResponse.json(
            { error: 'Order not found' },
            { status: 404 }
          )
        }

        // Reduce stock for each product (atomic transaction)
        await prisma.$transaction(
          order.items.map(item =>
            prisma.product.update({
              where: { id: item.productId },
              data: {
                stock: {
                  decrement: item.quantity
                }
              }
            })
          )
        )

        // Only clear cart for authenticated users (not guests)
        if (userId && !isGuest) {
          await prisma.cartItem.deleteMany({
            where: { userId }
          })
        }

        break
      }

      case 'checkout.session.async_payment_succeeded': {
        // Handle async payment methods (like bank transfers)
        const session = event.data.object as Stripe.Checkout.Session
        const orderId = session.metadata?.orderId

        if (orderId) {
          await prisma.order.update({
            where: { id: orderId },
            data: { status: 'PROCESSING' }
          })
        }
        break
      }

      case 'checkout.session.async_payment_failed': {
        // Handle failed async payments
        const session = event.data.object as Stripe.Checkout.Session
        const orderId = session.metadata?.orderId

        if (orderId) {
          await prisma.order.update({
            where: { id: orderId },
            data: { status: 'CANCELLED' }
          })
        }
        break
      }

      case 'checkout.session.expired': {
        // Handle expired checkout sessions
        const session = event.data.object as Stripe.Checkout.Session
        const orderId = session.metadata?.orderId

        if (orderId) {
          await prisma.order.update({
            where: { id: orderId },
            data: { status: 'CANCELLED' }
          })
        }
        break
      }

      default:
        // Unhandled event type - ignored
        break
    }

    return NextResponse.json({ received: true })
  } catch {
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    )
  }
}
