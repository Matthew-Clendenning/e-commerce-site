import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool, PoolConfig } from 'pg'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

let prisma: PrismaClient

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is not set')
}

const connectionString = process.env.DATABASE_URL

// Detect CI environment (GitHub Actions sets CI=true)
// CI uses a local PostgreSQL container without SSL
// Production and local development use Supabase which requires SSL
const isCI = process.env.CI === 'true'

// Configure SSL based on environment
const sslConfig = isCI ? false : { rejectUnauthorized: false }

try {
  if (process.env.NODE_ENV === 'production') {
    const poolConfig: PoolConfig = {
      connectionString,
      ssl: sslConfig,
      max: 1 // Important for serverless
    }
    const pool = new Pool(poolConfig)
    const adapter = new PrismaPg(pool)
    prisma = new PrismaClient({ adapter })
  } else {
    if (!globalForPrisma.prisma) {
      const poolConfig: PoolConfig = {
        connectionString,
        ssl: sslConfig
      }
      const pool = new Pool(poolConfig)
      const adapter = new PrismaPg(pool)
      globalForPrisma.prisma = new PrismaClient({ adapter })
    }
    prisma = globalForPrisma.prisma
  }
} catch (error) {
  // Re-throw to prevent silent failures
  throw error
}

export { prisma }