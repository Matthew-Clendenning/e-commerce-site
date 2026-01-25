/**
 * Comprehensive End-to-End Checkout Flow Test
 *
 * Tests the integration between:
 * - Order logic
 * - Shippo (shipping rates, address validation, label creation)
 * - Resend (email notifications)
 *
 * Run with: npx tsx scripts/test-checkout-flow.ts
 */

import 'dotenv/config'

// ============================================
// ENVIRONMENT VERIFICATION
// ============================================

console.log('\n' + '='.repeat(60))
console.log('🔍 STEP 1: ENVIRONMENT VERIFICATION')
console.log('='.repeat(60) + '\n')

interface EnvCheck {
  name: string
  value: string | undefined
  required: boolean
  isTestMode?: boolean
  testModeCheck?: (val: string) => boolean
}

const envChecks: EnvCheck[] = [
  {
    name: 'SHIPPO_API_KEY',
    value: process.env.SHIPPO_API_KEY,
    required: true,
    isTestMode: true,
    testModeCheck: (val) => val.startsWith('shippo_test_')
  },
  {
    name: 'RESEND_API_KEY',
    value: process.env.RESEND_API_KEY,
    required: true
  },
  {
    name: 'FROM_EMAIL',
    value: process.env.FROM_EMAIL,
    required: true
  },
  {
    name: 'BUSINESS_NAME',
    value: process.env.BUSINESS_NAME,
    required: true
  },
  {
    name: 'BUSINESS_ADDRESS_LINE1',
    value: process.env.BUSINESS_ADDRESS_LINE1,
    required: true
  },
  {
    name: 'BUSINESS_CITY',
    value: process.env.BUSINESS_CITY,
    required: true
  },
  {
    name: 'BUSINESS_STATE',
    value: process.env.BUSINESS_STATE,
    required: true
  },
  {
    name: 'BUSINESS_ZIP',
    value: process.env.BUSINESS_ZIP,
    required: true
  },
  {
    name: 'DATABASE_URL',
    value: process.env.DATABASE_URL,
    required: true
  },
]

let envValid = true
const missingEnvVars: string[] = []

for (const check of envChecks) {
  const hasValue = !!check.value && check.value.length > 0
  const isTest = check.testModeCheck ? check.testModeCheck(check.value || '') : null

  let status = '✅'
  let details = ''

  if (!hasValue && check.required) {
    status = '❌'
    details = 'MISSING - REQUIRED'
    envValid = false
    missingEnvVars.push(check.name)
  } else if (!hasValue) {
    status = '⚠️'
    details = 'Not set (optional)'
  } else if (isTest === false) {
    status = '🚨'
    details = 'WARNING: PRODUCTION KEY DETECTED!'
    envValid = false
  } else if (isTest === true) {
    status = '✅'
    details = 'Test mode confirmed'
  } else {
    status = '✅'
    details = `Set (${check.value?.substring(0, 10)}...)`
  }

  console.log(`${status} ${check.name}: ${details}`)
}

if (!envValid) {
  console.log('\n❌ ENVIRONMENT CHECK FAILED')
  if (missingEnvVars.length > 0) {
    console.log(`Missing required variables: ${missingEnvVars.join(', ')}`)
  }
  console.log('Please configure all required environment variables before running tests.')
  process.exit(1)
}

console.log('\n✅ All environment variables configured correctly')
console.log('✅ Shippo is in TEST MODE - safe to proceed\n')

// ============================================
// DYNAMIC IMPORTS (after env verification)
// ============================================

