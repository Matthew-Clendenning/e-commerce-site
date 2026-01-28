'use client'

import { useState } from 'react'
import Link from 'next/link'
import { SignedIn, SignedOut, useUser, useClerk, SignInButton } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import CartButton from './CartButton'
import ProfileDropdown from './ProfileDropdown'
import styles from '../styles/Navigation.module.css'
import { Menu, X, ChevronDown, ChevronUp } from 'lucide-react'

export default function Navigation() {
  const { user } = useUser()
  const { signOut } = useClerk()
  const router = useRouter()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [accountDropdownOpen, setAccountDropdownOpen] = useState(false)

  // Check if current user is admin
  const isAdmin = user?.publicMetadata?.role === 'admin'

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen)
    if (mobileMenuOpen) {
      setAccountDropdownOpen(false)
    }
  }

  const closeMobileMenu = () => {
    setMobileMenuOpen(false)
    setAccountDropdownOpen(false)
  }

  const toggleAccountDropdown = () => {
    setAccountDropdownOpen(!accountDropdownOpen)
  }

  const handleMobileSignOut = async () => {
    closeMobileMenu()
    await signOut()
    router.push('/')
  }

  return (
    <nav className={styles.nav}>
      <div className={styles.container}>
        {/* Mobile Menu Button - Left side on mobile */}
        <button
          className={styles.mobileMenuButton}
          onClick={toggleMobileMenu}
          aria-label="Toggle menu"
        >
          {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>

        <Link href="/" className={styles.logo} title='Vera Owens'>
          Vera Owens
        </Link>

        {/* Desktop Navigation */}
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

          {/* Desktop only - Profile dropdown (works for both guest and logged-in users) */}
          <div className={styles.desktopAuth}>
            <ProfileDropdown />
          </div>
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
              Browse Products
            </Link>

            {/* Account & Settings Dropdown - Only show when signed in */}
            <SignedIn>
              <button
                className={styles.mobileDropdownTrigger}
                onClick={toggleAccountDropdown}
                aria-expanded={accountDropdownOpen}
              >
                <span>Account & Settings</span>
                {accountDropdownOpen ? (
                  <ChevronUp size={20} />
                ) : (
                  <ChevronDown size={20} />
                )}
              </button>

              {accountDropdownOpen && (
                <div className={styles.mobileDropdownContent}>
                  <Link href="/account" className={styles.mobileSubLink} onClick={closeMobileMenu}>
                    My Account
                  </Link>
                  <Link href="/account/favorites" className={styles.mobileSubLink} onClick={closeMobileMenu}>
                    Favorites
                  </Link>
                  <Link href="/account/recently-viewed" className={styles.mobileSubLink} onClick={closeMobileMenu}>
                    Recently Viewed Items
                  </Link>
                  <Link href="/orders" className={styles.mobileSubLink} onClick={closeMobileMenu}>
                    Order History
                  </Link>
                  {isAdmin && (
                    <Link href="/admin" className={styles.mobileSubLink} onClick={closeMobileMenu}>
                      Admin Dashboard
                    </Link>
                  )}
                </div>
              )}

              <button
                className={styles.mobileLogout}
                onClick={handleMobileSignOut}
              >
                Logout
              </button>
            </SignedIn>

            <SignedOut>
              <Link href="/orders" className={styles.mobileLink} onClick={closeMobileMenu}>
                Orders
              </Link>
              <Link href="/contact" className={styles.mobileLink} onClick={closeMobileMenu}>
                Contact Us
              </Link>
              <SignInButton mode="modal">
                <button
                  className={styles.mobileSignIn} onClick={closeMobileMenu}>
                    Login
                  </button>
              </SignInButton>
            </SignedOut>
          </div>
        </>
      )}
    </nav>
  )
}
