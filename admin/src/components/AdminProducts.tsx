import React, { useEffect, useMemo, useState } from 'react'
import supabase from '../lib/supabase'

import { Search, Pencil, Trash2, Eye, X, Loader2, Image as ImageIcon, Package, IndianRupee, Box, ChevronLeft, ChevronRight } from 'lucide-react'

type Product = {
  id: string
  name: string
  slug: string
  description: string | null
  price_inr: number
  stock: number
  image_url: string | null
  is_active: boolean
  created_at?: string
}

type Collection = {
  id: string
  name: string
  slug: string
}

const money = (n: number) => `₹${n.toLocaleString('en-IN')}`

/** ---------- Enhanced Image Upload Component ---------- */
const ImageUpload: React.FC<{
  file: File | null
  currentUrl: string | null
  onFileChange: (file: File | null) => void
  label: string
}> = ({ file, currentUrl, onFileChange, label }) => {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)

  useEffect(() => {
    if (file) {
      const url = URL.createObjectURL(file)
      setPreviewUrl(url)
      return () => URL.revokeObjectURL(url)
    } else {
      setPreviewUrl(currentUrl)
    }
  }, [file, currentUrl])

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const droppedFile = e.dataTransfer.files[0]
    if (droppedFile && droppedFile.type.startsWith('image/')) {
      onFileChange(droppedFile)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(true)
  }

  const handleDragLeave = () => {
    setDragOver(false)
  }

  return (
    <div className="space-y-3">
      <label className="text-sm font-medium text-gray-700">{label}</label>
      
      <div
        className={`border-2 border-dashed rounded-2xl transition-all duration-200 ${
          dragOver 
            ? 'border-orange-400 bg-orange-50' 
            : 'border-gray-300 hover:border-gray-400'
        }`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        {previewUrl ? (
          <div className="p-4">
            <div className="flex items-center gap-4">
              <img
                src={previewUrl}
                alt="Preview"
                className="w-20 h-20 rounded-lg object-cover border"
              />
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">{file?.name || 'Current Image'}</p>
                {file && (
                  <p className="text-xs text-gray-500">
                    {file.size / 1024 > 1024
                      ? `${(file.size / 1024 / 1024).toFixed(1)} MB`
                      : `${Math.round(file.size / 1024)} KB`}
                  </p>
                )}
                <button
                  type="button"
                  onClick={() => onFileChange(null)}
                  className="mt-2 text-sm text-red-600 hover:text-red-700"
                >
                  Remove
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center p-8">
            <div className="mx-auto w-12 h-12 text-gray-400 mb-3">
              <ImageIcon className="w-12 h-12 mx-auto" />
            </div>
            <div className="space-y-1">
              <p className="text-sm text-gray-600">
                <button
                  type="button"
                  className="text-orange-600 hover:text-orange-700 font-medium"
                  onClick={() => document.getElementById('file-input')?.click()}
                >
                  Click to upload
                </button>{' '}
                or drag and drop
              </p>
              <p className="text-xs text-gray-500">PNG, JPG, GIF up to 10MB</p>
            </div>
            <input
              id="file-input"
              type="file"
              accept="image/*"
              onChange={e => onFileChange(e.target.files?.[0] || null)}
              className="hidden"
            />
          </div>
        )}
      </div>
    </div>
  )
}

