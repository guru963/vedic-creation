// src/pages/PanditDetails.tsx
import  { useEffect, useMemo, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  getPanditWithServices,
  getAvailability,
  getTimeOffOnDate,
  getExistingBookingsOnDate,
  createBooking,
  type Pandit,
  type PanditService
} from '../services/pandit'
import { ChevronDown, ChevronUp, MapPin, Clock, Calendar, User } from 'lucide-react'
import Navbar from './Navbar'

const PLACEHOLDER = 'https://picsum.photos/seed/pandit/720/540'
const toISODate = (d: Date) => d.toISOString().slice(0, 10)
const parseTimeHHMM = (t: string) => t.slice(0, 5)

function dateAtIST(dateISO: string, hm: string) {
  const [yy, mm, dd] = dateISO.split('-').map(Number)
  const [HH, MM] = hm.split(':').map(Number)
  return new Date(yy, mm - 1, dd, HH, MM, 0)
}
function addMinutes(d: Date, mins: number) { return new Date(d.getTime() + mins * 60 * 1000) }
function overlap(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date) {
  return aStart < bEnd && bStart < aEnd
}

export default function PanditDetails() {
  const { id } = useParams<{ id: string }>()
  const nav = useNavigate()

  const [pandit, setPandit] = useState<Pandit | null>(null)
  const [pservices, setPservices] = useState<PanditService[]>([])
  const [loading, setLoading] = useState(true)

  const [serviceId, setServiceId] = useState<string>('')
  const activeService = useMemo(
    () => pservices.find(x => x.service_id === serviceId),
    [pservices, serviceId]
  )

  const [date, setDate] = useState<string>(toISODate(new Date()))
  const [slots, setSlots] = useState<{ label: string; start: Date; end: Date; disabled: boolean }[]>([])
  const [picked, setPicked] = useState<number | null>(null)
  const [showAllSlots, setShowAllSlots] = useState(false)

  const [mode, setMode] = useState<'home' | 'temple' | 'online'>('online')
  const [address, setAddress] = useState('')
  const [note, setNote] = useState('')

  // Load pandit + services
  useEffect(() => {
    (async () => {
      if (!id) return
      try {
        const { pandit, services } = await getPanditWithServices(id)
        setPandit(pandit)
        setPservices(services)
        if (services.length) setServiceId(services[0].service_id)
      } catch (e) {
        console.error('[PanditDetails] load error:', e)
      } finally {
        setLoading(false)
      }
    })()
  }, [id])

  // Build slots for selected date & service
  useEffect(() => {
    (async () => {
      if (!id || !serviceId) { setSlots([]); return }
      try {
        const [avail, timeoff] = await Promise.all([
          getAvailability(id),
          getTimeOffOnDate(
            id,
            new Date(date + 'T00:00:00').toISOString(),
            new Date(date + 'T23:59:59').toISOString()
          ),
        ])

        const dow = new Date(date).getDay() || 7 // Sun=0 -> 7
        const todays = avail.filter(a => a.day_of_week === dow)
        const duration =
          activeService?.duration_min ??
          activeService?.services.duration_min ??
          30

        let cands: { label: string; start: Date; end: Date; disabled: boolean }[] = []
        todays.forEach(a => {
          const startHHMM = parseTimeHHMM(a.start_local)
          const endHHMM = parseTimeHHMM(a.end_local)
          let s = dateAtIST(date, startHHMM)
          const end = dateAtIST(date, endHHMM)
          while (addMinutes(s, duration) <= end) {
            const e = addMinutes(s, duration)
            cands.push({
              label: `${startHHMM} – ${String(e.getHours()).padStart(2, '0')}:${String(e.getMinutes()).padStart(2, '0')}`,
              start: s,
              end: e,
              disabled: false
            })
            s = addMinutes(s, duration)
          }
        })

        const bookings = await getExistingBookingsOnDate(
          id,
          new Date(date + 'T00:00:00').toISOString(),
          new Date(date + 'T23:59:59').toISOString()
        )

        cands = cands.map(sl => {
          const clashBk = bookings.some(b =>
            overlap(sl.start, sl.end, new Date(b.starts_at), new Date(b.ends_at))
          )
          const clashOff = timeoff.some(t =>
            overlap(sl.start, sl.end, new Date(t.starts_at), new Date(t.ends_at))
          )
          return { ...sl, disabled: clashBk || clashOff }
        })

        setSlots(cands)
        setPicked(null)
        setShowAllSlots(false)
      } catch (e) {
        console.error('[slots] error:', e)
        setSlots([])
      }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, date, serviceId])

  // Total = per-pandit override OR base service price
  const totalInr = useMemo(() => {
    const base = activeService?.price_inr ?? activeService?.services.base_price ?? 0
    return base
  }, [activeService])

  // Show first 6 slots by default, all when expanded
  const visibleSlots = useMemo(() => {
    if (showAllSlots) return slots
    return slots.slice(0, 6)
  }, [slots, showAllSlots])

  const onBook = async () => {
    if (picked == null) return alert('Pick a time slot')
    const slot = slots[picked]
    if (!slot || slot.disabled) return

    if ((mode === 'home' || mode === 'temple') && !address.trim()) {
      return alert('Please enter address for Home/Temple service.')
    }

    try {
      await createBooking({
        pandit_id: id!,
        service_id: serviceId,
        starts_at: slot.start.toISOString(),
        ends_at: slot.end.toISOString(),
        total_inr: totalInr,
        mode,
        location_text: mode === 'online' ? null : address.trim(),
        notes: note.trim() || null
      })
      alert('Booking placed! We\'ll notify you once an admin confirms.')
      // nav('/my-bookings')
    } catch (e: any) {
      alert(e.message || 'Failed to create booking')
    }
  }

  if (loading) return (
    <div>
      <Navbar/>
    <div className="min-h-screen bg-[#FAF7F2] flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto"></div>
        <p className="mt-4 text-gray-600">Loading pandit details...</p>
      </div>
    </div>
    </div>
  )
  
  if (!pandit) return (
    <div>
      <Navbar/>
    <div className="min-h-screen bg-[#FAF7F2] flex items-center justify-center">
      <div className="text-center">
        <User className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-900">Pandit Not Found</h2>
        <button 
          onClick={() => nav(-1)}
          className="mt-4 px-6 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition"
        >
          Go Back
        </button>
      </div>
    </div>
    </div>
  )

  return (
    <div>
      <Navbar/>
    
    <div className="min-h-screen bg-[#FAF7F2]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back Button */}
        <button 
          onClick={() => nav(-1)}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition mb-6"
        >
          <ChevronDown className="w-4 h-4 rotate-90" />
          Back to Pandits
        </button>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left: Profile */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="aspect-[4/3] overflow-hidden">
                <img 
                  src={pandit.photo_url || PLACEHOLDER} 
                  alt={pandit.full_name} 
                  className="w-full h-full object-cover" 
                />
              </div>
              <div className="p-6">
                <h1 className="text-2xl font-bold text-orange-600 mb-2">{pandit.full_name}</h1>
                
                <div className="space-y-3">
                  {pandit.base_location && (
                    <div className="flex items-center gap-2 text-gray-600">
                      <MapPin className="w-4 h-4" />
                      <span>{pandit.base_location}</span>
                    </div>
                  )}
                  
                  {pandit.experience_years && (
                    <div className="flex items-center gap-2 text-gray-600">
                      <Clock className="w-4 h-4" />
                      <span>{pandit.experience_years}+ years experience</span>
                    </div>
                  )}

                  {pandit.languages && (
                    <div className="flex items-start gap-2 text-gray-600">
                      <User className="w-4 h-4 mt-0.5" />
                      <span>Languages: {pandit.languages}</span>
                    </div>
                  )}
                </div>

                {pandit.bio && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <h3 className="font-semibold text-gray-900 mb-2">About</h3>
                    <p className="text-gray-600 text-sm leading-relaxed">{pandit.bio}</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right: Booking Form */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-bold text-orange-600 mb-6">Book Your Service</h2>

              <div className="space-y-6">
                {/* Service Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Select Service</label>
                  <select
                    value={serviceId}
                    onChange={e => setServiceId(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition"
                  >
                    {pservices.map(ps => (
                      <option key={ps.service_id} value={ps.service_id}>
                        {ps.services.name} — ₹{ps.price_inr ?? ps.services.base_price} ({(ps.duration_min ?? ps.services.duration_min)} mins)
                      </option>
                    ))}
                  </select>
                </div>

                {/* Date Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Select Date
                  </label>
                  <input
                    type="date"
                    value={date}
                    onChange={e => setDate(e.target.value)}
                    min={toISODate(new Date())}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition"
                  />
                </div>

                {/* Time Slots */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">Available Time Slots</label>
                  
                  {slots.length === 0 ? (
                    <div className="text-center py-8 text-gray-500 border-2 border-dashed border-gray-300 rounded-lg">
                      <Clock className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                      <p>No available slots for this date</p>
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {visibleSlots.map((s, i) => (
                          <button
                            key={i}
                            disabled={s.disabled}
                            onClick={() => setPicked(slots.indexOf(s))}
                            className={`p-3 rounded-lg border text-sm font-medium transition ${
                              s.disabled
                                ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                                : picked === slots.indexOf(s)
                                  ? 'bg-orange-500 text-white border-orange-500 shadow-sm'
                                  : 'bg-white text-gray-700 border-gray-300 hover:border-orange-300 hover:bg-orange-50'
                            }`}
                          >
                            {s.label}
                            {s.disabled && (
                              <div className="text-xs mt-1 text-gray-400">Unavailable</div>
                            )}
                          </button>
                        ))}
                      </div>

                      {/* Show More/Less Button */}
                      {slots.length > 6 && (
                        <button
                          onClick={() => setShowAllSlots(!showAllSlots)}
                          className="flex items-center gap-2 mt-4 text-orange-600 hover:text-orange-700 font-medium text-sm"
                        >
                          {showAllSlots ? (
                            <>
                              <ChevronUp className="w-4 h-4" />
                              Show Less
                            </>
                          ) : (
                            <>
                              <ChevronDown className="w-4 h-4" />
                              Show {slots.length - 6} More Slots
                            </>
                          )}
                        </button>
                      )}
                    </>
                  )}
                </div>

                {/* Service Mode */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">Service Type</label>
                  <div className="grid grid-cols-3 gap-3">
                    {(['online', 'home', 'temple'] as const).map(m => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setMode(m)}
                        className={`p-3 rounded-lg border text-sm font-medium transition ${
                          mode === m
                            ? 'bg-orange-500 text-white border-orange-500 shadow-sm'
                            : 'bg-white text-gray-700 border-gray-300 hover:border-orange-300 hover:bg-orange-50'
                        }`}
                      >
                        {m.charAt(0).toUpperCase() + m.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Address for Home/Temple */}
                {(mode === 'home' || mode === 'temple') && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {mode === 'home' ? 'Home Address' : 'Temple Address'}
                    </label>
                    <textarea
                      rows={3}
                      value={address}
                      onChange={e => setAddress(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition resize-none"
                      placeholder="House/Flat, Street, Area, City, Pincode"
                    />
                  </div>
                )}

                {/* Notes */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Special Requests (Optional)</label>
                  <textarea
                    rows={3}
                    value={note}
                    onChange={e => setNote(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition resize-none"
                    placeholder="Any special instructions or requirements..."
                  />
                </div>

                {/* Total and Book Button */}
                <div className="pt-6 border-t border-gray-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-2xl font-bold text-gray-900">₹{totalInr}</div>
                      <div className="text-sm text-gray-600">Total amount</div>
                    </div>
                    <button
                      onClick={onBook}
                      disabled={picked == null || ((mode === 'home' || mode === 'temple') && !address.trim())}
                      className="px-8 py-3 bg-orange-500 text-white font-semibold rounded-lg hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition"
                    >
                      Confirm Booking
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Services List */}
            <div className="mt-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Services Offered</h3>
              <div className="grid sm:grid-cols-2 gap-4">
                {pservices.map(ps => (
                  <div key={ps.service_id} className="bg-white rounded-lg border border-gray-200 p-4 hover:border-orange-300 transition">
                    <div className="font-semibold text-gray-900">{ps.services.name}</div>
                    <div className="text-sm text-gray-600 mt-1">
                      ₹{ps.price_inr ?? ps.services.base_price} • {(ps.duration_min ?? ps.services.duration_min)} minutes
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    </div>
  )
}