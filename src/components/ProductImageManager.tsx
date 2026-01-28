'use client'

import { useState } from 'react'
import Image from 'next/image'
import { toast } from 'sonner'
import { X, GripVertical, Plus } from 'lucide-react'
import styles from '../styles/ProductImageManager.module.css'

type ProductImage = {
  id: string
  url: string
  alt: string | null
  position: number
}

type ProductImageManagerProps = {
  productId: string
  images: ProductImage[]
  onImagesChange: (images: ProductImage[]) => void
}

export default function ProductImageManager({
  productId,
  images,
  onImagesChange
}: ProductImageManagerProps) {
  const [newImageUrl, setNewImageUrl] = useState('')
  const [newImageAlt, setNewImageAlt] = useState('')
  const [loading, setLoading] = useState(false)
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)

  const addImage = async () => {
    if (!newImageUrl.trim()) {
      toast.warning('Please enter an image URL')
      return
    }

    if (!newImageUrl.startsWith('/') && !newImageUrl.startsWith('http')) {
      toast.error('Image URL must start with "/" or "http"')
      return
    }

    setLoading(true)
    try {
      const response = await fetch(`/api/products/${productId}/images`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: newImageUrl.trim(),
          alt: newImageAlt.trim() || null
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to add image')
      }

      onImagesChange([...images, data])
      setNewImageUrl('')
      setNewImageAlt('')
      toast.success('Image added successfully')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to add image')
    } finally {
      setLoading(false)
    }
  }

  const removeImage = async (imageId: string) => {
    setLoading(true)
    try {
      const response = await fetch(
        `/api/products/${productId}/images?imageId=${imageId}`,
        { method: 'DELETE' }
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to remove image')
      }

      onImagesChange(images.filter(img => img.id !== imageId))
      toast.success('Image removed')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to remove image')
    } finally {
      setLoading(false)
    }
  }

  const handleDragStart = (index: number) => {
    setDraggedIndex(index)
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    if (draggedIndex === null || draggedIndex === index) return

    const newImages = [...images]
    const [draggedItem] = newImages.splice(draggedIndex, 1)
    newImages.splice(index, 0, draggedItem)

    // Update positions
    const reorderedImages = newImages.map((img, i) => ({ ...img, position: i }))
    onImagesChange(reorderedImages)
    setDraggedIndex(index)
  }

  const handleDragEnd = async () => {
    if (draggedIndex === null) return

    setDraggedIndex(null)

    // Save new order to server
    try {
      const imageIds = images.map(img => img.id)
      const response = await fetch(`/api/products/${productId}/images`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageIds })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to reorder images')
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save order')
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h4 className={styles.title}>Product Images</h4>
        <span className={styles.count}>{images.length} image(s)</span>
      </div>

      {images.length > 0 && (
        <div className={styles.imageGrid}>
          {images.map((image, index) => (
            <div
              key={image.id}
              className={`${styles.imageItem} ${draggedIndex === index ? styles.dragging : ''}`}
              draggable
              onDragStart={() => handleDragStart(index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDragEnd={handleDragEnd}
            >
              <div className={styles.dragHandle}>
                <GripVertical size={16} />
              </div>
              <div className={styles.imageWrapper}>
                <Image
                  src={image.url}
                  alt={image.alt || 'Product image'}
                  fill
                  sizes="100px"
                  className={styles.image}
                />
                {index === 0 && (
                  <span className={styles.primaryBadge}>Primary</span>
                )}
              </div>
              <button
                type="button"
                onClick={() => removeImage(image.id)}
                className={styles.removeButton}
                disabled={loading}
                title="Remove image"
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className={styles.addSection}>
        <div className={styles.inputGroup}>
          <input
            type="text"
            value={newImageUrl}
            onChange={(e) => setNewImageUrl(e.target.value)}
            placeholder="Image URL (e.g., https://images.unsplash.com/...)"
            className={styles.input}
            disabled={loading}
          />
          <input
            type="text"
            value={newImageAlt}
            onChange={(e) => setNewImageAlt(e.target.value)}
            placeholder="Alt text (optional)"
            className={styles.inputSmall}
            disabled={loading}
          />
        </div>
        <button
          type="button"
          onClick={addImage}
          className={styles.addButton}
          disabled={loading || !newImageUrl.trim()}
        >
          <Plus size={16} />
          Add Image
        </button>
      </div>

      <p className={styles.helpText}>
        Drag images to reorder. The first image will be the primary image shown in product listings.
      </p>
    </div>
  )
}
