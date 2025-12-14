import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const category = searchParams.get('category')

    const products = await prisma.product.findMany({
      where: category ? {
        category: {
          slug: category
        }
      } : undefined,
      include: {
        category: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    // Convert Decimal to number for JSON serialization
    const productsWithNumberPrice = products.map(product => ({
      ...product,
      price: Number(product.price)
    }))

    return NextResponse.json(productsWithNumberPrice)
  } catch (error) {
    console.error('Error fetching products:', error)
    return NextResponse.json(
      { error: 'Failed to fetch products' },
      { status: 500 }
    )
  }
}