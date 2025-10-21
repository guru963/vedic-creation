// src/pages/MyOrders.tsx
import React, { useEffect, useMemo, useState } from 'react'
import supabase from '../supabase'
import { getMyOrders } from '../services/orders'
import {
  ChevronDown, Package, Truck, CheckCircle, XCircle, Clock,
  ClipboardCopy, Check, ExternalLink, Undo2, X, Image as ImageIcon,
  Loader2,  Calendar as CalIcon, Shield, RotateCcw,
  MessageCircle, Phone, Mail
} from 'lucide-react'

const money = (n: number) => `₹${(n ?? 0).toLocaleString('en-IN')}`
function sanitizeFilename(name: string) {
  return name.replace(/[^\w.\-]+/g, '_').slice(0, 120)
}
const IMG_FALLBACK = 'https://via.placeholder.com/80?text=Item'

/* =====================
   Config
   ===================== */
const RETURN_WINDOW_DAYS = 7
const STORAGE_BUCKET = 'return-evidence'

/* =====================
   Types
   ===================== */
type OrderItemRow = {
  id: string
  product_id: string
  name_snapshot: string
  price_inr: number
  qty: number
  // we now have a nested product from the join in getMyOrders()
  product?: { id: string; image_url?: string | null } | null
}

type OrderRow = {
  id: string
  status: 'pending'|'paid'|'processing'|'shipped'|'delivered'|'cancelled'
  subtotal_inr: number
  shipping_inr: number
  total_inr: number
  tracking_number?: string | null
  carrier?: string | null
  created_at: string
  shipped_at?: string | null
  delivered_at?: string | null
  tracking_url?: string | null
  courier_name?: string | null
  order_items: OrderItemRow[]
  order_events?: { id: string, event: string, meta: any, created_at: string }[]
  shipping_address?: any
}

type ReturnStatusCustomer =
  | 'requested' | 'approved' | 'rejected'
  | 'in_transit' | 'received' | 'refunded'
  | 'replacement_shipped' | 'replaced'

type ReturnRow = {
  id: string
  order_id: string
  user_id: string
  status: ReturnStatusCustomer
  resolution: 'refund'|'replacement'|'store_credit'
  rma_code: string | null
  notes: string | null
  created_at: string
  replacement_order_id?: string | null
  replacement_shipped_at?: string | null
  replacement_carrier?: string | null
  replacement_awb?: string | null
  replacement_tracking_url?: string | null
}

type ReturnItemRow = {
  id: string
  return_id: string
  order_item_id: string
  product_id: string
  qty: number
  reason_code: string | null
  condition_note: string | null
  evidence_images: string[] | null
  name_snapshot?: string
}

type ReturnableCap = {
  order_item_id: string
  already_returned_qty: number
  remaining_qty: number
}

/* =====================
   Helpers
   ===================== */
const statusConfig = {
  pending:    { color: 'bg-yellow-100 text-yellow-800 border-yellow-200', icon: Clock,      label: 'Pending' },
  paid:       { color: 'bg-blue-100 text-blue-800 border-blue-200',      icon: CheckCircle, label: 'Paid' },
  processing: { color: 'bg-orange-100 text-orange-800 border-orange-200',icon: Package,     label: 'Processing' },
  shipped:    { color: 'bg-purple-100 text-purple-800 border-purple-200',icon: Truck,       label: 'Shipped' },
  delivered:  { color: 'bg-green-100 text-green-800 border-green-200',   icon: CheckCircle, label: 'Delivered' },
  cancelled:  { color: 'bg-red-100 text-red-800 border-red-200',         icon: XCircle,     label: 'Cancelled' }
}

const CARRIER_TEMPLATES = [
  { match: /delhivery/i,                 build: (n: string) => `https://www.delhivery.com/tracking/${encodeURIComponent(n)}` },
  { match: /bluedart|blue\s*dart/i,      build: (n: string) => `https://www.bluedart.com/tracking?trackno=${encodeURIComponent(n)}` },
  { match: /xpressbees|xp[b|ress]/i,     build: (n: string) => `https://www.xpressbees.com/track?awb=${encodeURIComponent(n)}` },
  { match: /ecom\s*express/i,            build: (n: string) => `https://ecomexpress.in/tracking/?awb=${encodeURIComponent(n)}` },
  { match: /dtdc/i,                      build: (n: string) => `https://www.dtdc.in/tracking.asp?cno=${encodeURIComponent(n)}` },
  { match: /india\s*post|speed\s*post/i, build: (_n: string) => `https://www.indiapost.gov.in/_layouts/15/dop.portal.tracking/trackconsignment.aspx` },
  { match: /shadowfax/i,                 build: (n: string) => `https://www.shadowfax.in/track/${encodeURIComponent(n)}` },
  { match: /ekart/i,                     build: (_n: string) => `https://ekartlogistics.com/` },
]