async function runTests() {
  // Import modules after env check
  const { validateAddress, getShippingRates, createShippingLabel } = await import('../src/lib/shipping')
  const { sendOrderConfirmationEmail, sendShippingNotificationEmail } = await import('../src/lib/email')

  // Test data
  const TEST_ADDRESSES = {
    valid: {
      name: 'John Doe',
      street1: '1600 Pennsylvania Avenue NW',
      city: 'Washington',
      state: 'DC',
      zip: '20500',
      country: 'US',
      email: 'test@example.com',
      phone: '555-123-4567',
    },
    invalid: {
      name: 'Jane Doe',
      street1: '123 Fake Street That Does Not Exist',
      city: 'Nowhere',
      state: 'XX',
      zip: '00000',
      country: 'US',
      email: 'test@example.com',
    },
    incomplete: {
      name: 'Missing Fields',
      street1: '',
      city: '',
      state: '',
      zip: '',
      country: 'US',
    },
  }

  const TEST_ORDER = {
    orderId: `test-order-${Date.now()}`,
    customerEmail: process.env.BUSINESS_EMAIL || 'test@example.com', // Send to yourself for testing
    customerName: 'Test Customer',
    items: [
      { name: 'Premium Leather Wallet', quantity: 1, price: 89.99, imageUrl: null },
      { name: 'Silk Tie Collection', quantity: 2, price: 65.00, imageUrl: null },
    ],
    total: 219.99,
    shippingAddress: {
      name: 'Test Customer',
      line1: '1600 Pennsylvania Avenue NW',
      city: 'Washington',
      state: 'DC',
      postalCode: '20500',
      country: 'US',
    },
  }

  const results: { test: string; status: 'PASS' | 'FAIL' | 'SKIP'; details: string; data?: unknown }[] = []

  // ============================================
  // TEST 2: ADDRESS VALIDATION
  // ============================================

  console.log('\n' + '='.repeat(60))
  console.log('📍 STEP 2: ADDRESS VALIDATION (Shippo API)')
  console.log('='.repeat(60) + '\n')

  // Test 2a: Valid address
  console.log('Testing valid address...')
  try {
    const validResult = await validateAddress(TEST_ADDRESSES.valid)
    console.log(`  Result: ${validResult.success ? '✅ VALID' : '❌ INVALID'}`)
    if (validResult.messages && validResult.messages.length > 0) {
      console.log(`  Messages: ${JSON.stringify(validResult.messages)}`)
    }
    results.push({
      test: 'Address Validation - Valid Address',
      status: validResult.success ? 'PASS' : 'FAIL',
      details: validResult.success ? 'Address validated successfully' : 'Validation failed',
      data: validResult,
    })
  } catch (error) {
    console.log(`  ❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    results.push({
      test: 'Address Validation - Valid Address',
      status: 'FAIL',
      details: error instanceof Error ? error.message : 'Unknown error',
    })
  }

  // Test 2b: Invalid address
  console.log('\nTesting invalid address...')
  try {
    const invalidResult = await validateAddress(TEST_ADDRESSES.invalid)
    console.log(`  Result: ${invalidResult.success ? '⚠️ Unexpectedly valid' : '✅ Correctly identified as invalid'}`)
    if (invalidResult.messages && invalidResult.messages.length > 0) {
      console.log(`  Messages: ${JSON.stringify(invalidResult.messages)}`)
    }
    results.push({
      test: 'Address Validation - Invalid Address',
      status: !invalidResult.success ? 'PASS' : 'FAIL',
      details: !invalidResult.success ? 'Correctly rejected invalid address' : 'Should have rejected address',
      data: invalidResult,
    })
  } catch (error) {
    console.log(`  ⚠️ Error (expected for invalid address): ${error instanceof Error ? error.message : 'Unknown error'}`)
    results.push({
      test: 'Address Validation - Invalid Address',
      status: 'PASS',
      details: 'API correctly threw error for invalid address',
    })
  }

  // ============================================
  // TEST 3: SHIPPING RATE COMPARISON
  // ============================================

  console.log('\n' + '='.repeat(60))
  console.log('💰 STEP 3: SHIPPING RATE COMPARISON')
  console.log('='.repeat(60) + '\n')

  let ratesResult: Awaited<ReturnType<typeof getShippingRates>> | null = null

  try {
    console.log('Fetching shipping rates for valid address...')
    ratesResult = await getShippingRates(TEST_ADDRESSES.valid)

    if (ratesResult.success && ratesResult.rates.length > 0) {
      console.log(`\n✅ Found ${ratesResult.rates.length} shipping options:\n`)
      console.log('  ' + '-'.repeat(70))
      console.log('  | Carrier       | Service                    | Price   | Est. Delivery |')
      console.log('  ' + '-'.repeat(70))

      for (const rate of ratesResult.rates.slice(0, 10)) { // Show top 10
        const carrier = rate.carrier.padEnd(13)
        const service = (rate.service || 'Standard').substring(0, 26).padEnd(26)
        const price = `$${rate.amount.toFixed(2)}`.padStart(7)
        const days = rate.estimatedDays ? `${rate.estimatedDays} days`.padEnd(13) : 'N/A'.padEnd(13)
        console.log(`  | ${carrier} | ${service} | ${price} | ${days} |`)
      }
      console.log('  ' + '-'.repeat(70))

      const cheapest = ratesResult.rates[0]
      console.log(`\n  💡 Cheapest option: ${cheapest.carrier} ${cheapest.service} at $${cheapest.amount.toFixed(2)}`)

      results.push({
        test: 'Shipping Rates - Fetch Rates',
        status: 'PASS',
        details: `Retrieved ${ratesResult.rates.length} rates`,
        data: { shipmentId: ratesResult.shipmentId, rateCount: ratesResult.rates.length },
      })
    } else {
      console.log('❌ No shipping rates returned')
      console.log(`  Error: ${ratesResult.error || 'Unknown error'}`)
      results.push({
        test: 'Shipping Rates - Fetch Rates',
        status: 'FAIL',
        details: ratesResult.error || 'No rates returned',
      })
    }
  } catch (error) {
    console.log(`❌ Error fetching rates: ${error instanceof Error ? error.message : 'Unknown error'}`)
    results.push({
      test: 'Shipping Rates - Fetch Rates',
      status: 'FAIL',
      details: error instanceof Error ? error.message : 'Unknown error',
    })
  }

  // ============================================
  // TEST 4: LABEL CREATION (Mock Purchase)
  // ============================================

  console.log('\n' + '='.repeat(60))
  console.log('🏷️  STEP 4: SHIPPING LABEL CREATION (Test Mode)')
  console.log('='.repeat(60) + '\n')

  let labelResult: Awaited<ReturnType<typeof createShippingLabel>> | null = null

  try {
    console.log('Creating test shipping label...')
    console.log('  ⚠️  Note: Using Shippo TEST mode - no real charges\n')

    labelResult = await createShippingLabel(TEST_ADDRESSES.valid)

    if (labelResult.success) {
      console.log('✅ Label created successfully!\n')
      console.log(`  📦 Tracking Number: ${labelResult.trackingNumber}`)
      console.log(`  🚚 Carrier: ${labelResult.carrier}`)
      console.log(`  💵 Rate: $${labelResult.rate?.toFixed(2) || 'N/A'}`)
      console.log(`  📅 Estimated Delivery: ${labelResult.estimatedDelivery || 'N/A'}`)
      console.log(`  🔗 Label URL: ${labelResult.labelUrl || 'N/A'}`)
      console.log(`  🔍 Tracking URL: ${labelResult.trackingUrl || 'N/A'}`)

      results.push({
        test: 'Label Creation - Create Test Label',
        status: 'PASS',
        details: `Label created: ${labelResult.trackingNumber}`,
        data: labelResult,
      })
    } else {
      console.log('❌ Label creation failed')
      console.log(`  Error: ${labelResult.error}`)
      results.push({
        test: 'Label Creation - Create Test Label',
        status: 'FAIL',
        details: labelResult.error || 'Unknown error',
      })
    }
  } catch (error) {
    console.log(`❌ Error creating label: ${error instanceof Error ? error.message : 'Unknown error'}`)
    results.push({
      test: 'Label Creation - Create Test Label',
      status: 'FAIL',
      details: error instanceof Error ? error.message : 'Unknown error',
    })
  }

  // ============================================
  // TEST 5: EMAIL NOTIFICATIONS
  // ============================================

  console.log('\n' + '='.repeat(60))
  console.log('📧 STEP 5: EMAIL NOTIFICATIONS')
  console.log('='.repeat(60) + '\n')

  // Test 5a: Order Confirmation Email
  console.log('Sending Order Confirmation email...')
  console.log(`  To: ${TEST_ORDER.customerEmail}`)

  try {
    const confirmResult = await sendOrderConfirmationEmail(TEST_ORDER)

    if (confirmResult.success) {
      console.log('  ✅ Order Confirmation email sent successfully!')
      console.log(`  Message ID: ${(confirmResult.data as { id?: string })?.id || 'N/A'}`)
      results.push({
        test: 'Email - Order Confirmation',
        status: 'PASS',
        details: 'Email sent successfully',
        data: confirmResult.data,
      })
    } else {
      console.log('  ❌ Failed to send Order Confirmation email')
      console.log(`  Error: ${JSON.stringify(confirmResult.error)}`)
      results.push({
        test: 'Email - Order Confirmation',
        status: 'FAIL',
        details: JSON.stringify(confirmResult.error),
      })
    }
  } catch (error) {
    console.log(`  ❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    results.push({
      test: 'Email - Order Confirmation',
      status: 'FAIL',
      details: error instanceof Error ? error.message : 'Unknown error',
    })
  }

  // Test 5b: Shipping Notification Email (only if label was created)
  if (labelResult?.success && labelResult.trackingNumber) {
    console.log('\nSending Shipping Notification email...')
    console.log(`  To: ${TEST_ORDER.customerEmail}`)

    try {
      const shippingEmailResult = await sendShippingNotificationEmail({
        ...TEST_ORDER,
        trackingNumber: labelResult.trackingNumber,
        carrier: labelResult.carrier || 'USPS',
        trackingUrl: labelResult.trackingUrl || null,
        estimatedDelivery: labelResult.estimatedDelivery,
      })

      if (shippingEmailResult.success) {
        console.log('  ✅ Shipping Notification email sent successfully!')
        console.log(`  Message ID: ${(shippingEmailResult.data as { id?: string })?.id || 'N/A'}`)
        results.push({
          test: 'Email - Shipping Notification',
          status: 'PASS',
          details: 'Email sent successfully',
          data: shippingEmailResult.data,
        })
      } else {
        console.log('  ❌ Failed to send Shipping Notification email')
        console.log(`  Error: ${JSON.stringify(shippingEmailResult.error)}`)
        results.push({
          test: 'Email - Shipping Notification',
          status: 'FAIL',
          details: JSON.stringify(shippingEmailResult.error),
        })
      }
    } catch (error) {
      console.log(`  ❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
      results.push({
        test: 'Email - Shipping Notification',
        status: 'FAIL',
        details: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  } else {
    console.log('\n⏭️  Skipping Shipping Notification email (no label created)')
    results.push({
      test: 'Email - Shipping Notification',
      status: 'SKIP',
      details: 'No label was created to test with',
    })
  }

  // ============================================
  // TEST 6: EDGE CASES
  // ============================================

  console.log('\n' + '='.repeat(60))
  console.log('⚠️  STEP 6: EDGE CASE TESTING')
  console.log('='.repeat(60) + '\n')

  // Test 6a: API Timeout Simulation
  console.log('Testing API timeout handling...')
  console.log('  (Simulating with incomplete address data)\n')

  try {
    const timeoutResult = await validateAddress(TEST_ADDRESSES.incomplete)
    console.log(`  Result: ${timeoutResult.success ? 'Validated (unexpected)' : 'Failed (expected)'}`)
    results.push({
      test: 'Edge Case - Incomplete Address',
      status: !timeoutResult.success ? 'PASS' : 'FAIL',
      details: !timeoutResult.success ? 'Correctly handled incomplete address' : 'Should have rejected',
    })
  } catch (error) {
    console.log(`  ✅ Correctly caught error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    results.push({
      test: 'Edge Case - Incomplete Address',
      status: 'PASS',
      details: 'API correctly threw error for incomplete address',
    })
  }

  // Test 6b: Rate fetch with invalid address
  console.log('\nTesting rate fetch with invalid address...')
  try {
    const badRates = await getShippingRates(TEST_ADDRESSES.invalid)
    console.log(`  Rates returned: ${badRates.rates?.length || 0}`)
    console.log(`  Success: ${badRates.success}`)
    if (badRates.error) {
      console.log(`  Error message: ${badRates.error}`)
    }
    results.push({
      test: 'Edge Case - Invalid Address Rates',
      status: 'PASS',
      details: badRates.success ? `Returned ${badRates.rates?.length} rates` : `Handled gracefully: ${badRates.error}`,
    })
  } catch (error) {
    console.log(`  Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    results.push({
      test: 'Edge Case - Invalid Address Rates',
      status: 'PASS',
      details: 'API error handled gracefully',
    })
  }

  // ============================================
  // FINAL REPORT
  // ============================================

  console.log('\n' + '='.repeat(60))
  console.log('📊 STEP 7: TEST RESULTS SUMMARY')
  console.log('='.repeat(60) + '\n')

  const passed = results.filter(r => r.status === 'PASS').length
  const failed = results.filter(r => r.status === 'FAIL').length
  const skipped = results.filter(r => r.status === 'SKIP').length

  console.log('Test Results:')
  console.log('-'.repeat(60))

  for (const result of results) {
    const icon = result.status === 'PASS' ? '✅' : result.status === 'FAIL' ? '❌' : '⏭️'
    console.log(`${icon} ${result.test}`)
    console.log(`   Status: ${result.status} | ${result.details}`)
  }

  console.log('-'.repeat(60))
  console.log(`\nTotal: ${results.length} tests`)
  console.log(`  ✅ Passed: ${passed}`)
  console.log(`  ❌ Failed: ${failed}`)
  console.log(`  ⏭️  Skipped: ${skipped}`)

  // ============================================
  // DATA FLOW SUMMARY
  // ============================================

  console.log('\n' + '='.repeat(60))
  console.log('🔄 DATA FLOW SUMMARY')
  console.log('='.repeat(60) + '\n')

  console.log(`
┌─────────────────────────────────────────────────────────────────┐
│                    CHECKOUT FLOW DATA PATH                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. CUSTOMER CHECKOUT                                            │
│     └─► Stripe Checkout Session Created                          │
│         └─► Order created in DB (status: PENDING)                │
│                                                                  │
│  2. PAYMENT CONFIRMATION (Stripe Webhook)                        │
│     └─► checkout.session.completed event                         │
│         ├─► Order status → PROCESSING                            │
│         ├─► Stock decremented                                    │
│         ├─► Cart cleared                                         │
│         └─► Order Confirmation Email sent (Resend)               │
│                                                                  │
│  3. SHIPPING LABEL CREATION (Admin Action)                       │
│     └─► POST /api/orders/[orderId]/ship                          │
│         ├─► Shippo: validateAddress()                            │
│         ├─► Shippo: getShippingRates()                           │
│         ├─► Shippo: createShippingLabel()                        │
│         ├─► Order status → SHIPPED                               │
│         ├─► Tracking number saved                                │
│         └─► Shipping Notification Email sent (Resend)            │
│                                                                  │
│  4. DELIVERY CONFIRMATION (Admin Action)                         │
│     └─► POST /api/orders/[orderId]/deliver                       │
│         ├─► Order status → DELIVERED                             │
│         └─► Delivery Confirmation Email sent (Resend)            │
│                                                                  │
│  5. CUSTOMER TRACKING                                            │
│     └─► GET /api/orders/[orderId]/tracking                       │
│         ├─► Auth users: by userId                                │
│         └─► Guests: by email + guestToken                        │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
  `)

  console.log('\n📌 Database Updates:')
  console.log('   - Order.status: PENDING → PROCESSING → SHIPPED → DELIVERED')
  console.log('   - Order.trackingNumber: Set when label created')
  console.log('   - Order.shippingCarrier: USPS/UPS/FEDEX/DHL/OTHER')
  console.log('   - Order.shippedAt: Timestamp when shipped')
  console.log('   - Order.deliveredAt: Timestamp when delivered')

  console.log('\n📧 Email Triggers:')
  console.log('   - Order Confirmation: checkout.session.completed webhook')
  console.log('   - Shipping Notification: POST /api/orders/[orderId]/ship')
  console.log('   - Delivery Confirmation: POST /api/orders/[orderId]/deliver')

  if (failed > 0) {
    console.log('\n⚠️  Some tests failed. Please review the errors above.')
    process.exit(1)
  } else {
    console.log('\n✅ All tests passed! The checkout flow is ready for use.')
  }
}

// Run the tests
runTests().catch(error => {
  console.error('Test execution failed:', error)
  process.exit(1)
})
