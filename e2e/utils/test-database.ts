/**
 * Test Database Utilities
 *
 * This module provides functions to manage the test database:
 * - Reset: Clear all data between test runs
 * - Seed: Populate with consistent test data
 * - Helpers: Create specific test scenarios
 *
 * WHY A SEPARATE TEST DATABASE?
 * Using a separate database ensures tests never affect production data.
 * Each test run starts with a known state, making tests predictable and reliable.
 */

import fs from 'fs'
import path from 'path'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'

// Read DATABASE_URL directly from .env.test.local file
// This avoids issues with dotenv loading order and ESM/CJS compatibility
function getTestDatabaseUrl(): string {
  const possiblePaths = [
    path.resolve(process.cwd(), '.env.test.local'),
    path.resolve(__dirname, '../../.env.test.local'),
    path.resolve(__dirname, '../../../.env.test.local'),
  ]

  for (const envPath of possiblePaths) {
    try {
      if (fs.existsSync(envPath)) {
        const content = fs.readFileSync(envPath, 'utf-8')
        const match = content.match(/^DATABASE_URL=["']?([^"'\n]+)["']?/m)
        if (match && match[1]) {
          console.log(`Found DATABASE_URL in ${envPath}`)
          return match[1]
        }
      }
    } catch {
      // Continue to next path
    }
  }

  // Fallback to environment variable
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL
  }

  throw new Error(
    'DATABASE_URL not found. Checked paths:\n' +
    possiblePaths.map(p => `  - ${p}`).join('\n') +
    '\n\nMake sure .env.test.local exists with DATABASE_URL set.'
  )
}

// Get the connection string
const connectionString = getTestDatabaseUrl()
console.log('Using test database:', connectionString.replace(/:[^:@]+@/, ':****@'))

// Detect if we're running in CI (GitHub Actions sets CI=true)
// CI uses a local PostgreSQL container without SSL
// Local development uses Supabase which requires SSL
const isCI = process.env.CI === 'true'
console.log(`Environment: ${isCI ? 'CI (no SSL)' : 'Local (SSL enabled)'}`)

// Create a Prisma client configured for the test database
// Prisma 7 with driverAdapters requires an adapter to be provided
const pool = new Pool({
  connectionString,
  // Only use SSL for non-CI environments (Supabase requires SSL, local PostgreSQL doesn't)
  ssl: isCI ? false : { rejectUnauthorized: false },
})
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

/**
 * Test Data Types
 * These interfaces define the shape of data returned by seeding functions
 */
export interface TestCategory {
  id: string
  name: string
  slug: string
}

export interface TestProduct {
  id: string
  name: string
  slug: string
  price: number
  stock: number
  categoryId: string
}

export interface TestUser {
  id: string
  email: string
  name: string
}

export interface TestData {
  categories: {
    watches: TestCategory
    bracelets: TestCategory
  }
  products: TestProduct[]
  users: {
    regular: TestUser
    admin: TestUser
  }
}

/**
 * Reset the test database to a clean state
 *
 * HOW IT WORKS:
 * We delete data in reverse dependency order:
 * 1. First delete items that depend on other tables (OrderItem, CartItem)
 * 2. Then delete the parent tables (Order, Product, Category, User)
 *
 * Using a transaction ensures all deletions succeed or none do.
 */
export async function resetDatabase(): Promise<void> {
  console.log('Resetting test database...')

  try {
    await prisma.$transaction([
      // Delete child records first (foreign key dependencies)
      prisma.orderItem.deleteMany(),
      prisma.order.deleteMany(),
      prisma.cartItem.deleteMany(),
      prisma.product.deleteMany(),
      prisma.category.deleteMany(),
      prisma.user.deleteMany(),
    ])
    console.log('Database reset complete.')
  } catch (error) {
    console.error('Failed to reset database:', error)
    throw error
  }
}

/**
 * Seed the test database with known data
 *
 * WHY CONSISTENT TEST DATA?
 * By always seeding the same data, our tests become:
 * - Predictable: We know exactly what products/users exist
 * - Reliable: Tests don't depend on random data
 * - Debuggable: Easy to reproduce failures
 *
 * The seeded data includes:
 * - 2 categories (watches, bracelets)
 * - 4 products (including 1 out-of-stock item for testing edge cases)
 * - 2 users (regular user and admin for auth testing)
 */
