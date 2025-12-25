import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type CartItem = {
    id: string;
    name: string;
    price: number;
    quantity: number;
    imageUrl: string | null;
    slug: string;
    stock: number;
}

type CartStore = {
    items: CartItem[];
    isOpen: boolean;
    isLoading: boolean;
    lastSyncedUserId: string | null;
    hasEverSynced: boolean;

    addItem: (item: Omit<CartItem, 'quantity'>) => Promise<void>;
    removeItem: (productId: string) => Promise<void>;
    updateQuantity: (productId: string, quantity: number) => Promise<void>;
    clearCart: () => Promise<void>;
    loadCart: () => Promise<void>;
    syncCartToServer: (userId: string) => Promise<void>;
    clearLocalCart: () => void;
    toggleCart: () => void;

    totalItems: () => number;
    totalPrice: () => number;
}

export const useCartStore = create<CartStore>()(
    persist(
        (set, get) => ({
            items: [],
            isOpen: false,
            isLoading: false,
            lastSyncedUserId: null,
            hasEverSynced: false,  // NEW

            loadCart: async () => {
                set({ isLoading: true })
                try {
                    const response = await fetch('/api/cart')

                    if (response.ok) {
                        const items = await response.json()
                        set({ items })
                    } else if (response.status === 401) {
                        console.log('Guest mode: Using localStorage cart')
                    } else {
                        console.warn(`Cart API returned ${response.status}, using localStorage`)
                    }
                } catch {
                    console.log('Guest mode: Using localStorage cart')
                } finally {
                    set({ isLoading: false })
                }
            },

            syncCartToServer: async (userId: string) => {
                const state = get()
                
                // If switching users, clear everything first
                if (state.lastSyncedUserId && state.lastSyncedUserId !== userId) {
                    console.log('Different user detected, clearing old cart before sync')
                    get().clearLocalCart()
                }

                // Check if this user has been synced before on this browser
                if (state.lastSyncedUserId === userId && state.hasEverSynced) {
                    console.log('Returning user detected - loading from server only (no guest cart sync)')
                    await get().loadCart()
                    return
                }

                // Get current guest items
                const currentItems = get().items

                try {
                    // Only sync guest items for FIRST-TIME sign-in on this browser
                    if (currentItems.length > 0 && !state.hasEverSynced) {
                        console.log(`First-time sign-in: Syncing ${currentItems.length} guest items`)
                        const response = await fetch('/api/cart/sync', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ items: currentItems })
                        })

                        if (response.ok) {
                            console.log('Guest items synced successfully')
                        }
                    } else if (state.hasEverSynced) {
                        console.log('Returning user: Skipping guest cart sync')
                    }
                    
                    // Always load from server
                    await get().loadCart()
                    
                    // Mark as synced for this user
                    set({ 
                        lastSyncedUserId: userId,
                        hasEverSynced: true  // Remember we've synced before
                    })
                    console.log('Cart sync complete for user:', userId)
                } catch (error) {
                    console.error('Failed to sync cart:', error)
                }
            },

            clearLocalCart: () => {
                console.log('Clearing local cart (keeping sync history)')
                set({ 
                    items: [], 
                    lastSyncedUserId: null,
                    isOpen: false
                    // DON'T reset hasEverSynced - keep the history
                })
            },

            addItem: async (item) => {
                set((state) => {
                    const existingItem = state.items.find(i => i.id === item.id)

                    if (existingItem) {
                        return {
                            items: state.items.map(i =>
                                i.id === item.id 
                                    ? { ...i, quantity: Math.min(i.quantity + 1, item.stock) }
                                    : i
                            )
                        }
                    } else {
                        return {
                            items: [...state.items, { ...item, quantity: 1 }]
                        }
                    }
                })

                try {
                    const response = await fetch('/api/cart', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ productId: item.id })
                    })

                    if (!response.ok && response.status !== 401) {
                        console.warn('Failed to sync item to server:', response.status)
                    }
                } catch {
                    console.log('Guest mode: Cart saved to localStorage')
                }
            },

            removeItem: async (productId) => {
                set((state) => ({
                    items: state.items.filter(i => i.id !== productId)
                }))

                try {
                    await fetch(`/api/cart/${productId}`, {
                        method: 'DELETE',
                    })
                } catch {
                    console.log('Guest mode: Cart saved to localStorage')
                }
            },

            updateQuantity: async (productId, quantity) => {
                if (quantity <= 0) {
                    set((state) => ({
                        items: state.items.filter(i => i.id !== productId)
                    }))
                } else {
                    set((state) => ({
                        items: state.items.map(i =>
                            i.id === productId
                                ? { ...i, quantity: Math.min(quantity, i.stock) }
                                : i
                        )
                    }))
                }

                try {
                    await fetch(`/api/cart/${productId}`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ quantity })
                    })
                } catch {
                    console.log('Guest mode: Cart saved to localStorage')
                }
            },

            clearCart: async () => {
                set({ items: [] })

                try {
                    await fetch('/api/cart', {
                        method: 'DELETE',
                    })
                } catch (error) {
                    console.error('Failed to clear cart:', error)
                }
            },

            toggleCart: () => set((state) => ({ isOpen: !state.isOpen })),

            totalItems: () => {
                const state = get()
                return state.items.reduce((total, item) => total + item.quantity, 0)
            },

            totalPrice: () => {
                const state = get()
                return state.items.reduce((total, item) => total + (item.price * item.quantity), 0)
            },
        }),
        { 
            name: 'cart-storage',
            partialize: (state) => ({ 
                items: state.items,
                lastSyncedUserId: state.lastSyncedUserId,
                hasEverSynced: state.hasEverSynced  // Persist this flag
            })
        }
    )
)