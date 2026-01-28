/**
 * Seed script for generating mock products
 * Run with: npx tsx scripts/seed-products.ts
 */

import 'dotenv/config'
import { prisma } from '../src/lib/prisma'

// High-quality placeholder images from Unsplash (verified working)
const images = {
  watches: [
    'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&q=80',
    'https://images.unsplash.com/photo-1524592094714-0f0654e20314?w=800&q=80',
    'https://images.unsplash.com/photo-1522312346375-d1a52e2b99b3?w=800&q=80',
    'https://images.unsplash.com/photo-1587836374828-4dbafa94cf0e?w=800&q=80',
    'https://images.unsplash.com/photo-1539874754764-5a96559165b0?w=800&q=80',
  ],
  bracelets: [
    'https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=800&q=80',
    'https://images.unsplash.com/photo-1573408301185-9146fe634ad0?w=800&q=80',
    'https://images.unsplash.com/photo-1602173574767-37ac01994b2a?w=800&q=80',
    'https://images.unsplash.com/photo-1609587312208-cea54be969e7?w=800&q=80',
    'https://images.unsplash.com/photo-1599643477877-530eb83abc8e?w=800&q=80',
  ],
  necklaces: [
    'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=800&q=80',
    'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=800&q=80',
    'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=800&q=80',
    'https://images.unsplash.com/photo-1506630448388-4e683c67ddb0?w=800&q=80',
    'https://images.unsplash.com/photo-1598560917505-59a3ad559071?w=800&q=80',
  ],
  rings: [
    'https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=800&q=80',
    'https://images.unsplash.com/photo-1603561591411-07134e71a2a9?w=800&q=80',
    'https://images.unsplash.com/photo-1602751584552-8ba73aad10e1?w=800&q=80',
    'https://images.unsplash.com/photo-1589674781759-c21c37956a44?w=800&q=80',
    'https://images.unsplash.com/photo-1586104237516-5765e6229344?w=800&q=80',
  ],
}

const categories = [
  {
    name: 'Watches',
    slug: 'watches',
    description: 'Luxury timepieces crafted with precision and elegance',
  },
  {
    name: 'Bracelets',
    slug: 'bracelets',
    description: 'Elegant bracelets for every occasion',
  },
  {
    name: 'Necklaces',
    slug: 'necklaces',
    description: 'Stunning necklaces that make a statement',
  },
  {
    name: 'Rings',
    slug: 'rings',
    description: 'Exquisite rings for timeless elegance',
  },
]

