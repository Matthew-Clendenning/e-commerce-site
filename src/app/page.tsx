import { SignedIn, SignedOut } from '@clerk/nextjs'
import Link from 'next/link'
import styles from '../styles/page.module.css'

export default function Home() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Store",
    name: "YOUR STORE NAME",
    description: "Shop our exclusive collection of premium watches, bracelets, rings, belts, and necklaces. Quality accessories for every style and occasion.",
    url: "https://e-commerce-site-eight-blush.vercel.app", // Change to your actual domain
    logo: "https://e-commerce-site-eight-blush.vercel.app/logo.png", // Change to your actual logo URL
    sameAs: [
      // Add your social media profiles here
    ],
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'customer service',
      email: 'support@yourstore.com', // Change to your actual support email
    }
  }
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <main className={styles.main}>
        <div className={styles.hero}>
          <h1 className={styles.title}>Welcome to Our Store</h1>
          <p className={styles.subtitle}>
            Discover our exclusive collection of premium accessories
          </p>
          
          <SignedOut>
            <p className={styles.message}>
              Sign in to start shopping and unlock exclusive deals!
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
    </>
  )
}