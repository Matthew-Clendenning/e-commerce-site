import { Shippo } from 'shippo'
import type { Rate, TrackingStatus } from 'shippo/models/components'
import { getTrackingUrl } from './tracking'

// Initialize Shippo client
const shippo = new Shippo({
  apiKeyHeader: process.env.SHIPPO_API_KEY || '',
})

// Your business address (sender)
const SENDER_ADDRESS = {
  name: process.env.BUSINESS_NAME,
  street1: process.env.BUSINESS_ADDRESS_LINE1,
  street2: process.env.BUSINESS_ADDRESS_LINE2 || '',
  city: process.env.BUSINESS_CITY,
  state: process.env.BUSINESS_STATE,
  zip: process.env.BUSINESS_ZIP,
  country: process.env.BUSINESS_COUNTRY || 'US',
  phone: process.env.BUSINESS_PHONE,
  email: process.env.BUSINESS_EMAIL,
}

export type ShippingAddress = {
  name: string
  street1: string
  street2?: string
  city: string
  state: string
  zip: string
  country: string
  phone?: string
  email?: string
}

export type ParcelDimensions = {
  length: number
  width: number
  height: number
  weight: number
  massUnit?: 'lb' | 'kg' | 'oz' | 'g'
  distanceUnit?: 'in' | 'cm' | 'ft' | 'm'
}

export type ShipmentResult = {
  success: boolean
  trackingNumber?: string
  carrier?: string
  labelUrl?: string
  trackingUrl?: string
  estimatedDelivery?: string
  rate?: number
  error?: string
}

// Default parcel size for when dimensions aren't specified
const DEFAULT_PARCEL: ParcelDimensions = {
  length: 10,
  width: 8,
  height: 4,
  weight: 1,
  massUnit: 'lb',
  distanceUnit: 'in',
}

// Map Shippo carrier tokens to our carrier enum
function mapCarrierToEnum(carrier: string): 'USPS' | 'UPS' | 'FEDEX' | 'DHL' | 'OTHER' {
  const carrierLower = carrier.toLowerCase()
  if (carrierLower.includes('usps')) return 'USPS'
  if (carrierLower.includes('ups')) return 'UPS'
  if (carrierLower.includes('fedex')) return 'FEDEX'
  if (carrierLower.includes('dhl')) return 'DHL'
  return 'OTHER'
}

/**
 * Create a shipment and get available rates
 */
export async function getShippingRates(
  toAddress: ShippingAddress,
  parcel: ParcelDimensions = DEFAULT_PARCEL
) {
  try {
    const shipment = await shippo.shipments.create({
      addressFrom: SENDER_ADDRESS,
      addressTo: {
        name: toAddress.name,
        street1: toAddress.street1,
        street2: toAddress.street2 || '',
        city: toAddress.city,
        state: toAddress.state,
        zip: toAddress.zip,
        country: toAddress.country,
        phone: toAddress.phone || '',
        email: toAddress.email || '',
      },
      parcels: [{
        length: String(parcel.length),
        width: String(parcel.width),
        height: String(parcel.height),
        distanceUnit: parcel.distanceUnit || 'in',
        weight: String(parcel.weight),
        massUnit: parcel.massUnit || 'lb',
      }],
      async: false,
    })

    // Filter for valid rates
    const rates = shipment.rates?.filter((rate: Rate) =>
      rate.amount && !rate.messages?.some((m: { source?: string }) => m.source === 'error')
    ) || []

    return {
      success: true,
      shipmentId: shipment.objectId,
      rates: rates.map((rate: Rate) => ({
        id: rate.objectId,
        carrier: rate.provider || 'Unknown',
        service: rate.servicelevel?.name || 'Standard',
        amount: parseFloat(rate.amount || '0'),
        currency: rate.currency || 'USD',
        estimatedDays: rate.estimatedDays,
        durationTerms: rate.durationTerms,
      })),
    }
  } catch (error) {
    console.error('Failed to get shipping rates:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get shipping rates',
      rates: [],
    }
  }
}

/**
 * Purchase a shipping label using the cheapest available rate
 * Prefers USPS by default as it's always available in Shippo test/production
 */
export async function createShippingLabel(
  toAddress: ShippingAddress,
  parcel: ParcelDimensions = DEFAULT_PARCEL,
  preferredCarrier?: string
): Promise<ShipmentResult> {
  try {
    // First create the shipment and get rates
    const ratesResult = await getShippingRates(toAddress, parcel)

    if (!ratesResult.success || ratesResult.rates.length === 0) {
      return {
        success: false,
        error: ratesResult.error || 'No shipping rates available',
      }
    }

    // Define the rate type for our mapped rates
    type MappedRate = {
      id: string | undefined
      carrier: string
      service: string
      amount: number
      currency: string
      estimatedDays: number | undefined
      durationTerms: string | undefined
    }

    // Sort rates by price
    let availableRates = ratesResult.rates.sort((a: MappedRate, b: MappedRate) => a.amount - b.amount)

    // Filter by preferred carrier if specified
    if (preferredCarrier) {
      const preferredRates = availableRates.filter((r: MappedRate) =>
        r.carrier.toLowerCase().includes(preferredCarrier.toLowerCase())
      )
      if (preferredRates.length > 0) {
        availableRates = preferredRates
      }
    } else {
      // Default: prefer USPS as it's always available (no account registration needed)
      const uspsRates = availableRates.filter((r: MappedRate) =>
        r.carrier.toLowerCase().includes('usps')
      )
      if (uspsRates.length > 0) {
        availableRates = uspsRates
      }
    }

    // Try to purchase label, with fallback if carrier account not registered
    let lastError = ''
    for (const rate of availableRates) {
      try {
        const transaction = await shippo.transactions.create({
          rate: rate.id,
          labelFileType: 'PDF',
          async: false,
        })

        if (transaction.status === 'SUCCESS') {
          const carrierEnum = mapCarrierToEnum(rate.carrier)
          const trackingNumber = transaction.trackingNumber || ''

          return {
            success: true,
            trackingNumber,
            carrier: carrierEnum,
            labelUrl: transaction.labelUrl || undefined,
            trackingUrl: getTrackingUrl(carrierEnum, trackingNumber) || undefined,
            estimatedDelivery: rate.estimatedDays
              ? `${rate.estimatedDays} business days`
              : rate.durationTerms || undefined,
            rate: rate.amount,
          }
        }

        // Store error message and try next rate
        lastError = transaction.messages?.map((m: { text?: string }) => m.text).join(', ') || 'Label creation failed'
      } catch (rateError) {
        lastError = rateError instanceof Error ? rateError.message : 'Label creation failed'
        // Continue to try next rate
      }
    }

    return {
      success: false,
      error: lastError || 'No rates could be used to create a label',
    }
  } catch (error) {
    console.error('Failed to create shipping label:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create shipping label',
    }
  }
}

