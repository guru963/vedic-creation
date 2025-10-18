// src/services/pandits.ts
import supabase from '../supabase'

export type Pandit = {
  id: string
  full_name: string
  photo_url: string | null
  bio: string | null
  base_location: string | null
  languages: string | null
  experience_years: number | null
  rating_avg: number | null
  rating_count: number | null
  is_active: boolean
}

export type Service = {
  id: string
  name: string
  slug: string
  base_price: number
  duration_min: number
}

export type PanditService = {
  service_id: string
  price_inr: number | null
  duration_min: number | null
  services: Service  // joined
}

export async function getPandits(): Promise<Pandit[]> {
  const { data, error } = await supabase
    .from('pandits')
    .select('id,full_name,photo_url,bio,base_location,languages,experience_years,rating_avg,rating_count,is_active')
    .eq('is_active', true)
    .order('full_name', { ascending: true })
  if (error) throw error
  return data || []
}

export async function getPanditWithServices(panditId: string) {
  const [{ data: p, error: pErr }, { data: ps, error: psErr }] = await Promise.all([
    supabase
      .from('pandits')
      .select('id,full_name,photo_url,bio,base_location,languages,experience_years,rating_avg,rating_count,is_active')
      .eq('id', panditId)
      .single(),
    supabase
      .from('pandit_services')
      // ⬇️ use price_inr (not rate_inr)
      .select('service_id,price_inr,duration_min,services(id,name,slug,base_price,duration_min)')
      .eq('pandit_id', panditId)
  ])
  if (pErr) throw pErr
  if (psErr) throw psErr
  return { pandit: p as Pandit, services: (ps || []) as PanditService[] }
}

export type Availability = {
  id: string
  day_of_week: number // 1..7 (Mon..Sun)
  start_local: string // 'HH:MM:SS'
  end_local: string   // 'HH:MM:SS'
  timezone: string
}

export async function getAvailability(panditId: string): Promise<Availability[]> {
  const { data, error } = await supabase
    .from('pandit_availability')
    .select('id,day_of_week,start_local,end_local,timezone')
    .eq('pandit_id', panditId)
  if (error) throw error
  return data || []
}

export type TimeOff = {
  starts_at: string  // ISO
  ends_at: string    // ISO
}

export async function getTimeOffOnDate(panditId: string, fromISO: string, toISO: string): Promise<TimeOff[]> {
  const { data, error } = await supabase
    .from('pandit_time_off')
    .select('starts_at,ends_at')
    .eq('pandit_id', panditId)
    .or(`and(starts_at.lte.${toISO},ends_at.gte.${fromISO})`) // overlap
  if (error) throw error
  return data || []
}

export type Booking = {
  id: string
  starts_at: string
  ends_at: string
  status: 'hold'|'confirmed'|'completed'|'cancelled'
}

export async function getExistingBookingsOnDate(panditId: string, fromISO: string, toISO: string): Promise<Booking[]> {
  const { data, error } = await supabase
    .from('bookings')
    .select('id,starts_at,ends_at,status')
    .eq('pandit_id', panditId)
    .in('status', ['hold','confirmed']) // active overlaps to block
    .or(`and(starts_at.lte.${toISO},ends_at.gte.${fromISO})`)
  if (error) throw error
  return data || []
}

export async function createBooking(params: {
  pandit_id: string
  service_id: string
  starts_at: string // ISO
  ends_at: string   // ISO
  total_inr: number
  mode: 'home'|'temple'|'online'
  location_text?: string | null
  notes?: string | null
}) {
  // Ensure authenticated user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Please log in to book.')

  const { error } = await supabase
    .from('bookings')
    .insert([{
      user_id: user.id,
      pandit_id: params.pandit_id,
      service_id: params.service_id,
      starts_at: params.starts_at,
      ends_at: params.ends_at,
      total_inr: params.total_inr,
      mode: params.mode,
      location_text: params.location_text ?? null,
      notes: params.notes ?? null,
      status: 'hold' // start as hold; admin can confirm
    }])
  if (error) throw error
}
