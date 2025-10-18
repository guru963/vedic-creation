// src/services/orders.ts
import supabase from '../supabase'

export type Address = {
  id: string
  full_name: string
  phone: string
  line1: string
  line2?: string | null
  city: string
  state: string
  postal_code: string
  country: string
  is_default: boolean
}

export type CartLine = {
  product_id: string
  name: string
  price_inr: number
  qty: number
}

export async function getMyAddresses() {
  const { data, error } = await supabase
    .from('addresses')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data as Address[]
}

/** USER: list my orders (includes shipped_at/delivered_at + tracking fields)
 *  NOTE: we join order_items → products to fetch product.image_url for the UI
 */
export async function getMyOrders() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data, error } = await supabase
    .from('orders')
    .select(`
      id,
      status,
      subtotal_inr,
      shipping_inr,
      total_inr,
      created_at,
      tracking_number,
      tracking_url,
      carrier,
      courier_name,
      shipped_at,
      delivered_at,
      order_items (
        id,
        product_id,
        name_snapshot,
        price_inr,
        qty,
        product:products (
          id,
          image_url
        )
      ),
      order_events (
        id, event, meta, created_at
      )
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data
}

export async function addAddress(a: Omit<Address, 'id' | 'is_default'> & { is_default?: boolean }) {
  const { data: user } = await supabase.auth.getUser()
  if (!user.user) throw new Error('Not authenticated')
  const { data, error } = await supabase
    .from('addresses')
    .insert([{ ...a, user_id: user.user.id, is_default: a.is_default ?? false }])
    .select()
    .single()
  if (error) throw error
  return data as Address
}

export async function placeOrder(addressId: string, cart: CartLine[], notes?: string) {
  const payload = cart.map((c) => ({
    product_id: c.product_id,
    name_snapshot: c.name,
    price_inr: c.price_inr,
    qty: c.qty,
  }))
  const { data, error } = await supabase.rpc('place_order', {
    p_address_id: addressId,
    p_items: payload,
    p_notes: notes ?? null,
  })
  if (error) throw error
  return data as string // order id
}

/** ADMIN: list orders (add timestamp + tracking fields so admin sees them too) */
export async function adminListOrders() {
  const { data, error } = await supabase
    .from('orders')
    .select(`
      id, status, subtotal_inr, shipping_inr, total_inr, tracking_number, carrier, created_at,
      shipped_at, delivered_at, tracking_url, courier_name,
      user_id,
      order_items (id, product_id, name_snapshot, price_inr, qty)
    `)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

/**
 * ADMIN: update order status.
 * - Sets shipped_at when status=shipped (and updates tracking fields if provided)
 * - Sets delivered_at when status=delivered
 * - Always bumps updated_at
 * - Adds order_events for non-shipping statuses to avoid duplicate timeline items
 *   (MyOrders synthesizes shipped/delivered timeline rows from the columns).
 */
export async function adminUpdateOrderStatus(
  orderId: string,
  status: 'pending'|'paid'|'processing'|'shipped'|'delivered'|'cancelled',
  tracking?: { carrier?: string, number?: string, url?: string, courier_name?: string }
) {
  const nowISO = new Date().toISOString()

  const patch: Record<string, any> = {
    status,
    updated_at: nowISO,
  }

  // tracking fields (optional inputs)
  if (typeof tracking?.carrier !== 'undefined') patch.carrier = tracking.carrier
  if (typeof tracking?.number !== 'undefined') patch.tracking_number = tracking.number
  if (typeof tracking?.url !== 'undefined') patch.tracking_url = tracking.url
  if (typeof tracking?.courier_name !== 'undefined') patch.courier_name = tracking.courier_name

  // timestamps on certain states
  if (status === 'shipped') {
    patch.shipped_at = nowISO
  } else if (status === 'delivered') {
    patch.delivered_at = nowISO
  }

  const { error } = await supabase
    .from('orders')
    .update(patch)
    .eq('id', orderId)

  if (error) throw error

  // Log events for non-shipping states; shipped/delivered are derived in UI from columns
  if (status !== 'shipped' && status !== 'delivered') {
    await supabase.from('order_events').insert([{
      order_id: orderId,
      event: `status:${status}`,
      meta: tracking ? { tracking } : null
    }])
  }
}
