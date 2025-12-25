'use client'

import { useCartStore } from '@/store/cartStore'
import styles from './CartButton.module.css'

export default function CartButton() {
  const { toggleCart, items } = useCartStore()
  
  // Calculate count from items (re-calculates on every cart change)
  const count = items.reduce((total, item) => total + item.quantity, 0)

  return (
    <button 
      onClick={toggleCart}
      className={styles.cartButton}
      aria-label={`Shopping cart with ${count} items`}
    >
      <svg 
        className={styles.icon}
        xmlns="http://www.w3.org/2000/svg" 
        width="24" 
        height="24" 
        viewBox="0 0 24 24" 
        fill="none" 
        stroke="currentColor" 
        strokeWidth="2"
      >
        <circle cx="9" cy="21" r="1"/>
        <circle cx="20" cy="21" r="1"/>
        <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
      </svg>
      
      {count > 0 && (
        <span className={styles.badge} suppressHydrationWarning>
          {count > 99 ? '99+' : count}
        </span>
      )}
    </button>
  )
}