function buildTrackingHref(carrier?: string | null, awb?: string | null, explicit?: string | null) {
  if (explicit && /^https?:\/\//i.test(explicit)) return explicit
  if (!carrier || !awb) return null
  const t = CARRIER_TEMPLATES.find(t => t.match.test(carrier))
  return t ? t.build(awb) : null
}

/* =====================
   Return modal state
   ===================== */
type ReturnLineDraft = {
  order_item_id: string
  product_id: string
  qty: number
  reason_code: string
  condition_note?: string
  images: File[]
}

type ReturnDraft = {
  openForOrderId: string | null
  resolution: 'refund'|'replacement'|'store_credit'
  notes?: string
  lines: ReturnLineDraft[]
  submitting: boolean
  error?: string | null
  successId?: string | null
}

const emptyReturnDraft: ReturnDraft = {
  openForOrderId: null,
  resolution: 'refund',
  notes: '',
  lines: [],
  submitting: false,
  error: null,
  successId: null
}

/* =====================
   Page
   ===================== */
export default function MyOrders() {
  const [rows, setRows] = useState<OrderRow[]>([])
  const [open, setOpen] = useState<Record<string, boolean>>({})
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [draft, setDraft] = useState<ReturnDraft>(emptyReturnDraft)
  const [userId, setUserId] = useState<string | null>(null)
  const [returnsByOrder, setReturnsByOrder] = useState<Record<string, { header: ReturnRow, lines: ReturnItemRow[] }[]>>({})
  const [capsByItem, setCapsByItem] = useState<Record<string, ReturnableCap>>({})
  const [activeTab, setActiveTab] = useState<'all' | 'delivered' | 'processing' | 'cancelled'>('all')

  // Load orders + returns + caps
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setUserId(user.id)

      const data = await getMyOrders()
      const orders = (data as unknown as OrderRow[]) || []
      setRows(orders)

      const orderIds = orders.map(o => o.id)
      if (orderIds.length) {
        await loadReturnsForOrders(user.id, orders)
        await loadReturnableCaps(orders)
      }
    })()
  }, [])

  // ---- Data loaders
  const loadReturnsForOrders = async (uid: string, orders: OrderRow[]) => {
    const orderIds = orders.map(o => o.id)
    const { data: rs } = await supabase
      .from('returns')
      .select('*')
      .eq('user_id', uid)
      .in('order_id', orderIds)
      .order('created_at', { ascending: false })

    const byOrder: Record<string, { header: ReturnRow, lines: ReturnItemRow[] }[]> = {}
    if (rs?.length) {
      const returnIds = rs.map(r => r.id)
      const { data: rls } = await supabase
        .from('return_items')
        .select('*, order_item_id, product_id, qty, reason_code, condition_note, evidence_images')
        .in('return_id', returnIds)

      const itemNameFor = (order_item_id: string) => {
        for (const o of orders) {
          const m = o.order_items.find(i => i.id === order_item_id)
          if (m) return m.name_snapshot
        }
        return undefined
      }

      rs.forEach((r: any) => {
        const lines = (rls || []).filter(li => li.return_id === r.id)
          .map(li => ({ ...li, name_snapshot: itemNameFor(li.order_item_id) }))
        ;(byOrder[r.order_id] ||= []).push({ header: r as ReturnRow, lines })
      })
    }
    setReturnsByOrder(byOrder)
  }

  const refreshOrderReturns = async (orderId: string) => {
    if (!userId) return
    const { data: rs } = await supabase
      .from('returns')
      .select('*')
      .eq('user_id', userId)
      .eq('order_id', orderId)
      .order('created_at', { ascending: false })
    if (!rs) return

    const { data: rls } = await supabase
      .from('return_items')
      .select('*, order_item_id, product_id, qty, reason_code, condition_note, evidence_images')
      .in('return_id', rs.map((r: any) => r.id))

    const order = rows.find(o => o.id === orderId)
    const nameFor = (order_item_id: string) => order?.order_items.find(i => i.id === order_item_id)?.name_snapshot

    setReturnsByOrder(prev => ({
      ...prev,
      [orderId]: rs.map((r: any) => ({
        header: r as ReturnRow,
        lines: (rls || []).filter(li => li.return_id === r.id).map(li => ({ ...li, name_snapshot: nameFor(li.order_item_id) }))
      }))
    }))
  }

  const loadReturnableCaps = async (orders: OrderRow[]) => {
    const allItemIds = orders.flatMap(o => o.order_items.map(i => i.id))
    if (!allItemIds.length) return
    const { data: caps } = await supabase
      .from('returnable_items_v') // optional view
      .select('order_item_id, already_returned_qty, remaining_qty')
      .in('order_item_id', allItemIds)
    if (!caps) return
    const map: Record<string, ReturnableCap> = {}
    caps.forEach((c: any) => { map[c.order_item_id] = c })
    setCapsByItem(map)
  }

  // ---- Misc helpers
  const toggle = (id: string) => setOpen(p => ({ ...p, [id]: !p[id] }))
  const formatDate = (s: string) => new Date(s).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
  const formatDateTime = (s: string) => new Date(s).toLocaleString('en-IN')

  const copyAwb = async (order: OrderRow) => {
    const label = order.courier_name || order.carrier || 'Carrier'
    const num = order.tracking_number || ''
    const url = order.tracking_url || buildTrackingHref(order.carrier || order.courier_name, order.tracking_number, order.tracking_url) || ''
    const text = [label, num ? `#${num}` : null, url || null].filter(Boolean).join(' • ')
    try {
      await navigator.clipboard.writeText(text)
      setCopiedId(order.id)
      setTimeout(() => setCopiedId(null), 1200)
    } catch {}
  }

  const withinReturnWindow = (o: OrderRow) => {
    if (!o.delivered_at) return false
    const delivered = new Date(o.delivered_at).getTime()
    return (Date.now() - delivered) / (1000 * 60 * 60 * 24) <= RETURN_WINDOW_DAYS
  }

  const remainingQtyForOrder = (order: OrderRow) =>
    order.order_items.reduce((sum, it) => {
      const cap = capsByItem[it.id]?.remaining_qty
      const remain = typeof cap === 'number' ? cap : it.qty
      return sum + Math.max(0, remain)
    }, 0)

  const getOrderReturnAggregate = (orderId: string): 'none' | 'open' | 'completed' | 'rejected_only' => {
    const list = returnsByOrder[orderId] || []
    if (!list.length) return 'none'
    const statuses = new Set(list.map(r => r.header.status))
    if (statuses.has('refunded') || statuses.has('replacement_shipped') || statuses.has('replaced')) return 'completed'
    if (['requested','approved','in_transit','received'].some(s => statuses.has(s as ReturnStatusCustomer))) return 'open'
    return 'rejected_only'
  }

  // CTA for return
  const getReturnCTA = (order: OrderRow) => {
    const inWindow = withinReturnWindow(order)
    const remainQty = remainingQtyForOrder(order)
    const agg = getOrderReturnAggregate(order.id)

    if (!inWindow)  return { disabled: true,  label: 'Return Window Closed', tooltip: `Returns allowed within ${RETURN_WINDOW_DAYS} days of delivery`, variant: 'disabled' as const }
    if (remainQty <= 0) return { disabled: true,  label: 'Already Returned',   tooltip: 'All items are already returned', variant: 'disabled' as const }
    if (agg === 'open') return { disabled: true,  label: 'Return In Progress',  tooltip: 'Your return request is being processed', variant: 'in_progress' as const }
    if (agg === 'completed') return { disabled: true,  label: 'Return Completed', tooltip: 'A return has already been completed for this order', variant: 'completed' as const }
    return { disabled: false, label: 'Return or Replace Items', tooltip: `Eligible within ${RETURN_WINDOW_DAYS} days of delivery`, variant: 'active' as const }
  }

  const startReturnFor = (order: OrderRow) => {
    const { disabled } = getReturnCTA(order)
    if (disabled) return

    const lines: ReturnLineDraft[] = order.order_items.map(it => {
      const cap = capsByItem[it.id]?.remaining_qty
      const maxRemain = typeof cap === 'number' ? cap : it.qty
      console.log({ it, cap, maxRemain })
      return {
        order_item_id: it.id,
        product_id: it.product_id,
        qty: 0,
        reason_code: 'not_as_described',
        condition_note: '',
        images: [],
      }
    })

    setDraft({
      openForOrderId: order.id,
      resolution: 'refund',
      notes: '',
      lines,
      submitting: false,
      error: null,
      successId: null
    })
  }

  // Components
  const OrderStatusBadge = ({ status }: { status: OrderRow['status'] }) => {
    const config = statusConfig[status]
    const Icon = config.icon
    return (
      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium border ${config.color}`}>
        <Icon className="h-3 w-3" />
        {config.label}
      </span>
    )
  }

  const ReturnStatusBadge = ({ status }: { status: ReturnStatusCustomer }) => {
    const styles = {
      requested: 'bg-yellow-50 text-yellow-800 border-yellow-200',
      approved: 'bg-blue-50 text-blue-800 border-blue-200',
      in_transit: 'bg-purple-50 text-purple-800 border-purple-200',
      received: 'bg-amber-50 text-amber-800 border-amber-200',
      refunded: 'bg-green-50 text-green-800 border-green-200',
      replacement_shipped: 'bg-green-50 text-green-800 border-green-200',
      replaced: 'bg-green-50 text-green-800 border-green-200',
      rejected: 'bg-red-50 text-red-800 border-red-200',
    }
    const labels = {
      requested: 'Return Requested',
      approved: 'Approved • Pickup Scheduled',
      in_transit: 'Return In Transit',
      received: 'Received at Warehouse',
      refunded: 'Refund Processed',
      replacement_shipped: 'Replacement Shipped',
      replaced: 'Item Replaced',
      rejected: 'Return Rejected',
    }
    return (
      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium border ${styles[status]}`}>
        <RotateCcw className="h-3 w-3" />
        {labels[status]}
      </span>
    )
  }

  const ActionButton = ({
    children, variant = 'primary', onClick, disabled = false, className = '', size = 'md'
  }: {
    children: React.ReactNode
    variant?: 'primary' | 'secondary' | 'outline' | 'danger'
    onClick?: () => void
    disabled?: boolean
    className?: string
    size?: 'sm' | 'md' | 'lg'
  }) => {
    const sizeStyles = { sm: 'px-3 py-1.5 text-xs', md: 'px-4 py-2 text-sm', lg: 'px-6 py-3 text-base' }
    const base = 'inline-flex items-center gap-2 rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed'
    const variants = {
      primary: 'bg-orange-600 text-white hover:bg-orange-700 shadow-sm',
      secondary: 'bg-gray-100 text-gray-700 hover:bg-gray-200',
      outline: 'border border-gray-300 text-gray-700 hover:bg-gray-50',
      danger: 'bg-red-600 text-white hover:bg-red-700'
    }
    return (
      <button className={`${base} ${sizeStyles[size]} ${variants[variant]} ${className}`} onClick={onClick} disabled={disabled}>
        {children}
      </button>
    )
  }

  const getReplacementForOrder = (orderId: string) => {
    const list = returnsByOrder[orderId] || []
    return list.find(r => r.header.replacement_shipped_at)
  }

  const TrackingCard = ({ order, type = 'original' }: { order: OrderRow, type?: 'original' | 'replacement' }) => {
    const isReplacement = type === 'replacement'
    const Rrepl = isReplacement ? getReplacementForOrder(order.id) : null
    if (isReplacement && !Rrepl) return null

    const trackingData = isReplacement ? {
      carrier: Rrepl!.header.replacement_carrier,
      number: Rrepl!.header.replacement_awb,
      url: Rrepl!.header.replacement_tracking_url,
      shippedAt: Rrepl!.header.replacement_shipped_at,
      label: 'Replacement Shipment'
    } : {
      carrier: order.courier_name || order.carrier,
      number: order.tracking_number,
      url: order.tracking_url,
      shippedAt: order.shipped_at,
      label: 'Tracking Information'
    }

    const href = buildTrackingHref(trackingData.carrier, trackingData.number, trackingData.url)
    const bgColor = isReplacement ? 'bg-green-50 border-green-200' : 'bg-blue-50 border-blue-200'
    const textColor = isReplacement ? 'text-green-900' : 'text-blue-900'

    return (
      <div className={`p-4 rounded-lg border ${bgColor}`}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <Truck className={`h-4 w-4 ${textColor}`} />
              <div className={`text-sm font-semibold ${textColor}`}>{trackingData.label}</div>
            </div>
            <div className="space-y-1">
              <div className="text-sm"><span className="font-medium">Carrier:</span> {trackingData.carrier || 'Not specified'}</div>
              {trackingData.number && (<div className="text-sm"><span className="font-medium">Tracking #:</span> {trackingData.number}</div>)}
              {trackingData.shippedAt && (<div className="text-sm"><span className="font-medium">Shipped:</span> {formatDateTime(trackingData.shippedAt)}</div>)}
              {!isReplacement && order.delivered_at && (<div className="text-sm"><span className="font-medium">Delivered:</span> {formatDateTime(order.delivered_at)}</div>)}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <ActionButton variant="outline" onClick={() => copyAwb(order)} size="sm">
              {copiedId === order.id ? <Check className="h-3 w-3" /> : <ClipboardCopy className="h-3 w-3" />}
              {copiedId === order.id ? 'Copied' : 'Copy'}
            </ActionButton>
            {href && (
              <a href={href} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 px-3 py-1.5 text-xs border rounded-lg border-gray-300 hover:bg-gray-50 text-gray-700">
                Track <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>
        </div>
      </div>
    )
  }

  const ReturnRequestCard = ({ order }: { order: OrderRow }) => {
    const cta = getReturnCTA(order)
    const returnList = returnsByOrder[order.id] || []

    return (
      <div className="bg-white border rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h4 className="font-semibold text-gray-900 text-lg">Returns & Refunds</h4>
            <p className="text-sm text-gray-500 mt-1">Manage your returns and replacements</p>
          </div>
        {returnList.length > 0 && (
          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
            {returnList.length} request{returnList.length > 1 ? 's' : ''}
          </span>
        )}
        </div>

        {returnList.length === 0 ? (
          <div className="text-center py-6">
            <RotateCcw className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 text-sm mb-4">No return requests for this order</p>
            <ActionButton variant="outline" onClick={() => startReturnFor(order)} disabled={cta.disabled}>
              <Undo2 className="h-4 w-4" />
              {cta.label}
            </ActionButton>
            {cta.tooltip && <p className="text-xs text-gray-400 mt-2">{cta.tooltip}</p>}
          </div>
        ) : (
          <div className="space-y-4">
            {returnList.map(R => (
              <div key={R.header.id} className="border rounded-lg p-4 hover:border-gray-300 transition-colors">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="font-semibold text-gray-900">
                      Return #{R.header.rma_code || R.header.id.slice(0, 8).toUpperCase()}
                    </div>
                    <div className="text-sm text-gray-500 mt-1">
                      Created on {formatDateTime(R.header.created_at)}
                    </div>
                  </div>
                  <ReturnStatusBadge status={R.header.status} />
                </div>

                <div className="space-y-3">
                  <div>
                    <div className="font-medium text-gray-900 text-sm mb-2">Items Returning</div>
                    <div className="space-y-2">
                      {R.lines.map(li => (
                        <div key={li.id} className="flex items-center justify-between text-sm">
                          <div className="flex-1">
                            <span className="font-medium text-gray-900">{li.name_snapshot || 'Item'}</span>
                            <span className="text-gray-500 ml-2">× {li.qty}</span>
                            {li.reason_code && (
                              <span className="text-gray-500 ml-2">• {li.reason_code.replace(/_/g, ' ')}</span>
                            )}
                          </div>
                          {li.evidence_images?.length && (
                            <div className="flex gap-1">
                              {li.evidence_images.map((url, i) => (
                                <a key={i} href={url} target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:underline">
                                  Photo {i + 1}
                                </a>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {R.header.notes && (
                    <div className="bg-gray-50 p-3 rounded text-sm">
                      <div className="font-medium text-gray-700 mb-1">Your Note:</div>
                      <div className="text-gray-600">{R.header.notes}</div>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {cta.variant === 'active' && (
              <ActionButton variant="outline" onClick={() => startReturnFor(order)} className="w-full">
                <Undo2 className="h-4 w-4" />
                Request Another Return
              </ActionButton>
            )}
          </div>
        )}
      </div>
    )
  }

  // Filtered orders (tabs)
  const filteredOrders = useMemo(() => {
    switch (activeTab) {
      case 'delivered':  return rows.filter(o => o.status === 'delivered')
      case 'processing': return rows.filter(o => ['pending','paid','processing','shipped'].includes(o.status))
      case 'cancelled':  return rows.filter(o => o.status === 'cancelled')
      default:           return rows
    }
  }, [rows, activeTab])

  // Submit return
  const submitReturn = async () => {
    if (!userId || !draft.openForOrderId) return
    setDraft(d => ({ ...d, submitting: true, error: null, successId: null }))

    try {
      // 1) create return
      const { data: retIns, error: retErr } = await supabase
        .from('returns')
        .insert([{
          user_id: userId,
          order_id: draft.openForOrderId,
          resolution: draft.resolution,
          notes: (draft.notes || '').trim(),
          status: 'requested'
        }])
        .select('id, rma_code')
        .single()
      if (retErr || !retIns) throw retErr || new Error('Failed to create return')

      const returnId = retIns.id as string
      const rmaCode = (retIns as any).rma_code as string | undefined

      // 2) lines
      const orderForDraft = rows.find(o => o.id === draft.openForOrderId)
      const linesToInsert = draft.lines
        .map(l => {
          const cap = capsByItem[l.order_item_id]?.remaining_qty
          const fallbackQty = orderForDraft?.order_items.find(i => i.id === l.order_item_id)?.qty ?? 0
          const maxRemain = typeof cap === 'number' ? cap : fallbackQty
          const qty = Math.min(Math.max(0, l.qty), maxRemain)
          return { ...l, qty }
        })
        .filter(l => l.qty > 0)
        .map(l => ({
          return_id: returnId,
          order_item_id: l.order_item_id,
          product_id: l.product_id,
          qty: l.qty,
          reason_code: l.reason_code || 'other',
          condition_note: (l.condition_note || '').trim(),
          evidence_images: [] as string[]
        }))
      if (!linesToInsert.length) throw new Error('Please select at least one item and quantity')

      const { error: liErr } = await supabase.from('return_items').insert(linesToInsert)
      if (liErr) throw liErr

      // 3) upload images
      for (const ln of draft.lines) {
        if (!ln.qty || !ln.images.length) continue
        const { data: retItemRow, error: fetchLineErr } = await supabase
          .from('return_items')
          .select('id')
          .eq('return_id', returnId)
          .eq('order_item_id', ln.order_item_id)
          .single()
        if (fetchLineErr || !retItemRow) throw fetchLineErr || new Error('Return line not found after insert')

        const uploadedUrls: string[] = []
        for (const file of ln.images) {
          const ext = (file.name.split('.').pop() || 'jpg').toLowerCase()
          const key = `${userId}/${rmaCode ?? returnId}/${retItemRow.id}/${Date.now()}_${sanitizeFilename(file.name)}`
          const { error: upErr } = await supabase.storage.from(STORAGE_BUCKET).upload(key, file, {
            upsert: false,
            contentType: file.type || (ext === 'png' ? 'image/png' : 'image/jpeg')
          })
          if (upErr) throw upErr
          const { data: pub } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(key)
          if (pub?.publicUrl) uploadedUrls.push(pub.publicUrl)
        }

        if (uploadedUrls.length) {
          const { error: updErr } = await supabase
            .from('return_items')
            .update({ evidence_images: uploadedUrls })
            .eq('id', retItemRow.id)
          if (updErr) throw updErr
        }
      }

      setDraft(d => ({ ...d, submitting: false, successId: returnId }))
      await refreshOrderReturns(draft.openForOrderId)
      await loadReturnableCaps(rows)
    } catch (e: any) {
      setDraft(d => ({ ...d, submitting: false, error: e?.message ?? 'Request failed' }))
    }
  }

  const canSubmit = useMemo(() => {
    if (!draft.openForOrderId) return false
    const hasLine = draft.lines.some(l => l.qty > 0)
    return hasLine && !draft.submitting
  }, [draft])

  const reasons = [
    { code: 'damaged', label: 'Damaged on arrival' },
    { code: 'wrong_item', label: 'Wrong item received' },
    { code: 'not_as_described', label: 'Not as described' },
    { code: 'quality_issue', label: 'Quality issue' },
    { code: 'size_fit', label: 'Size/fit issue' },
    { code: 'other', label: 'Other' },
  ]

  const resolutions = [
    { code: 'refund', label: 'Refund', desc: 'Money back to original payment' },
    { code: 'replacement', label: 'Replacement', desc: 'Receive a new item' },
    { code: 'store_credit', label: 'Store Credit', desc: 'Instant credit for future purchases' },
  ]
  console.log(resolutions);

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">My Orders</h1>
              <p className="text-gray-600 mt-2">Track, manage, and return your orders</p>
            </div>
            <div className="flex items-center gap-4 text-sm text-gray-500">
              <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg border">
                <Shield className="h-4 w-4 text-green-600" />
                <span>Easy Returns</span>
              </div>
              <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg border">
                <CalIcon className="h-4 w-4 text-blue-600" />
                <span>{RETURN_WINDOW_DAYS}-Day Window</span>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-sm border mb-6">
          <div className="flex border-b">
            {[
              { id: 'all', label: 'All Orders', count: rows.length },
              { id: 'processing', label: 'Processing', count: rows.filter(o => ['pending','paid','processing','shipped'].includes(o.status)).length },
              { id: 'delivered', label: 'Delivered', count: rows.filter(o => o.status === 'delivered').length },
              { id: 'cancelled', label: 'Cancelled', count: rows.filter(o => o.status === 'cancelled').length },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex-1 px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-orange-500 text-orange-600 bg-orange-50'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center gap-2 justify-center">
                  {tab.label}
                  <span className="bg-gray-200 text-gray-600 px-2 py-1 rounded-full text-xs min-w-6">
                    {tab.count}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Orders List */}
        <div className="space-y-6">
          {filteredOrders.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-xl shadow-sm border">
              <Package className="h-20 w-20 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-lg mb-2">No orders found</p>
              <p className="text-gray-400 text-sm">Your {activeTab !== 'all' ? activeTab : ''} orders will appear here</p>
            </div>
          ) : (
            filteredOrders.map(order => {
              const isOpen = open[order.id]
              const cta = getReturnCTA(order)
              const Rrepl = getReplacementForOrder(order.id)

              return (
                <div key={order.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                  {/* Order Header */}
                  <div className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <button
                          onClick={() => toggle(order.id)}
                          className={`p-2 rounded-lg transition-all ${isOpen ? 'bg-orange-100 text-orange-600' : 'hover:bg-gray-100 text-gray-600'}`}
                        >
                          <ChevronDown className={`h-5 w-5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                        </button>

                        <div>
                          <div className="flex items-center gap-3 mb-1">
                            <h3 className="font-semibold text-gray-900 text-lg">Order #{order.id.slice(-8)}</h3>
                            <OrderStatusBadge status={order.status} />
                          </div>
                          <p className="text-sm text-gray-500">
                            Placed on {formatDate(order.created_at)} • {order.order_items.length} item{order.order_items.length !== 1 ? 's' : ''} • Total {money(order.total_inr)}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <ActionButton
                          variant={cta.variant === 'active' ? 'outline' : 'secondary'}
                          onClick={() => startReturnFor(order)}
                          disabled={cta.disabled}
                          size="md"
                        >
                          <Undo2 className="h-4 w-4" />
                          {cta.label}
                        </ActionButton>

                        <div className="text-right">
                          <div className="text-xl font-bold text-gray-900">{money(order.total_inr)}</div>
                          <button onClick={() => toggle(order.id)} className="text-sm text-orange-600 hover:text-orange-700 font-medium">
                            {isOpen ? 'Hide details' : 'View details'}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Order Details */}
                  {isOpen && (
                    <div className="border-t border-gray-200 bg-gray-50 p-8">
                      <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
                        {/* Left: Items + Summary + Tracking + Returns */}
                        <div className="xl:col-span-3 space-y-6">
                          {/* Order Items */}
                          <div className="bg-white rounded-lg border border-gray-200 p-6">
                            <h4 className="font-semibold text-gray-900 text-lg mb-4">Order Items</h4>
                            <div className="overflow-x-auto">
                              <table className="w-full">
                                <thead className="bg-gray-50">
                                  <tr>
                                    <th className="text-left p-3 text-sm font-medium text-gray-700">Item</th>
                                    <th className="text-center p-3 text-sm font-medium text-gray-700">Qty</th>
                                    <th className="text-center p-3 text-sm font-medium text-gray-700">Returnable</th>
                                    <th className="text-right p-3 text-sm font-medium text-gray-700">Price</th>
                                    <th className="text-right p-3 text-sm font-medium text-gray-700">Total</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                  {order.order_items.map(item => {
                                    const cap = capsByItem[item.id]
                                    const remaining = Math.max(0, cap?.remaining_qty ?? item.qty)
                                    return (
                                      <tr key={item.id} className="hover:bg-gray-50">
                                        <td className="p-3">
                                          <div className="flex items-center gap-3">
                                            <img
                                              src={item.product?.image_url || IMG_FALLBACK}
                                              onError={(e) => { (e.currentTarget as HTMLImageElement).src = IMG_FALLBACK }}
                                              alt={item.name_snapshot}
                                              className="w-12 h-12 rounded-md object-cover border border-gray-200 flex-shrink-0"
                                            />
                                            <div className="text-sm font-medium text-gray-900">{item.name_snapshot}</div>
                                          </div>
                                        </td>
                                        <td className="p-3 text-sm text-gray-700 text-center">{item.qty}</td>
                                        <td className="p-3 text-sm text-gray-700 text-center">
                                          {remaining > 0 ? (
                                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-green-50 text-green-700 border border-green-200">
                                              {remaining} left
                                            </span>
                                          ) : (
                                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-600 border border-gray-200">
                                              None
                                            </span>
                                          )}
                                        </td>
                                        <td className="p-3 text-sm text-gray-700 text-right">{money(item.price_inr)}</td>
                                        <td className="p-3 text-sm font-semibold text-gray-900 text-right">{money(item.price_inr * item.qty)}</td>
                                      </tr>
                                    )
                                  })}
                                </tbody>
                              </table>
                            </div>
                          </div>

                          {/* Order Summary */}
                          <div className="bg-white rounded-lg border border-gray-200 p-6">
                            <h4 className="font-semibold text-gray-900 text-lg mb-4">Order Summary</h4>
                            <div className="space-y-3 text-sm">
                              <div className="flex justify-between"><span className="text-gray-600">Items Total</span><span className="font-medium">{money(order.subtotal_inr)}</span></div>
                              <div className="flex justify-between"><span className="text-gray-600">Delivery</span><span className="font-medium">{money(order.shipping_inr)}</span></div>
                              <div className="border-t pt-3 flex justify-between text-base font-semibold"><span>Grand Total</span><span>{money(order.total_inr)}</span></div>
                            </div>
                          </div>

                          {/* Tracking cards */}
                          {(order.tracking_number || order.tracking_url || order.carrier) && (
                            <TrackingCard order={order} type="original" />
                          )}
                          {Rrepl && <TrackingCard order={order} type="replacement" />}

                          {/* Returns */}
                          <ReturnRequestCard order={order} />
                        </div>

                        {/* Right: Timeline & Support */}
                        <div className="space-y-6">
                          {/* Simple order timeline */}
                          <div className="bg-white rounded-lg border border-gray-200 p-6">
                            <h4 className="font-semibold text-gray-900 text-lg mb-4">Order Timeline</h4>
                            <div className="space-y-4">
                              {[
                                { event: 'Order Placed', date: order.created_at, icon: Clock, status: 'completed' },
                                ...(order.shipped_at ? [{ event: 'Shipped', date: order.shipped_at, icon: Truck, status: 'completed' }] : []),
                                ...(order.delivered_at ? [{ event: 'Delivered', date: order.delivered_at, icon: CheckCircle, status: 'completed' }] : []),
                              ].map((item, idx) => (
                                <div key={idx} className="flex items-start gap-3">
                                  <div className={`w-2 h-2 rounded-full mt-2 ${item.status === 'completed' ? 'bg-green-500' : 'bg-gray-300'}`} />
                                  <div className="flex-1">
                                    <div className="text-sm font-medium text-gray-900">{item.event}</div>
                                    <div className="text-xs text-gray-500 mt-1">{formatDateTime(item.date)}</div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Help */}
                          <div className="bg-orange-50 border border-orange-200 rounded-lg p-6">
                            <h4 className="font-semibold text-orange-900 text-lg mb-3">Need Help?</h4>
                            <div className="space-y-3">
                              <button className="w-full flex items-center gap-3 p-3 bg-white rounded-lg border border-orange-200 hover:border-orange-300">
                                <MessageCircle className="h-5 w-5 text-orange-600" />
                                <span className="text-sm font-medium text-orange-900">Chat with Support</span>
                              </button>
                              <button className="w-full flex items-center gap-3 p-3 bg-white rounded-lg border border-orange-200 hover:border-orange-300">
                                <Phone className="h-5 w-5 text-orange-600" />
                                <span className="text-sm font-medium text-orange-900">Call Support</span>
                              </button>
                              <button className="w-full flex items-center gap-3 p-3 bg-white rounded-lg border border-orange-200 hover:border-orange-300">
                                <Mail className="h-5 w-5 text-orange-600" />
                                <span className="text-sm font-medium text-orange-900">Email Support</span>
                              </button>
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

      {/* Return Modal */}
      {draft.openForOrderId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b">
              <div className="flex items-center gap-3">
                <Undo2 className="h-6 w-6 text-orange-600" />
                <div>
                  <h3 className="text-xl font-semibold">Return Items</h3>
                  <p className="text-sm text-gray-500">Select items you want to return or replace</p>
                </div>
              </div>
              <button onClick={() => setDraft(emptyReturnDraft)} className="p-2 rounded-lg hover:bg-gray-100">
                <X className="h-5 w-5 text-gray-600" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-auto p-6 space-y-6">
              {/* Resolution */}
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                <label className="block text-sm font-medium text-orange-900 mb-3">What would you like to do?</label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {[
                    { code: 'refund', label: 'Refund', desc: 'Money back to original payment' },
                    { code: 'replacement', label: 'Replacement', desc: 'Receive a new item' },
                    { code: 'store_credit', label: 'Store Credit', desc: 'Instant credit for future purchases' },
                  ].map(r => (
                    <button
                      key={r.code}
                      onClick={() => setDraft(d => ({ ...d, resolution: r.code as ReturnDraft['resolution'] }))}
                      className={`p-4 rounded-lg border text-left transition-all ${
                        draft.resolution === r.code
                          ? 'border-orange-500 bg-white shadow-sm ring-2 ring-orange-500/20'
                          : 'border-gray-300 hover:border-gray-400 bg-white'
                      }`}
                    >
                      <div className="font-semibold text-gray-900">{r.label}</div>
                      <div className="text-xs text-gray-500 mt-1">{r.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Tell us more about the issue</label>
                <textarea
                  value={draft.notes}
                  onChange={(e) => setDraft(d => ({ ...d, notes: e.target.value }))}
                  rows={3}
                  className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  placeholder="Describe the issue with the product..."
                />
                <p className="text-xs text-gray-500 mt-1">This helps us resolve your concern faster.</p>
              </div>

              {/* Lines */}
              <div>
                <h4 className="text-sm font-semibold text-gray-900 mb-4">Select items to return</h4>
                <div className="space-y-4">
                  {draft.lines.map((ln, idx) => {
                    const order = rows.find(o => o.id === draft.openForOrderId)
                    const oi = order?.order_items.find(i => i.id === ln.order_item_id)
                    const cap = capsByItem[ln.order_item_id]
                    const maxRemain = Math.max(0, cap?.remaining_qty ?? (oi?.qty ?? 0))
                    const selected = ln.qty > 0

                    return (
                      <div key={ln.order_item_id} className={`border rounded-xl p-4 ${maxRemain === 0 ? 'opacity-60' : ''}`}>
                        <div className="flex items-center gap-3 mb-3">
                          <input
                            type="checkbox"
                            className="h-5 w-5 text-orange-600 rounded border-gray-300 focus:ring-orange-500"
                            checked={selected}
                            disabled={maxRemain === 0}
                            onChange={(e) => {
                              const checked = e.target.checked
                              setDraft(d => {
                                const qty = checked ? Math.min(1, maxRemain) : 0
                                return { ...d, lines: d.lines.map((l, i) => i === idx ? { ...l, qty } : l) }
                              })
                            }}
                          />
                          <img
                            src={oi?.product?.image_url || IMG_FALLBACK}
                            onError={(e) => { (e.currentTarget as HTMLImageElement).src = IMG_FALLBACK }}
                            alt={oi?.name_snapshot || 'Item'}
                            className="w-10 h-10 rounded-md object-cover border border-gray-200"
                          />
                          <div className="text-sm font-medium text-gray-900 flex-1">{oi?.name_snapshot || 'Item'}</div>
                          <div className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                            {maxRemain > 0 ? `Can return ${maxRemain}` : `Fully returned`}
                          </div>
                        </div>

                        {selected && (
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-start">
                            {/* Qty */}
                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1">Quantity</label>
                              <input
                                type="number"
                                min={1}
                                max={maxRemain}
                                value={ln.qty}
                                onChange={(e) => {
                                  const v = Math.max(1, Math.min(Number(e.target.value) || 1, maxRemain))
                                  setDraft(d => ({ ...d, lines: d.lines.map((l, i) => i === idx ? { ...l, qty: v } : l) }))
                                }}
                                className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                              />
                            </div>

                            {/* Reason */}
                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1">Reason for return</label>
                              <select
                                value={ln.reason_code}
                                onChange={(e) => setDraft(d => ({ ...d, lines: d.lines.map((l, i) => i === idx ? { ...l, reason_code: e.target.value } : l) }))}
                                className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                              >
                                {reasons.map(r => <option key={r.code} value={r.code}>{r.label}</option>)}
                              </select>
                            </div>

                            {/* Condition */}
                            <div className="lg:col-span-2">
                              <label className="block text-xs font-medium text-gray-600 mb-1">Condition details</label>
                              <input
                                value={ln.condition_note || ''}
                                onChange={(e) => setDraft(d => ({ ...d, lines: d.lines.map((l, i) => i === idx ? { ...l, condition_note: e.target.value } : l) }))}
                                placeholder="e.g., Box opened but product unused"
                                className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                              />
                            </div>

                            {/* Photos */}
                            <div className="md:col-span-2 lg:col-span-4">
                              <label className="block text-xs font-medium text-gray-600 mb-2">Add photos (optional)</label>
                              <div className="flex items-center gap-3 flex-wrap">
                                <label className="inline-flex items-center gap-2 px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg text-sm cursor-pointer hover:border-orange-400 hover:bg-orange-50 transition-colors">
                                  <ImageIcon className="h-4 w-4 text-gray-600" />
                                  Add images
                                  <input
                                    type="file"
                                    accept="image/*"
                                    multiple
                                    className="hidden"
                                    onChange={(e) => {
                                      const files = e.target.files
                                      if (!files || !files.length) return
                                      setDraft(d => ({
                                        ...d,
                                        lines: d.lines.map((l, i) =>
                                          i === idx ? { ...l, images: [...(l.images ?? []), ...Array.from(files)] } : l
                                        )
                                      }))
                                    }}
                                  />
                                </label>
                                {!!ln.images.length && (
                                  <div className="flex flex-wrap gap-2">
                                    {ln.images.map(f => (
                                      <div key={f.name} className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2 text-xs bg-white">
                                        <span className="truncate max-w-[140px]">{f.name}</span>
                                        <button
                                          onClick={() => setDraft(d => ({
                                            ...d,
                                            lines: d.lines.map((l, i) =>
                                              i === idx ? { ...l, images: l.images.filter(ff => ff.name !== f.name) } : l
                                            )
                                          }))} className="p-1 rounded hover:bg-gray-100" title="Remove">
                                          <X className="h-3.5 w-3.5 text-gray-500" />
                                        </button>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>

                <div className="text-xs text-gray-500 mt-3 bg-blue-50 p-3 rounded-lg border border-blue-200">
                  <div className="font-medium text-blue-900 mb-1">Return Policy</div>
                  <p>Returns are accepted within {RETURN_WINDOW_DAYS} days of delivery. Items should be in original condition with tags attached. Refunds will be processed after quality check.</p>
                </div>
              </div>

              {/* Error / Success */}
              {draft.error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
                  <div className="font-medium">Unable to process return</div>
                  <div className="mt-1">{draft.error}</div>
                </div>
              )}
              {draft.successId && (
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-sm text-green-800">
                  <div className="font-medium">Return request submitted successfully!</div>
                  <div className="mt-1">We’ve sent a confirmation email with next steps.</div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-6 border-t bg-gray-50">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-600">Need help? Contact our support team for assistance.</div>
                <div className="flex items-center gap-3">
                  <ActionButton variant="outline" onClick={() => setDraft(emptyReturnDraft)} disabled={draft.submitting}>
                    Cancel
                  </ActionButton>
                  <ActionButton onClick={submitReturn} disabled={!canSubmit} className="min-w-[160px]">
                    {draft.submitting ? (<><Loader2 className="h-4 w-4 animate-spin" /> Processing…</>) : (<><Check className="h-4 w-4" /> Submit Return Request</>)}
                  </ActionButton>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
