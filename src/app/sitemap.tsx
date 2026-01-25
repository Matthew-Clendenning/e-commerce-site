import type { MetadataRoute } from 'next'
import { prisma } from '@/lib/prisma';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const baseUrl = 'https://e-commerce-site-eight-blush.vercel.app' // Change to your actual domain

    const products = await prisma.product.findMany({
        select: {
            slug: true,
            updatedAt: true
        },
    });

    const productUrls = products.map((product) => ({
        url: `${baseUrl}/products/${product.slug}`,
        lastModified: product.updatedAt,
        changeFrequency: 'weekly' as const,
        priority: 0.8,
    }));

    const categories = await prisma.category.findMany({
        select: {
            slug: true,
        },
    });

    const categoryUrls = categories.map((category) => ({
        url: `${baseUrl}/products?category=${category.slug}`,
        lastModified: new Date(),
        changeFrequency: 'daily' as const,
        priority: 0.7,
    }));

    return [
        {
            url: baseUrl,
            lastModified: new Date(),
            changeFrequency: 'daily',
            priority: 1.0,
        },
        {
            url: `${baseUrl}/products`,
            lastModified: new Date(),
            changeFrequency: 'daily',
            priority: 0.9,
        },
        ...productUrls,
        ...categoryUrls,
    ];
}