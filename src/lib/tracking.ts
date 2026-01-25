export type ShippingCarrier = 'USPS' | 'UPS' | 'FEDEX' | 'DHL' | 'OTHER'

export function getTrackingUrl(carrier: ShippingCarrier | null, trackingNumber: string): string | null {
  if (!carrier || !trackingNumber) return null

  const cleanTrackingNumber = trackingNumber.trim()

  switch (carrier) {
    case 'USPS':
      return `https://tools.usps.com/go/TrackConfirmAction?tLabels=${cleanTrackingNumber}`
    case 'UPS':
      return `https://www.ups.com/track?tracknum=${cleanTrackingNumber}`
    case 'FEDEX':
      return `https://www.fedex.com/fedextrack/?trknbr=${cleanTrackingNumber}`
    case 'DHL':
      return `https://www.dhl.com/us-en/home/tracking/tracking-express.html?submit=1&tracking-id=${cleanTrackingNumber}`
    case 'OTHER':
      return null
    default:
      return null
  }
}

export function getCarrierName(carrier: ShippingCarrier | null): string {
  switch (carrier) {
    case 'USPS':
      return 'USPS'
    case 'UPS':
      return 'UPS'
    case 'FEDEX':
      return 'FedEx'
    case 'DHL':
      return 'DHL'
    case 'OTHER':
      return 'Carrier'
    default:
      return 'Carrier'
  }
}

export function getStatusSteps(status: string) {
  const steps = [
    { key: 'PENDING', label: 'Order Placed', description: 'Your order has been received' },
    { key: 'PROCESSING', label: 'Processing', description: 'Your order is being prepared' },
    { key: 'SHIPPED', label: 'Shipped', description: 'Your order is on its way' },
    { key: 'DELIVERED', label: 'Delivered', description: 'Your order has been delivered' }
  ]

  const currentIndex = steps.findIndex(s => s.key === status)

  return steps.map((step, index) => ({
    ...step,
    completed: index <= currentIndex && status !== 'CANCELLED',
    current: index === currentIndex && status !== 'CANCELLED'
  }))
}
