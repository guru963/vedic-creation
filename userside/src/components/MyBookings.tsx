import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getMyBookings, getBookingEvents, type BookingRow, type BookingEvent } from '../services/bookings'
import Navbar from '../components/Navbar'

const money = (n:number)=> `₹${n.toLocaleString('en-IN')}`

function StatusBadge({ s }: { s: BookingRow['status'] }) {
  const map: Record<BookingRow['status'], string> = {
    hold: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    confirmed: 'bg-green-100 text-green-800 border-green-300',
    completed: 'bg-blue-100 text-blue-800 border-blue-300',
    cancelled: 'bg-red-100 text-red-800 border-red-300',
  }
  return <span className={`px-2 py-1 text-xs rounded-full border ${map[s]}`}>{s}</span>
}

export default function MyBookings() {
  const [rows, setRows] = useState<BookingRow[]>([])
  const [open, setOpen] = useState<Record<string, boolean>>({})
  const [events, setEvents] = useState<Record<string, BookingEvent[]>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    (async () => {
      try {
        const data = await getMyBookings()
        setRows(data)
      } catch (e) {
        console.error('[MyBookings] load error:', e)
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  const toggle = async (id: string) => {
    setOpen((p) => ({ ...p, [id]: !p[id] }))
    // lazy-load timeline
    if (!events[id]) {
      try {
        const evs = await getBookingEvents(id)
        setEvents((p) => ({ ...p, [id]: evs }))
      } catch (e) {
        console.error('[events] error:', e)
      }
    }
  }

  return (
    <div className='min-h-screen bg-[#FAF7F2]'>
    
      <div className="max-w-5xl mx-auto p-6">
        <h1 className="text-2xl font-bold">My Bookings</h1>

        {loading ? (
          <div className="mt-6">Loading…</div>
        ) : rows.length === 0 ? (
          <div className="mt-6 text-black/70">No bookings yet.</div>
        ) : (
          <div className="mt-4 grid gap-3">
            {rows.map(b => (
              <div key={b.id} className="rounded-xl border-2 border-orange-200 bg-white overflow-hidden">
                <div className="p-4 flex items-center gap-3">
                  {/* Thumb */}
                  <div className="w-16 h-16 rounded-lg overflow-hidden bg-orange-50 border">
                    <img
                      src={b.pandits?.photo_url || 'https://picsum.photos/seed/pandit/160/120'}
                      alt={b.pandits?.full_name || 'Pandit'}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  {/* Main */}
                  <div className="flex-1">
                    <div className="font-semibold">{b.pandits?.full_name || 'Pandit'}</div>
                    <div className="text-sm text-black/70">
                      {b.services?.name || 'Service'} • {new Date(b.starts_at).toLocaleString()}
                    </div>
                    <div className="mt-1 flex items-center gap-2">
                      <StatusBadge s={b.status} />
                      <span className="text-sm text-black/70">Total {money(b.total_inr)}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="grid gap-2">
                    <Link
                      to={`/booking/${b.id}/confirmation`}
                      className="px-3 py-2 rounded-lg text-white text-sm"
                      style={{ background: 'linear-gradient(90deg,#F53C44,#FA7236)' }}
                      title="View/Print confirmation letter"
                    >
                      Confirmation
                    </Link>
                    <button
                      onClick={() => toggle(b.id)}
                      className="px-3 py-2 rounded-lg border text-sm hover:bg-orange-50"
                    >
                      {open[b.id] ? 'Hide details' : 'View details'}
                    </button>
                  </div>
                </div>

                {/* Details */}
                {open[b.id] && (
                  <div className="px-4 pb-4">
                    <div className="rounded-lg border p-3 bg-amber-50/40">
                      <div className="grid sm:grid-cols-2 gap-2 text-sm">
                        <div><span className="font-semibold">Mode:</span> {b.mode}</div>
                        <div><span className="font-semibold">Ends:</span> {new Date(b.ends_at).toLocaleTimeString()}</div>
                        {b.location_text && <div className="sm:col-span-2"><span className="font-semibold">Address:</span> {b.location_text}</div>}
                        {b.notes && <div className="sm:col-span-2"><span className="font-semibold">Notes:</span> {b.notes}</div>}
                        {b.pandits?.base_location && <div className="sm:col-span-2"><span className="font-semibold">Pandit Location:</span> {b.pandits.base_location}</div>}
                      </div>
                    </div>

                    {/* Timeline */}
                    <div className="mt-3">
                      <div className="font-semibold mb-1">Timeline</div>
                      {events[b.id]?.length ? (
                        <ul className="text-sm grid gap-1">
                          {events[b.id].map(ev => (
                            <li key={ev.id} className="rounded border px-3 py-2 bg-white">
                              <div className="flex items-center justify-between">
                                <span className="capitalize font-medium">{ev.type}</span>
                                <span className="text-black/60">{new Date(ev.created_at).toLocaleString()}</span>
                              </div>
                              {ev.message && <div className="text-black/80 mt-1">{ev.message}</div>}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <div className="text-sm text-black/60">No updates yet.</div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
