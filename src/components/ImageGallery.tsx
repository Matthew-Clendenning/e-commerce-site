'use client'

import { useState, useRef, useCallback } from 'react'
import Image from 'next/image'
import styles from '../styles/ImageGallery.module.css'

type ImageType = {
  id: string
  url: string
  alt: string | null
}

type ImageGalleryProps = {
  images: ImageType[]
  productName: string
}

export default function ImageGallery({ images, productName }: ImageGalleryProps) {
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [isZooming, setIsZooming] = useState(false)
  const [zoomPosition, setZoomPosition] = useState({ x: 0, y: 0 })
  const imageContainerRef = useRef<HTMLDivElement>(null)

  const selectedImage = images[selectedIndex]

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!imageContainerRef.current) return

    const rect = imageContainerRef.current.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * 100
    const y = ((e.clientY - rect.top) / rect.height) * 100

    setZoomPosition({ x, y })
  }, [])

  const handleMouseEnter = () => {
    setIsZooming(true)
  }

  const handleMouseLeave = () => {
    setIsZooming(false)
  }

  const handleTouchMove = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    if (!imageContainerRef.current || !e.touches[0]) return

    const rect = imageContainerRef.current.getBoundingClientRect()
    const touch = e.touches[0]
    const x = ((touch.clientX - rect.left) / rect.width) * 100
    const y = ((touch.clientY - rect.top) / rect.height) * 100

    setZoomPosition({ x: Math.max(0, Math.min(100, x)), y: Math.max(0, Math.min(100, y)) })
    setIsZooming(true)
  }, [])

  const handleTouchEnd = () => {
    setIsZooming(false)
  }

  if (images.length === 0) {
    return (
      <div className={styles.container}>
        <div className={styles.mainImageWrapper}>
          <div className={styles.placeholder}>No Image Available</div>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <div className={styles.galleryWrapper}>
        {/* Main Image */}
        <div
          ref={imageContainerRef}
          className={styles.mainImageWrapper}
          onMouseMove={handleMouseMove}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <Image
            src={selectedImage.url}
            alt={selectedImage.alt || productName}
            fill
            sizes="(max-width: 768px) 100vw, 50vw"
            className={styles.mainImage}
            priority
          />
          {isZooming && (
            <div className={styles.zoomLens} style={{
              left: `${zoomPosition.x}%`,
              top: `${zoomPosition.y}%`,
            }} />
          )}
        </div>

        {/* Zoom Preview - Desktop Only */}
        {isZooming && (
          <div className={styles.zoomPreview}>
            <div
              className={styles.zoomImage}
              style={{
                backgroundImage: `url(${selectedImage.url})`,
                backgroundPosition: `${zoomPosition.x}% ${zoomPosition.y}%`,
              }}
            />
          </div>
        )}
      </div>

      {/* Thumbnails */}
      {images.length > 1 && (
        <div className={styles.thumbnails}>
          {images.map((image, index) => (
            <button
              key={image.id}
              className={`${styles.thumbnail} ${index === selectedIndex ? styles.thumbnailActive : ''}`}
              onClick={() => setSelectedIndex(index)}
              aria-label={`View image ${index + 1}`}
            >
              <Image
                src={image.url}
                alt={image.alt || `${productName} - Image ${index + 1}`}
                fill
                sizes="120px"
                className={styles.thumbnailImage}
              />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
