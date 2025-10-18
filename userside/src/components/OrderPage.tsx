// src/components/Store.tsx
import React, { useMemo } from 'react'
import { Boxes, ReceiptText } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import MyOrders from './MyOrders'
import MyBookings from './MyBookings'
import Navbar from './Navbar'



const pill =
  'inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold text-white shadow transition active:scale-95'

const tabs = [
  { key: 'Product Order', label: 'Product Order', icon: Boxes, grad: 'linear-gradient(90deg,#F53C44,#FA7236)' },
 
  { key: 'Pandit Bookings',      label: 'Pandit Bookings', icon: ReceiptText, grad: 'linear-gradient(90deg,#FA9F2C,#FCD62B)' },
] as const

const OrderPage: React.FC = () => {
  const [params, setParams] = useSearchParams()
  const active = useMemo(() => {
    const t = params.get('tab')
    return  t === 'Pandit Bookings' ? t : 'Product Order'
  }, [params])

  const setTab = (key: 'Product Order' | 'Pandit Bookings') => {
    const next = new URLSearchParams(params)
    next.set('tab', key)
    setParams(next, { replace: true })
  }

  return (
    <div>
        <Navbar/>
    
    <div className="min-h-[60vh]" style={{ backgroundColor: '#FAF7F2' }}>
      <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-14">
        <h1 className="mb-4 text-xl font-extrabold bg-gradient-to-r from-[#F53C44] via-[#FA7236] to-[#FA9F2C] bg-clip-text text-transparent">
          All your Orders at one Place
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
                className={`${pill} ${isActive ? ' outline-2 outline-white/70' : ''}`}
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
          {active === 'Product Order' && <MyOrders/>}
          {active === 'Pandit Bookings' && <MyBookings/>}
        </div>
      </div>
    </div>
    </div>
  )
}

export default OrderPage
