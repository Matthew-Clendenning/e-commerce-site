import { clerkMiddleware, createRouteMatcher, clerkClient } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

const isPublicRoute = createRouteMatcher([
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/',
  '/products(.*)',
  '/categories(.*)',
  '/api/products(.*)',
  '/api/categories(.*)',
  '/api/cart(.*)'
])

const isAdminRoute = createRouteMatcher([
  '/admin(.*)'
])

/**
 * Check if running in test mode with auth bypass enabled
 * SECURITY: Only enabled when BYPASS_AUTH=true AND NODE_ENV is not production
 */
function isTestModeWithBypass(): boolean {
  return process.env.BYPASS_AUTH === 'true' && process.env.NODE_ENV !== 'production'
}

/**
 * Get test user from cookies (only used in test mode)
 */
function getTestUserFromCookies(req: Request): { id: string; role: string } | null {
  const cookieHeader = req.headers.get('cookie') || ''
  const cookies = Object.fromEntries(
    cookieHeader.split(';').map(c => {
      const [key, ...val] = c.trim().split('=')
      return [key, val.join('=')]
    })
  )

  const testUserCookie = cookies['__test_auth_user']
  if (!testUserCookie) return null

  try {
    const user = JSON.parse(decodeURIComponent(testUserCookie))
    return {
      id: user.id,
      role: user.publicMetadata?.role || 'user'
    }
  } catch {
    return null
  }
}

export default clerkMiddleware(async (auth, req) => {
  // TEST MODE BYPASS: Allow mock authentication for E2E tests
  // This only works when BYPASS_AUTH=true and NOT in production
  if (isTestModeWithBypass()) {
    const testUser = getTestUserFromCookies(req)

    if (isPublicRoute(req)) {
      return NextResponse.next()
    }

    if (isAdminRoute(req)) {
      if (!testUser) {
        const signInUrl = new URL('/sign-in', req.url)
        signInUrl.searchParams.set('redirect_url', req.url)
        return NextResponse.redirect(signInUrl)
      }

      if (testUser.role !== 'admin') {
        return NextResponse.redirect(new URL('/unauthorized', req.url))
      }

      return NextResponse.next()
    }

    // Protected route - require test user
    if (!testUser) {
      const signInUrl = new URL('/sign-in', req.url)
      signInUrl.searchParams.set('redirect_url', req.url)
      return NextResponse.redirect(signInUrl)
    }

    return NextResponse.next()
  }

  // PRODUCTION MODE: Normal Clerk authentication
  if (isPublicRoute(req)) {
    return NextResponse.next()
  }

  if (isAdminRoute(req)) {
    const { userId } = await auth()

    if (!userId) {
      const signInUrl = new URL('/sign-in', req.url)
      signInUrl.searchParams.set('redirect_url', req.url)
      return NextResponse.redirect(signInUrl)
    }

    // Fetch user directly from Clerk to get publicMetadata
    const client = await clerkClient()
    const user = await client.users.getUser(userId)
    const isAdmin = user.publicMetadata?.role === 'admin'

    if (!isAdmin) {
      return NextResponse.redirect(new URL('/unauthorized', req.url))
    }

    return NextResponse.next()
  }

  await auth.protect()
  return NextResponse.next()
})

export const config = {
  matcher: [
    // Skip Next.js internals and all static files
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
}