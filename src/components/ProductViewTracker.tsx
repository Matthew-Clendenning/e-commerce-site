'use client'

import { useEffect, useRef } from 'react'
import { useRecentlyViewedStore } from '@/store/recentlyViewedStore'

type ProductViewTrackerProps = {
    productId: string
}

export default function ProductViewTracker({ productId }: ProductViewTrackerProps) {
    const { trackView } = useRecentlyViewedStore()
    const hasTracked = useRef(false)

    useEffect(() => {
        if (!hasTracked.current && productId) {
            hasTracked.current = true
            trackView(productId)
        }
    }, [productId, trackView])

    return null
}
