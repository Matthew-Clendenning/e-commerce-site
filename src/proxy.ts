import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
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

export default clerkMiddleware(async (auth, req) => {
  // Public routes - allow everyone
  if (isPublicRoute(req)) {
    return NextResponse.next()
  }

  // Admin routes - require admin role
  if (isAdminRoute(req)) {
    const { userId, sessionClaims } = await auth()
    
    if (!userId) {
      // Not signed in - redirect to sign in
      const signInUrl = new URL('/sign-in', req.url)
      signInUrl.searchParams.set('redirect_url', req.url)
      return NextResponse.redirect(signInUrl)
    }

    // Check if user has admin role in public metadata
    const publicMetadata = sessionClaims?.publicMetadata as { role?: string } | undefined
    const isAdmin = publicMetadata?.role === 'admin'

    if (!isAdmin) {
      // Signed in but not admin - redirect to unauthorized page
      return NextResponse.redirect(new URL('/unauthorized', req.url))
    }

    return NextResponse.next()
  }

  // All other routes - require authentication
  await auth.protect()
  return NextResponse.next()
})

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
}