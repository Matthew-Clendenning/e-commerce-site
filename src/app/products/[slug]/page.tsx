import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import AddToCartButton from '@/components/AddToCartButton'
import styles from '../../../styles/product.module.css'

type Props = {
    params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { slug } = await params

    const product = await prisma.product.findUnique({
        where: { slug },
        include: {category: true }
    })

    if (!product) {
        return {
            title: 'Product Not Found',
        }
    }

    const price = Number(product.price)

    return {
        title: product.name,
        description: product.description || `Shop ${product.name} from our ${product.category.name} collection. High-quality ${product.category.name.toLowerCase()} at competitive prices.`,
        openGraph: {
            title: product.name,
            description: product.description || `Shop ${product.name}`,
            images: product.imageUrl ? [
                {
                    url: product.imageUrl,
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
            images: product.imageUrl ? [product.imageUrl] : [],
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
        include: { category: true }
    })

    if (!product) {
        notFound()
    }
    
    const price = Number(product.price)

    const jsonLd = {
        '@context': 'https://schema.org/',
        '@type': 'Product',
        name: product.name,
        description: product.description,
        image: product.imageUrl,
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
                        {product.imageUrl ? (
                            <Image
                                src={product.imageUrl}
                                alt={product.name}
                                width={600}
                                height={600}
                                className={styles.image}
                                priority
                            />
                        ) : (
                            <div className={styles.placeholderImage}>
                                <span>No Image Available</span>
                            </div>
                        )}
                    </div>

                    <div className={styles.detailsSection}>
                        <div className={styles.category}>{product.category.name}</div>
                        <h1 className={styles.title}>{product.name}</h1>

                        <div className={styles.price}>
                            ${price.toFixed(2)}
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

                        <AddToCartButton 
                            product={{
                                id: product.id,
                                name: product.name,
                                price: price,
                                imageUrl: product.imageUrl,
                                slug: product.slug,
                                stock: product.stock
                            }}
                            disabled={product.stock === 0}
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