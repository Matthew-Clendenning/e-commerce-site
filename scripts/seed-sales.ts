import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'
import * as dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: '.env.local' })
dotenv.config()

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is not set')
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
})

const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

async function main() {
  console.log('Fetching categories...')

  const categories = await prisma.category.findMany()
  console.log('Found categories:', categories.map(c => ({ id: c.id, name: c.name })))

  if (categories.length === 0) {
    console.log('No categories found. Please create some categories first.')
    return
  }

  // Create a Winter Sale that ends in 7 days
  const endDate = new Date()
  endDate.setDate(endDate.getDate() + 7)

  // Check if we already have a Winter Sale
  const existingSale = await prisma.sale.findFirst({
    where: { name: 'Winter Sale' }
  })

  if (existingSale) {
    console.log('Winter Sale already exists, skipping creation')
  } else {
    // Create Winter Sale with the first category
    const winterSale = await prisma.sale.create({
      data: {
        name: 'Winter Sale',
        tagline: 'THE TEXTURE & COLOR OF THE SEASON',
        discount: 25,
        startDate: new Date(),
        endDate: endDate,
        isActive: true,
        categories: {
          create: [
            { categoryId: categories[0].id }
          ]
        }
      },
      include: {
        categories: {
          include: { category: true }
        }
      }
    })
    console.log('Created Winter Sale:', winterSale.name, 'for category:', winterSale.categories[0].category.name)
  }

  // Create a Flash Sale if we have at least 2 categories
  if (categories.length >= 2) {
    const existingFlashSale = await prisma.sale.findFirst({
      where: { name: 'Flash Sale' }
    })

    if (existingFlashSale) {
      console.log('Flash Sale already exists, skipping creation')
    } else {
      const flashEndDate = new Date()
      flashEndDate.setDate(flashEndDate.getDate() + 3)

      const flashSale = await prisma.sale.create({
        data: {
          name: 'Flash Sale',
          tagline: 'LIMITED TIME ONLY - DONT MISS OUT',
          discount: 40,
          startDate: new Date(),
          endDate: flashEndDate,
          isActive: true,
          categories: {
            create: [
              { categoryId: categories[1].id }
            ]
          }
        },
        include: {
          categories: {
            include: { category: true }
          }
        }
      })
      console.log('Created Flash Sale:', flashSale.name, 'for category:', flashSale.categories[0].category.name)
    }
  }

  // Show all active sales
  const allSales = await prisma.sale.findMany({
    include: {
      categories: {
        include: { category: true }
      }
    }
  })
  console.log('\nAll Sales:')
  allSales.forEach(sale => {
    console.log(`- ${sale.name}: ${sale.discount}% off, ends ${sale.endDate.toLocaleDateString()}`)
    console.log(`  Categories: ${sale.categories.map(c => c.category.name).join(', ')}`)
  })
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
