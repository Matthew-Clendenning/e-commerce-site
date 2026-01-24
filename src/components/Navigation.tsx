'use client'

import { useState } from 'react'
import Link from 'next/link'
import { UserButton, SignInButton, SignedIn, SignedOut, useUser } from '@clerk/nextjs'
import CartButton from './CartButton'
import styles from '../styles/Navigation.module.css'
import { UserRound, Menu, X } from 'lucide-react'

export default function Navigation() {
  const { user } = useUser()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  // Check if current user is admin
  const isAdmin = user?.publicMetadata?.role === 'admin'

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen)
  }

  const closeMobileMenu = () => {
    setMobileMenuOpen(false)
  }

  return (
    <nav className={styles.nav}>
      <div className={styles.container}>
        <Link href="/" className={styles.logo} title='LuxeMarket'>
          LuxeMarket
        </Link>

        {/* Desktop Navigation */}
        <div className={styles.links}>
          <Link href="/" className={styles.link}>
            Home
          </Link>
          <Link href="/products" className={styles.link}>
            Products
          </Link>
          <Link href="/orders" className={styles.link}>
            Orders
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

          {/* Mobile Menu Button */}
          <button
            className={styles.mobileMenuButton}
            onClick={toggleMobileMenu}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <>
          <div className={styles.mobileOverlay} onClick={closeMobileMenu} />
          <div className={styles.mobileMenu}>
            <Link href="/" className={styles.mobileLink} onClick={closeMobileMenu}>
              Home
            </Link>
            <Link href="/products" className={styles.mobileLink} onClick={closeMobileMenu}>
              Products
            </Link>
            <Link href="/orders" className={styles.mobileLink} onClick={closeMobileMenu}>
              My Orders
            </Link>
            <SignedIn>
              {isAdmin && (
                <Link href="/admin" className={styles.mobileLink} onClick={closeMobileMenu}>
                  Admin
                </Link>
              )}
            </SignedIn>
            <SignedOut>
              <SignInButton mode="modal">
                <button className={styles.mobileSignIn} onClick={closeMobileMenu}>
                  Sign In
                </button>
              </SignInButton>
            </SignedOut>
          </div>
        </>
      )}
    </nav>
  )
}
