import React, { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { getBookingById, type BookingRow } from '../services/bookings'

const money = (n:number)=> `₹${n.toLocaleString('en-IN')}`

export default function BookingConfirmation() {
  const { id } = useParams<{ id: string }>()
  const [row, setRow] = useState<BookingRow | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    (async () => {
      if (!id) return
      try {
        const b = await getBookingById(id)
        setRow(b)
      } catch (e) {
        console.error('[confirm] load error:', e)
      } finally {
        setLoading(false)
      }
    })()
  }, [id])

  if (loading) return <div className="p-6">Loading…</div>
  if (!row) return <div className="p-6">Not found.</div>

  const d = new Date(row.starts_at)
  const end = new Date(row.ends_at)

  return (
    <div className="min-h-screen bg-white text-black">
      <div className="max-w-3xl mx-auto p-6 print:p-0">
        {/* Header */}
        <div className="flex items-center justify-between border-b pb-3">
          <div>
            <div className="text-xl font-extrabold">Vedic Creation</div>
            <div className="text-xs text-black/60">Order Confirmation</div>
          </div>
          <div className="text-right text-sm">
            <div><span className="text-black/60">Booking ID:</span> <span className="font-mono">{row.id}</span></div>
            <div><span className="text-black/60">Status:</span> <span className="capitalize">{row.status}</span></div>
          </div>
        </div>

        {/* Body */}
        <div className="mt-4 grid gap-4">
          <div className="rounded-xl border p-4">
            <div className="font-semibold">Pandit</div>
            <div>{row.pandits?.full_name || 'Pandit'}</div>
            {row.pandits?.base_location && <div className="text-sm text-black/70">{row.pandits.base_location}</div>}
          </div>

          <div className="rounded-xl border p-4">
            <div className="font-semibold">Service</div>
            <div>{row.services?.name || 'Service'}</div>
          </div>

          <div className="rounded-xl border p-4 grid sm:grid-cols-2 gap-2">
            <div>
              <div className="font-semibold">Date & Time</div>
              <div className="text-sm">
                {d.toLocaleDateString()} • {d.toLocaleTimeString()} – {end.toLocaleTimeString()}
              </div>
            </div>
            <div>
              <div className="font-semibold">Mode</div>
              <div className="capitalize text-sm">{row.mode}</div>
              {row.location_text && <div className="text-sm mt-1">{row.location_text}</div>}
            </div>
          </div>

          <div className="rounded-xl border p-4">
            <div className="font-semibold">Total</div>
            <div className="text-lg font-bold">{money(row.total_inr)}</div>
          </div>

          {row.notes && (
            <div className="rounded-xl border p-4">
              <div className="font-semibold">Notes</div>
              <div className="text-sm">{row.notes}</div>
            </div>
          )}

          <div className="text-xs text-black/60">
            This confirmation is valid for the above booking. An admin may contact you for any changes or clarifications.
          </div>
        </div>

        {/* Actions (hidden on print) */}
        <div className="mt-6 flex items-center gap-3 print:hidden">
          <button
            onClick={() => window.print()}
            className="px-4 py-2 rounded-lg text-white"
            style={{ background: 'linear-gradient(90deg,#F53C44,#FA7236)' }}
          >
            Print / Save PDF
          </button>
          <Link to="/my-bookings" className="px-4 py-2 rounded-lg border hover:bg-orange-50">Back to My Bookings</Link>
        </div>
      </div>
    </div>
  )
}
