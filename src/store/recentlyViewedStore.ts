import { create } from 'zustand'

type RecentlyViewedProduct = {
    id: string
    name: string
    slug: string
    price: number
    imageUrl: string | null
    stock: number
    category: {
        name: string
        slug: string
    }
    viewedAt: Date
}

type RecentlyViewedStore = {
    items: RecentlyViewedProduct[]
    isLoading: boolean

    loadRecentlyViewed: () => Promise<void>
    trackView: (productId: string) => Promise<void>
    clearRecentlyViewed: () => void
}

export const useRecentlyViewedStore = create<RecentlyViewedStore>((set) => ({
    items: [],
    isLoading: false,

    loadRecentlyViewed: async () => {
        set({ isLoading: true })
        try {
            const response = await fetch('/api/recently-viewed')

            if (response.ok) {
                const items = await response.json()
                set({ items })
            }
        } catch {
            // Failed to load recently viewed
        } finally {
            set({ isLoading: false })
        }
    },

    trackView: async (productId: string) => {
        try {
            await fetch('/api/recently-viewed', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ productId })
            })
        } catch {
            // Failed to track view - silent failure is acceptable
        }
    },

    clearRecentlyViewed: () => {
        set({ items: [] })
    }
}))
