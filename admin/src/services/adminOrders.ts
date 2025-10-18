// src/services/adminOrders.ts
import supabase from '../lib/supabase'

export type AdminOrderRow = {
  id: string
  user_id: string
  status: 'pending'|'processing'|'shipped'|'delivered'|'cancelled'
  total_inr: number
  created_at: string
  courier_name: string | null
  tracking_number: string | null
  tracking_url: string | null
  shipped_at: string | null
  delivered_at: string | null
  admin_notes: string | null
  address: {
    id: string
    name: string | null
    phone: string | null
    line1: string | null
    line2: string | null
    city: string | null
    state: string | null
    pincode: string | null
  } | null
  items: Array<{
    id: string
    quantity: number
    price_inr: number
    product: { id: string; name: string; image_url: string | null }
  }>
  buyer?: { email?: string } // optional display
}

export async function getAllOrdersAdmin(): Promise<AdminOrderRow[]> {
  // join orders -> address -> items -> product
  const { data, error } = await supabase
    .from('orders')
    .select(`
      id, user_id, status, total_inr, created_at,
      courier_name, tracking_number, tracking_url, shipped_at, delivered_at, admin_notes,
      address:address_id ( id, name, phone, line1, line2, city, state, pincode ),
      order_items ( id, quantity, price_inr, products ( id, name, image_url ) )
    `)
    .order('created_at', { ascending: false })

  if (error) throw error

  return (data || []).map((o: any) => ({
    id: o.id,
    user_id: o.user_id,
    status: o.status,
    total_inr: o.total_inr,
    created_at: o.created_at,
    courier_name: o.courier_name,
    tracking_number: o.tracking_number,
    tracking_url: o.tracking_url,
    shipped_at: o.shipped_at,
    delivered_at: o.delivered_at,
    admin_notes: o.admin_notes,
    address: o.address // The key is now correctly 'address'
      ? {
          id: o.address.id,
          name: o.address.name,
          phone: o.address.phone,
          line1: o.address.line1,
          line2: o.address.line2,
          city: o.address.city,
          state: o.address.state,
          pincode: o.address.pincode,
        }
      : null,
    items: (o.order_items || []).map((it: any) => ({
      id: it.id,
      quantity: it.quantity,
      price_inr: it.price_inr,
      product: {
        id: it.products?.id,
        name: it.products?.name,
        image_url: it.products?.image_url || null,
      },
    })),
  }))
}

export async function updateOrderStatus(orderId: string, status: AdminOrderRow['status']) {
  const patch: any = { status }
  if (status === 'shipped') patch.shipped_at = new Date().toISOString()
  if (status === 'delivered') patch.delivered_at = new Date().toISOString()

  const { error } = await supabase.from('orders').update(patch).eq('id', orderId)
  if (error) throw error
}

export async function saveTracking(
  orderId: string,
  fields: Partial<Pick<AdminOrderRow,
    'courier_name'|'tracking_number'|'tracking_url'|'admin_notes'
  >>
) {
  const { error } = await supabase.from('orders').update(fields).eq('id', orderId)
  if (error) throw error
}