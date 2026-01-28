'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Search } from 'lucide-react'
import styles from '../styles/SearchBar.module.css'

export default function SearchBar() {
  const [isExpanded, setIsExpanded] = useState(false)
  const [query, setQuery] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  // Focus input when expanded
  useEffect(() => {
    if (isExpanded && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isExpanded])

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        if (!query) {
          setIsExpanded(false)
        }
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [query])

  // Close on Escape key
  useEffect(() => {
    function handleEscapeKey(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsExpanded(false)
        setQuery('')
      }
    }

    document.addEventListener('keydown', handleEscapeKey)
    return () => document.removeEventListener('keydown', handleEscapeKey)
  }, [])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (query.trim()) {
      router.push(`/products?search=${encodeURIComponent(query.trim())}`)
      setIsExpanded(false)
    }
  }

  const handleIconClick = () => {
    if (!isExpanded) {
      setIsExpanded(true)
    } else if (query.trim()) {
      handleSubmit({ preventDefault: () => {} } as React.FormEvent)
    }
  }

  return (
    <div
      ref={containerRef}
      className={`${styles.container} ${isExpanded ? styles.expanded : ''}`}
    >
      <button
        type="button"
        className={styles.iconButton}
        onClick={handleIconClick}
        aria-label="Search products"
      >
        <Search size={18} className={styles.icon} />
      </button>

      {isExpanded && (
        <form onSubmit={handleSubmit} className={styles.form}>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search products..."
            className={styles.input}
          />
        </form>
      )}
    </div>
  )
}
