import supabase from '../supabase'

export type BookingRow = {
  id: string
  starts_at: string
  ends_at: string
  total_inr: number
  status: 'hold' | 'confirmed' | 'completed' | 'cancelled'
  mode: 'home' | 'temple' | 'online'
  location_text: string | null
  notes: string | null
  created_at: string
  pandits: {
    id: string
    full_name: string
    photo_url: string | null
    base_location: string | null
  } | null
  services: {
    id: string
    name: string
    slug: string
    base_price: number
    duration_min: number
  } | null
}

export async function getMyBookings(): Promise<BookingRow[]> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Please log in')

  const { data, error } = await supabase
    .from('bookings')
    .select(`
      id, starts_at, ends_at, total_inr, status, mode, location_text, notes, created_at,
      pandits: pandit_id ( id, full_name, photo_url, base_location ),
      services: service_id ( id, name, slug, base_price, duration_min )
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data || []) as BookingRow[]
}

export async function getBookingById(id: string): Promise<BookingRow | null> {
  const { data, error } = await supabase
    .from('bookings')
    .select(`
      id, starts_at, ends_at, total_inr, status, mode, location_text, notes, created_at,
      pandits: pandit_id ( id, full_name, photo_url, base_location ),
      services: service_id ( id, name, slug, base_price, duration_min )
    `)
    .eq('id', id)
    .maybeSingle()

  if (error) throw error
  return (data || null) as BookingRow | null
}

export type BookingEvent = {
  id: string
  booking_id: string
  actor_id: string | null
  type: string
  message: string | null
  created_at: string
}

export async function getBookingEvents(bookingId: string): Promise<BookingEvent[]> {
  const { data, error } = await supabase
    .from('booking_events')
    .select('id, booking_id, actor_id, type, message, created_at')
    .eq('booking_id', bookingId)
    .order('created_at', { ascending: true })

  if (error) throw error
  return data || []
}
