// src/services/adminStats.ts
import supabase from '../lib/supabase'

type ByStatus = Record<string, number>

function startOfTodayISO() {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d.toISOString()
}
function daysAgoISO(days: number) {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return d.toISOString()
}

/** Utility: count docs with optional filter */
async function countRows(table: string, filters?: (q: any) => any) {
  let q = supabase.from(table).select('id', { count: 'exact', head: true })
  if (filters) q = filters(q)
  const { count, error } = await q
  if (error) throw error
  return count || 0
}

/** Utility: sum column via narrow select + reduce (portable) */
async function sumColumn(
  table: string,
  col: string,
  filters?: (q: any) => any
): Promise<number> {
  let q = supabase.from(table).select(col)
  if (filters) q = filters(q)
  const { data, error } = await q
  if (error) throw error
  return (data || []).reduce((acc: number, row: any) => acc + (row?.[col] ?? 0), 0)
}

/** Utility: by-status breakdown done client-side (portable & simple) */
async function countByStatus(table: string, statusCol = 'status', filters?: (q: any) => any): Promise<ByStatus> {
  let q = supabase.from(table).select(statusCol)
  if (filters) q = filters(q)
  const { data, error } = await q
  if (error) throw error
  const map: ByStatus = {}
  ;(data || []).forEach((r: any) => {
    const s = (r?.[statusCol] ?? 'unknown') as string
    map[s] = (map[s] || 0) + 1
  })
  return map
}

/* ──────────────────────────────────────────────────────────────────────────
   ORDERS
   - revenue comes from orders.total_inr
   - We consider paid revenue statuses for sums (adjust if your logic differs)
   ────────────────────────────────────────────────────────────────────────── */
export async function getOrderStats() {
  const todayISO = startOfTodayISO()
  const d30 = daysAgoISO(30)

  const revenueStatuses = ['paid', 'processing', 'shipped', 'delivered'] as const

  const [total, today, revenue_total_inr, revenue_30d_inr, by_status] = await Promise.all([
    countRows('orders'),
    countRows('orders', (q) => q.gte('created_at', todayISO)),
    sumColumn('orders', 'total_inr', (q) => q.in('status', revenueStatuses as unknown as string[])),
    sumColumn('orders', 'total_inr', (q) => q.in('status', revenueStatuses as unknown as string[]).gte('created_at', d30)),
    countByStatus('orders'),
  ])

  return {
    total,
    today,
    revenue_total_inr,
    revenue_30d_inr,
    by_status,
  }
}

/* ──────────────────────────────────────────────────────────────────────────
   BOOKINGS
   - Adjust table name/columns if your schema differs.
   - Here revenue comes from bookings.total_inr (rename if required).
   ────────────────────────────────────────────────────────────────────────── */
export async function getBookingStats() {
  const todayISO = startOfTodayISO()
  const d30 = daysAgoISO(30)

  const [total, today, revenue_total_inr, revenue_30d_inr, by_status] = await Promise.all([
    countRows('bookings'),
    countRows('bookings', (q) => q.gte('created_at', todayISO)),
    sumColumn('bookings', 'total_inr'),
    sumColumn('bookings', 'total_inr', (q) => q.gte('created_at', d30)),
    countByStatus('bookings'),
  ])

  return {
    total,
    today,
    revenue_total_inr,
    revenue_30d_inr,
    by_status,
  }
}

/* ──────────────────────────────────────────────────────────────────────────
   RETURNS
   - Counts + by_status
   - Refund amount is not always kept on returns table; we’ll approximate
     as the sum of the parent order’s total_inr * (returned_qty / ordered_qty).
     If you store refunds in a column (e.g., returns.refund_inr), replace the
     computation below with a direct sumColumn on that.
   ────────────────────────────────────────────────────────────────────────── */
export async function getReturnStats() {
  const todayISO = startOfTodayISO()
  const d30 = daysAgoISO(30)

  // Simple counts
  const [total, today, by_status] = await Promise.all([
    countRows('returns'),
    countRows('returns', (q) => q.gte('created_at', todayISO)),
    countByStatus('returns'),
  ])

  // If you track refunds paid in a column on returns, swap this block for:
  // const [refund_total_inr, refund_30d_inr] = await Promise.all([
  //   sumColumn('returns', 'refund_inr', (q) => q.eq('status', 'refunded')),
  //   sumColumn('returns', 'refund_inr', (q) => q.eq('status', 'refunded').gte('created_at', d30)),
  // ])

  // Otherwise: compute an estimate from return_items joined with order_items.
  // We’ll fetch the minimum required fields and aggregate client-side.
  const { data: rItemsAll, error: rItemsAllErr } = await supabase
    .from('return_items')
    .select(`
      qty,
      order_item_id,
      returns!inner ( id, created_at, status, order_id ),
      order_items!inner ( id, qty, price_inr, order_id )
    `)
  if (rItemsAllErr) throw rItemsAllErr

  const allRefundEst = (rItemsAll || []).reduce((sum, row: any) => {
    // refund per line ≈ returned_qty * price_inr (unit)
    const returned = Number(row?.qty || 0)
    const unitPrice = Number(row?.order_items?.price_inr || 0)
    const isRefunded = row?.returns?.status === 'refunded'
    return sum + (isRefunded ? returned * unitPrice : 0)
  }, 0)

  const refund_30d_est = (rItemsAll || []).reduce((sum, row: any) => {
    const createdAt = row?.returns?.created_at ? new Date(row.returns.created_at).toISOString() : null
    const within30 = createdAt && createdAt >= d30
    const isRefunded = row?.returns?.status === 'refunded'
    const returned = Number(row?.qty || 0)
    const unitPrice = Number(row?.order_items?.price_inr || 0)
    return sum + (isRefunded && within30 ? returned * unitPrice : 0)
  }, 0)

  // Open returns = requested/approved/in_transit/received
  const openStatuses = new Set(['requested', 'approved', 'in_transit', 'received'])
  const open = Object.entries(by_status).reduce((acc, [s, c]) => acc + (openStatuses.has(s) ? c : 0), 0)

  return {
    total,
    today,
    by_status,
    refund_total_inr: allRefundEst,
    refund_30d_inr: refund_30d_est,
    open,
  }
}
