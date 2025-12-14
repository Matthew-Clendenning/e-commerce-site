'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import styles from './admin.module.css'

type Product = {
  id: string
  name: string
  slug: string
  description: string | null
  price: number
  imageUrl: string | null
  stock: number
  category: {
    id: string
    name: string
    slug: string
  }
}

export default function AdminPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState({
    name: '',
    price: '',
    stock: '',
    description: ''
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchProducts()
  }, [])

  const fetchProducts = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/products')
      const data = await response.json()
      setProducts(data)
    } catch (error) {
      console.error('Error fetching products:', error)
      alert('Failed to fetch products')
    } finally {
      setLoading(false)
    }
  }

  const startEdit = (product: Product) => {
    setEditingId(product.id)
    setEditForm({
      name: product.name,
      price: product.price.toString(),
      stock: product.stock.toString(),
      description: product.description || ''
    })
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditForm({ name: '', price: '', stock: '', description: '' })
  }

  const saveEdit = async (productId: string) => {
    setSaving(true)
    try {
        const response = await fetch(`/api/products/${productId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            name: editForm.name,
            price: parseFloat(editForm.price),
            stock: parseInt(editForm.stock),
            description: editForm.description
        })
        })

        const data = await response.json()

        if (!response.ok) {
        console.error('Update failed:', data)
        throw new Error(data.error || 'Failed to update product')
        }

        await fetchProducts()
        setEditingId(null)
        setEditForm({ name: '', price: '', stock: '', description: '' })
        alert('Product updated successfully!')
    } catch (error) {
        console.error('Error updating product:', error)
        alert(`Failed to update product: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
        setSaving(false)
    }
 }

  const getStockStatus = (stock: number) => {
    if (stock === 0) return 'out'
    if (stock <= 5) return 'low'
    return 'good'
  }

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Loading products...</div>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1>Product Management</h1>
        <p>Manage your inventory and product details</p>
      </header>

      <div className={styles.stats}>
        <div className={styles.stat}>
          <div className={styles.statValue}>{products.length}</div>
          <div className={styles.statLabel}>Total Products</div>
        </div>
        <div className={styles.stat}>
          <div className={styles.statValue}>
            {products.filter(p => p.stock <= 5 && p.stock > 0).length}
          </div>
          <div className={styles.statLabel}>Low Stock</div>
        </div>
        <div className={styles.stat}>
          <div className={styles.statValue}>
            {products.filter(p => p.stock === 0).length}
          </div>
          <div className={styles.statLabel}>Out of Stock</div>
        </div>
      </div>

      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Product</th>
              <th>Category</th>
              <th>Price</th>
              <th>Stock</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {products.map((product) => (
              <tr key={product.id}>
                <td>
                  <div className={styles.productCell}>
                    {product.imageUrl && (
                      <Image 
                        src={product.imageUrl} 
                        alt={product.name}
                        width={40}
                        height={40}
                        className={styles.productImage}
                      />
                    )}
                    <div>
                      {editingId === product.id ? (
                        <input
                          type="text"
                          value={editForm.name}
                          onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                          className={styles.input}
                        />
                      ) : (
                        <div className={styles.productName}>{product.name}</div>
                      )}
                      <div className={styles.productSlug}>{product.slug}</div>
                    </div>
                  </div>
                </td>
                <td>{product.category.name}</td>
                <td>
                  {editingId === product.id ? (
                    <input
                      type="number"
                      step="0.01"
                      value={editForm.price}
                      onChange={(e) => setEditForm({...editForm, price: e.target.value})}
                      className={styles.inputSmall}
                    />
                  ) : (
                    `$${product.price.toFixed(2)}`
                  )}
                </td>
                <td>
                  {editingId === product.id ? (
                    <input
                      type="number"
                      value={editForm.stock}
                      onChange={(e) => setEditForm({...editForm, stock: e.target.value})}
                      className={styles.inputSmall}
                    />
                  ) : (
                    product.stock
                  )}
                </td>
                <td>
                  <span className={`${styles.badge} ${styles[getStockStatus(product.stock)]}`}>
                    {getStockStatus(product.stock) === 'out' && 'Out'}
                    {getStockStatus(product.stock) === 'low' && 'Low'}
                    {getStockStatus(product.stock) === 'good' && 'Good'}
                  </span>
                </td>
                <td>
                  {editingId === product.id ? (
                    <div className={styles.actions}>
                      <button 
                        onClick={() => saveEdit(product.id)}
                        className={styles.saveButton}
                        disabled={saving}
                      >
                        {saving ? 'Saving...' : 'Save'}
                      </button>
                      <button 
                        onClick={cancelEdit}
                        className={styles.cancelButton}
                        disabled={saving}
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button 
                      onClick={() => startEdit(product)}
                      className={styles.editButton}
                    >
                      Edit
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}