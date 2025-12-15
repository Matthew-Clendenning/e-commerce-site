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

type Category = {
  id: string
  name: string
  slug: string
  description: string | null
  _count?: {
    products: number
  }
}

type TabType = 'products' | 'categories'

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<TabType>('products')
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState({
    name: '',
    price: '',
    stock: '',
    description: ''
  })
  const [saving, setSaving] = useState(false)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [showCreateCategoryForm, setShowCreateCategoryForm] = useState(false)
  const [createForm, setCreateForm] = useState({
    name: '',
    description: '',
    price: '',
    stock: '',
    categoryId: '',
    imageUrl: ''
  })
  const [createCategoryForm, setCreateCategoryForm] = useState({
    name: '',
    description: ''
  })

  useEffect(() => {
    fetchProducts()
    fetchCategories()
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

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/categories')
      const data = await response.json()
      setCategories(data)
    } catch (error) {
      console.error('Error fetching categories:', error)
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

  const deleteProduct = async (productId: string, productName: string) => {
    // Confirmation dialog
    const confirmed = window.confirm(
      `Are you sure you want to delete "${productName}"?\n\nThis action cannot be undone.`
    )

    if (!confirmed) {
      return
    }

    setSaving(true)
    try {
      const response = await fetch(`/api/products/${productId}`, {
        method: 'DELETE'
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete product')
      }

      await fetchProducts()
      alert('Product deleted successfully!')
    } catch (error) {
      console.error('Error deleting product:', error)
      alert(`Failed to delete product: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setSaving(false)
    }
  }

  const createProduct = async () => {
    if (!createForm.name || !createForm.price || !createForm.categoryId) {
      alert('Please fill in all required fields (Name, Price, Category)')
      return
    }

    setSaving(true)
    try {
      const response = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: createForm.name,
          description: createForm.description || null,
          price: parseFloat(createForm.price),
          stock: parseInt(createForm.stock) || 0,
          categoryId: createForm.categoryId,
          imageUrl: createForm.imageUrl || null
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create product')
      }

      await fetchProducts()
      setShowCreateForm(false)
      setCreateForm({
        name: '',
        description: '',
        price: '',
        stock: '',
        categoryId: '',
        imageUrl: ''
      })
      alert('Product created successfully!')
    } catch (error) {
      console.error('Error creating product:', error)
      alert(`Failed to create product: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setSaving(false)
    }
  }

  const createCategory = async () => {
    if (!createCategoryForm.name) {
      alert('Please enter a category name')
      return
    }

    setSaving(true)
    try {
      const response = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: createCategoryForm.name,
          description: createCategoryForm.description || null
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create category')
      }

      await fetchCategories()
      setShowCreateCategoryForm(false)
      setCreateCategoryForm({ name: '', description: '' })
      alert('Category created successfully!')
    } catch (error) {
      console.error('Error creating category:', error)
      alert(`Failed to create category: ${error instanceof Error ? error.message : 'Unknown error'}`)
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
        <div className={styles.loading}>Loading...</div>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div>
          <h1>Admin Dashboard</h1>
          <p>Manage your products and categories</p>
        </div>
      </header>

      <div className={styles.tabs}>
        <button
          className={activeTab === 'products' ? styles.tabActive : styles.tab}
          onClick={() => setActiveTab('products')}
        >
          Products ({products.length})
        </button>
        <button
          className={activeTab === 'categories' ? styles.tabActive : styles.tab}
          onClick={() => setActiveTab('categories')}
        >
          Categories ({categories.length})
        </button>
      </div>

      {activeTab === 'products' && (
        <>
          <div className={styles.sectionHeader}>
            <h2>Product Management</h2>
            <button 
              onClick={() => setShowCreateForm(true)}
              className={styles.createButton}
            >
              + Add New Product
            </button>
          </div>

          {showCreateForm && (
            <div className={styles.modal}>
              <div className={styles.modalContent}>
                <div className={styles.modalHeader}>
                  <h2>Create New Product</h2>
                  <button 
                    onClick={() => setShowCreateForm(false)}
                    className={styles.closeButton}
                  >
                    ✕
                  </button>
                </div>

                <div className={styles.form}>
                  <div className={styles.formGroup}>
                    <label>Product Name *</label>
                    <input
                      type="text"
                      value={createForm.name}
                      onChange={(e) => setCreateForm({...createForm, name: e.target.value})}
                      placeholder="e.g., Classic Leather Belt"
                      className={styles.formInput}
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label>Description</label>
                    <textarea
                      value={createForm.description}
                      onChange={(e) => setCreateForm({...createForm, description: e.target.value})}
                      placeholder="Product description..."
                      className={styles.formTextarea}
                      rows={3}
                    />
                  </div>

                  <div className={styles.formRow}>
                    <div className={styles.formGroup}>
                      <label>Price ($) *</label>
                      <input
                        type="number"
                        step="0.01"
                        value={createForm.price}
                        onChange={(e) => setCreateForm({...createForm, price: e.target.value})}
                        placeholder="29.99"
                        className={styles.formInput}
                      />
                    </div>

                    <div className={styles.formGroup}>
                      <label>Stock</label>
                      <input
                        type="number"
                        value={createForm.stock}
                        onChange={(e) => setCreateForm({...createForm, stock: e.target.value})}
                        placeholder="0"
                        className={styles.formInput}
                      />
                    </div>
                  </div>

                  <div className={styles.formGroup}>
                    <label>Category *</label>
                    <select
                      value={createForm.categoryId}
                      onChange={(e) => setCreateForm({...createForm, categoryId: e.target.value})}
                      className={styles.formSelect}
                    >
                      <option value="">Select a category</option>
                      {categories.map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className={styles.formGroup}>
                    <label>Image URL</label>
                    <input
                      type="text"
                      value={createForm.imageUrl}
                      onChange={(e) => setCreateForm({...createForm, imageUrl: e.target.value})}
                      placeholder="https://images.unsplash.com/..."
                      className={styles.formInput}
                    />
                    <small className={styles.helpText}>
                      Optional: Add an image URL (e.g., from Unsplash)
                    </small>
                  </div>

                  <div className={styles.formActions}>
                    <button 
                      onClick={() => setShowCreateForm(false)}
                      className={styles.cancelButtonLarge}
                      disabled={saving}
                    >
                      Cancel
                    </button>
                    <button 
                      onClick={createProduct}
                      className={styles.saveButtonLarge}
                      disabled={saving}
                    >
                      {saving ? 'Creating...' : 'Create Product'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

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
                            className={styles.productImage}
                            width={50}
                            height={50}
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
                          <button
                            onClick={() => deleteProduct(product.id, product.name)}
                            className={styles.deleteButton}
                            disabled={saving}
                          >
                            Delete
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
        </>
      )}

      {activeTab === 'categories' && (
        <>
          <div className={styles.sectionHeader}>
            <h2>Category Management</h2>
            <button 
              onClick={() => setShowCreateCategoryForm(true)}
              className={styles.createButton}
            >
              + Add New Category
            </button>
          </div>

          {showCreateCategoryForm && (
            <div className={styles.modal}>
              <div className={styles.modalContent}>
                <div className={styles.modalHeader}>
                  <h2>Create New Category</h2>
                  <button 
                    onClick={() => setShowCreateCategoryForm(false)}
                    className={styles.closeButton}
                  >
                    ✕
                  </button>
                </div>

                <div className={styles.form}>
                  <div className={styles.formGroup}>
                    <label>Category Name *</label>
                    <input
                      type="text"
                      value={createCategoryForm.name}
                      onChange={(e) => setCreateCategoryForm({...createCategoryForm, name: e.target.value})}
                      placeholder="e.g., Sunglasses"
                      className={styles.formInput}
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label>Description</label>
                    <textarea
                      value={createCategoryForm.description}
                      onChange={(e) => setCreateCategoryForm({...createCategoryForm, description: e.target.value})}
                      placeholder="Category description..."
                      className={styles.formTextarea}
                      rows={3}
                    />
                  </div>

                  <div className={styles.formActions}>
                    <button 
                      onClick={() => setShowCreateCategoryForm(false)}
                      className={styles.cancelButtonLarge}
                      disabled={saving}
                    >
                      Cancel
                    </button>
                    <button 
                      onClick={createCategory}
                      className={styles.saveButtonLarge}
                      disabled={saving}
                    >
                      {saving ? 'Creating...' : 'Create Category'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className={styles.categoryGrid}>
            {categories.map((category) => (
              <div key={category.id} className={styles.categoryCard}>
                <h3>{category.name}</h3>
                <p className={styles.categoryDesc}>
                  {category.description || 'No description'}
                </p>
                <div className={styles.categoryMeta}>
                  <span className={styles.categorySlug}>/{category.slug}</span>
                  <span className={styles.categoryCount}>
                    {category._count?.products || 0} products
                  </span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}