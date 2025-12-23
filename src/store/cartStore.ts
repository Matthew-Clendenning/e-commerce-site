import { create } from 'zustand';

// Define what a cart item looks like in our store
// This is the SHAPE of our data
type CartItem = {
    id: string; // Product ID
    name: string; // Product name (for display)
    price: number; // Current price
    quantity: number; // How many in cart
    imageUrl: string | null;
    slug: string; // For linking to product page
    stock: number; // To prevent over-ordering
}

// Define what our store can do (its "interface")")
type CartStore = {
    // STATE (data we're tracking)
    items: CartItem[];
    isOpen: boolean; // Is the cart sidebar open?
    isLoading: boolean; // Is the cart loading data?

    // ACTIONS (functions that modify the state)
    addItem: (item: Omit<CartItem, 'quantity'>) => Promise<void>;
    removeItem: (productId: string) => Promise<void>;
    updateQuantity: (productId: string, quantity: number) => Promise<void>;
    clearCart: () => Promise<void>;
    loadCart: () => Promise<void>;
    toggleCart: () => void;

    // COMPUTED VALUES (derived from state)
    totalItems: () => number;
    totalPrice: () => number;
}

// Create the store
export const useCartStore = create<CartStore>((set, get) => ({
    // INITIAL STATE
    items: [],
    isOpen: false,
    isLoading: false,

    // LOAD CART FROM DATABASE
    loadCart: async () => {
        set({ isLoading: true })
        try {
            const response = await fetch('/api/cart')
            if (response.ok) {
                const items = await response.json()
                set({ items })
            }
        } catch (error) {
            console.error('Failed to load cart:', error)
        } finally {
            set({ isLoading: false })
        }
    },

    // ADD ITEM ACTION
    addItem: async (item) => {
        // OPTIMISTIC UPDATE - Update UI immediately
        set((state) => {
            // Check if the item already exists in the cart
            const existingItem = state.items.find(i => i.id === item.id)

            if (existingItem) {
                // Item exists, increase quantity (but don't exceed stock)
                return {
                    items: state.items.map(i =>
                        i.id === item.id ? { ...i, quantity: Math.min(i.quantity + 1, item.stock) }
                        : i
                    )
                }
            } else {
                // New item, add to cart with quantity 1
                return {
                    items: [...state.items, { ...item, quantity: 1 }]
                }
            }
        })

        // SYNC TO DATABSE (in background)
        try {
            await fetch('/api/cart', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ productId: item.id })
            })
        } catch (error) {
            console.error('Failed to add to cart:', error)
            // Handle error (e.g., show a message to the user)
        }
    },

    // REMOVE ITEM ACTION (optimistic update + sync to DB)
    removeItem: async (productId) => {
        // OPTIMISTIC UPDATE
        set((state) => ({
            items: state.items.filter(i => i.id !== productId)
        }))

        // SYNC TO DATABSE
        try {
            await fetch(`/api/cart/${productId}`, {
                method: 'DELETE',
            })
        } catch (error) {
            console.error('Failed to remove from cart:', error)
        }
    },

    // UPDATE QUANTITY ACTION (optimistic update + sync to DB)
    updateQuantity: async (productId, quantity) => {
        if (quantity <= 0) {
            set((state) => ({
                items: state.items.filter(i => i.id !== productId )
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

        // SYNC TO DATABSE
        try {
            await fetch(`/api/cart/${productId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ quantity })
            })
        } catch (error) {
            console.error('Failed to update quantity:', error)
        }
    },

    // CLEAR CART ACTION
    clearCart: async () => {
        // OPTIMISTIC UPDATE
        set({ items: [] })

        // SYNC TO DATABSE
        try {
            await fetch('/api/cart', {
                method: 'DELETE',
            })
        } catch (error) {
            console.error('Failed to clear cart:', error)
        }
    },

    // TOGGLE CART SIDEBAR
    toggleCart: () => set((state) => ({ isOpen: !state.isOpen })),

    // COMPUTED: Total number of items
    totalItems: () => {
        const state = get()
        return state.items.reduce((total, item) => total + item.quantity, 0)
    },

    // COMPUTED: Total price
    totalPrice: () => {
        const state = get()
        return state.items.reduce((total, item) => total + (item.price * item.quantity), 0)
    },
}))