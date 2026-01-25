'use client'

import { useState, useEffect, useRef } from 'react'
import { useUser, useClerk } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import {
  User,
  Heart,
  Clock,
  Package,
  LogOut,
  ChevronDown
} from 'lucide-react'
import styles from '../styles/ProfileDropdown.module.css'

export default function ProfileDropdown() {
  const { user } = useUser()
  const { signOut } = useClerk()
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

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

  if (!user) return null

  const menuItems = [
    { href: '/account', icon: User, label: 'My Account' },
    { href: '/account/favorites', icon: Heart, label: 'Favorites' },
    { href: '/account/recently-viewed', icon: Clock, label: 'Recently Viewed' },
    { href: '/orders', icon: Package, label: 'Orders' },
  ]

  return (
    <div className={styles.container} ref={dropdownRef}>
      <button
        className={styles.trigger}
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <div className={styles.avatar}>
          {user.imageUrl ? (
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
            {menuItems.map((item) => (
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

          <button
            className={styles.signOutButton}
            onClick={handleSignOut}
          >
            <LogOut size={18} className={styles.menuIcon} />
            <span>Sign Out</span>
          </button>
        </div>
      )}
    </div>
  )
}