const products = [
  // Watches
  {
    name: 'Chronograph Elite',
    slug: 'chronograph-elite',
    description: 'A stunning chronograph watch featuring Swiss movement, sapphire crystal, and genuine leather strap. Water-resistant to 100 meters with luminous hands for low-light visibility.',
    price: 2495.00,
    stock: 15,
    category: 'watches',
    imageIndex: 0,
  },
  {
    name: 'Midnight Automatic',
    slug: 'midnight-automatic',
    description: 'Self-winding automatic movement with a sleek black dial. Features 42mm stainless steel case, exhibition caseback, and 48-hour power reserve.',
    price: 3250.00,
    stock: 8,
    category: 'watches',
    imageIndex: 1,
  },
  {
    name: 'Classic Gold Dress Watch',
    slug: 'classic-gold-dress-watch',
    description: 'Elegant dress watch with 18k gold-plated case and minimalist design. Japanese quartz movement with date function.',
    price: 895.00,
    stock: 25,
    category: 'watches',
    imageIndex: 2,
  },
  {
    name: 'Diver Professional 300',
    slug: 'diver-professional-300',
    description: 'Professional dive watch rated to 300 meters. Unidirectional ceramic bezel, helium escape valve, and super luminova markers.',
    price: 4750.00,
    stock: 5,
    category: 'watches',
    imageIndex: 3,
  },
  {
    name: 'Heritage Moonphase',
    slug: 'heritage-moonphase',
    description: 'Sophisticated moonphase complication with hand-finished movement. Rose gold case with genuine alligator strap.',
    price: 8900.00,
    stock: 3,
    category: 'watches',
    imageIndex: 4,
  },
  {
    name: 'Limited Edition Tourbillon',
    slug: 'limited-edition-tourbillon',
    description: 'Exceptional tourbillon movement visible through skeleton dial. Limited to 50 pieces worldwide. Includes presentation box and certificate.',
    price: 45000.00,
    stock: 1,
    category: 'watches',
    imageIndex: 0,
  },
  // Bracelets
  {
    name: 'Diamond Tennis Bracelet',
    slug: 'diamond-tennis-bracelet',
    description: 'Classic tennis bracelet featuring 5 carats of round brilliant diamonds set in 18k white gold. Secure box clasp with safety.',
    price: 8500.00,
    stock: 6,
    category: 'bracelets',
    imageIndex: 0,
  },
  {
    name: 'Gold Rope Chain Bracelet',
    slug: 'gold-rope-chain-bracelet',
    description: 'Luxurious 14k gold rope chain bracelet with lobster clasp. 7.5 inches with timeless twisted design.',
    price: 1250.00,
    stock: 20,
    category: 'bracelets',
    imageIndex: 1,
  },
  {
    name: 'Sapphire Bangle',
    slug: 'sapphire-bangle',
    description: 'Elegant hinged bangle featuring Ceylon blue sapphires and diamond accents. Set in polished platinum.',
    price: 4200.00,
    stock: 8,
    category: 'bracelets',
    imageIndex: 2,
  },
  {
    name: 'Pearl Strand Bracelet',
    slug: 'pearl-strand-bracelet',
    description: 'Double-strand Akoya pearl bracelet with 18k gold clasp. 6.5-7mm pearls with excellent luster.',
    price: 1850.00,
    stock: 15,
    category: 'bracelets',
    imageIndex: 3,
  },
  {
    name: 'Charm Link Bracelet',
    slug: 'charm-link-bracelet',
    description: 'Sterling silver charm bracelet with intricate link design. Perfect foundation for building your charm collection.',
    price: 395.00,
    stock: 35,
    category: 'bracelets',
    imageIndex: 4,
  },
  {
    name: 'Emerald Cuff Bracelet',
    slug: 'emerald-cuff-bracelet',
    description: 'Bold cuff bracelet featuring a central Colombian emerald surrounded by pavé diamonds. 18k yellow gold.',
    price: 12500.00,
    stock: 3,
    category: 'bracelets',
    imageIndex: 0,
  },
  // Necklaces
  {
    name: 'Diamond Solitaire Pendant',
    slug: 'diamond-solitaire-pendant',
    description: 'Brilliant-cut diamond pendant in 18k white gold setting. 0.75 carat VVS1 clarity with 16-inch chain included.',
    price: 3200.00,
    stock: 12,
    category: 'necklaces',
    imageIndex: 0,
  },
  {
    name: 'Gold Chain Necklace',
    slug: 'gold-chain-necklace',
    description: 'Substantial 22k gold chain necklace with modern link design. 20 inches with secure lobster clasp.',
    price: 2400.00,
    stock: 10,
    category: 'necklaces',
    imageIndex: 1,
  },
  {
    name: 'Pearl Strand Necklace',
    slug: 'pearl-strand-necklace',
    description: 'Classic single-strand South Sea pearl necklace. 9-11mm pearls with 18k gold clasp. 18 inches.',
    price: 5500.00,
    stock: 7,
    category: 'necklaces',
    imageIndex: 2,
  },
  {
    name: 'Ruby Heart Pendant',
    slug: 'ruby-heart-pendant',
    description: 'Romantic heart-shaped ruby pendant surrounded by diamonds. 1.5 carat Burmese ruby in platinum setting.',
    price: 7800.00,
    stock: 4,
    category: 'necklaces',
    imageIndex: 3,
  },
  {
    name: 'Layered Chain Set',
    slug: 'layered-chain-set',
    description: 'Set of three delicate gold chains in varying lengths. 14k gold with minimalist design for effortless layering.',
    price: 895.00,
    stock: 25,
    category: 'necklaces',
    imageIndex: 4,
  },
  {
    name: 'Emerald Drop Necklace',
    slug: 'emerald-drop-necklace',
    description: 'Stunning pear-shaped emerald drop pendant on diamond-studded chain. 2.5 carat Colombian emerald.',
    price: 15000.00,
    stock: 2,
    category: 'necklaces',
    imageIndex: 0,
  },
  // Rings
  {
    name: 'Diamond Engagement Ring',
    slug: 'diamond-engagement-ring',
    description: 'Timeless solitaire engagement ring with 1.5 carat round brilliant diamond. Platinum band with cathedral setting.',
    price: 12500.00,
    stock: 5,
    category: 'rings',
    imageIndex: 0,
  },
  {
    name: 'Sapphire Halo Ring',
    slug: 'sapphire-halo-ring',
    description: 'Stunning Ceylon sapphire surrounded by a halo of diamonds. 2 carat center stone in 18k white gold.',
    price: 8900.00,
    stock: 4,
    category: 'rings',
    imageIndex: 1,
  },
  {
    name: 'Gold Wedding Band',
    slug: 'gold-wedding-band',
    description: 'Classic 18k yellow gold wedding band with comfort fit. 4mm width with polished finish.',
    price: 850.00,
    stock: 30,
    category: 'rings',
    imageIndex: 2,
  },
  {
    name: 'Emerald Cocktail Ring',
    slug: 'emerald-cocktail-ring',
    description: 'Show-stopping emerald cocktail ring featuring a 3-carat Colombian emerald surrounded by pavé diamonds.',
    price: 15750.00,
    stock: 2,
    category: 'rings',
    imageIndex: 3,
  },
  {
    name: 'Ruby Eternity Band',
    slug: 'ruby-eternity-band',
    description: 'Stunning eternity band featuring channel-set rubies in platinum. 2.5 total carat weight.',
    price: 6500.00,
    stock: 0, // Out of stock example
    category: 'rings',
    imageIndex: 4,
  },
  {
    name: 'Diamond Stacking Ring',
    slug: 'diamond-stacking-ring',
    description: 'Delicate diamond stacking ring perfect for layering. 0.25 carat diamonds in 14k rose gold.',
    price: 695.00,
    stock: 40,
    category: 'rings',
    imageIndex: 0,
  },
]

