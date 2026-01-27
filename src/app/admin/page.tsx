'use client'

import { useEffect, useState } from 'react'
import { useUser } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { toast } from 'sonner'
import styles from '../../styles/admin.module.css'
import ConfirmModal from '../../components/ConfirmModal'
import ProductImageManager from '../../components/ProductImageManager'

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

type ProductImage = {
  id: string
  url: string
  alt: string | null
  position: number
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
  images?: ProductImage[]
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

type Sale = {
  id: string
  name: string
  tagline: string
  discount: number
  startDate: string
  endDate: string
  isActive: boolean
  bannerUrl: string | null
  categories: Array<{
    id: string
    categoryId: string
    category: {
      id: string
      name: string
      slug: string
    }
  }>
}

type TabType = 'products' | 'categories' | 'orders' | 'sales'

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
    description: '',
    imageUrl: ''
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
  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean
    productId: string
    productName: string
  }>({ isOpen: false, productId: '', productName: '' })

  // Category editing state
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null)
  const [editCategoryForm, setEditCategoryForm] = useState({
    name: '',
    description: ''
  })
  const [deleteCategoryConfirm, setDeleteCategoryConfirm] = useState<{
    isOpen: boolean
    categoryId: string
    categoryName: string
    productCount: number
  }>({ isOpen: false, categoryId: '', categoryName: '', productCount: 0 })

  // Image management state
  const [imageModalProduct, setImageModalProduct] = useState<Product | null>(null)
  const [productImages, setProductImages] = useState<ProductImage[]>([])

  // Sales management state
  const [sales, setSales] = useState<Sale[]>([])
  const [showCreateSaleForm, setShowCreateSaleForm] = useState(false)
  const [createSaleForm, setCreateSaleForm] = useState({
    name: '',
    tagline: '',
    discount: '',
    startDate: '',
    endDate: '',
    bannerUrl: '',
    categoryIds: [] as string[]
  })
  const [showEditSaleModal, setShowEditSaleModal] = useState(false)
  const [editingSaleId, setEditingSaleId] = useState<string | null>(null)
  const [editSaleForm, setEditSaleForm] = useState({
    name: '',
    tagline: '',
    discount: '',
    startDate: '',
    endDate: '',
    isActive: true,
    bannerUrl: '',
    categoryIds: [] as string[]
  })
  const [deleteSaleConfirm, setDeleteSaleConfirm] = useState<{
    isOpen: boolean
    saleId: string
    saleName: string
  }>({ isOpen: false, saleId: '', saleName: '' })

  // Check admin access
  useEffect(() => {
    if (isLoaded && !user) {
      router.push('/sign-in')
    } else if (isLoaded && user) {
      const isAdmin = user.publicMetadata?.role === 'admin'
      
      if (!isAdmin) {
        toast.error('Access denied: Admin privileges required')
        router.push('/')
      }
    }
  }, [isLoaded, user, router])

  useEffect(() => {
    if (isLoaded && user?.publicMetadata?.role === 'admin') {
      fetchProducts()
      fetchCategories()
      fetchOrders()
      fetchSales()
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
      toast.success('Order status updated successfully!')
    } catch (error) {
      // Error updating order
      toast.error(`Failed to update order: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setSaving(false)
    }
  }

  const fetchOrders = async () => {
    try {
      const response = await fetch('/api/admin/orders')
      const data = await response.json()
      setOrders(data)
    } catch {
      // Error fetching orders
    }
  }

  const fetchProducts = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/products')
      const data = await response.json()
      setProducts(data)
    } catch {
      // Error fetching products
      toast.error('Failed to fetch products')
    } finally {
      setLoading(false)
    }
  }

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/categories')
      const data = await response.json()
      setCategories(data)
    } catch {
      // Error fetching categories
    }
  }

  const fetchSales = async () => {
    try {
      const response = await fetch('/api/sales')
      const data = await response.json()
      setSales(data)
    } catch {
      // Error fetching sales
    }
  }

  const createSale = async () => {
    if (!createSaleForm.name || !createSaleForm.discount || !createSaleForm.endDate || createSaleForm.categoryIds.length === 0) {
      toast.warning('Please fill in all required fields (Name, Discount, End Date, Categories)')
      return
    }

    setSaving(true)
    try {
      const response = await fetch('/api/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: createSaleForm.name,
          tagline: createSaleForm.tagline || '',
          discount: parseInt(createSaleForm.discount),
          startDate: createSaleForm.startDate || new Date().toISOString(),
          endDate: new Date(createSaleForm.endDate).toISOString(),
          bannerUrl: createSaleForm.bannerUrl || null,
          categoryIds: createSaleForm.categoryIds
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create sale')
      }

      await fetchSales()
      setShowCreateSaleForm(false)
      setCreateSaleForm({
        name: '',
        tagline: '',
        discount: '',
        startDate: '',
        endDate: '',
        bannerUrl: '',
        categoryIds: []
      })
      toast.success('Sale created successfully!')
    } catch (error) {
      toast.error(`Failed to create sale: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setSaving(false)
    }
  }

  const startEditSale = (sale: Sale) => {
    setEditingSaleId(sale.id)
    setEditSaleForm({
      name: sale.name,
      tagline: sale.tagline,
      discount: sale.discount.toString(),
      startDate: sale.startDate.slice(0, 16),
      endDate: sale.endDate.slice(0, 16),
      isActive: sale.isActive,
      bannerUrl: sale.bannerUrl || '',
      categoryIds: sale.categories.map(c => c.categoryId)
    })
    setShowEditSaleModal(true)
  }

  const cancelEditSale = () => {
    setEditingSaleId(null)
    setShowEditSaleModal(false)
    setEditSaleForm({
      name: '',
      tagline: '',
      discount: '',
      startDate: '',
      endDate: '',
      isActive: true,
      bannerUrl: '',
      categoryIds: []
    })
  }

  const saveEditSale = async (saleId: string) => {
    if (!editSaleForm.name || !editSaleForm.discount || !editSaleForm.endDate) {
      toast.warning('Please fill in all required fields')
      return
    }

    setSaving(true)
    try {
      const response = await fetch(`/api/sales/${saleId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editSaleForm.name,
          tagline: editSaleForm.tagline,
          discount: parseInt(editSaleForm.discount),
          startDate: new Date(editSaleForm.startDate).toISOString(),
          endDate: new Date(editSaleForm.endDate).toISOString(),
          isActive: editSaleForm.isActive,
          bannerUrl: editSaleForm.bannerUrl || null,
          categoryIds: editSaleForm.categoryIds
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update sale')
      }

      await fetchSales()
      cancelEditSale()
      toast.success('Sale updated successfully!')
    } catch (error) {
      toast.error(`Failed to update sale: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setSaving(false)
    }
  }

  const openDeleteSaleConfirm = (saleId: string, saleName: string) => {
    setDeleteSaleConfirm({ isOpen: true, saleId, saleName })
  }

  const closeDeleteSaleConfirm = () => {
    setDeleteSaleConfirm({ isOpen: false, saleId: '', saleName: '' })
  }

  const confirmDeleteSale = async () => {
    const { saleId } = deleteSaleConfirm

    setSaving(true)
    try {
      const response = await fetch(`/api/sales/${saleId}`, {
        method: 'DELETE'
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete sale')
      }

      closeDeleteSaleConfirm()
      await fetchSales()
      toast.success('Sale deleted successfully!')
    } catch (error) {
      toast.error(`Failed to delete sale: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setSaving(false)
    }
  }

  const toggleSaleCategory = (categoryId: string, isCreate: boolean) => {
    if (isCreate) {
      setCreateSaleForm(prev => ({
        ...prev,
        categoryIds: prev.categoryIds.includes(categoryId)
          ? prev.categoryIds.filter(id => id !== categoryId)
          : [...prev.categoryIds, categoryId]
      }))
    } else {
      setEditSaleForm(prev => ({
        ...prev,
        categoryIds: prev.categoryIds.includes(categoryId)
          ? prev.categoryIds.filter(id => id !== categoryId)
          : [...prev.categoryIds, categoryId]
      }))
    }
  }

  const getSaleStatus = (sale: Sale) => {
    const now = new Date()
    const start = new Date(sale.startDate)
    const end = new Date(sale.endDate)

    if (!sale.isActive) return 'inactive'
    if (now < start) return 'scheduled'
    if (now > end) return 'expired'
    return 'active'
  }

  const startEdit = (product: Product) => {
    setEditingId(product.id)
    setEditForm({
      name: product.name,
      price: product.price.toString(),
      stock: product.stock.toString(),
      description: product.description || '',
      imageUrl: product.imageUrl || ''
    })
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditForm({ name: '', price: '', stock: '', description: '', imageUrl: '' })
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
          description: editForm.description,
          imageUrl: editForm.imageUrl || null
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update product')
      }

      await fetchProducts()
      setEditingId(null)
      setEditForm({ name: '', price: '', stock: '', description: '', imageUrl: '' })
      toast.success('Product updated successfully!')
    } catch (error) {
      // Error updating product
      toast.error(`Failed to update product: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setSaving(false)
    }
  }

  // Open delete confirmation modal
  const openDeleteConfirm = (productId: string, productName: string) => {
    setDeleteConfirm({ isOpen: true, productId, productName })
  }

  // Close delete confirmation modal
  const closeDeleteConfirm = () => {
    setDeleteConfirm({ isOpen: false, productId: '', productName: '' })
  }

  // Execute the delete after confirmation
  const confirmDelete = async () => {
    const { productId } = deleteConfirm

    setSaving(true)
    try {
      const response = await fetch(`/api/products/${productId}`, {
        method: 'DELETE'
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete product')
      }

      closeDeleteConfirm()
      await fetchProducts()
      toast.success('Product deleted successfully!')
    } catch (error) {
      // Error deleting product
      toast.error(`Failed to delete product: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setSaving(false)
    }
  }

  const createProduct = async () => {
    if (!createForm.name || !createForm.price || !createForm.categoryId) {
      toast.warning('Please fill in all required fields (Name, Price, Category)')
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
      toast.success('Product created successfully!')
    } catch (error) {
      // Error creating product
      toast.error(`Failed to create product: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setSaving(false)
    }
  }

  const createCategory = async () => {
    if (!createCategoryForm.name) {
      toast.warning('Please enter a category name')
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
      toast.success('Category created successfully!')
    } catch (error) {
      // Error creating category
      toast.error(`Failed to create category: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setSaving(false)
    }
  }

  const getStockStatus = (stock: number) => {
    if (stock === 0) return 'out'
    if (stock <= 5) return 'low'
    return 'good'
  }

  // Fetch product images and open modal
  const openImageModal = async (product: Product) => {
    setImageModalProduct(product)
    try {
      const response = await fetch(`/api/products/${product.id}/images`)
      const data = await response.json()
      setProductImages(data)
    } catch {
      toast.error('Failed to load product images')
      setProductImages([])
    }
  }

  const closeImageModal = () => {
    setImageModalProduct(null)
    setProductImages([])
  }

  const handleImagesChange = (newImages: ProductImage[]) => {
    setProductImages(newImages)
  }

  // Category editing functions
  const startEditCategory = (category: Category) => {
    setEditingCategoryId(category.id)
    setEditCategoryForm({
      name: category.name,
      description: category.description || ''
    })
  }

  const cancelEditCategory = () => {
    setEditingCategoryId(null)
    setEditCategoryForm({ name: '', description: '' })
  }

  const saveEditCategory = async (categoryId: string) => {
    if (!editCategoryForm.name) {
      toast.warning('Category name is required')
      return
    }

    setSaving(true)
    try {
      const response = await fetch(`/api/categories/${categoryId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editCategoryForm.name,
          description: editCategoryForm.description || null
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update category')
      }

      await fetchCategories()
      setEditingCategoryId(null)
      setEditCategoryForm({ name: '', description: '' })
      toast.success('Category updated successfully!')
    } catch (error) {
      toast.error(`Failed to update category: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setSaving(false)
    }
  }

  const openDeleteCategoryConfirm = (category: Category) => {
    setDeleteCategoryConfirm({
      isOpen: true,
      categoryId: category.id,
      categoryName: category.name,
      productCount: category._count?.products || 0
    })
  }

  const closeDeleteCategoryConfirm = () => {
    setDeleteCategoryConfirm({ isOpen: false, categoryId: '', categoryName: '', productCount: 0 })
  }

  const confirmDeleteCategory = async () => {
    const { categoryId } = deleteCategoryConfirm

    setSaving(true)
    try {
      const response = await fetch(`/api/categories/${categoryId}`, {
        method: 'DELETE'
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete category')
      }

      closeDeleteCategoryConfirm()
      await fetchCategories()
      toast.success('Category deleted successfully!')
    } catch (error) {
      toast.error(`Failed to delete category: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setSaving(false)
    }
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
        <button
          className={activeTab === 'sales' ? styles.tabActive : styles.tab}
          onClick={() => setActiveTab('sales')}
        >
          Sales ({sales.length})
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
                            <>
                              <input
                                type="text"
                                value={editForm.name}
                                onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                                className={styles.input}
                                placeholder="Product name"
                              />
                              <input
                                type="text"
                                value={editForm.imageUrl}
                                onChange={(e) => setEditForm({...editForm, imageUrl: e.target.value})}
                                className={styles.input}
                                placeholder="Image URL (e.g., /images/watch.jpg)"
                                style={{ marginTop: '5px', fontSize: '12px' }}
                              />
                            </>
                          ) : (
                            <div className={styles.productName}>{product.name}</div>
                          )}
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
                            onClick={() => openDeleteConfirm(product.id, product.name)}
                            className={styles.deleteButton}
                            disabled={saving}
                          >
                            Delete
                          </button>
                        </div>
                      ) : (
                        <div className={styles.actions}>
                          <button
                            onClick={() => startEdit(product)}
                            className={styles.editButton}
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => openImageModal(product)}
                            className={styles.imagesButton}
                          >
                            Images
                          </button>
                        </div>
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
                {editingCategoryId === category.id ? (
                  <>
                    <div className={styles.formGroup}>
                      <label>Category Name *</label>
                      <input
                        type="text"
                        value={editCategoryForm.name}
                        onChange={(e) => setEditCategoryForm({...editCategoryForm, name: e.target.value})}
                        className={styles.formInput}
                      />
                    </div>
                    <div className={styles.formGroup}>
                      <label>Description</label>
                      <textarea
                        value={editCategoryForm.description}
                        onChange={(e) => setEditCategoryForm({...editCategoryForm, description: e.target.value})}
                        className={styles.formTextarea}
                        rows={2}
                      />
                    </div>
                    <div className={styles.actions} style={{ marginTop: '10px' }}>
                      <button
                        onClick={() => saveEditCategory(category.id)}
                        className={styles.saveButton}
                        disabled={saving}
                      >
                        {saving ? 'Saving...' : 'Save'}
                      </button>
                      <button
                        onClick={cancelEditCategory}
                        className={styles.cancelButton}
                        disabled={saving}
                      >
                        Cancel
                      </button>
                    </div>
                  </>
                ) : (
                  <>
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
                    <div className={styles.actions} style={{ marginTop: '15px' }}>
                      <button
                        onClick={() => startEditCategory(category)}
                        className={styles.editButton}
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => openDeleteCategoryConfirm(category)}
                        className={styles.deleteButton}
                      >
                        Delete
                      </button>
                    </div>
                  </>
                )}
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

      {activeTab === 'sales' && (
        <>
          <div className={styles.sectionHeader}>
            <h2>Sales Management</h2>
            <button
              onClick={() => setShowCreateSaleForm(true)}
              className={styles.createButton}
            >
              + Create New Sale
            </button>
          </div>

          {showCreateSaleForm && (
            <div className={styles.modal}>
              <div className={styles.modalContent} style={{ maxWidth: '600px' }}>
                <div className={styles.modalHeader}>
                  <h2>Create New Sale</h2>
                  <button
                    onClick={() => setShowCreateSaleForm(false)}
                    className={styles.closeButton}
                  >
                    ✕
                  </button>
                </div>

                <div className={styles.form}>
                  <div className={styles.formGroup}>
                    <label>Sale Name *</label>
                    <input
                      type="text"
                      value={createSaleForm.name}
                      onChange={(e) => setCreateSaleForm({ ...createSaleForm, name: e.target.value })}
                      placeholder="e.g., Winter Sale"
                      className={styles.formInput}
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label>Tagline</label>
                    <input
                      type="text"
                      value={createSaleForm.tagline}
                      onChange={(e) => setCreateSaleForm({ ...createSaleForm, tagline: e.target.value })}
                      placeholder="e.g., THE TEXTURE & COLOR OF THE SEASON"
                      className={styles.formInput}
                    />
                  </div>

                  <div className={styles.formRow}>
                    <div className={styles.formGroup}>
                      <label>Discount (%) *</label>
                      <input
                        type="number"
                        min="1"
                        max="100"
                        value={createSaleForm.discount}
                        onChange={(e) => setCreateSaleForm({ ...createSaleForm, discount: e.target.value })}
                        placeholder="25"
                        className={styles.formInput}
                      />
                    </div>
                    <div className={styles.formGroup}>
                      <label>End Date *</label>
                      <input
                        type="datetime-local"
                        value={createSaleForm.endDate}
                        onChange={(e) => setCreateSaleForm({ ...createSaleForm, endDate: e.target.value })}
                        className={styles.formInput}
                      />
                    </div>
                  </div>

                  <div className={styles.formGroup}>
                    <label>Start Date (optional, defaults to now)</label>
                    <input
                      type="datetime-local"
                      value={createSaleForm.startDate}
                      onChange={(e) => setCreateSaleForm({ ...createSaleForm, startDate: e.target.value })}
                      className={styles.formInput}
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label>Banner Image URL (optional)</label>
                    <input
                      type="text"
                      value={createSaleForm.bannerUrl}
                      onChange={(e) => setCreateSaleForm({ ...createSaleForm, bannerUrl: e.target.value })}
                      placeholder="https://..."
                      className={styles.formInput}
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label>Categories *</label>
                    <div className={styles.categoryCheckboxes}>
                      {categories.map((category) => (
                        <label key={category.id} className={styles.checkboxLabel}>
                          <input
                            type="checkbox"
                            checked={createSaleForm.categoryIds.includes(category.id)}
                            onChange={() => toggleSaleCategory(category.id, true)}
                          />
                          {category.name}
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className={styles.formActions}>
                    <button
                      onClick={() => setShowCreateSaleForm(false)}
                      className={styles.cancelButtonLarge}
                      disabled={saving}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={createSale}
                      className={styles.saveButtonLarge}
                      disabled={saving}
                    >
                      {saving ? 'Creating...' : 'Create Sale'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className={styles.stats}>
            <div className={styles.stat}>
              <div className={styles.statValue}>{sales.length}</div>
              <div className={styles.statLabel}>Total Sales</div>
            </div>
            <div className={styles.stat}>
              <div className={styles.statValue}>
                {sales.filter(s => getSaleStatus(s) === 'active').length}
              </div>
              <div className={styles.statLabel}>Active</div>
            </div>
            <div className={styles.stat}>
              <div className={styles.statValue}>
                {sales.filter(s => getSaleStatus(s) === 'scheduled').length}
              </div>
              <div className={styles.statLabel}>Scheduled</div>
            </div>
            <div className={styles.stat}>
              <div className={styles.statValue}>
                {sales.filter(s => getSaleStatus(s) === 'expired' || getSaleStatus(s) === 'inactive').length}
              </div>
              <div className={styles.statLabel}>Inactive/Expired</div>
            </div>
          </div>

          <div className={styles.salesGrid}>
            {sales.map((sale) => (
              <div key={sale.id} className={styles.saleCard}>
                <div className={styles.saleHeader}>
                  <h3>{sale.name}</h3>
                  <span className={`${styles.badge} ${styles[getSaleStatus(sale)]}`}>
                    {getSaleStatus(sale).charAt(0).toUpperCase() + getSaleStatus(sale).slice(1)}
                  </span>
                </div>
                <p className={styles.saleTagline}>{sale.tagline || 'No tagline'}</p>
                <div className={styles.saleDiscount}>{sale.discount}% OFF</div>
                <div className={styles.saleMeta}>
                  <div>
                    <strong>Start:</strong> {new Date(sale.startDate).toLocaleDateString()}
                  </div>
                  <div>
                    <strong>End:</strong> {new Date(sale.endDate).toLocaleDateString()}
                  </div>
                </div>
                <div className={styles.saleCategories}>
                  <strong>Categories:</strong>{' '}
                  {sale.categories.map(c => c.category.name).join(', ') || 'None'}
                </div>
                <div className={styles.actions} style={{ marginTop: '15px' }}>
                  <button
                    onClick={() => startEditSale(sale)}
                    className={styles.editButton}
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => openDeleteSaleConfirm(sale.id, sale.name)}
                    className={styles.deleteButton}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Edit Sale Modal */}
          {showEditSaleModal && editingSaleId && (
            <div className={styles.modal}>
              <div className={styles.modalContent} style={{ maxWidth: '600px' }}>
                <div className={styles.modalHeader}>
                  <h2>Edit Sale</h2>
                  <button
                    onClick={cancelEditSale}
                    className={styles.closeButton}
                  >
                    ✕
                  </button>
                </div>

                <div className={styles.form}>
                  <div className={styles.formGroup}>
                    <label>Sale Name *</label>
                    <input
                      type="text"
                      value={editSaleForm.name}
                      onChange={(e) => setEditSaleForm({ ...editSaleForm, name: e.target.value })}
                      className={styles.formInput}
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label>Tagline</label>
                    <input
                      type="text"
                      value={editSaleForm.tagline}
                      onChange={(e) => setEditSaleForm({ ...editSaleForm, tagline: e.target.value })}
                      className={styles.formInput}
                    />
                  </div>

                  <div className={styles.formRow}>
                    <div className={styles.formGroup}>
                      <label>Discount (%) *</label>
                      <input
                        type="number"
                        min="1"
                        max="100"
                        value={editSaleForm.discount}
                        onChange={(e) => setEditSaleForm({ ...editSaleForm, discount: e.target.value })}
                        className={styles.formInput}
                      />
                    </div>
                    <div className={styles.formGroup}>
                      <label>Active</label>
                      <select
                        value={editSaleForm.isActive ? 'true' : 'false'}
                        onChange={(e) => setEditSaleForm({ ...editSaleForm, isActive: e.target.value === 'true' })}
                        className={styles.formSelect}
                      >
                        <option value="true">Yes</option>
                        <option value="false">No</option>
                      </select>
                    </div>
                  </div>

                  <div className={styles.formRow}>
                    <div className={styles.formGroup}>
                      <label>Start Date</label>
                      <input
                        type="datetime-local"
                        value={editSaleForm.startDate}
                        onChange={(e) => setEditSaleForm({ ...editSaleForm, startDate: e.target.value })}
                        className={styles.formInput}
                      />
                    </div>
                    <div className={styles.formGroup}>
                      <label>End Date *</label>
                      <input
                        type="datetime-local"
                        value={editSaleForm.endDate}
                        onChange={(e) => setEditSaleForm({ ...editSaleForm, endDate: e.target.value })}
                        className={styles.formInput}
                      />
                    </div>
                  </div>

                  <div className={styles.formGroup}>
                    <label>Banner Image URL (optional)</label>
                    <input
                      type="text"
                      value={editSaleForm.bannerUrl}
                      onChange={(e) => setEditSaleForm({ ...editSaleForm, bannerUrl: e.target.value })}
                      placeholder="https://..."
                      className={styles.formInput}
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label>Categories *</label>
                    <div className={styles.categoryCheckboxes}>
                      {categories.map((category) => (
                        <label key={category.id} className={styles.checkboxLabel}>
                          <input
                            type="checkbox"
                            checked={editSaleForm.categoryIds.includes(category.id)}
                            onChange={() => toggleSaleCategory(category.id, false)}
                          />
                          {category.name}
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className={styles.formActions}>
                    <button
                      onClick={cancelEditSale}
                      className={styles.cancelButtonLarge}
                      disabled={saving}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => saveEditSale(editingSaleId)}
                      className={styles.saveButtonLarge}
                      disabled={saving}
                    >
                      {saving ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Delete Product Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteConfirm.isOpen}
        title="Delete Product"
        message={`Are you sure you want to delete "${deleteConfirm.productName}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        onConfirm={confirmDelete}
        onCancel={closeDeleteConfirm}
        isLoading={saving}
      />

      {/* Delete Category Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteCategoryConfirm.isOpen}
        title="Delete Category"
        message={
          deleteCategoryConfirm.productCount > 0
            ? `Cannot delete "${deleteCategoryConfirm.categoryName}" because it has ${deleteCategoryConfirm.productCount} product(s). Please move or delete the products first.`
            : `Are you sure you want to delete "${deleteCategoryConfirm.categoryName}"? This action cannot be undone.`
        }
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        onConfirm={confirmDeleteCategory}
        onCancel={closeDeleteCategoryConfirm}
        isLoading={saving}
        hideConfirm={deleteCategoryConfirm.productCount > 0}
      />

      {/* Delete Sale Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteSaleConfirm.isOpen}
        title="Delete Sale"
        message={`Are you sure you want to delete "${deleteSaleConfirm.saleName}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        onConfirm={confirmDeleteSale}
        onCancel={closeDeleteSaleConfirm}
        isLoading={saving}
      />

      {/* Product Images Modal */}
      {imageModalProduct && (
        <div className={styles.modal}>
          <div className={styles.modalContent} style={{ maxWidth: '600px' }}>
            <div className={styles.modalHeader}>
              <h2>Manage Images - {imageModalProduct.name}</h2>
              <button
                onClick={closeImageModal}
                className={styles.closeButton}
              >
                ✕
              </button>
            </div>

            <ProductImageManager
              productId={imageModalProduct.id}
              images={productImages}
              onImagesChange={handleImagesChange}
            />

            <div className={styles.formActions} style={{ marginTop: '20px' }}>
              <button
                onClick={closeImageModal}
                className={styles.saveButtonLarge}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}