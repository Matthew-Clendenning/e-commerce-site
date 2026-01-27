import Image from 'next/image';
import Link from 'next/link';
import FavoriteButton from './FavoriteButton';
import SaleBadge from './SaleBadge';
import { calculateEffectiveDiscount, calculateSalePrice } from '../lib/sales';
import styles from '../styles/ProductCard.module.css';

type ProductCardProps = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price: number;
  imageUrl: string | null;
  stock: number;
  category: {
    name: string;
    slug: string;
  };
  productDiscount?: number | null;
  categoryDiscount?: number;
};

export default function ProductCard({
  id,
  name,
  slug,
  description,
  price,
  imageUrl,
  stock,
  category,
  productDiscount,
  categoryDiscount = 0
}: ProductCardProps) {
  const isOutOfStock = stock === 0
  const effectiveDiscount = calculateEffectiveDiscount(productDiscount ?? null, categoryDiscount)
  const hasDiscount = effectiveDiscount > 0
  const salePrice = hasDiscount ? calculateSalePrice(price, effectiveDiscount) : price

  return (
    <Link href={`/products/${slug}`} className={styles.card}>
      <div className={styles.imageContainer}>
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={name}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            className={styles.image}
          />
        ) : (
          <div className={styles.placeholder}>No Image</div>
        )}

        {isOutOfStock && (
          <>
            <div className={styles.outOfStockOverlay} />
            <div className={styles.outOfStock}>Out of Stock</div>
          </>
        )}

        {hasDiscount && !isOutOfStock && (
          <SaleBadge discount={effectiveDiscount} size="small" className={styles.saleBadge} />
        )}

        <FavoriteButton
          productId={id}
          size="small"
          className={styles.favoriteButton}
        />
      </div>

      <div className={styles.content}>
        <span className={styles.category}>{category.name}</span>
        <h3 className={styles.title}>{name}</h3>
        <p className={styles.description}>{description}</p>

        <div className={styles.footer}>
          <div className={styles.priceContainer}>
            {hasDiscount ? (
              <>
                <span className={styles.originalPrice}>${price.toFixed(2)}</span>
                <span className={styles.salePrice}>${salePrice.toFixed(2)}</span>
              </>
            ) : (
              <span className={styles.price}>${price.toFixed(2)}</span>
            )}
          </div>
          <span className={styles.stock}>
            {stock > 0 ? `${stock} in stock` : 'Out of stock'}
          </span>
        </div>
      </div>
    </Link>
  );
}
