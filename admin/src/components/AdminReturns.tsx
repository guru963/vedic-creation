// src/components/AdminReturns.tsx
import React, { useEffect, useMemo, useState } from 'react'
import supabase from '../lib/supabase'
import {
  RefreshCw, CheckCircle2, XCircle, Truck, Loader2,
  ChevronDown, Search, Filter, Download, Eye, EyeOff,
  Receipt, Copy, Calendar, Package, CreditCard, MessageCircle, 
  Plus, Minus, User, Mail, Phone, AlertCircle,
  BarChart3, Clock, CheckCircle, X, ArrowUpDown
} from 'lucide-react'

/** ---------- Types ---------- */
type ReturnStatus =
  | 'requested'
  | 'approved'
  | 'rejected'
  | 'in_transit'
  | 'received'
  | 'refunded'
  | 'replacement_shipped'

type Resolution = 'refund' | 'replacement' | 'store_credit'

type ReturnEvent = {
  id: string
  return_id: string
  status: string
  note: string | null
  created_at: string
  created_by: string | null
}

type ReturnRow = {
  id: string
  rma_code: string | null
  user_id: string
  order_id: string
  status: ReturnStatus
  resolution: Resolution
  notes: string | null
  admin_notes: string | null
  created_at: string
  updated_at: string | null
  order: {
    id: string
    created_at: string
    delivered_at: string | null
    total_inr: number
    user_id: string
    address_id: string | null
  } | null
  user: {
    id: string
    full_name: string | null
    email: string | null
    phone: string | null
  } | null
  return_items: Array<{
    id: string
    order_item_id: string
    product_id: string
    qty: number
    reason_code: string | null
    condition_note: string | null
    evidence_images: string[] | null
    order_item?: {
      id: string
      qty: number
      price_inr: number
      name_snapshot?: string | null
      product?: {
        id: string
        name: string
        image_url: string | null
      } | null
    } | null
  }>
}

type FilterTab =
  | 'all'
  | 'requested'
  | 'approved'
  | 'rejected'
  | 'in_transit'
  | 'received'
  | 'refunded'
  | 'replacement_shipped'

type SortField = 'created_at' | 'status' | 'rma_code' | 'customer' | 'amount'
type SortOrder = 'asc' | 'desc'

/** ---------- Constants & Helpers ---------- */
const money = (n: number) => `₹${(n ?? 0).toLocaleString('en-IN')}`

const STATUS_CONFIG: Record<ReturnStatus, { label: string; color: string; icon: React.ReactNode; bgColor: string }> = {
  requested: {
    label: 'Pending Review',
    color: 'text-yellow-800 bg-yellow-100 border-yellow-200',
    bgColor: 'bg-yellow-500',
    icon: <Clock className="h-3 w-3" />
  },
  approved: {
    label: 'Approved',
    color: 'text-blue-800 bg-blue-100 border-blue-200',
    bgColor: 'bg-blue-500',
    icon: <CheckCircle2 className="h-3 w-3" />
  },
  rejected: {
    label: 'Rejected',
    color: 'text-red-800 bg-red-100 border-red-200',
    bgColor: 'bg-red-500',
    icon: <XCircle className="h-3 w-3" />
  },
  in_transit: {
    label: 'In Transit',
    color: 'text-purple-800 bg-purple-100 border-purple-200',
    bgColor: 'bg-purple-500',
    icon: <Truck className="h-3 w-3" />
  },
  received: {
    label: 'Received',
    color: 'text-amber-800 bg-amber-100 border-amber-200',
    bgColor: 'bg-amber-500',
    icon: <Package className="h-3 w-3" />
  },
  refunded: {
    label: 'Refunded',
    color: 'text-green-800 bg-green-100 border-green-200',
    bgColor: 'bg-green-500',
    icon: <CreditCard className="h-3 w-3" />
  },
  replacement_shipped: {
    label: 'Replacement Shipped',
    color: 'text-green-800 bg-green-100 border-green-200',
    bgColor: 'bg-green-500',
    icon: <RefreshCw className="h-3 w-3" />
  },
}

const NEXT_ACTIONS: Partial<
  Record<
    ReturnStatus,
    Array<{ to: ReturnStatus; label: string; icon: React.ReactNode; variant: 'primary' | 'success' | 'danger' | 'outline' }>
  >
> = {
  requested: [
    { to: 'approved', label: 'Approve Return', icon: <CheckCircle2 className="h-4 w-4" />, variant: 'success' },
    { to: 'rejected', label: 'Reject Return', icon: <XCircle className="h-4 w-4" />, variant: 'danger' },
  ],
  approved: [
    { to: 'in_transit', label: 'Mark Picked Up', icon: <Truck className="h-4 w-4" />, variant: 'primary' },
  ],
  in_transit: [
    { to: 'received', label: 'Mark Received', icon: <Package className="h-4 w-4" />, variant: 'primary' },
  ],
  received: [
    { to: 'refunded', label: 'Process Refund', icon: <CreditCard className="h-4 w-4" />, variant: 'success' },
    { to: 'replacement_shipped', label: 'Send Replacement', icon: <RefreshCw className="h-4 w-4" />, variant: 'success' },
  ],
}

