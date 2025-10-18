// src/components/AdminOrders.tsx
import React, { useEffect, useMemo, useState } from 'react'
import supabase from '../lib/supabase'
import {
  ChevronDown, Loader2, Package, Truck, CheckCircle2, Clock, RefreshCw,
  User, Calendar, Link as LinkIcon, ClipboardCopy, Check, Pencil, CheckCircle, PlusCircle
} from 'lucide-react'

type OrderRow = {
  id: string
  created_at: string
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled'
  subtotal_inr: number
  shipping_inr: number
  total_inr: number
  notes: string | null
  admin_notes: string | null
  carrier: string | null
  courier_name: string | null
  tracking_number: string | null
  tracking_url: string | null
  shipped_at: string | null
  delivered_at: string | null
  user_id: string
  address: {
    id: string
    full_name: string | null
    line1: string | null
    line2: string | null
    city: string | null
    state: string | null
    postal_code: string | null
    country: string | null
    phone: string | null
  } | null
  order_items: Array<{
    id: string
    qty: number
    price_inr: number
    product: { id: string; name: string; image_url: string | null } | null
  }>
}

type OrderEvent = {
  id: string
  order_id: string
  status: OrderRow['status']
  note: string | null
  created_at: string
  created_by: string | null
}

const money = (n: number) => `₹${n.toLocaleString('en-IN')}`

const STATUS_OPTIONS: OrderRow['status'][] = [
  'pending','processing','shipped','delivered','cancelled',
]

