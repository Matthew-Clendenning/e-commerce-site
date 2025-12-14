import { SignedIn, SignedOut } from '@clerk/nextjs'
import Link from 'next/link'
import styles from './page.module.css'

export default function Home() {
  return (
    <main className={styles.main}>
      <div className={styles.hero}>
        <h1 className={styles.title}>Welcome to Our Store</h1>
        <p className={styles.subtitle}>
          Discover our exclusive collection of premium accessories
        </p>
        
        <SignedOut>
          <p className={styles.message}>
            Please sign in to start shopping and unlock exclusive deals!
          </p>
        </SignedOut>
        
        <SignedIn>
          <p className={styles.message}>
            Welcome back! Ready to find your next favorite item?
          </p>
        </SignedIn>

        <Link href="/products" className={styles.ctaButton}>
          Browse All Products
        </Link>
      </div>

      <div className={styles.features}>
        <div className={styles.feature}>
          <h3>🎁 Premium Quality</h3>
          <p>Handpicked accessories for discerning customers</p>
        </div>
        <div className={styles.feature}>
          <h3>🚚 Fast Shipping</h3>
          <p>Quick and reliable delivery to your doorstep</p>
        </div>
        <div className={styles.feature}>
          <h3>💯 Satisfaction Guaranteed</h3>
          <p>30-day returns on all purchases</p>
        </div>
      </div>
    </main>
  )
}