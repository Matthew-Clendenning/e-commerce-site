'use client'

import { useEffect, useRef } from 'react'
import { useAuth } from '@clerk/nextjs'
import { useCartStore } from '@/store/cartStore'

export default function CartSyncHandler() {
  const { isSignedIn, isLoaded, userId } = useAuth()
  const { syncCartToServer, loadCart, clearLocalCart } = useCartStore()
  
  // Track the previous user ID to detect user changes
  const previousUserIdRef = useRef<string | null>(null)
  const hasInitializedRef = useRef(false)

  useEffect(() => {
    // Wait for auth to load
    if (!isLoaded) return

    // First load - just initialize
    if (!hasInitializedRef.current) {
      hasInitializedRef.current = true
      previousUserIdRef.current = userId || null

      if (isSignedIn && userId) {
        console.log('Initial load: User signed in, syncing cart')
        syncCartToServer(userId)
      } else {
        console.log('Initial load: Guest mode')
        loadCart()
      }
      return
    }

    // Detect user change (sign in, sign out, or switch users)
    const previousUserId = previousUserIdRef.current
    const currentUserId = userId || null

    // User changed (either signed in, signed out, or switched accounts)
    if (previousUserId !== currentUserId) {
      console.log(`User changed: ${previousUserId} → ${currentUserId}`)
      
      // CRITICAL: Clear the old user's cart from localStorage
      clearLocalCart()
      
      if (currentUserId) {
        // New user signed in - sync their cart
        console.log('New user signed in, syncing cart')
        syncCartToServer(currentUserId)
      } else {
        // User signed out - load guest cart (which is now empty after clear)
        console.log('User signed out, loading empty guest cart')
        loadCart()
      }
      
      // Update the previous user ID
      previousUserIdRef.current = currentUserId
    }
  }, [isSignedIn, isLoaded, userId, syncCartToServer, loadCart, clearLocalCart])

  return null
}