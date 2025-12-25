import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Start seeding...')

  try {
    // ========================================
    // CATEGORIES - Always seed these
    // These are structural/foundational
    // ========================================
    const watches = await prisma.category.upsert({
      where: { slug: 'watches' },
      update: {},
      create: {
        name: 'Watches',
        slug: 'watches',
        description: 'Luxury and casual watches for every occasion',
      },
    })

    const bracelets = await prisma.category.upsert({
      where: { slug: 'bracelets' },
      update: {},
      create: {
        name: 'Bracelets',
        slug: 'bracelets',
        description: 'Elegant bracelets and bangles',
      },
    })

    const rings = await prisma.category.upsert({
      where: { slug: 'rings' },
      update: {},
      create: {
        name: 'Rings',
        slug: 'rings',
        description: 'Beautiful rings for all styles',
      },
    })

    const belts = await prisma.category.upsert({
      where: { slug: 'belts' },
      update: {},
      create: {
        name: 'Belts',
        slug: 'belts',
        description: 'Premium leather and fabric belts',
      },
    })

    const necklaces = await prisma.category.upsert({
      where: { slug: 'necklaces' },
      update: {},
      create: {
        name: 'Necklaces',
        slug: 'necklaces',
        description: 'Stunning necklaces and pendants',
      },
    })

    console.log('✅ Categories created: 5')

    // ========================================
    // PRODUCTS - Only seed in development
    // In production, use admin dashboard
    // ========================================
    
    // Check if we're in development
    const isDevelopment = process.env.NODE_ENV !== 'production'
    
    if (isDevelopment) {
      console.log('📦 Seeding sample products (development mode)...')
      
      const products = [
        // Watches
        {
          name: 'Classic Silver Watch',
          slug: 'classic-silver-watch',
          description: 'Elegant silver watch with leather strap. Perfect for formal occasions.',
          price: 299.99,
          stock: 15,
          categoryId: watches.id,
          imageUrl: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500',
        },
        {
          name: 'Sport Chronograph',
          slug: 'sport-chronograph',
          description: 'Water-resistant sports watch with multiple functions.',
          price: 449.99,
          stock: 8,
          categoryId: watches.id,
          imageUrl: 'https://images.unsplash.com/photo-1542496658-e33a6d0d50f6?w=500',
        },
        {
          name: 'Minimalist Gold Watch',
          slug: 'minimalist-gold-watch',
          description: 'Sleek minimalist design with gold-plated case.',
          price: 199.99,
          stock: 20,
          categoryId: watches.id,
          imageUrl: 'https://images.unsplash.com/photo-1524805444758-089113d48a6d?w=500',
        },
        // Bracelets
        {
          name: 'Silver Chain Bracelet',
          slug: 'silver-chain-bracelet',
          description: 'Sterling silver chain bracelet with delicate clasp.',
          price: 89.99,
          stock: 25,
          categoryId: bracelets.id,
          imageUrl: 'https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=500',
        },
        {
          name: 'Leather Wrap Bracelet',
          slug: 'leather-wrap-bracelet',
          description: 'Genuine leather wrap bracelet with metal accents.',
          price: 49.99,
          stock: 30,
          categoryId: bracelets.id,
          imageUrl: 'https://images.unsplash.com/photo-1590535157902-b22f8b43c49f?w=500',
        },
        {
          name: 'Beaded Charm Bracelet',
          slug: 'beaded-charm-bracelet',
          description: 'Colorful beaded bracelet with removable charms.',
          price: 39.99,
          stock: 40,
          categoryId: bracelets.id,
          imageUrl: 'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=500',
        },
        // Rings
        {
          name: 'Diamond Engagement Ring',
          slug: 'diamond-engagement-ring',
          description: '14k white gold ring with 1 carat diamond.',
          price: 2499.99,
          stock: 5,
          categoryId: rings.id,
          imageUrl: 'https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=500',
        },
        {
          name: 'Vintage Style Ring',
          slug: 'vintage-style-ring',
          description: 'Antique-inspired design with intricate details.',
          price: 159.99,
          stock: 12,
          categoryId: rings.id,
          imageUrl: 'https://images.unsplash.com/photo-1603561596112-0a132b757442?w=500',
        },
        {
          name: 'Minimalist Band Ring',
          slug: 'minimalist-band-ring',
          description: 'Simple and elegant band ring in rose gold.',
          price: 79.99,
          stock: 35,
          categoryId: rings.id,
          imageUrl: 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=500',
        },
        // Belts
        {
          name: 'Classic Leather Belt',
          slug: 'classic-leather-belt',
          description: 'Genuine leather belt with silver buckle.',
          price: 69.99,
          stock: 50,
          categoryId: belts.id,
          imageUrl: 'https://images.unsplash.com/photo-1624222247344-550fb60583bb?w=500',
        },
        {
          name: 'Reversible Belt',
          slug: 'reversible-belt',
          description: 'Two belts in one - black and brown leather.',
          price: 89.99,
          stock: 22,
          categoryId: belts.id,
          imageUrl: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=500',
        },
        {
          name: 'Canvas Casual Belt',
          slug: 'canvas-casual-belt',
          description: 'Durable canvas belt perfect for everyday wear.',
          price: 29.99,
          stock: 60,
          categoryId: belts.id,
          imageUrl: 'https://images.unsplash.com/photo-1598522325074-042db73aa4e6?w=500',
        },
        // Necklaces
        {
          name: 'Pearl Pendant Necklace',
          slug: 'pearl-pendant-necklace',
          description: 'Elegant freshwater pearl on gold chain.',
          price: 149.99,
          stock: 18,
          categoryId: necklaces.id,
          imageUrl: 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=500',
        },
        {
          name: 'Statement Chain Necklace',
          slug: 'statement-chain-necklace',
          description: 'Bold chunky chain necklace in gold tone.',
          price: 99.99,
          stock: 15,
          categoryId: necklaces.id,
          imageUrl: 'https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=500',
        },
        {
          name: 'Delicate Silver Necklace',
          slug: 'delicate-silver-necklace',
          description: 'Fine sterling silver chain with small pendant.',
          price: 59.99,
          stock: 45,
          categoryId: necklaces.id,
          imageUrl: 'https://images.unsplash.com/photo-1506630448388-4e683c67ddb0?w=500',
        },
      ]

      await Promise.all(
        products.map(product =>
          prisma.product.upsert({
            where: { slug: product.slug },
            update: {},
            create: product,
          })
        )
      )

      console.log(`✅ Sample products created: ${products.length}`)
    } else {
      console.log('⏭️  Skipping product seeding (production mode)')
      console.log('   Use the admin dashboard to add products.')
    }

    console.log('✅ Seeding finished.')
  } catch (error) {
    console.error('❌ Error during seeding:', error)
    throw error
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });