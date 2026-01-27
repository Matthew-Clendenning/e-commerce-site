import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { getSaleForCategory, calculateEffectiveDiscount, calculateSalePrice } from '@/lib/sales'
import ProductActions from '@/components/ProductActions'
import ProductViewTracker from '@/components/ProductViewTracker'
import ImageGallery from '@/components/ImageGallery'
import SaleBadge from '@/components/SaleBadge'
import styles from '../../../styles/product.module.css'

type Props = {
    params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { slug } = await params

    const product = await prisma.product.findUnique({
        where: { slug },
        include: {
            category: true,
            images: { orderBy: { position: 'asc' }, take: 1 }
        }
    })

    if (!product) {
        return {
            title: 'Product Not Found',
        }
    }

    const price = Number(product.price)
    const primaryImage = product.images[0]?.url || product.imageUrl

    return {
        title: product.name,
        description: product.description || `Shop ${product.name} from our ${product.category.name} collection. High-quality ${product.category.name.toLowerCase()} at competitive prices.`,
        openGraph: {
            title: product.name,
            description: product.description || `Shop ${product.name}`,
            images: primaryImage ? [
                {
                    url: primaryImage,
                    width: 800,
                    height: 600,
                    alt: product.name,
                }
            ] : [],
            type: 'website',
        },
        twitter: {
            card: 'summary_large_image',
            title: product.name,
            description: product.description || `Shop ${product.name}`,
            images: primaryImage ? [primaryImage] : [],
        },
        other: {
            'product:price:amount': price.toString(),
            'product:price:currency': 'USD',
        }
    }
}

export async function generateStaticParams() {
    const products = await prisma.product.findMany({
        select: { slug: true }
    })

    return products.map((product) => ({
        slug: product.slug,
    }))
}

export default async function ProductPage({ params }: Props) {
    const { slug } = await params

    const product = await prisma.product.findUnique({
        where: { slug },
        include: {
            category: true,
            images: { orderBy: { position: 'asc' } }
        }
    })

    if (!product) {
        notFound()
    }

    const price = Number(product.price)

    // Fetch category sale info for discount calculation
    const categorySale = await getSaleForCategory(product.categoryId)
    const categoryDiscount = categorySale?.discount ?? 0
    const effectiveDiscount = calculateEffectiveDiscount(product.discountPercent, categoryDiscount)
    const hasDiscount = effectiveDiscount > 0
    const salePrice = hasDiscount ? calculateSalePrice(price, effectiveDiscount) : price

    // Build images array - use ProductImage records, fallback to legacy imageUrl
    const galleryImages = product.images.length > 0
        ? product.images.map(img => ({ id: img.id, url: img.url, alt: img.alt }))
        : product.imageUrl
            ? [{ id: 'legacy', url: product.imageUrl, alt: product.name }]
            : []

    const jsonLd = {
        '@context': 'https://schema.org/',
        '@type': 'Product',
        name: product.name,
        description: product.description,
        image: galleryImages.length > 0 ? galleryImages.map(img => img.url) : undefined,
        sku: product.id,
        brand: {
            '@type': 'Brand',
            name: 'YOUR STORE NAME'
        },
        offers: {
            '@type': 'Offer',
            url: `https://e-commerce-site-eight-blush.vercel.app/products/${product.slug}`, // Change to your actual domain
            priceCurrency: 'USD',
            price: price,
            availability: product.stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
            itemCondition: 'https://schema.org/NewCondition'
        },
        category: product.category.name
    }

    return (
        <>
            <ProductViewTracker productId={product.id} />
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
            />

            <div className={styles.container}>
                <nav className={styles.breadcrumb}>
                    <Link href="/">Home</Link>
                    <span>/</span>
                    <Link href="/products">Products</Link>
                    <span>/</span>
                    <Link href={`/products?category=${product.category.slug}`}>
                        {product.category.name}
                    </Link>
                    <span>/</span>
                    <span>{product.name}</span>
                </nav>

                <div className={styles.productGrid}>
                    <div className={styles.imageSection}>
                        <ImageGallery
                            images={galleryImages}
                            productName={product.name}
                        />
                    </div>

                    <div className={styles.detailsSection}>
                        <div className={styles.categoryRow}>
                            <span className={styles.category}>{product.category.name}</span>
                            {hasDiscount && <SaleBadge discount={effectiveDiscount} size="medium" />}
                        </div>
                        <h1 className={styles.title}>{product.name}</h1>

                        <div className={styles.priceSection}>
                            {hasDiscount ? (
                                <>
                                    <span className={styles.originalPrice}>${price.toFixed(2)}</span>
                                    <span className={styles.salePrice}>${salePrice.toFixed(2)}</span>
                                    <span className={styles.savings}>Save ${(price - salePrice).toFixed(2)}</span>
                                </>
                            ) : (
                                <span className={styles.price}>${price.toFixed(2)}</span>
                            )}
                        </div>

                        <div className={styles.stock}>
                            {product.stock > 0 ? (
                                <span className={styles.inStock}>In Stock ({product.stock} available)</span>
                            ) : (
                                <span className={styles.outOfStock}>Out of Stock</span>
                            )}
                        </div>

                        <div className={styles.description}>
                            <h2>Description</h2>
                            <p>{product.description || 'No description available.'}</p>
                        </div>

                        <ProductActions
                            product={{
                                id: product.id,
                                name: product.name,
                                price: price,
                                imageUrl: product.imageUrl,
                                slug: product.slug,
                                stock: product.stock
                            }}
                        />

                        <div className={styles.features}>
                            <h3>Features</h3>
                            <ul>
                                <li>Premium quality materials</li>
                                <li>Secure packaging</li>
                                <li>30-day return policy</li>
                                <li>Free shipping on orders over $100</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </>
    )
}