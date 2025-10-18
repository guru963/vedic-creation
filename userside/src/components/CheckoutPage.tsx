// src/pages/Checkout.tsx
import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { addAddress, getMyAddresses, placeOrder, type Address } from '../services/orders'
import supabase from '../supabase'
import Navbar from './Navbar'
import { MapPin, Plus, CheckCircle2 } from 'lucide-react'

type CartItem = {
  id: string
  qty: number
  product: {
    id: string         // MUST be products.id (uuid). Preflight will repair old slug values.
    name: string
    price_inr: number
  }
}

const money = (n:number)=> `₹${n.toLocaleString('en-IN')}`

export default function Checkout() {
  const nav = useNavigate()
  const [addresses, setAddresses] = useState<Address[]>([])
  const [selected, setSelected] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string|null>(null)
  const [showAddForm, setShowAddForm] = useState(false)

  // Detect Buy Now mode and load items
  const [isBuyNow, setIsBuyNow] = useState(false)
  const [cart, setCart] = useState<CartItem[]>([])

  // Load items (Buy Now sessionStorage takes precedence over full cart)
  useEffect(() => {
    const mode = sessionStorage.getItem('checkoutMode')
    const buyNowRaw = sessionStorage.getItem('checkoutItems')

    if (mode === 'buynow' && buyNowRaw) {
      try {
        const items: CartItem[] = JSON.parse(buyNowRaw)
        setCart(items)
        setIsBuyNow(true)
        return
      } catch {
        // fall back to cart if parsing fails
      }
    }
    const raw = localStorage.getItem('cart')
    if (raw) setCart(JSON.parse(raw))
  }, [])

  const subtotal = useMemo(()=> cart.reduce((s,c)=> s + c.product.price_inr * c.qty, 0), [cart])

  // Load user + addresses
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        nav('/login', { replace: true, state: { returnTo: '/checkout' } })
        return
      }
      const rows = await getMyAddresses()
      setAddresses(rows)
      if (rows.length) {
        const def = rows.find(r=>r.is_default) ?? rows[0]
        setSelected(def.id)
      }
    })()
  }, [nav])

  const onAddAddress = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null); setAdding(true)
    const form = new FormData(e.currentTarget)
    try {
      const row = await addAddress({
        full_name: String(form.get('full_name')||''),
        phone: String(form.get('phone')||''),
        line1: String(form.get('line1')||''),
        line2: String(form.get('line2')||''),
        city: String(form.get('city')||''),
        state: String(form.get('state')||''),
        postal_code: String(form.get('postal_code')||''),
        country: 'India',
        is_default: form.get('is_default') === 'on',
      })
      const rows = await getMyAddresses()
      setAddresses(rows)
      setSelected(row.id)
      setAdding(false)
      setShowAddForm(false)
      ;(e.currentTarget as HTMLFormElement).reset()
    } catch (err:any) {
      setError(err.message || 'Failed to add address')
      setAdding(false)
    }
  }

  const clearBuyNowStash = () => {
    sessionStorage.removeItem('checkoutItems')
    sessionStorage.removeItem('checkoutMode')
  }

  /** 
   * Preflight repair for legacy carts:
   * - Validates product ids against products.id
   * - If some "id"s are actually slugs, converts them to real UUID ids
   */
  const resolveProductIds = async (items: CartItem[]) => {
    if (!items.length) return items

    const ids = items.map(i => i.product.id)
    // 1) Which of the provided ids are valid product UUIDs?
    const { data: byId, error: byIdErr } = await supabase
      .from('products')
      .select('id')
      .in('id', ids)

    if (byIdErr) {
      // Non-fatal; continue best effort (server will still validate)
      console.warn('[Checkout] resolveProductIds byIdErr:', byIdErr.message)
    }

    const okIds = new Set((byId || []).map(p => p.id))
    const missing = items.filter(i => !okIds.has(i.product.id))
    if (missing.length === 0) return items

    // 2) Treat missing ids as potential slugs and try to resolve
    const slugs = Array.from(new Set(missing.map(i => i.product.id)))
    const { data: bySlug, error: bySlugErr } = await supabase
      .from('products')
      .select('id, slug')
      .in('slug', slugs)

    if (bySlugErr) {
      console.warn('[Checkout] resolveProductIds bySlugErr:', bySlugErr.message)
      return items // continue; placeOrder will fail clearly if still bad
    }

    const slugToId = new Map((bySlug || []).map(p => [p.slug, p.id]))

    return items.map(i => {
      if (okIds.has(i.product.id)) return i
      const repaired = slugToId.get(i.product.id)
      return repaired
        ? { ...i, id: repaired, product: { ...i.product, id: repaired } }
        : i
    })
  }

  const onPlaceOrder = async () => {
    setError(null); setSubmitting(true)
    try {
      if (!selected) throw new Error('Please select an address')
      if (!cart.length) throw new Error('Your cart is empty')

      // ✅ Repair any legacy slug ids -> proper UUIDs
      const fixedCart = await resolveProductIds(cart)

      // Optional: hard-validate that all product ids exist before calling placeOrder
      const { data: check, error: checkErr } = await supabase
        .from('products')
        .select('id')
        .in('id', fixedCart.map(c => c.product.id))
      if (checkErr) {
        console.warn('[Checkout] pre-check products error:', checkErr.message)
      }
      const ok = new Set((check || []).map(r => r.id))
      const bad = fixedCart.filter(c => !ok.has(c.product.id))
      if (bad.length) {
        throw new Error(`Some items are invalid or unavailable: ${bad.map(b => b.product.name).join(', ')}`)
      }

      const payload = fixedCart.map(ci => ({
        product_id: ci.product.id,        // now guaranteed UUID
        name: ci.product.name,
        price_inr: ci.product.price_inr,
        qty: ci.qty
      }))

      const orderId = await placeOrder(selected, payload)

      // Clear the correct storage based on mode
      if (isBuyNow) {
        clearBuyNowStash()
      } else {
        localStorage.removeItem('cart')
        window.dispatchEvent(new Event('cart-updated'))
      }

      nav(`/order/success/${orderId}`, { replace: true })
    } catch (err:any) {
      setError(err.message || 'Could not place order')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div>
      <Navbar/>
      <div className="min-h-screen bg-[#FAF7F2] text-black">
        <div className="max-w-6xl mx-auto p-6">
          {/* Progress Steps */}
          <div className="flex items-center justify-center mb-8">
            <div className="flex items-center">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-orange-500 text-white text-sm font-semibold">
                1
              </div>
              <div className="ml-2 text-sm font-medium text-orange-600">Cart</div>
            </div>
            <div className="w-12 h-1 bg-orange-300 mx-2"></div>
            <div className="flex items-center">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-orange-500 text-white text-sm font-semibold">
                2
              </div>
              <div className="ml-2 text-sm font-medium text-orange-600">Checkout</div>
            </div>
            <div className="w-12 h-1 bg-gray-300 mx-2"></div>
            <div className="flex items-center">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-300 text-gray-600 text-sm font-semibold">
                3
              </div>
              <div className="ml-2 text-sm font-medium text-gray-500">Complete</div>
            </div>
          </div>

          <h1 className="text-transparent bg-clip-text bg-gradient-to-r from-[#F53C44] via-[#FA7236] to-[#FA9F2C] font-extrabold text-3xl text-center">
            Checkout
          </h1>

          {error && <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-[#B71C1C]">{error}</div>}

          <div className="mt-6 grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-8">
            {/* Addresses */}
            <section>
              <div className="flex items-center gap-2 mb-4">
                <MapPin className="h-5 w-5 text-orange-500" />
                <h2 className="font-semibold text-lg">Shipping Address</h2>
              </div>
              <div className="grid gap-3">
                {addresses.map(a => (
                  <div 
                    key={a.id} 
                    className={`rounded-xl border-2 p-4 cursor-pointer transition-all duration-200 ${
                      selected===a.id
                        ? 'border-orange-500 bg-orange-50 shadow-sm' 
                        : 'border-gray-200 hover:border-orange-300'
                    }`}
                    onClick={() => setSelected(a.id)}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center mt-0.5 ${
                        selected === a.id ? 'border-orange-500 bg-orange-500' : 'border-gray-400'
                      }`}>
                        {selected === a.id && <CheckCircle2 className="h-3 w-3 text-white" />}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-gray-900">{a.full_name}</span>
                          {a.is_default && (
                            <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">Default</span>
                          )}
                        </div>
                        <div className="text-sm text-gray-600">
                          <div>{a.line1}{a.line2 && `, ${a.line2}`}</div>
                          <div>{a.city}, {a.state} - {a.postal_code}</div>
                          <div className="mt-1 text-gray-500">📞 {a.phone}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                
                {/* Add new address */}
                {!showAddForm ? (
                  <button
                    onClick={() => setShowAddForm(true)}
                    className="rounded-xl border-2 border-dashed border-gray-300 p-4 text-center hover:border-orange-400 hover:bg-orange-25 transition-colors group"
                  >
                    <Plus className="h-6 w-6 text-gray-400 group-hover:text-orange-500 mx-auto mb-2" />
                    <div className="text-gray-600 group-hover:text-orange-600 font-medium">Add New Address</div>
                  </button>
                ) : (
                  <div className="rounded-xl border-2 border-orange-200 bg-orange-25 p-4">
                    <h3 className="font-semibold text-gray-900 mb-3">Add New Address</h3>
                    <form onSubmit={onAddAddress} className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <input 
                        name="full_name" 
                        placeholder="Full name" 
                        required
                        className="rounded-xl border border-gray-300 px-3 py-2 focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                      />
                      <input 
                        name="phone" 
                        placeholder="Phone" 
                        required
                        className="rounded-xl border border-gray-300 px-3 py-2 focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                      />
                      <input 
                        name="line1" 
                        placeholder="Address line 1" 
                        required
                        className="rounded-xl border border-gray-300 px-3 py-2 md:col-span-2 focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                      />
                      <input 
                        name="line2" 
                        placeholder="Address line 2 (optional)" 
                        className="rounded-xl border border-gray-300 px-3 py-2 md:col-span-2 focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                      />
                      <input 
                        name="city" 
                        placeholder="City" 
                        required
                        className="rounded-xl border border-gray-300 px-3 py-2 focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                      />
                      <input 
                        name="state" 
                        placeholder="State" 
                        required
                        className="rounded-xl border border-gray-300 px-3 py-2 focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                      />
                      <input 
                        name="postal_code" 
                        placeholder="PIN code" 
                        required
                        className="rounded-xl border border-gray-300 px-3 py-2 focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                      />
                      <label className="flex items-center gap-2 text-sm md:col-span-2">
                        <input 
                          type="checkbox" 
                          name="is_default" 
                          className="rounded border-gray-300 text-orange-500 focus:ring-orange-500"
                        />
                        Make default address
                      </label>
                      <div className="md:col-span-2 flex gap-3">
                        <button 
                          type="submit" 
                          disabled={adding}
                          className="flex-1 rounded-xl px-4 py-2 text-white font-semibold bg-gradient-to-r from-[#F53C44] via-[#FA7236] to-[#FA9F2C] disabled:opacity-60 hover:shadow-lg transition-all"
                        >
                          {adding?'Saving…':'Save Address'}
                        </button>
                        <button 
                          type="button"
                          onClick={() => setShowAddForm(false)}
                          className="px-4 py-2 border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  </div>
                )}
              </div>
            </section>

            {/* Order Summary */}
            <aside className="rounded-2xl border border-gray-200 p-6 h-max bg-white shadow-sm">
              <div className="flex items-center justify-between mb-1">
                <h3 className="font-semibold text-lg">Order Summary</h3>
                {isBuyNow && (
                  <span className="text-xs px-2 py-1 rounded-full bg-orange-100 text-orange-700 font-semibold">
                    Buy Now
                  </span>
                )}
              </div>

              <div className="grid gap-3">
                {cart.map(ci=>(
                  <div key={ci.id} className="flex items-center justify-between text-sm">
                    <div className="truncate flex-1">
                      <span className="text-gray-900">{ci.product.name}</span>
                      <span className="text-gray-500 ml-1">×{ci.qty}</span>
                    </div>
                    <div className="font-medium text-gray-900">{money(ci.product.price_inr * ci.qty)}</div>
                  </div>
                ))}
                
                <div className="mt-3 h-[1px] bg-gradient-to-r from-[#F53C44] via-[#FA7236] to-[#FA9F2C]"/>
                
                <div className="space-y-2 mt-3">
                  <div className="flex items-center justify-between">
                    <div className="text-gray-600">Subtotal</div>
                    <div className="font-semibold text-gray-900">{money(subtotal)}</div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="text-gray-600">Shipping</div>
                    <div className="font-semibold text-green-600">FREE</div>
                  </div>
                  <div className="flex items-center justify-between text-base mt-3 pt-3 border-t border-gray-200">
                    <div className="font-semibold text-gray-900">Total</div>
                    <div className="font-extrabold text-orange-600 text-lg">{money(subtotal)}</div>
                  </div>
                </div>
                
                <button 
                  onClick={onPlaceOrder} 
                  disabled={submitting || !selected}
                  className="mt-4 rounded-xl px-4 py-3 text-white font-semibold bg-gradient-to-r from-[#F53C44] via-[#FA7236] to-[#FA9F2C] disabled:opacity-60 hover:shadow-lg transition-all w-full"
                >
                  {submitting?'Placing Order…':'Confirm Order'}
                </button>
              </div>
            </aside>
          </div>
        </div>
      </div>
    </div>
  )
}
