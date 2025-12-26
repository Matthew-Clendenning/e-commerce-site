'use client'

import { useEffect, useState } from 'react'
import { useUser } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import styles from './admin.module.css'

type Order = {
  id: string
  status: string
  total: number
  customerEmail: string
  customerName: string | null
  createdAt: string
  updatedAt: string
  user: {
    id: string
    email: string
    name: string | null
  }
  items: Array<{
    id: string
    productId: string
    name: string
    price: number
    quantity: number
    imageUrl: string | null
  }>
}

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

type TabType = 'products' | 'categories' | 'orders'

export default function AdminPage() {
  const { user, isLoaded } = useUser()
  const router = useRouter()

  const [orders, setOrders] = useState<Order[]>([])
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [showOrderModal, setShowOrderModal] = useState(false)
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

  // Check admin access
  useEffect(() => {
    if (isLoaded && !user) {
      router.push('/sign-in')
    } else if (isLoaded && user) {
      const isAdmin = user.publicMetadata?.role === 'admin'
      
      if (!isAdmin) {
        alert('Access denied: Admin privileges required')
        router.push('/')
      }
    }
  }, [isLoaded, user, router])

  useEffect(() => {
    if (isLoaded && user?.publicMetadata?.role === 'admin') {
      fetchProducts()
      fetchCategories()
      fetchOrders()
    }
  }, [isLoaded, user])

  // Show loading while checking permissions
  if (!isLoaded) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Checking permissions...</div>
      </div>
    )
  }

  // Double-check admin status
  const isAdmin = user?.publicMetadata?.role === 'admin'
  
  if (!isAdmin) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Redirecting...</div>
      </div>
    )
  }

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    setSaving(true)
    try {
      const response = await fetch(`/api/admin/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update order')
      }

      await fetchOrders()
      setSelectedOrder(null)
      setShowOrderModal(false)
      alert('Order status updated successfully!')
    } catch (error) {
      console.error('Error updating order:', error)
      alert(`Failed to update order: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setSaving(false)
    }
  }

  const fetchOrders = async () => {
    try {
      const response = await fetch('/api/admin/orders')
      const data = await response.json()
      setOrders(data)
    } catch (error) {
      console.error('Error fetching orders:', error)
    }
  }

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
        <button
          className={activeTab === 'orders' ? styles.tabActive : styles.tab}
          onClick={() => setActiveTab('orders')}
        >
          Orders ({orders.length})
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
      {activeTab === 'orders' && (
        <>
          <div className={styles.sectionHeader}>
            <h2>Order Management</h2>
          </div>

          <div className={styles.stats}>
            <div className={styles.stat}>
              <div className={styles.statValue}>{orders.length}</div>
              <div className={styles.statLabel}>Total Orders</div>
            </div>
            <div className={styles.stat}>
              <div className={styles.statValue}>
                {orders.filter(o => o.status === 'PROCESSING').length}
              </div>
              <div className={styles.statLabel}>Processing</div>
            </div>
            <div className={styles.stat}>
              <div className={styles.statValue}>
                {orders.filter(o => o.status === 'SHIPPED').length}
              </div>
              <div className={styles.statLabel}>Shipped</div>
            </div>
            <div className={styles.stat}>
              <div className={styles.statValue}>
                ${orders.reduce((sum, o) => sum + o.total, 0).toFixed(2)}
              </div>
              <div className={styles.statLabel}>Total Revenue</div>
            </div>
          </div>

          <div className={styles.tableContainer}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Order ID</th>
                  <th>Customer</th>
                  <th>Items</th>
                  <th>Total</th>
                  <th>Status</th>
                  <th>Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.id}>
                    <td>
                      <div className={styles.orderId}>
                        #{order.id.slice(-8)}
                      </div>
                    </td>
                    <td>
                      <div>
                        <div className={styles.customerName}>
                          {order.customerName || 'N/A'}
                        </div>
                        <div className={styles.customerEmail}>
                          {order.customerEmail}
                        </div>
                      </div>
                    </td>
                    <td>{order.items.length} items</td>
                    <td>${order.total.toFixed(2)}</td>
                    <td>
                      <span className={`${styles.badge} ${styles[order.status.toLowerCase()]}`}>
                        {order.status}
                      </span>
                    </td>
                    <td>
                      {new Date(order.createdAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </td>
                    <td>
                      <button
                        onClick={() => {
                          setSelectedOrder(order)
                          setShowOrderModal(true)
                        }}
                        className={styles.editButton}
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Order Details Modal */}
          {showOrderModal && selectedOrder && (
            <div className={styles.modal}>
              <div className={styles.modalContent} style={{ maxWidth: '800px' }}>
                <div className={styles.modalHeader}>
                  <h2>Order Details - #{selectedOrder.id.slice(-8)}</h2>
                  <button
                    onClick={() => {
                      setShowOrderModal(false)
                      setSelectedOrder(null)
                    }}
                    className={styles.closeButton}
                  >
                    ✕
                  </button>
                </div>

                <div className={styles.form}>
                  {/* Customer Info */}
                  <div className={styles.formGroup}>
                    <label>Customer Information</label>
                    <div style={{ background: '#f9fafb', padding: '15px', borderRadius: '8px' }}>
                      <p style={{ margin: '5px 0' }}><strong>Name:</strong> {selectedOrder.customerName || 'N/A'}</p>
                      <p style={{ margin: '5px 0' }}><strong>Email:</strong> {selectedOrder.customerEmail}</p>
                    </div>
                  </div>

                  {/* Order Items */}
                  <div className={styles.formGroup}>
                    <label>Order Items</label>
                    <div style={{ border: '1px solid #e5e7eb', borderRadius: '8px', overflow: 'hidden' }}>
                      {selectedOrder.items.map(item => (
                        <div
                          key={item.id}
                          style={{
                            display: 'flex',
                            gap: '15px',
                            padding: '15px',
                            borderBottom: '1px solid #f3f4f6',
                            alignItems: 'center'
                          }}
                        >
                          {item.imageUrl && (
                            <Image
                              src={item.imageUrl}
                              alt={item.name}
                              width={50}
                              height={50}
                              style={{ borderRadius: '6px', objectFit: 'cover' }}
                            />
                          )}
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 600 }}>{item.name}</div>
                            <div style={{ fontSize: '14px', color: '#6b7280' }}>
                              ${item.price.toFixed(2)} × {item.quantity}
                            </div>
                          </div>
                          <div style={{ fontWeight: 600 }}>
                            ${(item.price * item.quantity).toFixed(2)}
                          </div>
                        </div>
                      ))}
                      <div style={{ padding: '15px', background: '#f9fafb', fontWeight: 700, fontSize: '18px', textAlign: 'right' }}>
                        Total: ${selectedOrder.total.toFixed(2)}
                      </div>
                    </div>
                  </div>

                  {/* Order Status */}
                  <div className={styles.formGroup}>
                    <label>Update Order Status</label>
                    <select
                      value={selectedOrder.status}
                      onChange={(e) => updateOrderStatus(selectedOrder.id, e.target.value)}
                      className={styles.formSelect}
                      disabled={saving}
                    >
                      <option value="PENDING">Pending</option>
                      <option value="PROCESSING">Processing</option>
                      <option value="SHIPPED">Shipped</option>
                      <option value="DELIVERED">Delivered</option>
                      <option value="CANCELLED">Cancelled</option>
                      <option value="REFUNDED">Refunded</option>
                    </select>
                  </div>

                  {/* Dates */}
                  <div className={styles.formRow}>
                    <div className={styles.formGroup}>
                      <label>Order Date</label>
                      <input
                        type="text"
                        value={new Date(selectedOrder.createdAt).toLocaleString()}
                        disabled
                        className={styles.formInput}
                      />
                    </div>
                    <div className={styles.formGroup}>
                      <label>Last Updated</label>
                      <input
                        type="text"
                        value={new Date(selectedOrder.updatedAt).toLocaleString()}
                        disabled
                        className={styles.formInput}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}