import DOMPurify from 'isomorphic-dompurify'

// Configure DOMPurify to strip all HTML tags (text only)
const sanitizeText = (text: string): string => {
  return DOMPurify.sanitize(text, {
    ALLOWED_TAGS: [], // No HTML tags allowed
    ALLOWED_ATTR: [], // No attributes allowed
  })
}

// Validate quantity for cart operations
export function validateQuantity(
  quantity: unknown, 
  maxStock: number,
  maxPerItem: number = 1000
): number {
  // Type validation
  if (typeof quantity !== 'number') {
    throw new Error('Quantity must be a number')
  }
  
  // Integer validation
  if (!Number.isInteger(quantity)) {
    throw new Error('Quantity must be a whole number')
  }
  
  // Finite validation
  if (!Number.isFinite(quantity)) {
    throw new Error('Quantity must be a valid number')
  }
  
  // Negative validation
  if (quantity < 0) {
    throw new Error('Quantity cannot be negative')
  }
  
  // Zero is valid (means remove item)
  if (quantity === 0) {
    return 0
  }
  
  // Maximum per-item limit
  if (quantity > maxPerItem) {
    throw new Error(`Quantity cannot exceed ${maxPerItem} per item`)
  }
  
  // Stock validation
  if (quantity > maxStock) {
    throw new Error(`Only ${maxStock} available in stock`)
  }
  
  return quantity
}

// Validate product ID format
export function validateProductId(id: unknown): string | null {
  if (typeof id !== 'string') return null
  if (id.length === 0 || id.length > 100) return null
  if (!/^[a-zA-Z0-9_-]+$/.test(id)) return null // Only alphanumeric, dash, underscore
  return id
}

export function validatePrice(price: unknown): number {
    const num = typeof price === 'number' ? price : parseFloat(String(price))

    if (isNaN(num) || !isFinite(num)) {
        throw new Error('Price must be a valid number')
    }

    if (num < 0) {
        throw new Error('Price cannot be negative')
    }

    if (num > 1000000) {
        throw new Error('Price cannot exceed $1,000,000')
    }

    // Round to 2 decimal places
    return Math.round(num * 100) / 100
}

// Validate stock
export function validateStock(stock: unknown): number {
    const num = typeof stock === 'number' ? stock : parseInt(String(stock))

    if (isNaN(num) || !isFinite(num)) {
        throw new Error("Stock must be a valid number")
    }

    if (num < 0) {
        throw new Error('Stock cannot be negative')
    }

    if (num > 100000) {
        throw new Error('Stock cannot exceed 100,000')
    }

    return Math.floor(num) // Ensure integer
}

// Validate product name
export function validateProductName(name: unknown): string {
    if (typeof name !== 'string') {
        throw new Error('Name must be a string')
    }

    const trimmed = name.trim()

    if (trimmed.length === 0) {
        throw new Error('Name cannot be empty')
    }

    if (trimmed.length > 200) {
        throw new Error('Name cannot exceed 200 characters')
    }

    // Sanitize using DOMPurify to remove XSS vectors
    const sanitized = sanitizeText(trimmed)

    return sanitized
}

// Validate description
export function validateDescription(description: unknown): string | null {
    if (description === null || description === undefined || description === '') {
        return null
    }

    if (typeof description !== 'string') {
    throw new Error('Description must be a string')
  }
  
  const trimmed = description.trim()
  
  if (trimmed.length > 5000) {
    throw new Error('Description cannot exceed 5000 characters')
  }

  // Sanitize using DOMPurify to remove XSS vectors
  const sanitized = sanitizeText(trimmed)

  return sanitized
}

// Validate UUID/ID format
export function validateId(id: unknown): string {
  if (typeof id !== 'string') {
    throw new Error('ID must be a string')
  }
  
  if (id.length === 0 || id.length > 100) {
    throw new Error('Invalid ID format')
  }
  
  // Allow alphanumeric, dash, underscore
  if (!/^[a-zA-Z0-9_-]+$/.test(id)) {
    throw new Error('Invalid ID format')
  }
  
  return id
}

// Validate category name
export function validateCategoryName(name: unknown): string {
  if (typeof name !== 'string') {
    throw new Error('Category name must be a string')
  }

  const trimmed = name.trim()

  if (trimmed.length === 0) {
    throw new Error('Category name cannot be empty')
  }

  if (trimmed.length < 2) {
    throw new Error('Category name must be at least 2 characters')
  }

  if (trimmed.length > 100) {
    throw new Error('Category name cannot exceed 100 characters')
  }

  // Sanitize using DOMPurify to remove XSS vectors
  const sanitized = sanitizeText(trimmed)

  return sanitized
}

// Validate category description
export function validateCategoryDescription(description: unknown): string | null {
  if (description === null || description === undefined || description === '') {
    return null
  }
  
  if (typeof description !== 'string') {
    throw new Error('Description must be a string')
  }
  
  const trimmed = description.trim()
  
  if (trimmed.length > 1000) {
    throw new Error('Category description cannot exceed 1000 characters')
  }

  // Sanitize using DOMPurify to remove XSS vectors
  const sanitized = sanitizeText(trimmed)

  return sanitized
}

// Validate slug format
export function validateSlug(slug: unknown): string {
  if (typeof slug !== 'string') {
    throw new Error('Slug must be a string')
  }

  if (slug.length === 0 || slug.length > 100) {
    throw new Error('Invalid slug length')
  }

  // Slug should only contain lowercase letters, numbers, and hyphens
  if (!/^[a-z0-9-]+$/.test(slug)) {
    throw new Error('Invalid slug format')
  }

  return slug
}

// Validate email format
export function validateEmail(email: unknown): email is string {
  if (typeof email !== 'string') return false
  if (email.length === 0 || email.length > 254) return false

  // Basic email regex pattern
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

// Validate guest cart items
export function validateGuestCartItems(
  items: unknown
): { id: string; quantity: number }[] | null {
  if (!Array.isArray(items)) return null
  if (items.length === 0) return null
  if (items.length > 100) return null // Reasonable max items

  const validatedItems: { id: string; quantity: number }[] = []

  for (const item of items) {
    if (typeof item !== 'object' || item === null) return null

    const { id, quantity } = item as { id?: unknown; quantity?: unknown }

    // Validate product ID
    if (typeof id !== 'string') return null
    if (id.length === 0 || id.length > 100) return null
    if (!/^[a-zA-Z0-9_-]+$/.test(id)) return null

    // Validate quantity
    if (typeof quantity !== 'number') return null
    if (!Number.isInteger(quantity)) return null
    if (quantity < 1 || quantity > 1000) return null

    validatedItems.push({ id, quantity })
  }

  return validatedItems
}

// Validate guest name (optional)
export function validateGuestName(name: unknown): string | null {
  if (name === null || name === undefined || name === '') {
    return null
  }

  if (typeof name !== 'string') {
    throw new Error('Name must be a string')
  }

  const trimmed = name.trim()

  if (trimmed.length > 100) {
    throw new Error('Name cannot exceed 100 characters')
  }

  // Sanitize using DOMPurify to remove XSS vectors
  const sanitized = sanitizeText(trimmed)

  return sanitized || null
}