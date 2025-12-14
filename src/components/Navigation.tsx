import Link from 'next/link'
import { UserButton, SignInButton, SignedIn, SignedOut } from '@clerk/nextjs'
import styles from './Navigation.module.css'

export default function Navigation() {
  return (
    <nav className={styles.nav}>
      <div className={styles.container}>
        <Link href="/" className={styles.logo}>
          E-Commerce Store
        </Link>
        
        <div className={styles.links}>
          <Link href="/" className={styles.link}>
            Home
          </Link>
          <Link href="/products" className={styles.link}>
            Products
          </Link>
          <SignedIn>
            <Link href="/admin" className={styles.link}>
              Admin
            </Link>
          </SignedIn>
        </div>

        <div className={styles.auth}>
          <SignedOut>
            <SignInButton mode="modal">
              <button className={styles.signInButton}>
                Sign In
              </button>
            </SignInButton>
          </SignedOut>
          <SignedIn>
            <UserButton afterSignOutUrl="/" />
          </SignedIn>
        </div>
      </div>
    </nav>
  )
}