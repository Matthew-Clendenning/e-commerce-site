/**
 * Global Teardown for Playwright Tests
 *
 * This file runs ONCE after all tests complete.
 *
 * WHAT HAPPENS HERE:
 * 1. Clean up test data (optional - depends on your needs)
 * 2. Disconnect database connections
 * 3. Clean up any other resources
 *
 * WHY GLOBAL TEARDOWN?
 * - Properly closes database connections (prevents connection leaks)
 * - Cleans up test artifacts
 * - Ensures no resources are left hanging
 */

/* eslint-disable @typescript-eslint/no-unused-vars */
import { FullConfig } from '@playwright/test'
import dotenv from 'dotenv'

// Load environment variables (global teardown runs in separate process)
dotenv.config({ path: '.env.test.local' })
dotenv.config({ path: '.env.test' })

import { disconnectDatabase } from './utils/test-database'

async function globalTeardown(_config: FullConfig): Promise<void> {
  console.log('\n========================================')
  console.log('PLAYWRIGHT GLOBAL TEARDOWN')
  console.log('========================================\n')

  try {
    // ============================================
    // STEP 1: Clean Up Test Data (Optional)
    // ============================================
    // Uncomment if you want to clear data after tests:
    // console.log('Step 1: Cleaning up test data...')
    // await resetDatabase()

    // We're keeping data after tests for these reasons:
    // - Helps debug failed tests by inspecting the database
    // - Data will be reset by global-setup on next run anyway
    console.log('Step 1: Skipping data cleanup (will be reset on next run)')

    // ============================================
    // STEP 2: Disconnect Database
    // ============================================
    console.log('Step 2: Disconnecting from database...')
    await disconnectDatabase()

    console.log('\nGlobal teardown completed.')
    console.log('========================================\n')

  } catch (error) {
    console.error('\n========================================')
    console.error('GLOBAL TEARDOWN WARNING')
    console.error('========================================')
    console.error('Teardown encountered an error (tests still passed):')
    console.error(error)
    console.error('========================================\n')
    // Don't throw - teardown errors shouldn't fail the test run
  }
}

export default globalTeardown
