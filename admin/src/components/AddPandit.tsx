// src/components/admin/AddPandit.tsx
import React, { useEffect, useMemo, useState } from 'react'
import supabase from '../lib/supabase'
import { Plus, X, Clock, Calendar, User, Phone, Mail, MapPin, Languages, Award, FileText, Trash2 } from 'lucide-react'

// ---- Types matching your SQL ----
type Service = {
  id: string
  name: string
  slug: string
  base_price: number
  duration_min: number
  is_active: boolean
}

type Selected = { 
  service_id: string; 
  rate_inr?: number; 
  duration_min?: number 
}

type AvailRow = {
  id: string;
  day_of_week: number;
  start_local: string;
  end_local: string;
  timezone: string;
}

const DAYS = [
  { label: 'Monday', value: 1 },
  { label: 'Tuesday', value: 2 },
  { label: 'Wednesday', value: 3 },
  { label: 'Thursday', value: 4 },
  { label: 'Friday', value: 5 },
  { label: 'Saturday', value: 6 },
  { label: 'Sunday', value: 7 },
]

const toInt = (v: string) => (v.trim() === '' ? undefined : Number(v))

const slugify = (s: string) =>
  s.trim().toLowerCase().normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')

const AddPandit: React.FC = () => {
  // Form state
  const [formData, setFormData] = useState({
    fullName: '',
    bio: '',
    phone: '',
    email: '',
    baseLocation: '',
    languages: '',
    experienceYears: '',
  })
  const [file, setFile] = useState<File | null>(null)

  // Services
  const [services, setServices] = useState<Service[]>([])
  const [selected, setSelected] = useState<Selected[]>([])

  // Modal state
  const [svcOpen, setSvcOpen] = useState(false)
  const [svcForm, setSvcForm] = useState({
    name: '',
    price: '',
    duration: ''
  })

  // Availability
  const [availability, setAvailability] = useState<AvailRow[]>([
    { 
      id: crypto.randomUUID(), 
      day_of_week: 1, 
      start_local: '09:00', 
      end_local: '17:00', 
      timezone: 'Asia/Kolkata' 
    },
  ])

  const [loading, setLoading] = useState(false)

  const selectedIds = useMemo(() => new Set(selected.map(s => s.service_id)), [selected])

  // Load services
  useEffect(() => {
    const loadServices = async () => {
      const { data, error } = await supabase
        .from('services')
        .select('id, name, slug, base_price, duration_min, is_active')
        .eq('is_active', true)
        .order('name')

      if (error) {
        console.error('Error loading services:', error)
        setServices([])
      } else {
        setServices((data || []) as Service[])
      }
    }
    loadServices()
  }, [])

  // Form handlers
  const handleInputChange = (field: keyof typeof formData) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData(prev => ({ ...prev, [field]: e.target.value }))
  }

  const toggleSelect = (svc: Service) => {
    setSelected(prev => {
      const existing = prev.find(p => p.service_id === svc.id)
      if (existing) {
        return prev.filter(p => p.service_id !== svc.id)
      }
      return [...prev, {
        service_id: svc.id,
        rate_inr: svc.base_price,
        duration_min: svc.duration_min
      }]
    })
  }

  const updateOverride = (id: string, field: 'rate_inr' | 'duration_min', value: number | undefined) => {
    setSelected(prev => prev.map(p => 
      p.service_id === id ? { ...p, [field]: value } : p
    ))
  }

  // Service creation
  const createService = async () => {
    const trimmed = svcForm.name.trim()
    if (!trimmed) return alert('Service name is required')

    const price = toInt(svcForm.price) ?? 0
    const dur = toInt(svcForm.duration) ?? 30
    if (dur <= 0) return alert('Default duration must be > 0')
    if (price < 0) return alert('Base price must be ≥ 0')

    const baseSlug = slugify(trimmed)
    if (!baseSlug) return alert('Generated slug is empty. Pick a different name.')

    let slug = baseSlug
    const { data: exists } = await supabase
      .from('services').select('id').eq('slug', slug).maybeSingle()

    if (exists) slug = `${baseSlug}-${Math.random().toString(36).slice(2, 6)}`

    const { data, error } = await supabase
      .from('services')
      .insert([{ 
        name: trimmed, 
        slug, 
        base_price: price, 
        duration_min: dur, 
        is_active: true 
      }])
      .select()
      .single()

    if (error) {
      console.error('Error creating service:', error)
      return alert(error.message)
    }

    const newService = data as Service
    setServices(prev => [...prev, newService].sort((a, b) => a.name.localeCompare(b.name)))
    setSelected(prev => [...prev, { 
      service_id: newService.id, 
      rate_inr: newService.base_price, 
      duration_min: newService.duration_min 
    }])
    
    setSvcForm({ name: '', price: '', duration: '' })
    setSvcOpen(false)
  }

  // Availability handlers
  const addAvailRow = () => {
    setAvailability(prev => [
      ...prev,
      { 
        id: crypto.randomUUID(), 
        day_of_week: 1, 
        start_local: '09:00', 
        end_local: '17:00', 
        timezone: 'Asia/Kolkata' 
      }
    ])
  }

  const removeAvailRow = (id: string) => {
    setAvailability(prev => prev.filter(r => r.id !== id))
  }

  const updateAvail = (id: string, patch: Partial<AvailRow>) => {
    setAvailability(prev => prev.map(r => 
      r.id === id ? { ...r, ...patch } : r
    ))
  }

  const validateAvailability = () => {
    for (const r of availability) {
      if (!r.start_local || !r.end_local) return 'Availability time cannot be empty'
      if (r.start_local >= r.end_local) return 'Start time must be before end time'
    }
    return null
  }

  // Form submission
  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.fullName.trim()) return alert('Full name is required')
    if (!selected.length) return alert('Select at least one service')

    const exp = formData.experienceYears.trim() === '' 
      ? null 
      : Number.isFinite(Number(formData.experienceYears)) 
        ? Math.max(0, Math.floor(Number(formData.experienceYears)))
        : null

    if (formData.experienceYears && exp === null) {
      return alert('Experience years must be a number')
    }

    const availErr = validateAvailability()
    if (availErr) return alert(availErr)

    setLoading(true)
    
    try {
      // Upload profile image
      let photo_url: string | null = null
      if (file) {
        const key = `pandits/${crypto.randomUUID()}_${file.name.replace(/\s+/g, '_')}`
        const { data, error } = await supabase.storage
          .from('pandit-photos')
          .upload(key, file, { upsert: false })
        
        if (error) throw error
        
        const { data: pub } = supabase.storage
          .from('pandit-photos')
          .getPublicUrl(data.path)
        photo_url = pub?.publicUrl ?? null
      }

      // Create pandit
      const { data: pandit, error: pErr } = await supabase
        .from('pandits')
        .insert([{
          full_name: formData.fullName.trim(),
          bio: formData.bio.trim() || null,
          photo_url,
          phone: formData.phone.trim() || null,
          email: formData.email.trim() || null,
          base_location: formData.baseLocation.trim() || null,
          languages: formData.languages.trim() || null,
          experience_years: exp,
          is_active: true
        }])
        .select('id')
        .single()

      if (pErr) throw pErr

      const pandit_id = pandit.id

      // Link services
      const linkRows = selected.map(s => ({
        pandit_id,
        service_id: s.service_id,
        price_inr: s.rate_inr ?? null,
        duration_min: s.duration_min ?? null
      }))

      const { error: linkErr } = await supabase
        .from('pandit_services')
        .insert(linkRows)

      if (linkErr) throw linkErr

      // Add availability
      if (availability.length) {
        const availRows = availability.map(r => ({
          pandit_id,
          day_of_week: r.day_of_week,
          start_local: r.start_local + ':00',
          end_local: r.end_local + ':00',
          timezone: r.timezone || 'Asia/Kolkata'
        }))

        const { error: availErr } = await supabase
          .from('pandit_availability')
          .insert(availRows)

        if (availErr) throw availErr
      }

      alert('Pandit created successfully!')
      
      // Reset form
      setFormData({
        fullName: '',
        bio: '',
        phone: '',
        email: '',
        baseLocation: '',
        languages: '',
        experienceYears: '',
      })
      setFile(null)
      setSelected([])
      setAvailability([{ 
        id: crypto.randomUUID(), 
        day_of_week: 1, 
        start_local: '09:00', 
        end_local: '17:00', 
        timezone: 'Asia/Kolkata' 
      }])
      
    } catch (error: any) {
      console.error('Error creating pandit:', error)
      alert(error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#FAF7F2]">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-[#F53C44] via-[#FA7236] to-[#FA9F2C] bg-clip-text text-transparent mb-2">
            Add New Pandit
          </h1>
          <p className="text-gray-600">Create a new pandit profile with services and availability</p>
        </div>

        <form onSubmit={onSubmit} className="space-y-6">
          {/* Basic Information Card */}
          <div className="bg-white rounded-2xl border border-orange-100 p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-gradient-to-br from-orange-500 to-amber-500 rounded-lg">
                <User className="h-5 w-5 text-white" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900">Basic Information</h2>
            </div>

            <div className="grid gap-6">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    value={formData.fullName}
                    onChange={handleInputChange('fullName')}
                    className="w-full rounded-xl border border-gray-300 px-4 py-3 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors"
                    placeholder="e.g., Pandit Raghavendra"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Base Location
                  </label>
                  <input
                    type="text"
                    value={formData.baseLocation}
                    onChange={handleInputChange('baseLocation')}
                    className="w-full rounded-xl border border-gray-300 px-4 py-3 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors"
                    placeholder="e.g., Chennai, Tamil Nadu"
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Phone Number
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={handleInputChange('phone')}
                      className="w-full rounded-xl border border-gray-300 pl-10 pr-4 py-3 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors"
                      placeholder="+91 98765 43210"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="email"
                      value={formData.email}
                      onChange={handleInputChange('email')}
                      className="w-full rounded-xl border border-gray-300 pl-10 pr-4 py-3 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors"
                      placeholder="pandit@example.com"
                    />
                  </div>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Languages
                  </label>
                  <div className="relative">
                    <Languages className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      value={formData.languages}
                      onChange={handleInputChange('languages')}
                      className="w-full rounded-xl border border-gray-300 pl-10 pr-4 py-3 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors"
                      placeholder="Tamil, English, Hindi"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Experience (Years)
                  </label>
                  <div className="relative">
                    <Award className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="number"
                      value={formData.experienceYears}
                      onChange={handleInputChange('experienceYears')}
                      className="w-full rounded-xl border border-gray-300 pl-10 pr-4 py-3 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors"
                      placeholder="10"
                      min="0"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Bio
                </label>
                <div className="relative">
                  <FileText className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <textarea
                    value={formData.bio}
                    onChange={handleInputChange('bio')}
                    rows={4}
                    className="w-full rounded-xl border border-gray-300 pl-10 pr-4 py-3 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors resize-none"
                    placeholder="Brief introduction, specialties, achievements..."
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Profile Image
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={e => setFile(e.target.files?.[0] ?? null)}
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-orange-50 file:text-orange-700 hover:file:bg-orange-100 transition-colors"
                />
              </div>
            </div>
          </div>

          {/* Services Card */}
          <div className="bg-white rounded-2xl border border-orange-100 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-orange-500 to-amber-500 rounded-lg">
                  <Clock className="h-5 w-5 text-white" />
                </div>
                <h2 className="text-xl font-semibold text-gray-900">Services</h2>
              </div>
              <button
                type="button"
                onClick={() => setSvcOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-xl font-semibold hover:shadow-md transition-all duration-200"
              >
                <Plus className="h-4 w-4" />
                New Service
              </button>
            </div>

            {services.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No services available. Create your first service to get started.
              </div>
            ) : (
              <div className="space-y-3">
                {services.map(service => {
                  const isSelected = selectedIds.has(service.id)
                  const selectedData = selected.find(s => s.service_id === service.id)

                  return (
                    <div
                      key={service.id}
                      className={`p-4 rounded-xl border-2 transition-all duration-200 ${
                        isSelected
                          ? 'border-orange-300 bg-orange-50'
                          : 'border-gray-200 bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <label className="flex items-center gap-3 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelect(service)}
                            className="w-4 h-4 text-orange-500 rounded focus:ring-orange-500"
                          />
                          <div>
                            <div className="font-semibold text-gray-900">
                              {service.name}
                            </div>
                            <div className="text-sm text-gray-600">
                              Base: ₹{service.base_price.toLocaleString()} • {service.duration_min} mins
                            </div>
                          </div>
                        </label>

                        {isSelected && (
                          <button
                            type="button"
                            onClick={() => toggleSelect(service)}
                            className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>

                      {isSelected && (
                        <div className="mt-3 grid md:grid-cols-2 gap-3 pl-7">
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">
                              Custom Rate (₹)
                            </label>
                            <input
                              type="number"
                              value={selectedData?.rate_inr ?? ''}
                              onChange={e => updateOverride(service.id, 'rate_inr', toInt(e.target.value))}
                              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-1 focus:ring-orange-500"
                              placeholder="Leave empty for base price"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">
                              Custom Duration (mins)
                            </label>
                            <input
                              type="number"
                              value={selectedData?.duration_min ?? ''}
                              onChange={e => updateOverride(service.id, 'duration_min', toInt(e.target.value))}
                              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-1 focus:ring-orange-500"
                              placeholder="Leave empty for default"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Availability Card */}
          <div className="bg-white rounded-2xl border border-orange-100 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-orange-500 to-amber-500 rounded-lg">
                  <Calendar className="h-5 w-5 text-white" />
                </div>
                <h2 className="text-xl font-semibold text-gray-900">Weekly Availability</h2>
              </div>
              <button
                type="button"
                onClick={addAvailRow}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-xl font-semibold hover:shadow-md transition-all duration-200"
              >
                <Plus className="h-4 w-4" />
                Add Slot
              </button>
            </div>

            <div className="space-y-3">
              {availability.map(slot => (
                <div
                  key={slot.id}
                  className="p-4 rounded-xl border border-gray-200 bg-gray-50"
                >
                  <div className="grid md:grid-cols-5 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Day
                      </label>
                      <select
                        value={slot.day_of_week}
                        onChange={e => updateAvail(slot.id, { day_of_week: Number(e.target.value) })}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-1 focus:ring-orange-500"
                      >
                        {DAYS.map(day => (
                          <option key={day.value} value={day.value}>
                            {day.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Start Time
                      </label>
                      <input
                        type="time"
                        value={slot.start_local}
                        onChange={e => updateAvail(slot.id, { start_local: e.target.value })}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-1 focus:ring-orange-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        End Time
                      </label>
                      <input
                        type="time"
                        value={slot.end_local}
                        onChange={e => updateAvail(slot.id, { end_local: e.target.value })}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-1 focus:ring-orange-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Timezone
                      </label>
                      <input
                        type="text"
                        value={slot.timezone}
                        onChange={e => updateAvail(slot.id, { timezone: e.target.value })}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-1 focus:ring-orange-500"
                        placeholder="Asia/Kolkata"
                      />
                    </div>

                    <div className="flex items-end">
                      <button
                        type="button"
                        onClick={() => removeAvailRow(slot.id)}
                        className="w-full py-2 text-red-600 bg-red-50 hover:bg-red-100 rounded-lg font-medium transition-colors flex items-center justify-center gap-1"
                      >
                        <X className="h-4 w-4" />
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {availability.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No availability slots added. Add at least one slot for the pandit.
              </div>
            )}
          </div>

          {/* Submit Button */}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={loading}
              className="px-8 py-4 bg-gradient-to-r from-[#F53C44] to-[#FA7236] text-white rounded-xl font-bold text-lg hover:shadow-lg transform hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Creating Pandit...
                </div>
              ) : (
                'Create Pandit Profile'
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Create Service Modal */}
      {svcOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md mx-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Create New Service</h3>
              <button
                onClick={() => setSvcOpen(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Service Name *
                </label>
                <input
                  type="text"
                  value={svcForm.name}
                  onChange={e => setSvcForm(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  placeholder="e.g., Griha Pravesh Pooja"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Base Price (₹)
                  </label>
                  <input
                    type="number"
                    value={svcForm.price}
                    onChange={e => setSvcForm(prev => ({ ...prev, price: e.target.value }))}
                    className="w-full rounded-xl border border-gray-300 px-4 py-3 focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    placeholder="1500"
                    min="0"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Duration (mins)
                  </label>
                  <input
                    type="number"
                    value={svcForm.duration}
                    onChange={e => setSvcForm(prev => ({ ...prev, duration: e.target.value }))}
                    className="w-full rounded-xl border border-gray-300 px-4 py-3 focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    placeholder="60"
                    min="1"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setSvcOpen(false)}
                  className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={createService}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-xl font-semibold hover:shadow-md transition-all duration-200"
                >
                  Create Service
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AddPandit