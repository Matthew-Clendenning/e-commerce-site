import Image from 'next/image'
import Link from 'next/link'
import CountdownTimer from './CountdownTimer'
import SaleBadge from './SaleBadge'
import styles from '../styles/SaleCategoryCard.module.css'

type SaleCategoryCardProps = {
  saleName: string
  tagline: string
  discount: number
  endDate: Date | string
  bannerUrl?: string | null
  categorySlug: string
  categoryName: string
  productImages: string[]
}

export default function SaleCategoryCard({
  saleName,
  tagline,
  discount,
  endDate,
  bannerUrl,
  categorySlug,
  categoryName,
  productImages
}: SaleCategoryCardProps) {
  // Use banner if provided, otherwise show product images grid
  const hasBanner = !!bannerUrl
  const displayImages = productImages.filter(Boolean).slice(0, 4)

  return (
    <Link href={`/products?category=${categorySlug}`} className={styles.card}>
      <div className={styles.imageSection}>
        {hasBanner ? (
          <Image
            src={bannerUrl}
            alt={saleName}
            fill
            sizes="(max-width: 768px) 100vw, 50vw"
            className={styles.bannerImage}
          />
        ) : displayImages.length > 0 ? (
          <div className={styles.imageGrid}>
            {displayImages.map((img, index) => (
              <div key={index} className={styles.gridImage}>
                <Image
                  src={img}
                  alt={`${categoryName} product ${index + 1}`}
                  fill
                  sizes="(max-width: 768px) 50vw, 25vw"
                  className={styles.productImage}
                />
              </div>
            ))}
          </div>
        ) : (
          <div className={styles.placeholder}>
            <span>{categoryName}</span>
          </div>
        )}

        <SaleBadge discount={discount} size="large" className={styles.badge} />
      </div>

      <div className={styles.content}>
        <span className={styles.category}>{categoryName}</span>
        <h3 className={styles.saleName}>{saleName}</h3>
        <p className={styles.tagline}>{tagline}</p>

        <div className={styles.footer}>
          <CountdownTimer endDate={endDate} />
          <span className={styles.cta}>Shop Now</span>
        </div>
      </div>
    </Link>
  )
}