export async function seedTestData(): Promise<TestData> {
  console.log('Seeding test data...')

  // ============================================
  // CREATE OR GET CATEGORIES (using upsert for idempotency)
  // ============================================
  const watches = await prisma.category.upsert({
    where: { slug: 'test-watches' },
    update: {}, // No update needed, just get existing
    create: {
      name: 'Test Watches',
      slug: 'test-watches',
      description: 'Test category for watches',
    },
  })

  const bracelets = await prisma.category.upsert({
    where: { slug: 'test-bracelets' },
    update: {},
    create: {
      name: 'Test Bracelets',
      slug: 'test-bracelets',
      description: 'Test category for bracelets',
    },
  })

  // ============================================
  // CREATE OR GET PRODUCTS (using upsert for idempotency)
  // ============================================
  const products = await Promise.all([
    // Product 1: Normal in-stock item
    prisma.product.upsert({
      where: { slug: 'test-silver-watch' },
      update: { stock: 10 }, // Reset stock on re-seed
      create: {
        name: 'Test Silver Watch',
        slug: 'test-silver-watch',
        description: 'A beautiful silver watch for testing',
        price: 199.99,
        stock: 10,
        categoryId: watches.id,
        imageUrl: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500',
      },
    }),

    // Product 2: Higher priced item
    prisma.product.upsert({
      where: { slug: 'test-gold-watch' },
      update: { stock: 5 },
      create: {
        name: 'Test Gold Watch',
        slug: 'test-gold-watch',
        description: 'A premium gold watch for testing',
        price: 299.99,
        stock: 5,
        categoryId: watches.id,
        imageUrl: 'https://images.unsplash.com/photo-1524805444758-089113d48a6d?w=500',
      },
    }),

    // Product 3: Different category
    prisma.product.upsert({
      where: { slug: 'test-leather-bracelet' },
      update: { stock: 20 },
      create: {
        name: 'Test Leather Bracelet',
        slug: 'test-leather-bracelet',
        description: 'A stylish leather bracelet for testing',
        price: 49.99,
        stock: 20,
        categoryId: bracelets.id,
        imageUrl: null, // No image - tests placeholder handling
      },
    }),

    // Product 4: OUT OF STOCK - important for testing disabled states
    prisma.product.upsert({
      where: { slug: 'test-out-of-stock-item' },
      update: { stock: 0 },
      create: {
        name: 'Test Out of Stock Item',
        slug: 'test-out-of-stock-item',
        description: 'This item has no stock - for testing disabled add-to-cart',
        price: 99.99,
        stock: 0, // Zero stock!
        categoryId: watches.id,
        imageUrl: null,
      },
    }),
  ])

  // ============================================
  // CREATE OR GET TEST USERS (using upsert for idempotency)
  // ============================================
  // These user IDs match what we use in our Clerk mocks
  const regularUser = await prisma.user.upsert({
    where: { id: 'user_test_regular_123' },
    update: {},
    create: {
      id: 'user_test_regular_123', // Must match TEST_USERS.regular.id
      email: 'testuser@example.com',
      name: 'Test User',
    },
  })

  const adminUser = await prisma.user.upsert({
    where: { id: 'user_test_admin_456' },
    update: {},
    create: {
      id: 'user_test_admin_456', // Must match TEST_USERS.admin.id
      email: 'admin@example.com',
      name: 'Admin User',
    },
  })

  console.log('Test data seeded successfully.')
  console.log(`  - ${2} categories`)
  console.log(`  - ${products.length} products`)
  console.log(`  - ${2} users`)

  // Return formatted test data for use in tests
  return {
    categories: {
      watches: {
        id: watches.id,
        name: watches.name,
        slug: watches.slug,
      },
      bracelets: {
        id: bracelets.id,
        name: bracelets.name,
        slug: bracelets.slug,
      },
    },
    products: products.map((p) => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      price: Number(p.price),
      stock: p.stock,
      categoryId: p.categoryId,
    })),
    users: {
      regular: {
        id: regularUser.id,
        email: regularUser.email,
        name: regularUser.name || '',
      },
      admin: {
        id: adminUser.id,
        email: adminUser.email,
        name: adminUser.name || '',
      },
    },
  }
}

/**
 * Create cart items for a user
 *
 * USAGE: Set up a cart with items before testing checkout flow
 *
 * @param userId - The user's ID (must exist in database)
 * @param items - Array of {productId, quantity} to add to cart
 */
export async function createCartForUser(
  userId: string,
  items: Array<{ productId: string; quantity: number }>
): Promise<void> {
  await Promise.all(
    items.map((item) =>
      prisma.cartItem.create({
        data: {
          userId,
          productId: item.productId,
          quantity: item.quantity,
        },
      })
    )
  )
}

/**
 * Create a test order
 *
 * USAGE: Set up an existing order for testing order history/admin views
 *
 * @param userId - The user who placed the order
 * @param items - Array of order items with product details
 * @param status - Order status (defaults to PROCESSING)
 */
export async function createTestOrder(
  userId: string,
  items: Array<{
    productId: string
    name: string
    price: number
    quantity: number
  }>,
  status: 'PENDING' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED' = 'PROCESSING'
): Promise<string> {
  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0)

  const order = await prisma.order.create({
    data: {
      userId,
      customerEmail: 'testuser@example.com',
      customerName: 'Test User',
      total,
      status,
      items: {
        create: items.map((item) => ({
          productId: item.productId,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          imageUrl: null,
        })),
      },
    },
  })

  return order.id
}

/**
 * Clear a user's cart
 *
 * USAGE: Reset cart state between tests
 */
export async function clearUserCart(userId: string): Promise<void> {
  await prisma.cartItem.deleteMany({
    where: { userId },
  })
}

/**
 * Disconnect Prisma client
 *
 * IMPORTANT: Call this in global teardown to properly close database connections
 */
export async function disconnectDatabase(): Promise<void> {
  await prisma.$disconnect()
  await pool.end()
}

// Export the Prisma client for advanced usage in tests
export { prisma }
