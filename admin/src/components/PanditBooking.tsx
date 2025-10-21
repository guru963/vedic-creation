// src/components/Store.tsx
import React, { useMemo } from 'react'
import { Boxes, PlusSquare } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import AddPandit from './AddPandit'
import AdminBookings from './ConfirmBooking'

const pill =
  'inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold text-white shadow transition active:scale-95'

const tabs = [
  { key: 'Add Pandits', label: 'Add Pandits', icon: Boxes, grad: 'linear-gradient(90deg,#F53C44,#FA7236)' },
  { key: 'Bookings', label: 'Bookings', icon: PlusSquare, grad: 'linear-gradient(90deg,#FA7236,#FA9F2C)' },
  
] as const

const Store: React.FC = () => {
  const [params, setParams] = useSearchParams()
  const active = useMemo(() => {
    const t = params.get('tab')
    return t === 'Bookings' ? t : 'Add Pandits'
  }, [params])

  const setTab = (key: 'Add Pandits' | 'Bookings' ) => {
    const next = new URLSearchParams(params)
    next.set('tab', key)
    setParams(next, { replace: true })
  }

  return (
    <div className="min-h-[60vh]" style={{ backgroundColor: '#FAF7F2' }}>
      <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-14">
        <h1 className="mb-4 text-2xl font-extrabold bg-gradient-to-r from-[#F53C44] via-[#FA7236] to-[#FA9F2C] bg-clip-text text-transparent">
          Pandit Booking
        </h1>

        {/* Persistent tiny buttons */}
        <div className="flex flex-wrap items-center gap-3">
          {tabs.map(t => {
            const Icon = t.icon
            const isActive = active === t.key
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`${pill} ${isActive ? 'outline outline-white/70' : ''}`}
                style={{ background: t.grad }}
                title={t.label}
              >
                <Icon className="h-4 w-4" />
                {t.label}
              </button>
            )
          })}
        </div>

        {/* Content area */}
        <div className="mt-6">
          {active === 'Add Pandits' && <AddPandit />}
          {active === 'Bookings' &&<AdminBookings/>}
          
        </div>
      </div>
    </div>
  )
}

export default Store
