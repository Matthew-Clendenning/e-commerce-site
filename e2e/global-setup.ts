/**
 * Global Setup for Playwright Tests
 *
 * This file runs ONCE before all tests start.
 *
 * WHAT HAPPENS HERE:
 * 1. Reset the test database to a clean state
 * 2. Seed the database with known test data
 * 3. (Optional) Create authenticated browser states
 *
 * WHY GLOBAL SETUP?
 * - Ensures every test run starts from a known state
 * - Avoids repeating expensive setup operations for each test
 * - Makes tests deterministic and reproducible
 */

import { FullConfig } from '@playwright/test'
import dotenv from 'dotenv'

// Load environment variables (global setup runs in separate process)
dotenv.config({ path: '.env.test.local' })
dotenv.config({ path: '.env.test' })

import { resetDatabase, seedTestData } from './utils/test-database'

// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function globalSetup(_config: FullConfig): Promise<void> {
  console.log('\n========================================')
  console.log('PLAYWRIGHT GLOBAL SETUP')
  console.log('========================================\n')

  const startTime = Date.now()

  try {
    // ============================================
    // STEP 1: Reset Database
    // ============================================
    console.log('Step 1: Resetting test database...')
    await resetDatabase()

    // ============================================
    // STEP 2: Seed Test Data
    // ============================================
    console.log('Step 2: Seeding test data...')
    const testData = await seedTestData()

    // Log summary of seeded data
    console.log('\nTest data summary:')
    console.log(`  Categories: ${Object.keys(testData.categories).length}`)
    console.log(`  Products: ${testData.products.length}`)
    console.log(`  Users: ${Object.keys(testData.users).length}`)

    // ============================================
    // STEP 3: Additional Setup (if needed)
    // ============================================
    // You could add more setup here, such as:
    // - Creating pre-authenticated browser states
    // - Setting up mock servers
    // - Warming up caches

    const duration = Date.now() - startTime
    console.log(`\nGlobal setup completed in ${duration}ms`)
    console.log('========================================\n')

  } catch (error) {
    console.error('\n========================================')
    console.error('GLOBAL SETUP FAILED')
    console.error('========================================')
    console.error(error)
    console.error('\nTROUBLESHOOTING:')
    console.error('1. Is your test database running?')
    console.error('2. Is DATABASE_URL in .env.test correct?')
    console.error('3. Have you created the ecommerce_test database?')
    console.error('   Run: CREATE DATABASE ecommerce_test;')
    console.error('4. Have you run prisma db push?')
    console.error('   Run: npx prisma db push')
    console.error('========================================\n')
    throw error
  }
}

export default globalSetup
