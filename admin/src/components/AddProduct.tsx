import React, { useEffect, useMemo, useState } from 'react'
import supabase from '../lib/supabase'
import { Plus, Image, CheckCircle, AlertCircle, Loader2, IndianRupee, Package, Tag } from 'lucide-react'
import BulkImportPanel from './BulkImport'

type Collection = {
  id: string
  name: string
  slug: string
  image_url: string | null
  description: string | null
  // NEW FIELDS
  department_id: string | null
  image_object_path: string | null
}

type Department = {
  id: string
  name: string
}

const money = (n: number) => `₹${n.toLocaleString("en-IN")}`
const slugify = (s: string) =>
  s.toLowerCase().trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')

// Enhanced Image Upload Component (unchanged)
const ImageUpload: React.FC<{
  file: File | null
  onFileChange: (file: File | null) => void
  label: string
}> = ({ file, onFileChange, label }) => {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)

  useEffect(() => {
    if (file) {
      const url = URL.createObjectURL(file)
      setPreviewUrl(url)
      return () => URL.revokeObjectURL(url)
    } else {
      setPreviewUrl(null)
    }
  }, [file])

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const droppedFile = e.dataTransfer.files[0]
    if (droppedFile && droppedFile.type.startsWith('image/')) {
      onFileChange(droppedFile)
    }
  }

  return (
    <div className="space-y-3 ">
      <label className="text-sm font-medium text-gray-700">{label}</label>
      
      <div
        className={`border-2 border-dashed rounded-xl transition-all duration-200 ${
          dragOver 
            ? 'border-orange-400 bg-orange-50' 
            : 'border-gray-300 hover:border-gray-400'
        }`}
        onDrop={handleDrop}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
      >
        {previewUrl ? (
          <div className="p-4">
            <div className="flex items-center gap-4">
              <img
                src={previewUrl}
                alt="Preview"
                className="w-16 h-16 rounded-lg object-cover border"
              />
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">{file?.name}</p>
                <p className="text-xs text-gray-500">
                  {file && (file.size / 1024 > 1024
                    ? `${(file.size / 1024 / 1024).toFixed(1)} MB`
                    : `${Math.round(file.size / 1024)} KB`)}
                </p>
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
          <div className="text-center p-6">
            <Image className="w-8 h-8 text-gray-400 mx-auto mb-2" />
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

// New Collection Modal — UPDATED for department_id & image_object_path
const NewCollectionModal: React.FC<{
  open: boolean
  onClose: () => void
  onCreated: (c: Collection) => void
}> = ({ open, onClose, onCreated }) => {
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [desc, setDesc] = useState('')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  // NEW: departments
  const [departments, setDepartments] = useState<Department[]>([])
  const [departmentId, setDepartmentId] = useState<string>('') // optional

  useEffect(() => {
    if (open) {
      setName('')
      setSlug('')
      setDesc('')
      setImageFile(null)
      setErr(null)
      setDepartmentId('')
      // lazy-load departments when modal opens
      supabase.from('departments').select('id,name').order('name')
        .then(({ data, error }) => {
          if (!error) setDepartments(data || [])
        })
        .catch(() => {})
    }
  }, [open])

  useEffect(() => {
    if (!name) setSlug('')
    else setSlug(slugify(name))
  }, [name])

  // return both path and public URL so we can store image_object_path
  const uploadImage = async (): Promise<{ path: string, publicUrl: string } | null> => {
    if (!imageFile) return null
    const objectPath = `collections/${crypto.randomUUID()}_${imageFile.name}`
    const { error } = await supabase.storage.from('product-images').upload(objectPath, imageFile)
    if (error) throw error
    const { data: pub } = supabase.storage.from('product-images').getPublicUrl(objectPath)
    return { path: objectPath, publicUrl: pub.publicUrl }
  }

  const createCollection = async () => {
    setErr(null)
    setSaving(true)
    try {
      const uploaded = await uploadImage()

      const payload: any = {
        name,
        slug,
        description: desc || null,
        image_url: uploaded?.publicUrl ?? null,
        image_object_path: uploaded?.path ?? null,
        department_id: departmentId || null,
        // created_by is set by trigger set_created_by()
      }

      const { data, error } = await supabase
        .from('collections')
        .insert([payload])
        .select('id,name,slug,image_url,description,department_id,image_object_path')
        .single()

      if (error) throw error

      onCreated(data as Collection)
      onClose()
    } catch (e: any) {
      setErr(e.message || 'Failed to create collection')
    } finally {
      setSaving(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl bg-white border border-gray-200 overflow-hidden shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-orange-50 to-amber-50">
          <h3 className="text-lg font-semibold text-gray-900">Create New Collection</h3>
        </div>
        
        <div className="p-6 space-y-4">
          {err && (
            <div className="rounded-lg border border-red-200 bg-red-50 text-red-700 px-4 py-3 text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {err}
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Name *</label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full rounded-lg px-3 py-2 border border-gray-300 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition"
              placeholder="Eg. Daily Pooja"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Slug *</label>
            <input
              value={slug}
              onChange={e => setSlug(slugify(e.target.value))}
              className="w-full rounded-lg px-3 py-2 border border-gray-300 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition font-mono text-sm"
              placeholder="daily-pooja"
            />
          </div>

          {/* NEW: Department select (optional) */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Department (optional)</label>
            <select
              value={departmentId}
              onChange={e => setDepartmentId(e.target.value)}
              className="w-full rounded-lg px-3 py-2 border border-gray-300 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition"
            >
              <option value="">— None —</option>
              {departments.map(d => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Description</label>
            <textarea
              value={desc}
              onChange={e => setDesc(e.target.value)}
              className="w-full rounded-lg px-3 py-2 border border-gray-300 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition resize-none"
              rows={3}
              placeholder="Short description about this collection..."
            />
          </div>

          <ImageUpload
            file={imageFile}
            onFileChange={setImageFile}
            label="Collection Image (optional)"
          />

          <div className="flex gap-3 pt-4">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition font-medium"
            >
              Cancel
            </button>
            <button
              onClick={createCollection}
              disabled={saving || !name || !slug}
              className="flex-1 px-4 py-2 rounded-lg text-white font-semibold bg-orange-500 hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Collection'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

const AddProduct: React.FC = () => {
  // Product fields
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [desc, setDesc] = useState('')
  const [price, setPrice] = useState<number>(0)
  const [stock, setStock] = useState<number>(0)
  const [active, setActive] = useState<boolean>(true)
  const [imageFile, setImageFile] = useState<File | null>(null)

  // Collections
  const [collections, setCollections] = useState<Collection[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [openNewCollection, setOpenNewCollection] = useState(false)

  // UI state
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    if (!name) setSlug('')
    else setSlug(slugify(name))
  }, [name])

  // Load collections (include new fields)
  const loadCollections = async () => {
    const { data, error } = await supabase
      .from('collections')
      .select('id,name,slug,image_url,description,department_id,image_object_path')
      .order('name')
    if (error) throw error
    setCollections(data || [])
  }

  useEffect(() => {
    loadCollections().catch(console.error)
  }, [])

  const toggleSelected = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const uploadImage = async (): Promise<string | null> => {
    if (!imageFile) return null
    const fileName = `products/${crypto.randomUUID()}_${imageFile.name}`
    const { error } = await supabase.storage
      .from('product-images')
      .upload(fileName, imageFile)
    if (error) throw error
    const { data: pub } = supabase.storage.from('product-images').getPublicUrl(fileName)
    return pub.publicUrl
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErr(null)
    setSuccess(null)
    setSaving(true)
    
    try {
      const imageUrl = await uploadImage()

      const { data: product, error: pErr } = await supabase
        .from('products')
        .insert([{
          name,
          slug,
          description: desc || null,
          price_inr: price,
          stock,
          image_url: imageUrl,
          is_active: active
        }])
        .select('id')
        .single()
      
      if (pErr) throw pErr

      if (selectedIds.size) {
        const links = Array.from(selectedIds).map(cid => ({
          product_id: product!.id,
          collection_id: cid
        }))
        const { error: lErr } = await supabase
          .from('product_collections')
          .insert(links)
        if (lErr) throw lErr
      }

      setSuccess('Product added successfully!')
      
      // Reset form
      setName('')
      setSlug('')
      setDesc('')
      setPrice(0)
      setStock(0)
      setActive(true)
      setImageFile(null)
      setSelectedIds(new Set())
    } catch (e: any) {
      setErr(e.message || 'Failed to add product')
    } finally {
      setSaving(false)
    }
  }

  const canSave = name.trim() && slug.trim() && price >= 0 && stock >= 0

  return (
    <div className="min-h-screen bg-[#FAF7F2] py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-orange-600">Add New Product</h1>
          <p className="mt-2 text-orange-600">
            Add a new product to your store and assign it to collections
          </p>
        </div>

        <form onSubmit={handleSubmit} className="grid lg:grid-cols-3 gap-8">
          {/* Main form - 2/3 width */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-6">Product Information</h2>
              
              {err && (
                <div className="rounded-lg border border-red-200 bg-red-50 text-red-700 px-4 py-3 text-sm flex items-center gap-2 mb-6">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {err}
                </div>
              )}

              {success && (
                <div className="rounded-lg border border-green-200 bg-green-50 text-green-700 px-4 py-3 text-sm flex items-center gap-2 mb-6">
                  <CheckCircle className="w-4 h-4 flex-shrink-0" />
                  {success}
                </div>
              )}

              <div className="grid md:grid-cols-2 gap-4 mb-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Product Name *</label>
                  <input
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="Eg. Brass Aarti Diya"
                    className="w-full rounded-lg px-3 py-2 border border-gray-300 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Slug *</label>
                  <input
                    value={slug}
                    onChange={e => setSlug(slugify(e.target.value))}
                    placeholder="brass-aarti-diya"
                    className="w-full rounded-lg px-3 py-2 border border-gray-300 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition font-mono text-sm"
                  />
                </div>
              </div>

              <div className="space-y-2 mb-6">
                <label className="text-sm font-medium text-gray-700">Description</label>
                <textarea
                  value={desc}
                  onChange={e => setDesc(e.target.value)}
                  rows={3}
                  className="w-full rounded-lg px-3 py-2 border border-gray-300 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition resize-none"
                  placeholder="Describe the product features, materials, dimensions, etc."
                />
              </div>

              <div className="grid md:grid-cols-3 gap-4 mb-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Price (INR) *</label>
                  <div className="relative">
                    <IndianRupee className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      value={price}
                      onChange={e => setPrice(Number(e.target.value) || 0)}
                      className="w-full rounded-lg pl-9 pr-3 py-2 border border-gray-300 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Stock *</label>
                  <div className="relative">
                    <Package className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                    <input
                      type="number"
                      min={0}
                      value={stock}
                      onChange={e => setStock(Number(e.target.value) || 0)}
                      className="w-full rounded-lg pl-9 pr-3 py-2 border border-gray-300 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Status</label>
                  <div className="flex items-center h-10 px-3 border border-gray-300 rounded-lg bg-white">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <div className="relative">
                        <input
                          type="checkbox"
                          checked={active}
                          onChange={e => setActive(e.target.checked)}
                          className="sr-only"
                        />
                        <div className={`w-8 h-4 rounded-full transition ${
                          active ? 'bg-orange-500' : 'bg-gray-300'
                        }`} />
                        <div className={`absolute left-0.5 top-0.5 bg-white w-3 h-3 rounded-full transition transform ${
                          active ? 'translate-x-4' : 'translate-x-0'
                        }`} />
                      </div>
                      <span className="text-sm text-gray-700">
                        {active ? 'Active' : 'Inactive'}
                      </span>
                    </label>
                  </div>
                </div>
              </div>

              <ImageUpload
                file={imageFile}
                onFileChange={setImageFile}
                label="Product Image"
              />
            </div>

            {/* Submit Button */}
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={!canSave || saving}
                className="px-8 py-3 rounded-lg text-white font-semibold bg-orange-500 hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center gap-2"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Adding Product...
                  </>
                ) : (
                  'Add Product'
                )}
              </button>
            </div>
          </div>

          {/* Collections sidebar - 1/3 width */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden sticky top-8">
              <div className="px-4 py-4 border-b border-gray-200 bg-gradient-to-r from-orange-50 to-amber-50">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                    <Tag className="w-4 h-4" />
                    Collections
                  </h3>
                  <button
                    type="button"
                    onClick={() => setOpenNewCollection(true)}
                    className="p-2 text-orange-600 hover:bg-orange-100 rounded-lg transition"
                    title="New Collection"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-xs text-gray-600 mt-1">
                  {selectedIds.size} collection(s) selected
                </p>
              </div>

              <div className="p-4">
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {!collections.length ? (
                    <div className="text-center py-8 text-gray-500">
                      <Tag className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                      <p className="text-sm">No collections yet</p>
                    </div>
                  ) : (
                    collections.map(c => {
                      const selected = selectedIds.has(c.id)
                      return (
                        <label
                          key={c.id}
                          className={`flex items-center gap-3 rounded-lg p-3 border transition cursor-pointer ${
                            selected
                              ? 'border-orange-300 bg-orange-50'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={selected}
                            onChange={() => toggleSelected(c.id)}
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
            </div>
          </div>
        </form>
      </div>

      <NewCollectionModal
        open={openNewCollection}
        onClose={() => setOpenNewCollection(false)}
        onCreated={(c) => {
          setCollections(prev => [c, ...prev])
          setSelectedIds(prev => new Set(prev).add(c.id))
        }}
      />
    </div>
  )
}

export default AddProduct
