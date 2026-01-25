import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'
import { NextResponse } from 'next/server'

// Check if Upstash credentials are configured
const isRateLimitEnabled = !!(
  process.env.UPSTASH_REDIS_REST_URL &&
  process.env.UPSTASH_REDIS_REST_TOKEN
)

// Create Redis client only if credentials exist
const redis = isRateLimitEnabled
  ? new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    })
  : null

// Different rate limiters for different use cases
export const rateLimiters = {
  // General API rate limit: 60 requests per minute
  api: redis
    ? new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(60, '1 m'),
        analytics: true,
        prefix: 'ratelimit:api',
      })
    : null,

  // Stricter limit for auth-related endpoints: 10 requests per minute
  auth: redis
    ? new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(10, '1 m'),
        analytics: true,
        prefix: 'ratelimit:auth',
      })
    : null,

  // Cart operations: 30 requests per minute
  cart: redis
    ? new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(30, '1 m'),
        analytics: true,
        prefix: 'ratelimit:cart',
      })
    : null,

  // Checkout: 5 requests per minute (prevent abuse)
  checkout: redis
    ? new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(5, '1 m'),
        analytics: true,
        prefix: 'ratelimit:checkout',
      })
    : null,

  // Admin operations: 100 requests per minute
  admin: redis
    ? new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(100, '1 m'),
        analytics: true,
        prefix: 'ratelimit:admin',
      })
    : null,

  // Guest order lookup: 10 requests per minute (prevent abuse)
  guestLookup: redis
    ? new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(10, '1 m'),
        analytics: true,
        prefix: 'ratelimit:guest-lookup',
      })
    : null,
}

export type RateLimiterType = keyof typeof rateLimiters

/**
 * Check rate limit for a given identifier
 * @param identifier - Unique identifier (usually IP or user ID)
 * @param type - Type of rate limiter to use
 * @returns Object with success status and response if rate limited
 */
export async function checkRateLimit(
  identifier: string,
  type: RateLimiterType = 'api'
): Promise<{ success: boolean; response?: NextResponse }> {
  const limiter = rateLimiters[type]

  // If rate limiting is not configured, allow all requests
  if (!limiter) {
    return { success: true }
  }

  const { success, limit, reset, remaining } = await limiter.limit(identifier)

  if (!success) {
    return {
      success: false,
      response: NextResponse.json(
        {
          error: 'Too many requests. Please try again later.',
          retryAfter: Math.ceil((reset - Date.now()) / 1000)
        },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': limit.toString(),
            'X-RateLimit-Remaining': remaining.toString(),
            'X-RateLimit-Reset': reset.toString(),
            'Retry-After': Math.ceil((reset - Date.now()) / 1000).toString(),
          }
        }
      ),
    }
  }

  return { success: true }
}

/**
 * Get identifier from request (IP address or user ID)
 */
export function getIdentifier(
  request: Request,
  userId?: string | null
): string {
  // Prefer user ID if authenticated
  if (userId) {
    return `user:${userId}`
  }

  // Fall back to IP address
  const forwardedFor = request.headers.get('x-forwarded-for')
  const realIp = request.headers.get('x-real-ip')

  if (forwardedFor) {
    return `ip:${forwardedFor.split(',')[0].trim()}`
  }

  if (realIp) {
    return `ip:${realIp}`
  }

  // Fallback for local development
  return 'ip:127.0.0.1'
}

/**
 * Check if a Stripe webhook event has already been processed (idempotency)
 * @param eventId - Stripe event ID
 * @returns true if event was already processed, false if new
 */
export async function isWebhookEventProcessed(eventId: string): Promise<boolean> {
  if (!redis) {
    // If Redis is not configured, we can't check idempotency
    // Log a warning but allow processing (better than failing)
    console.warn('Redis not configured - webhook idempotency check skipped')
    return false
  }

  const key = `webhook:processed:${eventId}`
  const exists = await redis.exists(key)
  return exists === 1
}

/**
 * Mark a Stripe webhook event as processed
 * @param eventId - Stripe event ID
 * @param ttlSeconds - Time to live in seconds (default 24 hours)
 */
export async function markWebhookEventProcessed(
  eventId: string,
  ttlSeconds: number = 86400 // 24 hours
): Promise<void> {
  if (!redis) {
    return
  }

  const key = `webhook:processed:${eventId}`
  await redis.set(key, Date.now().toString(), { ex: ttlSeconds })
}
