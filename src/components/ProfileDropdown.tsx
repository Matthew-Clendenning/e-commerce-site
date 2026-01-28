'use client'

import { useState, useEffect, useRef } from 'react'
import { useUser, useClerk, SignInButton } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import {
  User,
  Heart,
  Clock,
  Package,
  LogOut,
  ChevronDown,
  Home,
  Mail,
  LogIn,
  LayoutDashboard,
  ShoppingBag
} from 'lucide-react'
import styles from '../styles/ProfileDropdown.module.css'

export default function ProfileDropdown() {
  const { user, isLoaded } = useUser()
  const { signOut } = useClerk()
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const isAdmin = user?.publicMetadata?.role === 'admin'

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Close dropdown on Escape key
  useEffect(() => {
    function handleEscapeKey(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false)
      }
    }

    document.addEventListener('keydown', handleEscapeKey)
    return () => document.removeEventListener('keydown', handleEscapeKey)
  }, [])

  const handleSignOut = async () => {
    setIsOpen(false)
    await signOut()
    router.push('/')
  }

  const handleLinkClick = () => {
    setIsOpen(false)
  }

  // Guest menu items
  const guestMenuItems = [
    { href: '/', icon: Home, label: 'Home' },
    { href: '/products', icon: ShoppingBag, label: 'Browse Products' },
    { href: '/orders', icon: Package, label: 'Orders' },
    { href: '/contact', icon: Mail, label: 'Contact Us' },
  ]

  // Logged-in user menu items
  const userMenuItems = [
    { href: '/', icon: Home, label: 'Home' },
    { href: '/account', icon: User, label: 'My Account' },
    { href: '/products', icon: ShoppingBag, label: 'Browse Products' },
    { href: '/account/favorites', icon: Heart, label: 'Favorites' },
    { href: '/account/recently-viewed', icon: Clock, label: 'Recently Viewed' },
    { href: '/orders', icon: Package, label: 'Orders' },
    { href: '/contact', icon: Mail, label: 'Contact Us' },
  ]

  // Don't render until auth state is loaded to prevent hydration mismatch
  if (!isLoaded) {
    return (
      <div className={styles.container}>
        <div className={styles.trigger}>
          <div className={styles.avatar}>
            <User size={18} />
          </div>
          <ChevronDown size={14} className={styles.chevron} />
        </div>
      </div>
    )
  }

  return (
    <div className={styles.container} ref={dropdownRef}>
      <button
        className={styles.trigger}
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <div className={styles.avatar}>
          {user?.imageUrl ? (
            <Image
              src={user.imageUrl}
              alt={user.firstName || 'User'}
              width={32}
              height={32}
              className={styles.avatarImage}
            />
          ) : (
            <User size={18} />
          )}
        </div>
        <ChevronDown
          size={14}
          className={`${styles.chevron} ${isOpen ? styles.chevronOpen : ''}`}
        />
      </button>

      {isOpen && (
        <div className={styles.dropdown}>
          {user ? (
            <>
              {/* Logged-in user header */}
              <div className={styles.header}>
                <div className={styles.headerAvatar}>
                  {user.imageUrl ? (
                    <Image
                      src={user.imageUrl}
                      alt={user.firstName || 'User'}
                      width={48}
                      height={48}
                      className={styles.avatarImage}
                    />
                  ) : (
                    <User size={24} />
                  )}
                </div>
                <div className={styles.headerInfo}>
                  <span className={styles.headerName}>
                    {user.firstName} {user.lastName}
                  </span>
                  <span className={styles.headerEmail}>
                    {user.primaryEmailAddress?.emailAddress}
                  </span>
                </div>
              </div>

              <div className={styles.divider} />

              <nav className={styles.menu}>
                {userMenuItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={styles.menuItem}
                    onClick={handleLinkClick}
                  >
                    <item.icon size={18} className={styles.menuIcon} />
                    <span>{item.label}</span>
                  </Link>
                ))}
                {isAdmin && (
                  <Link
                    href="/admin"
                    className={styles.menuItem}
                    onClick={handleLinkClick}
                  >
                    <LayoutDashboard size={18} className={styles.menuIcon} />
                    <span>Admin Dashboard</span>
                  </Link>
                )}
              </nav>

              <div className={styles.divider} />

              <button
                className={styles.signOutButton}
                onClick={handleSignOut}
              >
                <LogOut size={18} className={styles.menuIcon} />
                <span>Sign Out</span>
              </button>
            </>
          ) : (
            <>
              {/* Guest header */}
              <div className={styles.guestHeader}>
                <span className={styles.guestTitle}>Welcome</span>
                <span className={styles.guestSubtitle}>Sign in for the best experience</span>
              </div>

              <div className={styles.divider} />

              <nav className={styles.menu}>
                {guestMenuItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={styles.menuItem}
                    onClick={handleLinkClick}
                  >
                    <item.icon size={18} className={styles.menuIcon} />
                    <span>{item.label}</span>
                  </Link>
                ))}
              </nav>

              <div className={styles.divider} />

              <SignInButton mode="modal">
                <button
                  className={styles.signInButton}
                  onClick={handleLinkClick}
                >
                  <LogIn size={18} className={styles.menuIcon} />
                  <span>Log In</span>
                </button>
              </SignInButton>
            </>
          )}
        </div>
      )}
    </div>
  )
}
