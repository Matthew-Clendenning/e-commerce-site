import { NextRequest, NextResponse } from 'next/server'
import { auth, currentUser } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'

type RouteContext = {
  params: Promise<{ id: string }>
}

// GET - Fetch all images for a product
export async function GET(
  _request: NextRequest,
  context: RouteContext
) {
  try {
    const { id: productId } = await context.params

    const images = await prisma.productImage.findMany({
      where: { productId },
      orderBy: { position: 'asc' }
    })

    return NextResponse.json(images)
  } catch {
    return NextResponse.json(
      { error: 'Failed to fetch product images' },
      { status: 500 }
    )
  }
}

// POST - Add a new image to a product
export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await currentUser()
    if (user?.publicMetadata?.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const { id: productId } = await context.params
    const body = await request.json()
    const { url, alt } = body

    if (!url) {
      return NextResponse.json({ error: 'Image URL is required' }, { status: 400 })
    }

    // Validate URL format
    if (!url.startsWith('/') && !url.startsWith('http')) {
      return NextResponse.json(
        { error: 'Image URL must start with "/" or "http"' },
        { status: 400 }
      )
    }

    // Check product exists
    const product = await prisma.product.findUnique({
      where: { id: productId }
    })

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    // Get the highest position for existing images
    const lastImage = await prisma.productImage.findFirst({
      where: { productId },
      orderBy: { position: 'desc' }
    })

    const newPosition = (lastImage?.position ?? -1) + 1

    const image = await prisma.productImage.create({
      data: {
        url,
        alt: alt || null,
        position: newPosition,
        productId
      }
    })

    return NextResponse.json(image, { status: 201 })
  } catch {
    return NextResponse.json(
      { error: 'Failed to add image' },
      { status: 500 }
    )
  }
}

// PUT - Reorder images
export async function PUT(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await currentUser()
    if (user?.publicMetadata?.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const { id: productId } = await context.params
    const body = await request.json()
    const { imageIds } = body as { imageIds: string[] }

    if (!Array.isArray(imageIds)) {
      return NextResponse.json(
        { error: 'imageIds must be an array' },
        { status: 400 }
      )
    }

    // Update positions in a transaction
    await prisma.$transaction(
      imageIds.map((imageId, index) =>
        prisma.productImage.update({
          where: { id: imageId, productId },
          data: { position: index }
        })
      )
    )

    const images = await prisma.productImage.findMany({
      where: { productId },
      orderBy: { position: 'asc' }
    })

    return NextResponse.json(images)
  } catch {
    return NextResponse.json(
      { error: 'Failed to reorder images' },
      { status: 500 }
    )
  }
}

// DELETE - Remove an image (via query param ?imageId=xxx)
export async function DELETE(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await currentUser()
    if (user?.publicMetadata?.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const { id: productId } = await context.params
    const { searchParams } = new URL(request.url)
    const imageId = searchParams.get('imageId')

    if (!imageId) {
      return NextResponse.json(
        { error: 'imageId query parameter is required' },
        { status: 400 }
      )
    }

    // Verify image belongs to product
    const image = await prisma.productImage.findFirst({
      where: { id: imageId, productId }
    })

    if (!image) {
      return NextResponse.json(
        { error: 'Image not found for this product' },
        { status: 404 }
      )
    }

    await prisma.productImage.delete({
      where: { id: imageId }
    })

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json(
      { error: 'Failed to delete image' },
      { status: 500 }
    )
  }
}
