import { create } from 'zustand'

type FavoriteProduct = {
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
    addedAt: Date
}

type FavoritesStore = {
    items: FavoriteProduct[]
    isLoading: boolean
    favoriteIds: Set<string>

    loadFavorites: () => Promise<void>
    addFavorite: (productId: string) => Promise<boolean>
    removeFavorite: (productId: string) => Promise<boolean>
    isFavorited: (productId: string) => boolean
    clearFavorites: () => void
}

export const useFavoritesStore = create<FavoritesStore>((set, get) => ({
    items: [],
    isLoading: false,
    favoriteIds: new Set<string>(),

    loadFavorites: async () => {
        set({ isLoading: true })
        try {
            const response = await fetch('/api/favorites')

            if (response.ok) {
                const items = await response.json()
                const favoriteIds = new Set<string>(items.map((item: FavoriteProduct) => item.id))
                set({ items, favoriteIds })
            }
        } catch {
            // Failed to load favorites
        } finally {
            set({ isLoading: false })
        }
    },

    addFavorite: async (productId: string) => {
        // Optimistic update
        set((state) => ({
            favoriteIds: new Set([...state.favoriteIds, productId])
        }))

        try {
            const response = await fetch('/api/favorites', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ productId })
            })

            if (response.ok) {
                const newFavorite = await response.json()
                set((state) => ({
                    items: [newFavorite, ...state.items]
                }))
                return true
            } else {
                // Revert optimistic update
                set((state) => {
                    const newIds = new Set(state.favoriteIds)
                    newIds.delete(productId)
                    return { favoriteIds: newIds }
                })
                return false
            }
        } catch {
            // Revert optimistic update
            set((state) => {
                const newIds = new Set(state.favoriteIds)
                newIds.delete(productId)
                return { favoriteIds: newIds }
            })
            return false
        }
    },

    removeFavorite: async (productId: string) => {
        // Optimistic update
        set((state) => {
            const newIds = new Set(state.favoriteIds)
            newIds.delete(productId)
            return { favoriteIds: newIds }
        })

        try {
            const response = await fetch(`/api/favorites/${productId}`, {
                method: 'DELETE'
            })

            if (response.ok) {
                set((state) => ({
                    items: state.items.filter(item => item.id !== productId)
                }))
                return true
            } else {
                // Revert optimistic update
                set((state) => ({
                    favoriteIds: new Set([...state.favoriteIds, productId])
                }))
                return false
            }
        } catch {
            // Revert optimistic update
            set((state) => ({
                favoriteIds: new Set([...state.favoriteIds, productId])
            }))
            return false
        }
    },

    isFavorited: (productId: string) => {
        return get().favoriteIds.has(productId)
    },

    clearFavorites: () => {
        set({ items: [], favoriteIds: new Set<string>() })
    }
}))
