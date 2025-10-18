import React, { useEffect, useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import supabase from '../supabase'
import { ChevronLeft, ChevronRight } from 'lucide-react'

type DbCollection = {
  id: string
  name: string
  slug: string
  image_url: string | null
  product_collections: { count: number }[]
}

type UiCollection = {
  id: string
  name: string
  slug: string
  image: string
  count: number
}

const PLACEHOLDER = 'https://picsum.photos/seed/collections/640/480'

const CollectionsSection: React.FC<{ title?: string; limit?: number }> = ({ 
  title = 'Shop by Collection', 
  limit = 12 
}) => {
  const [rows, setRows] = useState<UiCollection[]>([])
  const [loading, setLoading] = useState(true)
  const [showLeftArrow, setShowLeftArrow] = useState(false)
  const [showRightArrow, setShowRightArrow] = useState(true)
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const loadCollections = async () => {
      setLoading(true)
      const { data, error } = await supabase
        .from('collections')
        .select('id,name,slug,image_url,product_collections(count)')
        .order('name', { ascending: true })
        .limit(limit)

      if (error) {
        console.error('[CollectionsSection] load error:', error)
        setRows([])
      } else {
        const ui: UiCollection[] = (data as DbCollection[]).map(c => ({
          id: c.id,
          name: c.name,
          slug: c.slug,
          image: c.image_url || PLACEHOLDER,
          count: c.product_collections?.[0]?.count ?? 0,
        }))
        setRows(ui)
      }
      setLoading(false)
    }
    loadCollections()
  }, [limit])

  const checkScrollPosition = () => {
    if (scrollContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current
      setShowLeftArrow(scrollLeft > 0)
      setShowRightArrow(scrollLeft < scrollWidth - clientWidth - 10)
    }
  }

  const scroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const scrollAmount = 400
      const newScrollLeft = scrollContainerRef.current.scrollLeft + 
        (direction === 'left' ? -scrollAmount : scrollAmount)
      
      scrollContainerRef.current.scrollTo({
        left: newScrollLeft,
        behavior: 'smooth'
      })
      
      // Check position after scroll animation
      setTimeout(checkScrollPosition, 300)
    }
  }

  useEffect(() => {
    checkScrollPosition()
    window.addEventListener('resize', checkScrollPosition)
    return () => window.removeEventListener('resize', checkScrollPosition)
  }, [rows])

  return (
    <section className="py-16 bg-gradient-to-br from-amber-50 to-orange-50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Centered Header */}
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-5xl font-bold bg-gradient-to-r from-[#F53C44] via-[#FA7236] to-[#FA9F2C] bg-clip-text text-transparent mb-4">
            {title}
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Discover our carefully curated collections
          </p>
        </div>

        {/* Scrollable Container with Navigation */}
        <div className="relative">
          {/* Navigation Arrows */}
          {showLeftArrow && (
            <button
              onClick={() => scroll('left')}
              className="absolute left-0 top-1/2 transform -translate-y-1/2 z-10 p-3 bg-white/90 backdrop-blur-sm rounded-full shadow-lg border border-orange-200 hover:shadow-xl transition-all duration-200 -translate-x-1/2"
              aria-label="Scroll left"
            >
              <ChevronLeft className="h-5 w-5 text-orange-600" />
            </button>
          )}
          
          {showRightArrow && (
            <button
              onClick={() => scroll('right')}
              className="absolute right-0 top-1/2 transform -translate-y-1/2 z-10 p-3 bg-white/90 backdrop-blur-sm rounded-full shadow-lg border border-orange-200 hover:shadow-xl transition-all duration-200 translate-x-1/2"
              aria-label="Scroll right"
            >
              <ChevronRight className="h-5 w-5 text-orange-600" />
            </button>
          )}

          {/* Scrollable Content */}
          <div
            ref={scrollContainerRef}
            onScroll={checkScrollPosition}
            className="flex gap-6 overflow-x-auto scrollbar-hide pb-6 pt-2 px-2"
            style={{ 
              scrollbarWidth: 'none',
              msOverflowStyle: 'none'
            }}
          >
            {loading ? (
              // Loading Skeletons
              Array.from({ length: 8 }).map((_, index) => (
                <div
                  key={index}
                  className="flex-shrink-0 w-70 bg-white rounded-2xl border-2 border-orange-200 animate-pulse"
                >
                  <div className="aspect-[4/3] bg-gray-200 rounded-t-2xl" />
                  <div className="p-4 space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-3/4" />
                    <div className="h-3 bg-gray-200 rounded w-1/2" />
                  </div>
                </div>
              ))
            ) : (
              // Collection Cards
              rows.map((collection) => (
                <Link
                  key={collection.id}
                  to={`/collections?c=${encodeURIComponent(collection.slug)}`}
                  className="group flex-shrink-0 w-80 bg-white rounded-2xl border-2 border-orange-200 hover:border-orange-300 transition-all duration-300 hover:shadow-xl overflow-hidden"
                >
                  {/* Image Container */}
                  <div className="relative aspect-[4/3] overflow-hidden">
                    <img
                      src={collection.image}
                      alt={collection.name}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                      loading="lazy"
                    />
                    
                    {/* Gradient Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent" />
                    
                    {/* Item Count Badge */}
                    {collection.count > 0 && (
                      <div className="absolute top-3 left-3">
                        <span className="px-3 py-1.5 bg-white/90 backdrop-blur-sm rounded-full text-sm font-semibold text-amber-900 border border-orange-200">
                          {collection.count} item{collection.count === 1 ? '' : 's'}
                        </span>
                      </div>
                    )}
                    
                    {/* Hover Overlay */}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300" />
                  </div>

                  {/* Content */}
                  <div className="p-6">
                    <h3 className="text-xl font-bold text-gray-900 line-clamp-2 group-hover:text-orange-700 transition-colors duration-200 mb-2">
                      {collection.name}
                    </h3>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 font-medium group-hover:text-orange-600 transition-colors duration-200">
                        Explore collection
                      </span>
                      <ChevronRight className="h-4 w-4 text-gray-400 group-hover:text-orange-500 group-hover:translate-x-1 transition-all duration-200" />
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>

        {/* View All Link */}
        <div className="text-center mt-8">
          <Link
            to="/collections"
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-xl font-semibold hover:shadow-lg transition-all duration-200 hover:scale-105"
          >
            View All Collections
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      </div>

      {/* Hide scrollbar styles */}
      <style>{`
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </section>
  )
}

export default CollectionsSection