async function main() {
  console.log('🌱 Starting seed...\n')

  // Clear existing data
  console.log('Clearing existing products and categories...')
  await prisma.orderItem.deleteMany({})
  await prisma.cartItem.deleteMany({})
  await prisma.favorite.deleteMany({})
  await prisma.recentlyViewed.deleteMany({})
  await prisma.product.deleteMany({})
  await prisma.category.deleteMany({})

  // Create categories
  console.log('Creating categories...')
  const categoryMap = new Map<string, string>()

  for (const cat of categories) {
    const created = await prisma.category.create({
      data: cat,
    })
    categoryMap.set(cat.slug, created.id)
    console.log(`  ✓ Created category: ${cat.name}`)
  }

  // Create products
  console.log('\nCreating products...')
  for (const product of products) {
    const categoryId = categoryMap.get(product.category)
    if (!categoryId) {
      console.log(`  ✗ Skipping ${product.name}: category not found`)
      continue
    }

    const imageArray = images[product.category as keyof typeof images]
    const imageUrl = imageArray[product.imageIndex % imageArray.length]

    await prisma.product.create({
      data: {
        name: product.name,
        slug: product.slug,
        description: product.description,
        price: product.price,
        stock: product.stock,
        imageUrl,
        categoryId,
      },
    })
    console.log(`  ✓ Created product: ${product.name} ($${product.price})`)
  }

  // Summary
  const productCount = await prisma.product.count()
  const categoryCount = await prisma.category.count()

  console.log('\n✅ Seed completed!')
  console.log(`   Categories: ${categoryCount}`)
  console.log(`   Products: ${productCount}`)
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e)
    process.exit(1)
  })
  .finally(() => {
    process.exit(0)
  })