const statusConfig = {
  pending:    { icon: <Clock className="h-4 w-4" />,      color: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  processing: { icon: <RefreshCw className="h-4 w-4" />,  color: 'bg-blue-100 text-blue-800 border-blue-200' },
  shipped:    { icon: <Truck className="h-4 w-4" />,      color: 'bg-purple-100 text-purple-800 border-purple-200' },
  delivered:  { icon: <CheckCircle2 className="h-4 w-4"/>,color: 'bg-green-100 text-green-800 border-green-200' },
  cancelled:  { icon: <Package className="h-4 w-4" />,    color: 'bg-red-100 text-red-800 border-red-200' },
} as const

type TrackingForm = {
  carrier: string
  courier_name: string
  tracking_number: string
  tracking_url: string
}

function isHttpUrl(u: string) {
  try { const x = new URL(u); return x.protocol === 'http:' || x.protocol === 'https:' } catch { return false }
}

export default function AdminOrders() {
  const [rows, setRows] = useState<OrderRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [open, setOpen] = useState<Record<string, boolean>>({})
  const [saving, setSaving] = useState<Record<string, boolean>>({})
  const [events, setEvents] = useState<Record<string, OrderEvent[]>>({})
  const [copyOk, setCopyOk] = useState<string | null>(null)

  // map of user_id -> full_name (for event.created_by display)
  const [profileNames, setProfileNames] = useState<Record<string, string>>({})

  // modal state
  const [trackingFor, setTrackingFor] = useState<OrderRow | null>(null)
  const [trackingSaving, setTrackingSaving] = useState(false)
  const [tForm, setTForm] = useState<TrackingForm>({ carrier: '', courier_name: '', tracking_number: '', tracking_url: '' })
  const [tErrors, setTErrors] = useState<string | null>(null)

  // new timeline entry state per order
  const [newEventStatus, setNewEventStatus] = useState<Record<string, OrderRow['status']>>({})
  const [newEventNote, setNewEventNote] = useState<Record<string, string>>({})
  const [statusFilter, setStatusFilter] = useState<'all'|OrderRow['status']>('all')

  const toggleOpen = (id: string) => setOpen(s => ({ ...s, [id]: !s[id] }))

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString('en-IN', {
      day: 'numeric', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    })

  const load = async () => {
    setError(null)
    setLoading(true)
    try {
      // base orders + joins
      const { data, error } = await supabase
        .from('orders')
        .select(`
          id, created_at, status, subtotal_inr, shipping_inr, total_inr, notes, admin_notes,
          carrier, courier_name, tracking_number, tracking_url, shipped_at, delivered_at,
          user_id,
          address:addresses (
            id, full_name, line1, line2, city, state, postal_code, country, phone
          ),
          order_items (
            id, qty, price_inr,
            product:products ( id, name, image_url )
          )
        `)
        .order('created_at', { ascending: false })

      if (error) throw error
      const orders = (data || []) as OrderRow[]
      setRows(orders)

      // fetch events for these orders
      const ids = orders.map(d => d.id)
      if (ids.length) {
        const { data: ev, error: evErr } = await supabase
          .from('order_events')
          .select('id, order_id, status, note, created_at, created_by')
          .in('order_id', ids)
          .order('created_at', { ascending: false })
        if (!evErr) {
          const map: Record<string, OrderEvent[]> = {}
          ev?.forEach(e => { (map[e.order_id] ||= []).push(e as OrderEvent) })
          setEvents(map)

          // collect created_by for name lookup
          const creatorIds = Array.from(new Set((ev || []).map(e => e.created_by).filter(Boolean))) as string[]
          if (creatorIds.length) {
            const { data: profs } = await supabase
              .from('profiles')
              .select('id, full_name')
              .in('id', creatorIds)
            const pn: Record<string, string> = {}
            profs?.forEach(p => { pn[p.id] = p.full_name || p.id })
            setProfileNames(pn)
          } else {
            setProfileNames({})
          }
        }
      } else {
        setEvents({})
        setProfileNames({})
      }
    } catch (err: any) {
      console.error('[AdminOrders] load error:', err)
      setError(err?.message || 'Failed to load orders')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const writeEvent = async (orderId: string, status: OrderRow['status'], note: string | null) => {
    const { data: userData } = await supabase.auth.getUser()
    const adminId = userData.user?.id ?? null
    const { error: evErr } = await supabase.from('order_events')
      .insert({ order_id: orderId, status, note, created_by: adminId })
    if (evErr) console.warn('[AdminOrders] add event warn:', evErr?.message)

    const { data: ev, error } = await supabase
      .from('order_events')
      .select('id, order_id, status, note, created_at, created_by')
      .eq('order_id', orderId)
      .order('created_at', { ascending: false })
    if (!error) {
      setEvents(prev => ({ ...prev, [orderId]: (ev || []) as any }))
      // update creators map if new id
      const newIds = Array.from(new Set((ev || []).map(e => e.created_by).filter(Boolean))) as string[]
      if (newIds.length) {
        const missing = newIds.filter(id => !(id in profileNames))
        if (missing.length) {
          const { data: profs } = await supabase.from('profiles').select('id, full_name').in('id', missing)
          const pn = { ...profileNames }
          profs?.forEach(p => { pn[p.id] = p.full_name || p.id })
          setProfileNames(pn)
        }
      }
    }
  }

  const performStatusUpdate = async (orderId: string, status: OrderRow['status']) => {
    setSaving(s => ({ ...s, [orderId]: true }))
    try {
      const patch: Partial<OrderRow> = { status }
      if (status === 'shipped') patch.shipped_at = new Date().toISOString() as any
      if (status === 'delivered') patch.delivered_at = new Date().toISOString() as any

      const { error: upErr } = await supabase.from('orders').update(patch).eq('id', orderId)
      if (upErr) throw upErr

      setRows(prev => prev.map(r => (r.id === orderId ? { ...r, ...patch } as OrderRow : r)))
      await writeEvent(orderId, status, `Status updated to ${status}`)
    } catch (err: any) {
      console.error('[AdminOrders] updateStatus error:', err)
      alert(err?.message || 'Failed to update status')
    } finally {
      setSaving(s => ({ ...s, [orderId]: false }))
    }
  }

  const updateStatus = async (orderId: string, nextStatus: OrderRow['status']) => {
    const order = rows.find(r => r.id === orderId)
    if (!order) return
    if (nextStatus === 'shipped' && !(order.tracking_number && order.tracking_url)) {
      setTrackingFor(order)
      setTForm({
        carrier: order.carrier || order.courier_name || '',
        courier_name: order.courier_name || order.carrier || '',
        tracking_number: order.tracking_number || '',
        tracking_url: order.tracking_url || '',
      })
      setTErrors(null)
      return
    }
    await performStatusUpdate(orderId, nextStatus)
  }

  const openTrackingModal = (order: OrderRow) => {
    setTrackingFor(order)
    setTForm({
      carrier: order.carrier || order.courier_name || '',
      courier_name: order.courier_name || order.carrier || '',
      tracking_number: order.tracking_number || '',
      tracking_url: order.tracking_url || '',
    })
    setTErrors(null)
  }

  const saveTracking = async () => {
    if (!trackingFor) return
    const carrier = tForm.carrier.trim()
    const courier_name = tForm.courier_name.trim() || carrier
    const tracking_number = tForm.tracking_number.trim()
    const tracking_url = tForm.tracking_url.trim()

    setTErrors(null)
    if (!carrier || !tracking_number) {
      setTErrors('Carrier and Tracking Number are required.')
      return
    }
    if (tracking_url && !isHttpUrl(tracking_url)) {
      setTErrors('Tracking URL must start with http:// or https://')
      return
    }

    setTrackingSaving(true)
    try {
      const mustShip = trackingFor.status !== 'shipped'
      const patch: Partial<OrderRow> = {
        carrier, courier_name, tracking_number, tracking_url,
        ...(mustShip ? { status: 'shipped', shipped_at: new Date().toISOString() as any } : {})
      }

      const { error: upErr } = await supabase.from('orders').update(patch).eq('id', trackingFor.id)
      if (upErr) throw upErr

      setRows(prev => prev.map(r => (r.id === trackingFor.id ? { ...r, ...patch } as OrderRow : r)))

      const eventStatus = (patch.status as OrderRow['status']) || trackingFor.status
      const note = `Tracking set: ${courier_name || carrier}${tracking_number ? ` • ${tracking_number}` : ''}${tracking_url ? ` • ${tracking_url}` : ''}`
      await writeEvent(trackingFor.id, eventStatus, note)

      setTrackingFor(null)
    } catch (err: any) {
      console.error('[AdminOrders] saveTracking error:', err)
      setTErrors(err?.message || 'Failed to save tracking')
    } finally {
      setTrackingSaving(false)
    }
  }

  const markDelivered = async (orderId: string) => {
    await performStatusUpdate(orderId, 'delivered')
  }

  // add manual timeline entry
  const addTimelineEntry = async (order: OrderRow) => {
    const s = newEventStatus[order.id] || order.status
    const note = (newEventNote[order.id] || '').trim() || null
    await writeEvent(order.id, s, note)
    // clear inputs
    setNewEventNote(prev => ({ ...prev, [order.id]: '' }))
  }

  // admin notes save
  const [adminNoteDraft, setAdminNoteDraft] = useState<Record<string, string>>({})
  const saveAdminNotes = async (order: OrderRow) => {
    const note = adminNoteDraft[order.id] ?? order.admin_notes ?? ''
    try {
      const { error: upErr } = await supabase.from('orders').update({ admin_notes: note }).eq('id', order.id)
      if (upErr) throw upErr
      setRows(prev => prev.map(r => (r.id === order.id ? { ...r, admin_notes: note } : r)))
    } catch (e:any) {
      alert(e?.message || 'Failed to save admin notes')
    }
  }

  const totalOrders = rows.length
  const totalRevenue = useMemo(() => rows.reduce((s, r) => s + (r.total_inr || 0), 0), [rows])

  // merge synthetic & db events for display
  const mergedEvents = (order: OrderRow): OrderEvent[] => {
    const synth: OrderEvent[] = [
      { id: `placed-${order.id}`, order_id: order.id, status: 'pending', note: 'Order placed', created_at: order.created_at, created_by: order.user_id }
    ]
    if (order.shipped_at) synth.push({ id: `shipped-${order.id}`, order_id: order.id, status: 'shipped', note: 'Order shipped', created_at: order.shipped_at, created_by: null })
    if (order.delivered_at) synth.push({ id: `delivered-${order.id}`, order_id: order.id, status: 'delivered', note: 'Order delivered', created_at: order.delivered_at, created_by: null })

    const db = events[order.id] || []
    const all = [...synth, ...db]
    // sort desc by time
    all.sort((a,b)=> new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    return all
  }

  const filteredRows = statusFilter === 'all' ? rows : rows.filter(r => r.status === statusFilter)

  const copyTracking = async (order: OrderRow) => {
    const text = `${order.courier_name || order.carrier || ''} ${order.tracking_number || ''} ${order.tracking_url || ''}`.trim()
    if (!text) return
    try {
      await navigator.clipboard.writeText(text)
      setCopyOk(order.id)
      setTimeout(() => setCopyOk(null), 1200)
    } catch {}
  }

  return (
    <div className="min-h-screen bg-[#FAF7F2] py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-orange-600">Order Management</h1>
            <p className="text-orange-600 mt-2">Manage and track customer orders</p>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={statusFilter}
              onChange={(e)=>setStatusFilter(e.target.value as any)}
              className="text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 bg-white"
              title="Filter by status"
            >
              <option value="all">All statuses</option>
              {STATUS_OPTIONS.map(s=> <option key={s} value={s}>{s}</option>)}
            </select>
            <button
              onClick={load}
              className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center">
                <Package className="h-6 w-6 text-orange-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">{totalOrders}</div>
                <div className="text-sm text-gray-600">Total Orders</div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle2 className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">{money(totalRevenue)}</div>
                <div className="text-sm text-gray-600">Total Revenue</div>
              </div>
            </div>
          </div>
        </div>

        {/* Orders */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400 mr-3" />
              <span className="text-gray-600">Loading orders...</span>
            </div>
          ) : error ? (
            <div className="text-center py-12 text-red-600">{error}</div>
          ) : filteredRows.length === 0 ? (
            <div className="text-center py-12">
              <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 text-lg">No orders found</p>
              <p className="text-gray-400 mt-1">Orders will appear here when customers make purchases</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {filteredRows.map(order => {
                const isOpen = open[order.id]
                const orderEvents = mergedEvents(order)

                return (
                  <div key={order.id} className="hover:bg-gray-50 transition-colors">
                    {/* Summary */}
                    <div className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <button
                            onClick={() => toggleOpen(order.id)}
                            className={`p-2 rounded-lg transition-all ${isOpen ? 'bg-orange-100 text-orange-600' : 'hover:bg-gray-100 text-gray-600'}`}
                          >
                            <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                          </button>

                          <div>
                            <div className="flex items-center gap-3">
                              <h3 className="font-semibold text-gray-900">Order #{order.id}</h3>
                              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border ${statusConfig[order.status].color}`}>
                                {statusConfig[order.status].icon}
                                {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                              </span>
                            </div>
                            <p className="text-sm text-gray-500 mt-1">
                              {formatDate(order.created_at)} • {order.order_items.length} item{order.order_items.length !== 1 ? 's' : ''}
                            </p>
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="text-lg font-semibold text-gray-900">{money(order.total_inr)}</div>

                          {/* Status & quick actions */}
                          <div className="flex items-center gap-2 mt-2">
                            <select
                              value={order.status}
                              onChange={(e) => updateStatus(order.id, e.target.value as OrderRow['status'])}
                              disabled={saving[order.id]}
                              className="text-sm border border-gray-300 rounded-lg px-3 py-1 focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                            >
                              {STATUS_OPTIONS.map(status => (
                                <option key={status} value={status}>
                                  {status.charAt(0).toUpperCase() + status.slice(1)}
                                </option>
                              ))}
                            </select>

                            {/* Add/Edit Tracking */}
                            <button
                              onClick={() => openTrackingModal(order)}
                              className="px-2 py-1 text-sm border rounded-lg text-gray-700 border-gray-300 hover:bg-gray-100"
                            >
                              {order.tracking_number ? 'Edit Tracking' : 'Add Tracking'}
                            </button>

                            {/* Mark Delivered */}
                            {order.status !== 'delivered' && (
                              <button
                                onClick={() => markDelivered(order.id)}
                                disabled={saving[order.id]}
                                className="px-2 py-1 text-sm border rounded-lg text-green-700 border-green-300 hover:bg-green-50"
                                title="Mark delivered"
                              >
                                <CheckCircle className="h-4 w-4 inline -mt-0.5 mr-1" />
                                Delivered
                              </button>
                            )}

                            <button
                              onClick={() => performStatusUpdate(order.id, order.status)}
                              disabled={saving[order.id]}
                              className="p-1 text-gray-600 hover:text-gray-800 transition-colors"
                              title="Save status"
                            >
                              {saving[order.id] ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Details */}
                    {isOpen && (
                      <div className="border-t border-gray-200 bg-gray-50 p-6">
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                          {/* Items */}
                          <div className="lg:col-span-2">
                            <h4 className="font-semibold text-gray-900 mb-4">Order Items</h4>
                            <div className="space-y-3">
                              {order.order_items.map(item => (
                                <div key={item.id} className="flex items-center gap-4 p-3 bg-white rounded-lg border border-gray-200">
                                  <img
                                    src={item.product?.image_url || 'https://picsum.photos/seed/p/80'}
                                    alt={item.product?.name || 'Product'}
                                    className="w-16 h-16 rounded-lg object-cover"
                                  />
                                  <div className="flex-1">
                                    <div className="font-medium text-gray-900">{item.product?.name || 'Product'}</div>
                                    <div className="text-sm text-gray-600">Quantity: {item.qty}</div>
                                  </div>
                                  <div className="text-right">
                                    <div className="font-semibold text-gray-900">{money(item.price_inr * item.qty)}</div>
                                    <div className="text-sm text-gray-600">{money(item.price_inr)} each</div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Right column: Customer + Shipping + Timeline + Admin Notes */}
                          <div className="space-y-6">
                            {/* Customer */}
                            <div>
                              <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                                <User className="h-4 w-4" />
                                Customer Information
                              </h4>
                              {order.address ? (
                                <div className="bg-white rounded-lg border border-gray-200 p-4">
                                  <div className="font-medium text-gray-900">{order.address.full_name}</div>
                                  <div className="text-sm text-gray-600 mt-1">
                                    <div>{order.address.line1}{order.address.line2 && `, ${order.address.line2}`}</div>
                                    <div>{order.address.city}, {order.address.state} - {order.address.postal_code}</div>
                                    <div className="mt-2 text-gray-500">📞 {order.address.phone}</div>
                                  </div>
                                </div>
                              ) : (
                                <div className="text-gray-500 text-sm">No address information</div>
                              )}
                            </div>

                            {/* Shipping / Tracking */}
                            <div>
                              <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                                <Truck className="h-4 w-4" />
                                Shipping & Tracking
                              </h4>
                              <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-2">
                                <div className="text-sm text-gray-600">
                                  <div>Carrier: <span className="text-gray-900 font-medium">{order.carrier || '-'}</span></div>
                                  <div>Courier Name: <span className="text-gray-900 font-medium">{order.courier_name || '-'}</span></div>
                                  <div>Tracking No: <span className="text-gray-900 font-medium">{order.tracking_number || '-'}</span></div>
                                  <div className="flex items-center gap-2">
                                    <span>URL:</span>
                                    {order.tracking_url ? (
                                      <a
                                        href={order.tracking_url}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="inline-flex items-center gap-1 text-blue-600 hover:underline break-all"
                                      >
                                        <LinkIcon className="h-3.5 w-3.5" /> {order.tracking_url}
                                      </a>
                                    ) : (
                                      <span className="text-gray-900 font-medium">-</span>
                                    )}
                                  </div>
                                  <div className="mt-2 text-xs text-gray-500">
                                    {order.shipped_at && <>Shipped: {formatDate(order.shipped_at)} • </>}
                                    {order.delivered_at && <>Delivered: {formatDate(order.delivered_at)}</>}
                                  </div>
                                </div>
                                <div className="flex gap-2 pt-2">
                                  <button
                                    onClick={() => openTrackingModal(order)}
                                    className="inline-flex items-center gap-1 px-3 py-1.5 text-sm border rounded-lg text-gray-700 border-gray-300 hover:bg-gray-100"
                                  >
                                    <Pencil className="h-4 w-4" /> {order.tracking_number ? 'Edit' : 'Add'} Tracking
                                  </button>
                                  {(order.tracking_number || order.tracking_url) && (
                                    <button
                                      onClick={() => copyTracking(order)}
                                      className="inline-flex items-center gap-1 px-3 py-1.5 text-sm border rounded-lg text-gray-700 border-gray-300 hover:bg-gray-100"
                                    >
                                      {copyOk === order.id ? <Check className="h-4 w-4" /> : <ClipboardCopy className="h-4 w-4" />}
                                      {copyOk === order.id ? 'Copied' : 'Copy'}
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Timeline */}
                            <div>
                              <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                                <Calendar className="h-4 w-4" />
                                Order Timeline
                              </h4>

                              {/* Add timeline entry */}
                              <div className="bg-white rounded-lg border border-gray-200 p-3 mb-3">
                                <div className="flex items-center gap-2 mb-2">
                                  <select
                                    value={newEventStatus[order.id] || order.status}
                                    onChange={(e)=>setNewEventStatus(prev=>({ ...prev, [order.id]: e.target.value as OrderRow['status'] }))}
                                    className="text-sm border border-gray-300 rounded-lg px-3 py-1 focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                                  >
                                    {STATUS_OPTIONS.map(s=> <option key={s} value={s}>{s}</option>)}
                                  </select>
                                  <button
                                    onClick={()=>addTimelineEntry(order)}
                                    className="inline-flex items-center gap-1 px-3 py-1.5 text-sm rounded-lg text-white bg-orange-600 hover:bg-orange-700"
                                  >
                                    <PlusCircle className="h-4 w-4" /> Add Entry
                                  </button>
                                </div>
                                <textarea
                                  value={newEventNote[order.id] || ''}
                                  onChange={(e)=>setNewEventNote(prev=>({ ...prev, [order.id]: e.target.value }))}
                                  placeholder="Optional note (e.g., 'Packed and ready for pickup')"
                                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                                  rows={2}
                                />
                              </div>

                              <div className="space-y-2">
                                {orderEvents.length > 0 ? (
                                  orderEvents.map(event => (
                                    <div key={event.id} className="bg-white rounded-lg border border-gray-200 p-3">
                                      <div className="flex items-center gap-2 mb-1">
                                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${statusConfig[event.status].color}`}>
                                          {statusConfig[event.status].icon}
                                          {event.status}
                                        </span>
                                        <span className="text-xs text-gray-500">{formatDate(event.created_at)}</span>
                                        {event.created_by && (
                                          <span className="text-xs text-gray-500">• by {profileNames[event.created_by] || event.created_by}</span>
                                        )}
                                      </div>
                                      {event.note && <div className="text-sm text-gray-600 mt-1 whitespace-pre-wrap">{event.note}</div>}
                                    </div>
                                  ))
                                ) : (
                                  <div className="text-gray-500 text-sm text-center py-4">No timeline events yet</div>
                                )}
                              </div>
                            </div>

                            {/* Admin Notes */}
                            <div>
                              <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                                <Pencil className="h-4 w-4" />
                                Admin Notes
                              </h4>
                              <div className="bg-white rounded-lg border border-gray-200 p-4">
                                <textarea
                                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                                  rows={3}
                                  placeholder="Private notes for internal use (customer won't see this)."
                                  value={adminNoteDraft[order.id] ?? (order.admin_notes || '')}
                                  onChange={(e)=>setAdminNoteDraft(prev=>({ ...prev, [order.id]: e.target.value }))}
                                />
                                <div className="flex justify-end pt-2">
                                  <button
                                    onClick={()=>saveAdminNotes(order)}
                                    className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                                  >
                                    <CheckCircle2 className="h-4 w-4" />
                                    Save Notes
                                  </button>
                                </div>
                              </div>
                            </div>

                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Tracking Modal */}
      {trackingFor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setTrackingFor(null)} />
          <div className="relative bg-white rounded-2xl shadow-xl border border-gray-200 w-full max-w-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900">Tracking for Order #{trackingFor.id}</h3>
            <p className="text-sm text-gray-500 mt-1">Enter the shipment details. Carrier & Tracking No. are required.</p>

            <div className="mt-4 space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700">Carrier</label>
                <input
                  className="mt-1 w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  placeholder="e.g., Delhivery, Blue Dart, India Post"
                  value={tForm.carrier}
                  onChange={(e) => setTForm(f => ({ ...f, carrier: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Courier Name (optional)</label>
                <input
                  className="mt-1 w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  placeholder="Shown to customer; defaults to Carrier"
                  value={tForm.courier_name}
                  onChange={(e) => setTForm(f => ({ ...f, courier_name: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Tracking Number</label>
                <input
                  className="mt-1 w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  placeholder="AWB / Consignment ID"
                  value={tForm.tracking_number}
                  onChange={(e) => setTForm(f => ({ ...f, tracking_number: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Tracking URL (optional)</label>
                <input
                  className="mt-1 w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  placeholder="https://tracking.example.com/your-code"
                  value={tForm.tracking_url}
                  onChange={(e) => setTForm(f => ({ ...f, tracking_url: e.target.value }))}
                />
                <p className="text-xs text-gray-500 mt-1">If empty, customers can still search the carrier site with the tracking number.</p>
              </div>

              {tErrors && <div className="text-sm text-red-600">{tErrors}</div>}
            </div>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                onClick={() => setTrackingFor(null)}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
                disabled={trackingSaving}
              >
                Cancel
              </button>
              <button
                onClick={saveTracking}
                disabled={trackingSaving}
                className="inline-flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
              >
                {trackingSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                Save Tracking
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
