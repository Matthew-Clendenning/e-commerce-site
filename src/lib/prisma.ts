import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

let prisma: PrismaClient

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is not set')
}

const connectionString = process.env.DATABASE_URL

try {
  if (process.env.NODE_ENV === 'production') {
    const pool = new Pool({ 
      connectionString,
      ssl: { rejectUnauthorized: false },
      max: 1 // Important for serverless
    })
    const adapter = new PrismaPg(pool)
    prisma = new PrismaClient({ adapter })
  } else {
    if (!globalForPrisma.prisma) {
      const pool = new Pool({ 
        connectionString,
        ssl: { rejectUnauthorized: false }
      })
      const adapter = new PrismaPg(pool)
      globalForPrisma.prisma = new PrismaClient({ adapter })
    }
    prisma = globalForPrisma.prisma
  }
} catch (error) {
  console.error('Failed to initialize Prisma Client:', error)
  throw error
}

export { prisma }