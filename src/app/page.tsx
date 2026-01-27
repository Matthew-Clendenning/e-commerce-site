import { SignedIn, SignedOut } from '@clerk/nextjs'
import Link from 'next/link'
import { getActiveSales } from '../lib/sales'
import SaleCategoryCard from '../components/SaleCategoryCard'
import AboutSection from '../components/AboutSection'
import styles from '../styles/page.module.css'

export default async function Home() {
  const activeSales = await getActiveSales()

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Store",
    name: "YOUR STORE NAME",
    description: "Shop our exclusive collection of premium watches, bracelets, rings, belts, and necklaces. Quality accessories for every style and occasion.",
    url: "https://e-commerce-site-eight-blush.vercel.app",
    logo: "https://e-commerce-site-eight-blush.vercel.app/logo.png",
    sameAs: [],
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'customer service',
      email: 'support@yourstore.com',
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

        <AboutSection />

        {activeSales.length > 0 && (
          <section className={styles.salesSection}>
            <div className={styles.salesContainer}>
              <div className={styles.salesHeader}>
                <span className={styles.salesLabel}>Limited Time</span>
                <h2 className={styles.salesTitle}>Current Sales</h2>
                <p className={styles.salesSubtitle}>
                  Shop our exclusive deals before they end
                </p>
              </div>

              <div className={styles.salesGrid}>
                {activeSales.flatMap((sale) =>
                  sale.categories.map((saleCategory) => (
                    <SaleCategoryCard
                      key={`${sale.id}-${saleCategory.categoryId}`}
                      saleName={sale.name}
                      tagline={sale.tagline}
                      discount={sale.discount}
                      endDate={sale.endDate}
                      bannerUrl={sale.bannerUrl}
                      categorySlug={saleCategory.category.slug}
                      categoryName={saleCategory.category.name}
                      productImages={saleCategory.category.products
                        .map((p) => p.imageUrl)
                        .filter((url): url is string => url !== null)}
                    />
                  ))
                )}
              </div>
            </div>
          </section>
        )}
      </main>
    </>
  )
}
