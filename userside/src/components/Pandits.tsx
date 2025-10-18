// src/pages/Pandits.tsx
import React, { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { getPandits, type Pandit } from '../services/pandit'
import Navbar from './Navbar'
import { Search, MapPin, Languages, Award } from 'lucide-react'

const PLACEHOLDER = 'https://picsum.photos/seed/pandit/480/360'

const LanguageTag: React.FC<{ text: string }> = ({ text }) => (
  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200">
    {text}
  </span>
)

const ExperienceBadge: React.FC<{ years: number }> = ({ years }) => (
  <div className="flex items-center gap-1 text-xs font-medium text-amber-700 bg-amber-50 px-2 py-1 rounded-full border border-amber-200 min-w-[60px] justify-center">
    <Award className="w-3 h-3" />
    <span>{years}+ yrs</span>
  </div>
)

export default function Pandits() {
  const [rows, setRows] = useState<Pandit[]>([])
  const [q, setQ] = useState('')
  const [city, setCity] = useState('all')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    (async () => {
      try {
        setLoading(true)
        const data = await getPandits()
        setRows(data)
      } catch (e) {
        console.error('[Pandits] load error:', e)
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  const cities = useMemo(() => {
    const s = new Set<string>()
    rows.forEach(r => { if (r.base_location) s.add(r.base_location) })
    return Array.from(s.values()).sort()
  }, [rows])

  const filtered = useMemo(() => {
    let list = rows
    if (city !== 'all') list = list.filter(r => r.base_location === city)
    if (q.trim()) {
      const qq = q.trim().toLowerCase()
      list = list.filter(r =>
        r.full_name.toLowerCase().includes(qq) ||
        (r.languages || '').toLowerCase().includes(qq) ||
        (r.bio || '').toLowerCase().includes(qq)
      )
    }
    return list
  }, [rows, q, city])

  return (
    <div>
      <Navbar/>
      
      <div className="min-h-screen bg-[#FAF7F2] py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-orange-600">Find Your Pandit</h1>
            <p className="mt-3 text-lg text-orange-600 max-w-2xl mx-auto">
              Connect with experienced pandits for your spiritual ceremonies and rituals
            </p>
          </div>

          {/* Filters */}
          <div className="max-w-4xl mx-auto mb-8">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="relative">
                <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                <input
                  value={q}
                  onChange={e => setQ(e.target.value)}
                  placeholder="Search by name, language, or specialty…"
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition"
                />
              </div>
              <div className="relative">
                <MapPin className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                <select
                  value={city}
                  onChange={e => setCity(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition appearance-none bg-white"
                >
                  <option value="all">All Locations</option>
                  {cities.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Results Count */}
          <div className="max-w-4xl mx-auto mb-6">
            <p className="text-gray-600">
              Showing {filtered.length} pandit{filtered.length !== 1 ? 's' : ''}
              {city !== 'all' && ` in ${city}`}
            </p>
          </div>

          {/* Loading State */}
          {loading ? (
            <div className="max-w-4xl mx-auto grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden animate-pulse">
                  <div className="aspect-[4/3] bg-gray-200" />
                  <div className="p-4 space-y-3">
                    <div className="h-4 bg-gray-200 rounded w-3/4" />
                    <div className="h-3 bg-gray-200 rounded w-1/2" />
                    <div className="flex gap-2">
                      <div className="h-6 bg-gray-200 rounded w-16" />
                      <div className="h-6 bg-gray-200 rounded w-20" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* Pandits Grid */
            <div className="max-w-4xl mx-auto grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filtered.map(pandit => (
                <Link 
                  to={`/pandits/${pandit.id}`} 
                  key={pandit.id}
                  className="group bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-lg transition-all duration-300 hover:-translate-y-1 flex flex-col"
                >
                  {/* Image */}
                  <div className="aspect-[4/3] overflow-hidden flex-shrink-0">
                    <img 
                      src={pandit.photo_url || PLACEHOLDER} 
                      alt={pandit.full_name}
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                    />
                  </div>

                  {/* Content */}
                  <div className="p-4 flex-1 flex flex-col">
                    {/* Name and Experience */}
                    <div className="flex items-start justify-between mb-2 gap-2">
                      <h3 className="font-semibold text-gray-900 text-lg group-hover:text-orange-600 transition-colors leading-tight flex-1 min-w-0">
                        {pandit.full_name}
                      </h3>
                      {pandit.experience_years && (
                        <ExperienceBadge years={pandit.experience_years} />
                      )}
                    </div>

                    {/* Location */}
                    {pandit.base_location && (
                      <div className="flex items-center gap-1 text-sm text-gray-600 mb-3">
                        <MapPin className="w-4 h-4 flex-shrink-0" />
                        <span className="truncate">{pandit.base_location}</span>
                      </div>
                    )}

                    {/* Bio Preview */}
                    {pandit.bio && (
                      <p className="text-sm text-gray-600 line-clamp-2 mb-3 flex-1">
                        {pandit.bio}
                      </p>
                    )}

                    {/* Languages */}
                    {(pandit.languages || '').split(',').filter(Boolean).length > 0 && (
                      <div className="mb-3">
                        <div className="flex items-center gap-2 mb-2">
                          <Languages className="w-4 h-4 text-gray-400 flex-shrink-0" />
                          <span className="text-xs font-medium text-gray-500">Languages</span>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {(pandit.languages || '')
                            .split(',')
                            .slice(0, 2)
                            .map(lang => (
                              <LanguageTag key={lang.trim()} text={lang.trim()} />
                            ))}
                          {(pandit.languages || '').split(',').length > 2 && (
                            <span className="text-xs text-gray-500 px-2 py-1">
                              +{(pandit.languages || '').split(',').length - 2} more
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* View Profile CTA */}
                    <div className="pt-3 border-t border-gray-100 mt-auto">
                      <span className="text-sm font-medium text-orange-600 group-hover:text-orange-700 transition-colors inline-flex items-center gap-1">
                        View Profile 
                        <span className="group-hover:translate-x-0.5 transition-transform">→</span>
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}

          {/* Empty State */}
          {!loading && !filtered.length && (
            <div className="max-w-4xl mx-auto text-center py-12">
              <div className="w-24 h-24 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                <Search className="w-10 h-10 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No pandits found</h3>
              <p className="text-gray-600 max-w-md mx-auto">
                {q || city !== 'all' 
                  ? 'Try adjusting your search criteria or location filter'
                  : 'No pandits are currently available. Please check back later.'
                }
              </p>
              {(q || city !== 'all') && (
                <button
                  onClick={() => {
                    setQ('')
                    setCity('all')
                  }}
                  className="mt-4 px-6 py-2 text-orange-600 font-medium hover:text-orange-700 transition-colors"
                >
                  Clear filters
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}