const BUTTON_VARIANTS = {
  primary: 'bg-blue-600 text-white hover:bg-blue-700 border-blue-600 shadow-sm',
  success: 'bg-green-600 text-white hover:bg-green-700 border-green-600 shadow-sm',
  danger: 'bg-red-600 text-white hover:bg-red-700 border-red-600 shadow-sm',
  outline: 'bg-white text-gray-700 hover:bg-gray-50 border-gray-300'
}

/** ---------- Replacement Modal Types ---------- */
type ReplacementItemDraft = {
  return_item_id: string
  order_item_id: string
  product_id: string
  name: string
  unit_price: number
  max_qty: number
  qty: number
}

type ReplacementDraft = {
  openForReturnId: string | null
  items: ReplacementItemDraft[]
  shipping_inr: number
  note: string
  submitting: boolean
  error: string | null
}

/** ---------- Component ---------- */
export default function AdminReturns() {
  const [rows, setRows] = useState<ReturnRow[]>([])
  const [events, setEvents] = useState<Record<string, ReturnEvent[]>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [open, setOpen] = useState<Record<string, boolean>>({})
  const [saving, setSaving] = useState<Record<string, boolean>>({})
  const [filter, setFilter] = useState<FilterTab>('requested')
  const [searchQuery, setSearchQuery] = useState('')
  const [sortField, setSortField] = useState<SortField>('created_at')
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc')
  const [showFilters, setShowFilters] = useState(false)

  // Replacement modal state
  const [replModal, setReplModal] = useState<ReplacementDraft>({
    openForReturnId: null, items: [], shipping_inr: 0, note: '', submitting: false, error: null
  })

  // Toast notifications
  const [toast, setToast] = useState<{ type: 'success' | 'error' | 'info'; msg: string } | null>(null)
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 3000)
    return () => clearTimeout(t)
  }, [toast])

  // Load data
  const loadData = async () => {
    setLoading(true)
    setError(null)
    try {
      const { data: retData, error: retErr } = await supabase
        .from('returns')
        .select(`
          id, rma_code, user_id, order_id, status, resolution, notes, admin_notes, created_at, updated_at,
          order:orders (
            id, created_at, delivered_at, total_inr, user_id, address_id
          ),
          return_items (
            id, order_item_id, product_id, qty, reason_code, condition_note, evidence_images,
            order_item:order_items (
              id, qty, price_inr, name_snapshot,
              product:products ( id, name, image_url )
            )
          )
        `)
        .order('created_at', { ascending: false })

      if (retErr) throw retErr

      const list = (retData ?? []) as any as Omit<ReturnRow, 'user'>[]

      // Fetch user profiles
      const userIds = [...new Set(list.map(r => r.user_id).filter(Boolean))]
      let profilesById: Record<string, { id: string; full_name: string | null; email: string | null; phone: string | null }> = {}

      if (userIds.length) {
        const { data: profs, error: pErr } = await supabase
          .from('profiles')
          .select('user_id, full_name, email, phone')
          .in('user_id', userIds)
        if (pErr) throw pErr
        profilesById = Object.fromEntries(
          (profs ?? []).map(p => [
            p.user_id,
            { id: p.user_id, full_name: p.full_name ?? null, email: p.email ?? null, phone: p.phone ?? null },
          ])
        )
      }

      const withUsers: ReturnRow[] = list.map(r => ({
        ...(r as any),
        user: profilesById[r.user_id] ?? null,
      }))
      setRows(withUsers)

      // Load timeline events
      if (withUsers.length) {
        const ids = withUsers.map(r => r.id)
        const { data: ev } = await supabase
          .from('return_events')
          .select('*')
          .in('return_id', ids)
          .order('created_at', { ascending: true })
        if (ev) {
          const grouped: Record<string, ReturnEvent[]> = {}
          ev.forEach(e => { (grouped[e.return_id] ||= []).push(e as ReturnEvent) })
          setEvents(grouped)
        } else {
          setEvents({})
        }
      } else {
        setEvents({})
      }
    } catch (e: any) {
      console.error('[AdminReturns] load error:', e)
      setError(e?.message || 'Failed to load returns')
      setToast({ type: 'error', msg: 'Failed to load returns data' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadData() }, [])

  // Filter and sort data
  const filteredAndSorted = useMemo(() => {
    let list = rows
    
    // Apply filters
    if (filter !== 'all') {
      list = list.filter(r => r.status === filter)
    }
    
    // Apply search
    if (searchQuery.trim()) {
      const query = searchQuery.trim().toLowerCase()
      list = list.filter(r =>
        (r.rma_code || '').toLowerCase().includes(query) ||
        r.id.toLowerCase().includes(query) ||
        (r.order?.id || '').toLowerCase().includes(query) ||
        (r.notes || '').toLowerCase().includes(query) ||
        (r.admin_notes || '').toLowerCase().includes(query) ||
        (r.user?.full_name || '').toLowerCase().includes(query) ||
        (r.user?.email || '').toLowerCase().includes(query) ||
        (r.user?.phone || '').toLowerCase().includes(query) ||
        r.return_items.some(it =>
          (it.order_item?.product?.name || '').toLowerCase().includes(query) ||
          (it.order_item?.name_snapshot || '').toLowerCase().includes(query)
        )
      )
    }

    // Apply sorting
    list.sort((a, b) => {
      let aValue: any, bValue: any
      
      switch (sortField) {
        case 'created_at':
          aValue = new Date(a.created_at).getTime()
          bValue = new Date(b.created_at).getTime()
          break
        case 'status':
          aValue = a.status
          bValue = b.status
          break
        case 'rma_code':
          aValue = a.rma_code || a.id
          bValue = b.rma_code || b.id
          break
        case 'customer':
          aValue = a.user?.full_name || a.user?.email || ''
          bValue = b.user?.full_name || b.user?.email || ''
          break
        case 'amount':
          aValue = a.return_items.reduce((sum, it) => sum + (it.order_item?.price_inr || 0) * (it.qty || 0), 0)
          bValue = b.return_items.reduce((sum, it) => sum + (it.order_item?.price_inr || 0) * (it.qty || 0), 0)
          break
        default:
          return 0
      }

      if (sortOrder === 'desc') {
        return aValue < bValue ? 1 : aValue > bValue ? -1 : 0
      } else {
        return aValue > bValue ? 1 : aValue < bValue ? -1 : 0
      }
    })

    return list
  }, [rows, filter, searchQuery, sortField, sortOrder])

  // Status update handler
  const updateStatus = async (ret: ReturnRow, to: ReturnStatus, extraNote?: string) => {
    setSaving(s => ({ ...s, [ret.id]: true }))

    try {
      const { error: upErr } = await supabase
        .from('returns')
        .update({ status: to })
        .eq('id', ret.id)

      if (upErr) throw upErr

      // Update UI optimistically
      setRows(prev => prev.map(r => (r.id === ret.id ? { ...r, status: to } : r)))

      // Add timeline event
      await supabase
        .from('return_events')
        .insert([{
          return_id: ret.id,
          status: to,
          note: extraNote || null
        }])

      // Refresh events
      const { data: ev } = await supabase
        .from('return_events')
        .select('*')
        .eq('return_id', ret.id)
        .order('created_at', { ascending: true })
      if (ev) setEvents(prev => ({ ...prev, [ret.id]: ev as ReturnEvent[] }))

      setToast({ type: 'success', msg: `Return ${to.replace('_', ' ')} successfully` })
    } catch (e: any) {
      console.error('[updateStatus] error:', e)
      setToast({ type: 'error', msg: e?.message || 'Failed to update status' })
    } finally {
      setSaving(s => ({ ...s, [ret.id]: false }))
    }
  }

  // Admin notes handler
  const saveAdminNotes = async (ret: ReturnRow, notes: string) => {
    setSaving(s => ({ ...s, [ret.id]: true }))
    
    try {
      const { error: upErr } = await supabase
        .from('returns')
        .update({ admin_notes: notes || null })
        .eq('id', ret.id)

      if (upErr) throw upErr

      setRows(prev => prev.map(r => (r.id === ret.id ? { ...r, admin_notes: notes || null } : r)))
      setToast({ type: 'success', msg: 'Notes saved successfully' })
    } catch (e: any) {
      console.error('[saveAdminNotes] error:', e)
      setToast({ type: 'error', msg: 'Failed to save notes' })
    } finally {
      setSaving(s => ({ ...s, [ret.id]: false }))
    }
  }

  // UI helpers
  const toggleOpen = (id: string) => setOpen(s => ({ ...s, [id]: !s[id] }))
  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setToast({ type: 'success', msg: 'Copied to clipboard' })
    } catch {}
  }

  // Export functionality
  const exportToCSV = () => {
    const headers = ['RMA Code', 'Return ID', 'Order ID', 'Customer', 'Status', 'Resolution', 'Created', 'Items', 'Amount']
    const csvData = filteredAndSorted.map(r => {
      const totalAmount = r.return_items.reduce((sum, it) => sum + (it.order_item?.price_inr || 0) * (it.qty || 0), 0)
      return [
        r.rma_code || '',
        r.id,
        r.order_id,
        r.user?.full_name || r.user?.email || 'Unknown',
        r.status,
        r.resolution,
        new Date(r.created_at).toLocaleDateString('en-IN'),
        r.return_items.length,
        totalAmount
      ]
    })

    const csvContent = [headers, ...csvData].map(row => row.join(',')).join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `returns_export_${new Date().toISOString().slice(0, 10)}.csv`
    link.click()
    URL.revokeObjectURL(url)
    
    setToast({ type: 'success', msg: 'Export started successfully' })
  }

  // Statistics
  const stats = useMemo(() => {
    const total = rows.length
    const requested = rows.filter(r => r.status === 'requested').length
    const inProgress = rows.filter(r => ['approved', 'in_transit', 'received'].includes(r.status)).length
    const completed = rows.filter(r => ['refunded', 'replacement_shipped', 'rejected'].includes(r.status)).length
    const totalAmount = rows.reduce((sum, r) => 
      sum + r.return_items.reduce((s, it) => s + (it.order_item?.price_inr || 0) * (it.qty || 0), 0), 0
    )
    
    return { total, requested, inProgress, completed, totalAmount }
  }, [rows])

  // Replacement modal handlers
  const openReplacementModal = (ret: ReturnRow) => {
    const items: ReplacementItemDraft[] = ret.return_items.map(ri => ({
      return_item_id: ri.id,
      order_item_id: ri.order_item_id,
      product_id: ri.product_id,
      name: ri.order_item?.product?.name || ri.order_item?.name_snapshot || 'Product',
      unit_price: ri.order_item?.price_inr || 0,
      max_qty: ri.qty || 0,
      qty: ri.qty || 0,
    }))

    setReplModal({
      openForReturnId: ret.id,
      items,
      shipping_inr: 0,
      note: `Replacement for RMA ${ret.rma_code || ret.id.slice(-8)}`,
      submitting: false,
      error: null,
    })
  }

  const closeReplacementModal = () => {
    setReplModal({ openForReturnId: null, items: [], shipping_inr: 0, note: '', submitting: false, error: null })
  }

  const updateReplacementItemQty = (index: number, qty: number) => {
    setReplModal(prev => {
      const items = [...prev.items]
      const maxQty = Math.max(0, items[index].max_qty)
      items[index] = { ...items[index], qty: Math.max(0, Math.min(qty, maxQty)) }
      return { ...prev, items }
    })
  }

  const confirmReplacement = async () => {
    if (!replModal.openForReturnId) return
    setReplModal(prev => ({ ...prev, submitting: true, error: null }))

    const ret = rows.find(r => r.id === replModal.openForReturnId)
    if (!ret) {
      setReplModal(prev => ({ ...prev, submitting: false, error: 'Return not found' }))
      return
    }

    try {
      // Get address ID
      let addressId = ret.order?.address_id || null
      if (!addressId) {
        const { data: baseOrder, error: addrErr } = await supabase
          .from('orders')
          .select('address_id')
          .eq('id', ret.order_id)
          .single()
        if (addrErr) throw addrErr
        addressId = baseOrder?.address_id || null
      }
      if (!addressId) throw new Error('Original order is missing address information')

      // Validate items
      const items = replModal.items.filter(it => it.qty > 0)
      if (!items.length) throw new Error('Select at least one item to replace')

      // Calculate totals
      const subtotal = items.reduce((s, it) => s + it.unit_price * it.qty, 0)
      const shipping = Math.max(0, Number.isFinite(replModal.shipping_inr) ? replModal.shipping_inr : 0)
      const total = subtotal + shipping

      // Create replacement order
      const { data: orderIns, error: oErr } = await supabase
        .from('orders')
        .insert([{
          user_id: ret.order?.user_id || ret.user_id,
          address_id: addressId,
          status: 'processing',
          subtotal_inr: subtotal,
          shipping_inr: shipping,
          total_inr: total,
          notes: replModal.note || `Replacement for RMA ${ret.rma_code || ret.id}`
        }])
        .select('id')
        .single()
      if (oErr || !orderIns) throw oErr || new Error('Failed to create replacement order')

      // Add order items
      const itemsPayload = items.map(it => ({
        order_id: orderIns.id,
        product_id: it.product_id,
        qty: it.qty,
        price_inr: it.unit_price,
        name_snapshot: it.name
      }))
      const { error: oiErr } = await supabase.from('order_items').insert(itemsPayload)
      if (oiErr) throw oiErr

      // Update return status
      const { error: rErr } = await supabase
        .from('returns')
        .update({ status: 'replacement_shipped' })
        .eq('id', ret.id)
      if (rErr) throw rErr

      // Add timeline event
      await supabase.from('return_events').insert([{
        return_id: ret.id,
        status: 'replacement_shipped',
        note: `Replacement order ${orderIns.id} created`
      }])

      // Update UI
      setRows(prev => prev.map(r => r.id === ret.id ? { ...r, status: 'replacement_shipped' } : r))
      const { data: ev } = await supabase
        .from('return_events')
        .select('*')
        .eq('return_id', ret.id)
        .order('created_at', { ascending: true })
      if (ev) setEvents(prev => ({ ...prev, [ret.id]: ev as ReturnEvent[] }))

      setToast({ type: 'success', msg: 'Replacement order created successfully' })
      closeReplacementModal()
    } catch (e: any) {
      console.error('[confirmReplacement] error', e)
      setReplModal(prev => ({ ...prev, submitting: false, error: e?.message || 'Failed to create replacement order' }))
    }
  }

  // Sort handler
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortOrder('desc')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50/60 py-6 pt-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Toast Notifications */}
        {toast && (
          <div className={`fixed top-4 right-4 z-50 rounded-lg border px-4 py-3 shadow-lg transition-all duration-300 ${
            toast.type === 'success' 
              ? 'bg-green-50 border-green-200 text-green-800' 
              : toast.type === 'error'
              ? 'bg-red-50 border-red-200 text-red-800'
              : 'bg-blue-50 border-blue-200 text-blue-800'
          }`}>
            <div className="flex items-center gap-2">
              {toast.type === 'success' && <CheckCircle className="h-4 w-4" />}
              {toast.type === 'error' && <XCircle className="h-4 w-4" />}
              {toast.type === 'info' && <AlertCircle className="h-4 w-4" />}
              <span className="text-sm font-medium">{toast.msg}</span>
            </div>
          </div>
        )}

        {/* Header Section */}
        <div className="mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Returns Management</h1>
              <p className="text-gray-600 mt-2">Manage and process customer return requests efficiently</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={exportToCSV}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 transition-all duration-200 shadow-sm"
              >
                <Download className="h-4 w-4" />
                Export CSV
              </button>
              <button
                onClick={loadData}
                disabled={loading}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 transition-all duration-200 shadow-sm disabled:opacity-50"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>
          </div>

          {/* Statistics Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mt-6">
            <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Returns</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{stats.total}</p>
                </div>
                <div className="p-2 bg-blue-50 rounded-lg">
                  <BarChart3 className="h-5 w-5 text-blue-600" />
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Pending Review</p>
                  <p className="text-2xl font-bold text-yellow-600 mt-1">{stats.requested}</p>
                </div>
                <div className="p-2 bg-yellow-50 rounded-lg">
                  <Clock className="h-5 w-5 text-yellow-600" />
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">In Progress</p>
                  <p className="text-2xl font-bold text-blue-600 mt-1">{stats.inProgress}</p>
                </div>
                <div className="p-2 bg-blue-50 rounded-lg">
                  <RefreshCw className="h-5 w-5 text-blue-600" />
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Completed</p>
                  <p className="text-2xl font-bold text-green-600 mt-1">{stats.completed}</p>
                </div>
                <div className="p-2 bg-green-50 rounded-lg">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Amount</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{money(stats.totalAmount)}</p>
                </div>
                <div className="p-2 bg-purple-50 rounded-lg">
                  <CreditCard className="h-5 w-5 text-purple-600" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Filters and Search Section */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-6 shadow-sm">
          <div className="flex flex-col lg:flex-row lg:items-center gap-4">
            {/* Status Filters */}
            <div className="flex flex-wrap gap-2">
              {(['all', 'requested', 'approved', 'rejected', 'in_transit', 'received', 'refunded', 'replacement_shipped'] as FilterTab[]).map(tab => {
                const config = tab === 'all' 
                  ? { label: 'All Returns', color: 'bg-gray-100 text-gray-700 border-gray-300' }
                  : STATUS_CONFIG[tab as ReturnStatus]
                
                return (
                  <button
                    key={tab}
                    onClick={() => setFilter(tab)}
                    className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-all duration-200 ${
                      filter === tab
                        ? 'border-orange-500 text-orange-700 bg-orange-50 shadow-sm'
                        : config.color + ' hover:shadow-sm'
                    }`}
                  >
                    {tab !== 'all' && STATUS_CONFIG[tab as ReturnStatus].icon}
                    {config.label}
                  </button>
                )
              })}
            </div>

            {/* Search and Sort */}
            <div className="flex flex-col sm:flex-row gap-3 lg:ml-auto">
              <div className="relative flex-1 lg:max-w-md">
                <Search className="h-4 w-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search returns, orders, customers..."
                  className="w-full pl-9 pr-3 py-2.5 border rounded-xl text-sm border-gray-300 focus:ring-2 focus:ring-orange-200 focus:border-orange-400 bg-white"
                />
              </div>
              
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="inline-flex items-center gap-2 px-4 py-2.5 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 transition-all duration-200 bg-white"
              >
                <Filter className="h-4 w-4" />
                Sort & Filter
                <ChevronDown className={`h-4 w-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
              </button>
            </div>
          </div>

          {/* Advanced Filters */}
          {showFilters && (
            <div className="mt-4 p-4 bg-gray-50 rounded-xl border border-gray-200">
              <div className="flex flex-wrap items-center gap-4">
                <span className="text-sm font-medium text-gray-700">Sort by:</span>
                {[
                  { field: 'created_at' as SortField, label: 'Date' },
                  { field: 'status' as SortField, label: 'Status' },
                  { field: 'rma_code' as SortField, label: 'RMA Code' },
                  { field: 'customer' as SortField, label: 'Customer' },
                  { field: 'amount' as SortField, label: 'Amount' },
                ].map(({ field, label }) => (
                  <button
                    key={field}
                    onClick={() => handleSort(field)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-all ${
                      sortField === field
                        ? 'bg-orange-100 text-orange-700'
                        : 'bg-white text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    {label}
                    <ArrowUpDown className={`h-3 w-3 ${
                      sortField === field ? 'text-orange-600' : 'text-gray-400'
                    }`} />
                    {sortField === field && (
                      <span className="text-xs">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Main Content */}
        <div className="space-y-4">
          {loading ? (
            <div className="bg-white rounded-2xl border border-gray-200 p-12 flex flex-col items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400 mb-4" />
              <span className="text-gray-600">Loading returns data...</span>
            </div>
          ) : error ? (
            <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center">
              <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
              <div className="text-red-600 font-medium mb-2">Failed to load returns</div>
              <div className="text-gray-600 text-sm mb-4">{error}</div>
              <button
                onClick={loadData}
                className="inline-flex items-center gap-2 px-6 py-3 bg-orange-600 text-white rounded-xl hover:bg-orange-700 transition-colors"
              >
                <RefreshCw className="h-4 w-4" />
                Try Again
              </button>
            </div>
          ) : filteredAndSorted.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
              <Package className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600 text-lg font-medium mb-2">No returns found</p>
              <p className="text-gray-500 text-sm">Try adjusting your filters or search terms</p>
            </div>
          ) : (
            filteredAndSorted.map(ret => {
              const isOpen = open[ret.id]
              const totalAmount = ret.return_items.reduce((sum, it) => {
                const unitPrice = it.order_item?.price_inr || 0
                return sum + unitPrice * (it.qty || 0)
              }, 0)
              const timelineEvents = events[ret.id] || []
              const statusConfig = STATUS_CONFIG[ret.status]

              return (
                <div key={ret.id} className="bg-white rounded-2xl border border-gray-200 overflow-hidden transition-all hover:shadow-md">
                  {/* Card Header */}
                  <div className="p-6">
                    <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-4">
                      {/* Left Section - Return Info */}
                      <div className="flex-1 space-y-4">
                        <div className="flex flex-wrap items-center gap-3">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-gray-900 text-lg">
                              {ret.rma_code || `RMA-${ret.id.slice(-8).toUpperCase()}`}
                            </span>
                            <button
                              onClick={() => copyToClipboard(ret.rma_code || ret.id)}
                              className="p-1.5 text-gray-400 hover:text-gray-600 transition-colors rounded-lg hover:bg-gray-100"
                              title="Copy RMA Code"
                            >
                              <Copy className="h-3.5 w-3.5" />
                            </button>
                          </div>
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border ${statusConfig.color}`}>
                            {statusConfig.icon}
                            {statusConfig.label}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                          <div className="flex items-center gap-2 text-gray-600">
                            <Calendar className="h-4 w-4" />
                            <span>{new Date(ret.created_at).toLocaleDateString('en-IN', { 
                              day: 'numeric', 
                              month: 'short', 
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}</span>
                          </div>
                          <div className="flex items-center gap-2 text-gray-600">
                            <Receipt className="h-4 w-4" />
                            <span>Order: #{ret.order_id.slice(-8)}</span>
                          </div>
                          <div className="flex items-center gap-2 text-gray-600">
                            <CreditCard className="h-4 w-4" />
                            <span className="capitalize">{ret.resolution.replace('_', ' ')}</span>
                          </div>
                          <div className="flex items-center gap-2 text-gray-600">
                            <span className="font-medium text-green-600">{money(totalAmount)}</span>
                          </div>
                        </div>

                        {ret.notes && (
                          <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
                            <div className="flex items-start gap-2">
                              <MessageCircle className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                              <div>
                                <div className="text-sm font-medium text-blue-900 mb-1">Customer Note</div>
                                <div className="text-sm text-blue-800">{ret.notes}</div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Right Section - Customer & Actions */}
                      <div className="flex flex-col sm:flex-row xl:flex-col gap-4 xl:items-end xl:min-w-[280px]">
                        {/* Customer Info */}
                        <div className="bg-gray-50 rounded-xl p-4 min-w-[240px]">
                          <div className="flex items-center gap-2 text-xs font-medium text-gray-500 mb-2">
                            <User className="h-3.5 w-3.5" />
                            Customer Information
                          </div>
                          {ret.user ? (
                            <div className="space-y-2 text-sm">
                              <div className="font-semibold text-gray-900 truncate">
                                {ret.user.full_name || 'No Name Provided'}
                              </div>
                              <div className="flex items-center gap-2 text-gray-600">
                                <Mail className="h-3.5 w-3.5" />
                                <span className="truncate">{ret.user.email}</span>
                              </div>
                              {ret.user.phone && (
                                <div className="flex items-center gap-2 text-gray-600">
                                  <Phone className="h-3.5 w-3.5" />
                                  <span>{ret.user.phone}</span>
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="text-sm text-gray-500">Customer information not available</div>
                          )}
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-2">
                          <div className="flex flex-wrap gap-2">
                            {(NEXT_ACTIONS[ret.status] || []).map(action => {
                              const handleClick = () => {
                                if (action.to === 'replacement_shipped') {
                                  openReplacementModal(ret)
                                } else {
                                  updateStatus(ret, action.to, `Status updated to ${action.to}`)
                                }
                              }
                              
                              return (
                                <button
                                  key={action.to}
                                  onClick={handleClick}
                                  disabled={!!saving[ret.id]}
                                  className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-all duration-200 ${
                                    BUTTON_VARIANTS[action.variant]
                                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                                >
                                  {action.icon}
                                  {action.label}
                                </button>
                              )
                            })}
                          </div>
                          <button
                            onClick={() => toggleOpen(ret.id)}
                            className={`p-2.5 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-all duration-200 ${
                              isOpen ? 'bg-gray-50' : ''
                            }`}
                            title={isOpen ? 'Collapse details' : 'Expand details'}
                          >
                            {isOpen ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {isOpen && (
                    <div className="border-t border-gray-200 bg-gray-50/50">
                      <div className="p-6">
                        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                          {/* Return Items */}
                          <div className="xl:col-span-2">
                            <h3 className="font-semibold text-gray-900 text-lg mb-4">Return Items</h3>
                            <div className="space-y-4">
                              {ret.return_items.map(item => {
                                const productName = item.order_item?.product?.name || item.order_item?.name_snapshot || 'Product'
                                const productImage = item.order_item?.product?.image_url || `https://picsum.photos/seed/${item.id}/120`
                                const unitPrice = item.order_item?.price_inr || 0
                                const totalPrice = unitPrice * (item.qty || 0)

                                return (
                                  <div key={item.id} className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
                                    <div className="flex gap-4">
                                      <img 
                                        src={productImage} 
                                        alt={productName}
                                        className="w-20 h-20 rounded-lg object-cover border flex-shrink-0"
                                      />
                                      <div className="flex-1 min-w-0">
                                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                                          <div className="flex-1">
                                            <h4 className="font-semibold text-gray-900 text-sm mb-2">{productName}</h4>
                                            <div className="space-y-1 text-sm text-gray-600">
                                              <div>
                                                Quantity: <span className="font-medium">{item.qty}</span> × {money(unitPrice)} = 
                                                <span className="font-semibold text-gray-900 ml-1">{money(totalPrice)}</span>
                                              </div>
                                              {item.reason_code && (
                                                <div>
                                                  Reason: <span className="capitalize font-medium">{item.reason_code.replace(/_/g, ' ')}</span>
                                                </div>
                                              )}
                                              {item.condition_note && (
                                                <div className="text-gray-600">
                                                  Condition: {item.condition_note}
                                                </div>
                                              )}
                                            </div>
                                          </div>
                                        </div>

                                        {/* Evidence Images */}
                                        {Array.isArray(item.evidence_images) && item.evidence_images.length > 0 && (
                                          <div className="mt-4">
                                            <div className="text-xs font-medium text-gray-500 mb-2">Evidence Photos</div>
                                            <div className="flex gap-2 flex-wrap">
                                              {item.evidence_images.map((url, index) => (
                                                <a
                                                  key={index}
                                                  href={url}
                                                  target="_blank"
                                                  rel="noopener noreferrer"
                                                  className="group relative block"
                                                >
                                                  <img
                                                    src={url}
                                                    alt={`Evidence ${index + 1}`}
                                                    className="w-16 h-16 rounded border border-gray-300 object-cover group-hover:opacity-80 transition-opacity"
                                                  />
                                                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-all rounded" />
                                                </a>
                                              ))}
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          </div>

                          {/* Timeline & Notes */}
                          <div className="space-y-6">
                            {/* Summary Card */}
                            <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
                              <h4 className="font-semibold text-gray-900 mb-3">Return Summary</h4>
                              <div className="space-y-3 text-sm">
                                <div className="flex justify-between items-center">
                                  <span className="text-gray-600">Total Items</span>
                                  <span className="font-semibold">{ret.return_items.length}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                  <span className="text-gray-600">Refund Amount</span>
                                  <span className="font-semibold text-green-600">{money(totalAmount)}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                  <span className="text-gray-600">Current Status</span>
                                  <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${statusConfig.color}`}>
                                    {statusConfig.icon}
                                    {statusConfig.label}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Timeline */}
                            <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
                              <h4 className="font-semibold text-gray-900 mb-3">Return Timeline</h4>
                              <div className="space-y-4">
                                {timelineEvents.length === 0 ? (
                                  <div className="text-center py-4 text-gray-500 text-sm">
                                    No timeline events recorded
                                  </div>
                                ) : (
                                  timelineEvents.map((event, index) => (
                                    <div key={event.id} className="flex gap-3">
                                      <div className="flex flex-col items-center">
                                        <div className={`w-2 h-2 rounded-full ${
                                          event.status === 'rejected' ? 'bg-red-500' :
                                          (event.status === 'refunded' || event.status === 'replacement_shipped') ? 'bg-green-500' :
                                          'bg-blue-500'
                                        }`} />
                                        {index < timelineEvents.length - 1 && (
                                          <div className="w-0.5 h-6 bg-gray-200" />
                                        )}
                                      </div>
                                      <div className="flex-1 pb-1">
                                        <div className="font-medium text-gray-900 text-sm capitalize">
                                          {String(event.status).replace(/_/g, ' ')}
                                        </div>
                                        <div className="text-xs text-gray-500 mt-1">
                                          {new Date(event.created_at).toLocaleString('en-IN')}
                                        </div>
                                        {event.note && (
                                          <div className="text-xs text-gray-600 mt-1 bg-gray-50 p-2 rounded-lg">
                                            {event.note}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  ))
                                )}
                              </div>
                            </div>

                            {/* Admin Notes */}
                            <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
                              <h4 className="font-semibold text-gray-900 mb-3">Admin Notes</h4>
                              <textarea
                                defaultValue={ret.admin_notes || ''}
                                onBlur={(e) => {
                                  const value = e.currentTarget.value
                                  if (value !== (ret.admin_notes || '')) {
                                    saveAdminNotes(ret, value)
                                  }
                                }}
                                rows={4}
                                placeholder="Add internal notes, inspection details, or refund information..."
                                className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-blue-200 focus:border-blue-400 resize-none bg-white"
                              />
                              <div className="text-xs text-gray-500 mt-2">
                                These notes are for internal use only and won't be visible to customers.
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* Replacement Order Modal */}
      {replModal.openForReturnId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b">
              <div className="flex items-center gap-3">
                <RefreshCw className="h-6 w-6 text-green-600" />
                <div>
                  <h3 className="text-xl font-semibold text-gray-900">Create Replacement Order</h3>
                  <p className="text-sm text-gray-500 mt-1">Select items and quantities for replacement</p>
                </div>
              </div>
              <button
                onClick={closeReplacementModal}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-auto p-6 space-y-6">
              <div className="text-sm text-gray-600 bg-blue-50 p-4 rounded-xl border border-blue-200">
                Unit prices are taken from the original order. Adjust quantities as needed.
              </div>

              {/* Replacement Items */}
              <div className="space-y-4">
                {replModal.items.map((item, index) => (
                  <div key={item.return_item_id} className="border rounded-xl p-4 bg-white">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900 text-sm mb-1">{item.name}</h4>
                        <div className="text-sm text-gray-600 space-y-1">
                          <div>Unit Price: {money(item.unit_price)}</div>
                          <div className="text-xs text-gray-500">Maximum: {item.max_qty} units</div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4">
                        {/* Quantity Controls */}
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => updateReplacementItemQty(index, Math.max(0, item.qty - 1))}
                            className="p-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
                            disabled={item.qty <= 0}
                          >
                            <Minus className="h-4 w-4" />
                          </button>
                          <input
                            type="number"
                            min={0}
                            max={item.max_qty}
                            value={item.qty}
                            onChange={(e) => updateReplacementItemQty(index, Math.max(0, Math.min(item.max_qty, Number(e.target.value) || 0)))}
                            className="w-20 border border-gray-300 rounded-lg p-2 text-sm text-center focus:ring-2 focus:ring-green-200 focus:border-green-400"
                          />
                          <button
                            onClick={() => updateReplacementItemQty(index, Math.min(item.max_qty, item.qty + 1))}
                            className="p-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
                            disabled={item.qty >= item.max_qty}
                          >
                            <Plus className="h-4 w-4" />
                          </button>
                        </div>
                        
                        <div className="text-right min-w-[100px]">
                          <div className="text-sm font-semibold text-gray-900">
                            {money(item.unit_price * item.qty)}
                          </div>
                          <div className="text-xs text-gray-500">
                            {item.qty} × {money(item.unit_price)}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Order Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Shipping Charges (₹)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={replModal.shipping_inr}
                    onChange={(e) => setReplModal(prev => ({ 
                      ...prev, 
                      shipping_inr: Math.max(0, Number(e.target.value) || 0) 
                    }))}
                    className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-green-200 focus:border-green-400"
                    placeholder="0"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Order Notes
                  </label>
                  <input
                    value={replModal.note}
                    onChange={(e) => setReplModal(prev => ({ ...prev, note: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-green-200 focus:border-green-400"
                    placeholder="Add any special instructions or notes..."
                  />
                </div>
              </div>

              {/* Order Summary */}
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                <h4 className="font-semibold text-gray-900 mb-3">Order Summary</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Items Total</span>
                    <span>{money(replModal.items.reduce((sum, item) => sum + item.unit_price * item.qty, 0))}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Shipping</span>
                    <span>{money(replModal.shipping_inr)}</span>
                  </div>
                  <div className="border-t pt-2 flex justify-between font-semibold text-gray-900">
                    <span>Grand Total</span>
                    <span>{money(
                      replModal.items.reduce((sum, item) => sum + item.unit_price * item.qty, 0) + 
                      replModal.shipping_inr
                    )}</span>
                  </div>
                </div>
              </div>

              {/* Error Message */}
              {replModal.error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-800">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    <span className="font-medium">Unable to create replacement</span>
                  </div>
                  <div className="mt-1">{replModal.error}</div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-6 border-t bg-gray-50">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  A new order will be created with the same shipping address.
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={closeReplacementModal}
                    disabled={replModal.submitting}
                    className="px-6 py-3 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors font-medium disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmReplacement}
                    disabled={replModal.submitting || replModal.items.every(item => item.qty === 0)}
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-white font-medium bg-green-600 hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {replModal.submitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Creating Order...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="h-4 w-4" />
                        Create Replacement Order
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}