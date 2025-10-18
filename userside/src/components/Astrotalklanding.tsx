// src/components/landing/AstrotalkTeaser.tsx
import React, { useRef } from "react"
import { Star, MessageCircle, Clock, ChevronLeft, ChevronRight } from "lucide-react"
import { Link, useNavigate } from "react-router-dom"

type Astrologer = {
  id: string
  name: string
  photo?: string | null
  expertise: string[]
  rating: number
  reviews: number
  price_inr: number
  next_available?: string | null
}

type Props = {
  topics?: string[]
  astrologers?: Astrologer[]
}

const money = (n: number) => `₹${n.toLocaleString("en-IN")}`

const DEFAULT_TOPICS = [
  "Love",
  "Career",
  "Marriage",
  "Health",
  "Education",
  "Business",
]

const PLACEHOLDER = "https://picsum.photos/seed/astrologer/80/80"

const AstrotalkTeaser: React.FC<Props> = ({ topics = DEFAULT_TOPICS, astrologers = [] }) => {
  const navigate = useNavigate()
  const scrollRef = useRef<HTMLDivElement>(null)

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = 300
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      })
    }
  }

  return (
    <section className="py-12 bg-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        {/* Centered Header */}
        <div className="text-center mb-8">
          <h2 className="text-5xl font-bold bg-gradient-to-r from-[#F53C44] via-[#FA7236] to-[#FA9F2C] bg-clip-text text-transparent mb-2">
            Talk to Expert Astrologers
          </h2>
          <p className="text-gray-600">
            Instant guidance on love, career, marriage & more
          </p>
        </div>

        {/* Topic Chips */}
        <div className="flex flex-wrap justify-center gap-2 mb-8">
          {topics.map((topic) => (
            <button
              key={topic}
              onClick={() => navigate(`/astrotalk?topic=${encodeURIComponent(topic)}`)}
              className="px-3 py-1.5 rounded-full border border-orange-200 bg-white text-amber-900 text-sm hover:bg-orange-50 transition-colors"
            >
              {topic}
            </button>
          ))}
        </div>

        {/* Horizontal Scroll Container */}
        <div className="relative mb-8">
          {/* Navigation Arrows */}
          <button
            onClick={() => scroll('left')}
            className="absolute left-0 top-1/2 transform -translate-y-1/2 z-10 p-2 bg-white/80 backdrop-blur-sm rounded-full shadow-lg border border-orange-200 hover:shadow-xl transition-all -translate-x-1/2"
          >
            <ChevronLeft className="h-4 w-4 text-orange-600" />
          </button>
          
          <button
            onClick={() => scroll('right')}
            className="absolute right-0 top-1/2 transform -translate-y-1/2 z-10 p-2 bg-white/80 backdrop-blur-sm rounded-full shadow-lg border border-orange-200 hover:shadow-xl transition-all translate-x-1/2"
          >
            <ChevronRight className="h-4 w-4 text-orange-600" />
          </button>

          {/* Scrollable Astrologers */}
          <div
            ref={scrollRef}
            className="flex gap-4 overflow-x-auto scrollbar-hide pb-4"
          >
            {(astrologers.length ? astrologers : demoAstros).map((astrologer) => (
              <div
                key={astrologer.id}
                className="flex-shrink-0 w-80 bg-white rounded-xl border border-orange-100 p-4 hover:shadow-md transition-all duration-200"
              >
                <div className="flex items-start gap-3 mb-3">
                  <img
                    src={astrologer.photo || PLACEHOLDER}
                    alt={astrologer.name}
                    className="w-12 h-12 rounded-lg object-cover"
                  />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 text-sm truncate">{astrologer.name}</h3>
                    <p className="text-xs text-gray-600 mt-0.5 truncate">
                      {astrologer.expertise.join(", ")}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex items-center gap-1">
                        <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
                        <span className="text-xs font-semibold text-gray-900">
                          {astrologer.rating.toFixed(1)}
                        </span>
                        <span className="text-xs text-gray-600">
                          ({astrologer.reviews})
                        </span>
                      </div>
                      {astrologer.next_available && (
                        <div className="flex items-center gap-1 text-xs text-gray-600">
                          <Clock className="h-3 w-3" />
                          {astrologer.next_available}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-600">Starts from</p>
                    <p className="text-lg font-bold text-amber-900">
                      {money(astrologer.price_inr)}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => navigate(`/pandits/${astrologer.id}`)}
                      className="px-3 py-1.5 border border-orange-300 text-orange-700 text-xs rounded-lg font-medium hover:bg-orange-50 transition-colors"
                    >
                      Profile
                    </button>
                    <button
                      onClick={() => navigate(`/astrotalk?start=${astrologer.id}`)}
                      className="px-3 py-1.5 bg-gradient-to-r from-[#F53C44] to-[#FA7236] text-white text-xs rounded-lg font-medium hover:shadow-sm transition-all"
                    >
                      Chat
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Trust Features */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="text-center p-3 rounded-lg border border-orange-100 bg-orange-50">
            <p className="text-xs font-medium text-gray-900">Private & Secure</p>
          </div>
          <div className="text-center p-3 rounded-lg border border-orange-100 bg-orange-50">
            <p className="text-xs font-medium text-gray-900">Verified Experts</p>
          </div>
          <div className="text-center p-3 rounded-lg border border-orange-100 bg-orange-50">
            <p className="text-xs font-medium text-gray-900">Flexible Payment</p>
          </div>
        </div>

        {/* CTA Button */}
        <div className="text-center">
          <Link
            to="/astrotalk"
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#F53C44] to-[#FA7236] text-white rounded-xl font-semibold text-sm hover:shadow-md transition-all"
          >
            <MessageCircle className="h-4 w-4" />
            Explore All Astrologers
          </Link>
        </div>
      </div>

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

export default AstrotalkTeaser

// Demo data
const demoAstros: Astrologer[] = [
  { 
    id: "a1", 
    name: "Acharya Meera", 
    photo: null, 
    expertise: ["Vedic", "Tarot"], 
    rating: 4.9, 
    reviews: 842, 
    price_inr: 399, 
    next_available: "Today, 5 PM" 
  },
  { 
    id: "a2", 
    name: "Guru Prakash", 
    photo: null, 
    expertise: ["KP", "Numerology"], 
    rating: 4.8, 
    reviews: 650, 
    price_inr: 349, 
    next_available: "Today, 6:15 PM" 
  },
  { 
    id: "a3", 
    name: "Pandit Arjun", 
    photo: null, 
    expertise: ["Vedic", "Prashna"], 
    rating: 4.7, 
    reviews: 510, 
    price_inr: 299, 
    next_available: "Today, 4:45 PM" 
  },
  { 
    id: "a4", 
    name: "Dr. Priya Sharma", 
    photo: null, 
    expertise: ["Numerology", "Tarot"], 
    rating: 4.8, 
    reviews: 420, 
    price_inr: 449, 
    next_available: "Today, 7 PM" 
  },
]