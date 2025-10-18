// src/components/admin/AdminBookings.tsx
import React, { useEffect, useMemo, useState } from 'react'
import supabase from '../lib/supabase'

type BookingRow = {
  id: string
  user_id: string
  pandit_id: string
  service_id: string
  starts_at: string
  ends_at: string
  total_inr: number
  status: 'hold' | 'confirmed' | 'completed' | 'cancelled'
  mode: 'home' | 'temple' | 'online'
  location_text: string | null
  notes: string | null
  created_at: string
  pandits: { full_name: string } | null
  services: { name: string } | null

  // NEW: embedded customer profile
  profiles?: { full_name: string | null; phone: string | null; email: string | null } | null
}

const money = (n: number) => `₹${n.toLocaleString('en-IN')}`
const fmtDateTime = (iso: string) =>
  new Date(iso).toLocaleString('en-IN', { hour12: false })

const statusColors = {
  hold: 'bg-amber-100 text-amber-900 border-amber-300',
  confirmed: 'bg-green-100 text-green-900 border-green-300',
  completed: 'bg-blue-100 text-blue-900 border-blue-300',
  cancelled: 'bg-rose-100 text-rose-900 border-rose-300',
} as const

const StatusBadge: React.FC<{ status: BookingRow['status'] }> = ({ status }) => (
  <span className={`inline-block rounded-full border px-2 py-0.5 text-xs font-semibold ${statusColors[status]}`}>
    {status}
  </span>
)

const Tabs: React.FC<{ active: string; onChange: (k: string) => void }> = ({ active, onChange }) => {
  const items = ['all', 'hold', 'confirmed', 'completed', 'cancelled']
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((it) => (
        <button
          key={it}
          onClick={() => onChange(it)}
          className={`px-3 py-1.5 rounded-lg text-sm font-semibold border transition ${
            active === it ? 'bg-black text-white border-black' : 'bg-white text-black border-black/20 hover:bg-black/5'
          }`}
        >
          {it[0].toUpperCase() + it.slice(1)}
        </button>
      ))}
    </div>
  )
}