/** ---------- Delete Confirmation Modal ---------- */
const DeleteModal: React.FC<{
  open: boolean
  onClose: () => void
  product: Product | null
  onConfirm: () => void
  loading: boolean
}> = ({ open, onClose, product, onConfirm, loading }) => {
  if (!open || !product) return null

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl bg-white border border-gray-200 overflow-hidden shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="p-6">
          <div className="flex items-center gap-3 text-red-600 mb-4">
            <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
              <Trash2 className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-semibold">Delete Product</h3>
          </div>
          
          <p className="text-gray-600 mb-2">
            Are you sure you want to delete <strong>"{product.name}"</strong>?
          </p>
          <p className="text-sm text-gray-500 mb-6">
            This action cannot be undone. All product data and collection associations will be permanently removed.
          </p>

          <div className="flex gap-3">
            <button
              onClick={onClose}
              disabled={loading}
              className="flex-1 px-4 py-3 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-50 transition font-medium disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={loading}
              className="flex-1 px-4 py-3 rounded-xl text-white font-semibold bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4" />
                  Delete
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

/** ---------- Enhanced Editor Modal ---------- */
const EditorModal: React.FC<{
  open: boolean
  onClose: () => void
  product: Product | null
  onSaved: () => void
  mode?: 'view' | 'edit'
}> = ({ open, onClose, product, onSaved, mode = 'edit' }) => {
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [desc, setDesc] = useState<string>('')
  const [price, setPrice] = useState<number>(0)
  const [stock, setStock] = useState<number>(0)
  const [active, setActive] = useState<boolean>(true)
  const [img, setImg] = useState<File | null>(null)
  const [imgUrl, setImgUrl] = useState<string | null>(null)

  const [allCollections, setAllCollections] = useState<Collection[]>([])
  const [selectedCols, setSelectedCols] = useState<Set<string>>(new Set())

  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const isView = mode === 'view'

  // Load existing data + collections
  useEffect(() => {
    if (!open || !product) return
    
    setName(product.name)
    setSlug(product.slug)
    setDesc(product.description ?? '')
    setPrice(product.price_inr)
    setStock(product.stock)
    setActive(product.is_active)
    setImg(null)
    setImgUrl(product.image_url ?? null)
    setErr(null)

    const loadData = async () => {
      try {
        // Load all collections
        const { data: cols, error: cErr } = await supabase
          .from('collections')
          .select('id,name,slug')
          .order('name')
        if (cErr) throw cErr
        setAllCollections(cols || [])

        // Load already linked collections for this product
        const { data: links, error: lErr } = await supabase
          .from('product_collections')
          .select('collection_id')
          .eq('product_id', product.id)
        if (lErr) throw lErr
        setSelectedCols(new Set((links || []).map(l => l.collection_id)))
      } catch (e: any) {
        setErr(e.message || 'Failed to load data')
      }
    }
    
    loadData()
  }, [open, product])

  const toggleCol = (id: string) => {
    if (isView) return
    setSelectedCols(prev => {
      const n = new Set(prev)
      if (n.has(id)) n.delete(id)
      else n.add(id)
      return n
    })
  }

  const uploadImageIfAny = async (): Promise<string | null> => {
    if (!img) return imgUrl || null
    const path = `products/${crypto.randomUUID()}_${img.name}`
    const { error } = await supabase.storage.from('product-images').upload(path, img)
    if (error) throw error
    const { data } = supabase.storage.from('product-images').getPublicUrl(path)
    return data.publicUrl
  }

  const onSave = async () => {
    if (!product || isView) return
    setSaving(true)
    setErr(null)
    
    try {
      const newUrl = await uploadImageIfAny()
      
      // Update product
      const { error: uErr } = await supabase
        .from('products')
        .update({
          name,
          slug,
          description: desc || null,
          price_inr: price,
          stock,
          is_active: active,
          image_url: newUrl
        })
        .eq('id', product.id)
      if (uErr) throw uErr

      // Relink collections: delete all then insert selected
      const { error: dErr } = await supabase
        .from('product_collections')
        .delete()
        .eq('product_id', product.id)
      if (dErr) throw dErr

      if (selectedCols.size) {
        const rows = Array.from(selectedCols).map(cid => ({ 
          product_id: product.id, 
          collection_id: cid 
        }))
        const { error: iErr } = await supabase.from('product_collections').insert(rows)
        if (iErr) throw iErr
      }

      onSaved()
      onClose()
    } catch (e: any) {
      setErr(e.message || 'Failed to save product')
    } finally {
      setSaving(false)
    }
  }

  if (!open || !product) return null

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-6xl rounded-2xl bg-white border border-gray-200 overflow-hidden shadow-xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-gray-100">
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
              isView ? 'bg-blue-100 text-blue-600' : 'bg-orange-100 text-orange-600'
            }`}>
              {isView ? <Eye className="w-4 h-4" /> : <Pencil className="w-4 h-4" />}
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                {isView ? 'View Product' : 'Edit Product'}
              </h2>
              <p className="text-sm text-gray-600">
                {isView ? 'Product details' : 'Update product information'}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="grid lg:grid-cols-3 gap-6 p-6">
            {/* Left Column - Product Details */}
            <div className="lg:col-span-2 space-y-6">
              {err && (
                <div className="rounded-lg border border-red-200 bg-red-50 text-red-700 px-4 py-3 text-sm flex items-center gap-2">
                  <X className="w-4 h-4 flex-shrink-0" />
                  {err}
                </div>
              )}

              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Product Name</label>
                  <input
                    value={name}
                    onChange={e => setName(e.target.value)}
                    disabled={isView}
                    className="w-full rounded-xl px-4 py-3 border border-gray-300 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition disabled:bg-gray-50 disabled:text-gray-500"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Slug</label>
                  <input
                    value={slug}
                    onChange={e => setSlug(e.target.value)}
                    disabled={isView}
                    className="w-full rounded-xl px-4 py-3 border border-gray-300 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition disabled:bg-gray-50 disabled:text-gray-500 font-mono text-sm"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Description</label>
                <textarea
                  rows={4}
                  value={desc}
                  onChange={e => setDesc(e.target.value)}
                  disabled={isView}
                  className="w-full rounded-xl px-4 py-3 border border-gray-300 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition resize-none disabled:bg-gray-50 disabled:text-gray-500"
                />
              </div>

              <div className="grid md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Price (INR)</label>
                  <div className="relative">
                    <IndianRupee className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      value={price}
                      onChange={e => setPrice(Number(e.target.value) || 0)}
                      disabled={isView}
                      className="w-full rounded-xl pl-10 pr-4 py-3 border border-gray-300 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition disabled:bg-gray-50 disabled:text-gray-500"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Stock</label>
                  <div className="relative">
                    <Package className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                    <input
                      type="number"
                      min={0}
                      value={stock}
                      onChange={e => setStock(Number(e.target.value) || 0)}
                      disabled={isView}
                      className="w-full rounded-xl pl-10 pr-4 py-3 border border-gray-300 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition disabled:bg-gray-50 disabled:text-gray-500"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Status</label>
                  <div className="flex items-center h-12 px-4 border border-gray-300 rounded-xl bg-white disabled:bg-gray-50">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <div className="relative">
                        <input
                          type="checkbox"
                          checked={active}
                          onChange={e => setActive(e.target.checked)}
                          disabled={isView}
                          className="sr-only"
                        />
                        <div className={`w-10 h-6 rounded-full transition ${
                          active ? 'bg-orange-500' : 'bg-gray-300'
                        } ${isView ? 'opacity-50' : ''}`} />
                        <div className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition transform ${
                          active ? 'translate-x-4' : 'translate-x-0'
                        }`} />
                      </div>
                      <span className="text-sm font-medium text-gray-700">
                        {active ? 'Active' : 'Inactive'}
                      </span>
                    </label>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column - Image & Collections */}
            <div className="space-y-6">
              {/* Image Upload */}
              <ImageUpload
                file={img}
                currentUrl={imgUrl}
                onFileChange={setImg}
                label="Product Image"
              />

              {/* Collections */}
              <div className="border border-gray-200 rounded-2xl overflow-hidden">
                <div className="px-4 py-3 bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
                  <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                    <Box className="w-4 h-4" />
                    Collections
                  </h3>
                  <p className="text-xs text-gray-600 mt-1">
                    {selectedCols.size} collection(s) selected
                  </p>
                </div>
                <div className="max-h-64 overflow-y-auto p-4 space-y-2">
                  {!allCollections.length ? (
                    <div className="text-center py-4 text-gray-500 text-sm">
                      No collections available
                    </div>
                  ) : (
                    allCollections.map(c => {
                      const selected = selectedCols.has(c.id)
                      return (
                        <label
                          key={c.id}
                          className={`flex items-center gap-3 rounded-xl px-3 py-2 border-2 transition cursor-pointer ${
                            selected
                              ? 'border-orange-300 bg-orange-50'
                              : 'border-gray-200 hover:border-gray-300'
                          } ${isView ? 'cursor-default' : ''}`}
                        >
                          <input
                            type="checkbox"
                            checked={selected}
                            onChange={() => toggleCol(c.id)}
                            disabled={isView}
                            className="rounded border-gray-300 text-orange-500 focus:ring-orange-500"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-gray-900 truncate">
                              {c.name}
                            </div>
                            <div className="text-xs text-gray-500 font-mono truncate">
                              {c.slug}
                            </div>
                          </div>
                        </label>
                      )
                    })
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              {!isView && (
                <div className="flex gap-3 pt-4">
                  <button
                    onClick={onClose}
                    className="flex-1 px-4 py-3 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-50 transition font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={onSave}
                    disabled={saving}
                    className="flex-1 px-4 py-3 rounded-xl text-white font-semibold bg-gradient-to-r from-orange-500 to-yellow-500 hover:from-orange-600 hover:to-yellow-600 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      'Save Changes'
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/** ---------- Pagination Component ---------- */
const Pagination: React.FC<{
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
}> = ({ currentPage, totalPages, onPageChange }) => {
  const pages = []
  const maxVisiblePages = 5
  
  let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2))
  let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1)
  
  if (endPage - startPage + 1 < maxVisiblePages) {
    startPage = Math.max(1, endPage - maxVisiblePages + 1)
  }

  for (let i = startPage; i <= endPage; i++) {
    pages.push(i)
  }

  return (
    <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-white">
      <div className="text-sm text-gray-700">
        Showing page {currentPage} of {totalPages}
      </div>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="p-2 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        
        {pages.map(page => (
          <button
            key={page}
            onClick={() => onPageChange(page)}
            className={`w-10 h-10 rounded-lg border text-sm font-medium transition ${
              currentPage === page
                ? 'border-orange-500 bg-orange-500 text-white'
                : 'border-gray-300 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {page}
          </button>
        ))}
        
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="p-2 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

/** ---------- Main Table Page ---------- */
const AdminProducts: React.FC = () => {
  const [rows, setRows] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(10)

  const [viewProduct, setViewProduct] = useState<Product | null>(null)
  const [editProduct, setEditProduct] = useState<Product | null>(null)
  const [deleteProduct, setDeleteProduct] = useState<Product | null>(null)
  const [deleting, setDeleting] = useState(false)

  const loadProducts = async () => {
    setLoading(true)
    setError(null)
    try {
      const { data, error } = await supabase
        .from('products')
        .select('id,name,slug,description,price_inr,stock,image_url,is_active,created_at')
        .order('created_at', { ascending: false })
      if (error) throw error
      setRows(data || [])
    } catch (e: any) {
      setError(e.message || 'Failed to load products')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadProducts()
  }, [])

  const filteredProducts = useMemo(() => {
    const k = q.trim().toLowerCase()
    if (!k) return rows
    return rows.filter(r =>
      r.name.toLowerCase().includes(k) ||
      r.slug.toLowerCase().includes(k)
    )
  }, [rows, q])

  // Pagination calculations
  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const paginatedProducts = filteredProducts.slice(startIndex, startIndex + itemsPerPage)

  const handleDelete = async () => {
    if (!deleteProduct) return
    
    setDeleting(true)
    try {
      // Remove links first
      const { error: e1 } = await supabase
        .from('product_collections')
        .delete()
        .eq('product_id', deleteProduct.id)
      if (e1) throw e1
      
      // Delete product
      const { error: e2 } = await supabase
        .from('products')
        .delete()
        .eq('id', deleteProduct.id)
      if (e2) throw e2
      
      setRows(prev => prev.filter(r => r.id !== deleteProduct.id))
      setDeleteProduct(null)
    } catch (e: any) {
      alert(e.message || 'Failed to delete product')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#FAF7F2]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-orange-600">Product Management</h1>
              <p className="mt-2 text-orange-600">
                Manage your products, inventory, and collections
              </p>
            </div>
            <div className="relative w-full lg:w-80">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
              <input
                value={q}
                onChange={e => setQ(e.target.value)}
                placeholder="Search products..."
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition"
              />
            </div>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-700 flex items-center gap-2">
            <X className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}

        {/* Products Table */}
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 bg-[#FAF7F2]">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-black">Products</h2>
              <div className="text-sm text-black">
                {filteredProducts.length} product(s)
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-orange-600 border-b border-orange-600">
                <tr className="text-left text-sm font-semibold text-white">
                  <th className="px-4 py-3 w-16">Image</th>
                  <th className="px-4 py-3 w-48">Product Name</th>
                  <th className="px-4 py-3 w-24">Price</th>
                  <th className="px-4 py-3 w-20">Stock</th>
                  <th className="px-4 py-3 w-24">Status</th>
                  <th className="px-4 py-3 w-32 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center">
                      <div className="flex items-center justify-center gap-2 text-gray-500">
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Loading products...
                      </div>
                    </td>
                  </tr>
                ) : paginatedProducts.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center">
                      <div className="text-gray-500">
                        {q ? 'No products found matching your search' : 'No products available'}
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginatedProducts.map(product => (
                    <tr key={product.id} className="hover:bg-gray-50 transition">
                      <td className="px-4 py-3">
                        <div className="w-12 h-12 rounded-lg bg-gray-100 border border-gray-200 overflow-hidden flex-shrink-0">
                          {product.image_url ? (
                            <img
                              src={product.image_url}
                              alt={product.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-400">
                              <ImageIcon className="w-5 h-5" />
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="min-w-0">
                          <div className="font-medium text-gray-900 truncate max-w-[180px]">
                            {product.name}
                          </div>
                          <div className="text-xs text-gray-500 font-mono truncate max-w-[180px] mt-1">
                            {product.slug}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-gray-900">
                          {money(product.price_inr)}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className={`font-medium ${
                            product.stock <= 0 ? 'text-red-600' : 'text-gray-900'
                          }`}>
                            {product.stock}
                          </span>
                          {product.stock <= 0 && (
                            <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {product.is_active ? (
                          <span className="px-2 py-1 text-xs rounded-full border border-emerald-300 text-emerald-700 bg-emerald-50 font-medium">
                            Active
                          </span>
                        ) : (
                          <span className="px-2 py-1 text-xs rounded-full border border-gray-300 text-gray-700 bg-gray-50 font-medium">
                            Hidden
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => setViewProduct(product)}
                            className="p-2 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 hover:text-gray-700 transition"
                            title="View"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setEditProduct(product)}
                            className="p-2 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 hover:text-gray-700 transition"
                            title="Edit"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDeleteProduct(product)}
                            className="p-2 rounded-lg border border-gray-300 text-red-600 hover:bg-red-50 hover:text-red-700 transition"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {filteredProducts.length > itemsPerPage && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          )}
        </div>
      </div>

      {/* Modals */}
      <EditorModal
        open={!!viewProduct}
        onClose={() => setViewProduct(null)}
        product={viewProduct}
        onSaved={loadProducts}
        mode="view"
      />

      <EditorModal
        open={!!editProduct}
        onClose={() => setEditProduct(null)}
        product={editProduct}
        onSaved={loadProducts}
        mode="edit"
      />

      <DeleteModal
        open={!!deleteProduct}
        onClose={() => setDeleteProduct(null)}
        product={deleteProduct}
        onConfirm={handleDelete}
        loading={deleting}
      />
    </div>
  )
}

export default AdminProducts