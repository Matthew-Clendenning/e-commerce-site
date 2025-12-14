import Image from 'next/image';
import Link from 'next/link';
import styles from './ProductCard.module.css';

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
};

export default function ProductCard({
    name,
    slug,
    description,
    price,
    imageUrl,
    stock,
    category
}: ProductCardProps) {
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
        {stock === 0 && (
          <div className={styles.outOfStock}>Out of Stock</div>
        )}
      </div>
      
      <div className={styles.content}>
        <span className={styles.category}>{category.name}</span>
        <h3 className={styles.title}>{name}</h3>
        <p className={styles.description}>{description}</p>
        <div className={styles.footer}>
          <span className={styles.price}>${price.toFixed(2)}</span>
          <span className={styles.stock}>
            {stock > 0 ? `${stock} in stock` : 'Out of stock'}
          </span>
        </div>
      </div>
    </Link>
  )
}