const AdminBookings: React.FC = () => {
  const [rows, setRows] = useState<BookingRow[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'all' | BookingRow['status']>('all')

  const [openId, setOpenId] = useState<string | null>(null)
  const [note, setNote] = useState('')
  const [actionBusy, setActionBusy] = useState(false)

  const load = async () => {
    setLoading(true)

    // IMPORTANT: this embed assumes the FK named `bookings_user_profile_fk` (see SQL above).
    // If your FK name differs, replace `profiles!bookings_user_profile_fk(...)` accordingly.
    const { data, error } = await supabase
      .from('bookings')
      .select(`
        id, user_id, pandit_id, service_id, starts_at, ends_at, status, total_inr, mode, location_text, notes, created_at,
        pandits ( full_name ),
        services ( name ),
        profiles!bookings_user_profile_fk ( full_name, phone, email )
      `)
      .order('created_at', { ascending: false })

    setLoading(false)
    if (error) {
      console.error('[AdminBookings] load error:', error)
      setRows([])
      return
    }
    setRows((data || []) as BookingRow[])
  }

  useEffect(() => { load() }, [])

  const filtered = useMemo(() => {
    if (tab === 'all') return rows
    return rows.filter((r) => r.status === tab)
  }, [rows, tab])

  const addEvent = async (bookingId: string, type: string, msg?: string | null) => {
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('booking_events').insert([{
      booking_id: bookingId,
      actor_id: user?.id ?? null,
      type,
      message: msg || null,
    }])
  }

  const updateStatus = async (booking: BookingRow, next: BookingRow['status']) => {
    setActionBusy(true)
    try {
      const { error } = await supabase.from('bookings').update({ status: next }).eq('id', booking.id)
      if (error) throw error
      await addEvent(booking.id, next, note?.trim() || null)
      setNote('')
      setOpenId(null)
      await load()
      alert(`Booking ${next}`)
    } catch (e: any) {
      console.error('[AdminBookings] status update error:', e)
      alert(e.message || 'Failed to update booking')
    } finally {
      setActionBusy(false)
    }
  }

  const onConfirm = (b: BookingRow) => updateStatus(b, 'confirmed')
  const onCancel = (b: BookingRow) => updateStatus(b, 'cancelled')
  const onComplete = (b: BookingRow) => updateStatus(b, 'completed')

  return (
    <div className="max-w-6xl mx-auto ">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold bg-gradient-to-r from-[#F53C44] via-[#FA7236] to-[#FA9F2C] bg-clip-text text-transparent">
          Bookings
        </h1>
        <Tabs active={tab} onChange={(k) => setTab(k as any)} />
      </div>

      <div className="mt-4 overflow-x-auto rounded-xl border">
        <table className="w-full text-sm">
          <thead className="bg-[#FFF8E7] text-left">
            <tr>
              <th className="p-3">Booking</th>
              <th className="p-3">Customer</th>
              <th className="p-3">Pandit / Service</th>
              <th className="p-3">When</th>
              <th className="p-3">Mode</th>
              <th className="p-3">Status</th>
              <th className="p-3 text-right">Total</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td className="p-4 text-center text-black/60" colSpan={8}>Loading…</td></tr>
            )}
            {!loading && !filtered.length && (
              <tr><td className="p-6 text-center text-black/60" colSpan={8}>No bookings.</td></tr>
            )}
            {filtered.map((b) => (
              <tr key={b.id} className="border-t align-top">
                <td className="p-3">
                  <div className="font-mono text-[12px]">{b.id}</div>
                  <div className="text-black/50 text-[12px]">Created: {fmtDateTime(b.created_at)}</div>
                </td>

                {/* Customer column (full name / phone / email) */}
                <td className="p-3">
                  <div className="font-semibold">{b.profiles?.full_name || '—'}</div>
                  {b.profiles?.phone && <div className="text-black/70 text-xs">{b.profiles.phone}</div>}
                  {b.profiles?.email && <div className="text-black/70 text-xs">{b.profiles.email}</div>}
                  {!b.profiles && (
                    <div className="text-black/50 text-[12px]">User: {b.user_id}</div>
                  )}
                </td>

                <td className="p-3">
                  <div className="font-semibold">{b.pandits?.full_name ?? '—'}</div>
                  <div className="text-black/70">{b.services?.name ?? '—'}</div>
                </td>

                <td className="p-3">
                  <div>{fmtDateTime(b.starts_at)}</div>
                  <div className="text-black/70 text-[12px]">to {fmtDateTime(b.ends_at)}</div>
                </td>

                <td className="p-3 capitalize">
                  {b.mode}
                  {b.location_text && (
                    <div className="text-black/70 text-[12px] line-clamp-2">{b.location_text}</div>
                  )}
                </td>

                <td className="p-3">
                  <StatusBadge status={b.status} />
                </td>

                <td className="p-3 text-right font-semibold">{money(b.total_inr)}</td>

                <td className="p-3">
                  <button
                    onClick={() => setOpenId(openId === b.id ? null : b.id)}
                    className="px-2 py-1 rounded-lg border text-xs hover:bg-black/5"
                  >
                    {openId === b.id ? 'Close' : 'View'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Drawer */}
      {openId && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" onClick={() => !actionBusy && setOpenId(null)}>
          <div className="w-full max-w-2xl bg-white rounded-2xl border-2 border-orange-200 p-4" onClick={(e) => e.stopPropagation()}>
            {(() => {
              const b = rows.find((x) => x.id === openId)
              if (!b) return null
              return (
                <>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-lg font-bold">{b.pandits?.full_name ?? '—'}</div>
                      <div className="text-sm text-black/70">{b.services?.name ?? '—'}</div>
                    </div>
                    <StatusBadge status={b.status} />
                  </div>

                  <div className="mt-3 grid sm:grid-cols-2 gap-3">
                    <div className="rounded-xl border p-3">
                      <div className="text-xs text-black/60">Booking ID</div>
                      <div className="font-mono text-xs">{b.id}</div>

                      <div className="mt-2 text-xs text-black/60">Customer</div>
                      <div className="text-sm">
                        {b.profiles?.full_name || '—'}
                        {b.profiles?.phone ? ` • ${b.profiles.phone}` : ''}
                      </div>
                      {b.profiles?.email && <div className="text-xs text-black/70">{b.profiles.email}</div>}
                    </div>

                    <div className="rounded-xl border p-3">
                      <div className="text-xs text-black/60">When</div>
                      <div className="text-sm">{fmtDateTime(b.starts_at)}</div>
                      <div className="text-xs text-black/60">Ends</div>
                      <div className="text-sm">{fmtDateTime(b.ends_at)}</div>
                    </div>

                    <div className="rounded-xl border p-3">
                      <div className="text-xs text-black/60">Mode</div>
                      <div className="text-sm capitalize">{b.mode}</div>
                      {b.location_text && (
                        <>
                          <div className="text-xs text-black/60 mt-2">Location</div>
                          <div className="text-sm whitespace-pre-wrap">{b.location_text}</div>
                        </>
                      )}
                    </div>

                    <div className="rounded-xl border p-3">
                      <div className="text-xs text-black/60">Amount</div>
                      <div className="text-sm font-semibold">{money(b.total_inr)}</div>
                      {b.notes && (
                        <>
                          <div className="text-xs text-black/60 mt-2">Customer Note</div>
                          <div className="text-sm whitespace-pre-wrap">{b.notes}</div>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="mt-3">
                    <label className="block text-sm font-semibold text-amber-900">Internal note (optional)</label>
                    <textarea
                      rows={2}
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      className="mt-1 w-full rounded-xl border-2 border-orange-200 bg-white px-3 py-2"
                      placeholder="e.g., Confirmed after phone call. Collect advance on arrival."
                    />
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2 justify-end">
                    <button onClick={() => setOpenId(null)} disabled={actionBusy} className="px-3 py-2 rounded-lg border">
                      Close
                    </button>

                    {b.status === 'hold' && (
                      <button
                        onClick={() => onConfirm(b)}
                        disabled={actionBusy}
                        className="px-3 py-2 rounded-lg text-white"
                        style={{ background: 'linear-gradient(90deg,#22c55e,#16a34a)' }}
                      >
                        Confirm
                      </button>
                    )}

                    {b.status !== 'cancelled' && b.status !== 'completed' && (
                      <button
                        onClick={() => onCancel(b)}
                        disabled={actionBusy}
                        className="px-3 py-2 rounded-lg text-white"
                        style={{ background: 'linear-gradient(90deg,#f43f5e,#e11d48)' }}
                      >
                        Cancel
                      </button>
                    )}

                    {b.status === 'confirmed' && (
                      <button
                        onClick={() => onComplete(b)}
                        disabled={actionBusy}
                        className="px-3 py-2 rounded-lg text-white"
                        style={{ background: 'linear-gradient(90deg,#3b82f6,#2563eb)' }}
                      >
                        Mark Completed
                      </button>
                    )}
                  </div>
                </>
              )
            })()}
          </div>
        </div>
      )}
    </div>
  )
}

export default AdminBookings
