'use client'

import Link from 'next/link'
import { UserButton, SignInButton, SignedIn, SignedOut, useUser } from '@clerk/nextjs'
import CartButton from './CartButton'
import styles from '../styles/Navigation.module.css'
import { UserRound } from 'lucide-react'

export default function Navigation() {
  const { user } = useUser()
  
  // Check if current user is admin
  const isAdmin = user?.publicMetadata?.role === 'admin'

  return (
    <nav className={styles.nav}>
      <div className={styles.container}>
        <Link href="/" className={styles.logo} title='LuxeMarket'>
          LuxeMarket
        </Link>
        
        <div className={styles.links}>
          <Link href="/" className={styles.link}>
            Home
          </Link>
          <Link href="/products" className={styles.link}>
            Products
          </Link>
          
          {/* Only show Admin link if user is admin */}
          <SignedIn>
            {isAdmin && (
              <Link href="/admin" className={styles.link}>
                Admin
              </Link>
            )}
          </SignedIn>
        </div>

        <div className={styles.auth}>
          <CartButton />
          
          <SignedOut>
            <SignInButton mode="modal">
              <button className={styles.signInButton}><UserRound size={24} /></button>
            </SignInButton>
          </SignedOut>
          <SignedIn>
            <UserButton />
          </SignedIn>
        </div>
      </div>
    </nav>
  )
}