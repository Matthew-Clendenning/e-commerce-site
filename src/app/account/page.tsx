import type { Metadata } from 'next'
import { auth, currentUser } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import {
  User,
  Heart,
  Clock,
  Package,
  ChevronRight
} from 'lucide-react'
import styles from '../../styles/account.module.css'

export const metadata: Metadata = {
  title: 'My Account',
  description: 'Manage your account settings and view your activity'
}

export default async function AccountPage() {
  const { userId } = await auth()

  if (!userId) {
    redirect('/sign-in')
  }

  const user = await currentUser()

  if (!user) {
    redirect('/sign-in')
  }

  // Fetch user stats
  const [ordersCount, favoritesCount, recentlyViewedCount] = await Promise.all([
    prisma.order.count({
      where: { userId }
    }),
    prisma.favorite.count({
      where: { userId }
    }),
    prisma.recentlyViewed.count({
      where: { userId }
    })
  ])

  const navItems = [
    {
      href: '/account/favorites',
      icon: Heart,
      title: 'Favorites',
      description: 'Products you\'ve saved for later'
    },
    {
      href: '/account/recently-viewed',
      icon: Clock,
      title: 'Recently Viewed',
      description: 'Products you\'ve looked at recently'
    },
    {
      href: '/orders',
      icon: Package,
      title: 'Orders',
      description: 'Track and manage your orders'
    }
  ]

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>My Account</h1>
        <p className={styles.subtitle}>Manage your account and view your activity</p>
      </div>

      {/* Profile Section */}
      <div className={styles.profileSection}>
        <div className={styles.profileAvatar}>
          {user.imageUrl ? (
            <Image
              src={user.imageUrl}
              alt={user.firstName || 'User'}
              width={80}
              height={80}
              className={styles.avatarImage}
            />
          ) : (
            <User size={32} />
          )}
        </div>
        <div className={styles.profileInfo}>
          <h2 className={styles.profileName}>
            {user.firstName} {user.lastName}
          </h2>
          <p className={styles.profileEmail}>
            {user.primaryEmailAddress?.emailAddress}
          </p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <p className={styles.statValue}>{ordersCount}</p>
          <p className={styles.statLabel}>Total Orders</p>
        </div>
        <div className={styles.statCard}>
          <p className={styles.statValue}>{favoritesCount}</p>
          <p className={styles.statLabel}>Favorites</p>
        </div>
        <div className={styles.statCard}>
          <p className={styles.statValue}>{recentlyViewedCount}</p>
          <p className={styles.statLabel}>Recently Viewed</p>
        </div>
      </div>

      {/* Navigation Grid */}
      <div className={styles.navGrid}>
        {navItems.map((item) => (
          <Link key={item.href} href={item.href} className={styles.navCard}>
            <div className={styles.navIcon}>
              <item.icon size={24} />
            </div>
            <div className={styles.navContent}>
              <h3 className={styles.navTitle}>{item.title}</h3>
              <p className={styles.navDescription}>{item.description}</p>
            </div>
            <ChevronRight size={20} className={styles.navArrow} />
          </Link>
        ))}
      </div>
    </div>
  )
}