/**
 * Create a shipping label using Instalabel (single API call)
 * This is faster but only works with certain carriers
 */
export async function createInstalabel(
  toAddress: ShippingAddress,
  parcel: ParcelDimensions = DEFAULT_PARCEL,
  carrierAccount?: string,
  servicelevelToken: string = 'usps_ground_advantage'
): Promise<ShipmentResult> {
  try {
    // Build the instalabel request
    // Using type assertion because the SDK types may not fully cover the instalabel API
    const transactionRequest = {
      shipment: {
        addressFrom: SENDER_ADDRESS,
        addressTo: {
          name: toAddress.name,
          street1: toAddress.street1,
          street2: toAddress.street2 || '',
          city: toAddress.city,
          state: toAddress.state,
          zip: toAddress.zip,
          country: toAddress.country,
          phone: toAddress.phone || '',
          email: toAddress.email || '',
        },
        parcels: [{
          length: String(parcel.length),
          width: String(parcel.width),
          height: String(parcel.height),
          distanceUnit: parcel.distanceUnit || 'in',
          weight: String(parcel.weight),
          massUnit: parcel.massUnit || 'lb',
        }],
      },
      servicelevelToken: servicelevelToken,
      labelFileType: 'PDF' as const,
      ...(carrierAccount && { carrierAccount }),
    }

    const transaction = await shippo.transactions.create(transactionRequest as Parameters<typeof shippo.transactions.create>[0])

    if (transaction.status !== 'SUCCESS') {
      const errorMsg = transaction.messages?.map((m: { text?: string }) => m.text).join(', ') || 'Label creation failed'
      return {
        success: false,
        error: errorMsg,
      }
    }

    // Determine carrier from service level token
    let carrier: 'USPS' | 'UPS' | 'FEDEX' | 'DHL' | 'OTHER' = 'USPS'
    if (servicelevelToken.startsWith('ups')) carrier = 'UPS'
    else if (servicelevelToken.startsWith('fedex')) carrier = 'FEDEX'
    else if (servicelevelToken.startsWith('dhl')) carrier = 'DHL'

    const trackingNumber = transaction.trackingNumber || ''

    // Handle rate which can be CoreRate object or string
    let rateAmount: number | undefined
    if (transaction.rate) {
      if (typeof transaction.rate === 'string') {
        rateAmount = parseFloat(transaction.rate)
      } else if (typeof transaction.rate === 'object' && transaction.rate.amount) {
        rateAmount = parseFloat(transaction.rate.amount)
      }
    }

    return {
      success: true,
      trackingNumber,
      carrier,
      labelUrl: transaction.labelUrl || undefined,
      trackingUrl: getTrackingUrl(carrier, trackingNumber) || undefined,
      rate: rateAmount,
    }
  } catch (error) {
    console.error('Failed to create instalabel:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create instalabel',
    }
  }
}

/**
 * Validate an address using Shippo
 */
export async function validateAddress(address: ShippingAddress) {
  try {
    const result = await shippo.addresses.create({
      name: address.name,
      street1: address.street1,
      street2: address.street2 || '',
      city: address.city,
      state: address.state,
      zip: address.zip,
      country: address.country,
      validate: true,
    })

    return {
      success: result.validationResults?.isValid || false,
      messages: result.validationResults?.messages || [],
      suggestedAddress: result.validationResults?.isValid ? null : {
        street1: result.street1,
        street2: result.street2,
        city: result.city,
        state: result.state,
        zip: result.zip,
        country: result.country,
      },
    }
  } catch (error) {
    console.error('Failed to validate address:', error)
    return {
      success: false,
      messages: [{ text: 'Address validation failed' }],
    }
  }
}

/**
 * Get tracking info for a shipment
 */
export async function getTrackingInfo(carrier: string, trackingNumber: string) {
  try {
    const tracking = await shippo.trackingStatus.get(carrier.toLowerCase(), trackingNumber)

    return {
      success: true,
      status: tracking.trackingStatus?.status,
      statusDetails: tracking.trackingStatus?.statusDetails,
      statusDate: tracking.trackingStatus?.statusDate,
      location: tracking.trackingStatus?.location,
      eta: tracking.eta,
      history: tracking.trackingHistory?.map((h: TrackingStatus) => ({
        status: h.status,
        statusDetails: h.statusDetails,
        statusDate: h.statusDate,
        location: h.location,
      })) || [],
    }
  } catch (error) {
    console.error('Failed to get tracking info:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get tracking info',
    }
  }
}
