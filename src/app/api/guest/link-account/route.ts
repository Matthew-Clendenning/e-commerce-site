import { NextResponse } from 'next/server'
import { auth, currentUser } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { checkRateLimit, getIdentifier } from '@/lib/ratelimit'

// POST - Link guest orders to newly created account
export async function POST(request: Request) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Rate limit requests
    const identifier = getIdentifier(request, userId)
    const { success, response } = await checkRateLimit(identifier, 'api')
    if (!success && response) {
      return response
    }

    // Get the user's email from Clerk
    const user = await currentUser()
    if (!user || !user.emailAddresses?.[0]?.emailAddress) {
      return NextResponse.json(
        { error: 'User email not found' },
        { status: 400 }
      )
    }

    const email = user.emailAddresses[0].emailAddress.toLowerCase()

    // Ensure user exists in our database
    const existingUser = await prisma.user.findUnique({
      where: { id: userId }
    })

    if (!existingUser) {
      // Create user if they don't exist
      await prisma.user.create({
        data: {
          id: userId,
          email,
          name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || null,
        }
      })
    }

    // Find all guest orders with matching email that aren't already linked
    const guestOrders = await prisma.order.findMany({
      where: {
        customerEmail: email,
        isGuest: true,
        userId: null,
      }
    })

    if (guestOrders.length === 0) {
      return NextResponse.json({
        message: 'No guest orders found to link',
        linkedCount: 0
      })
    }

    // Link all guest orders to this user
    const result = await prisma.order.updateMany({
      where: {
        customerEmail: email,
        isGuest: true,
        userId: null,
      },
      data: {
        userId,
        isGuest: false,
      }
    })

    return NextResponse.json({
      message: `Successfully linked ${result.count} order(s) to your account`,
      linkedCount: result.count
    })

  } catch (err) {
    console.error('Link account error:', err)
    return NextResponse.json(
      { error: 'Failed to link orders' },
      { status: 500 }
    )
  }
}
