import { useParams, Link } from "react-router-dom";
import { ArrowLeft, MessageCircle, Star, Clock, Calendar, Award, Languages, Zap, Heart, Shield, Users } from "lucide-react";
import { ASTROLOGERS } from "../components/astrologers";
import Navbar from "./Navbar";

const gradientText = "bg-gradient-to-r from-[#F53C44] via-[#FA7236] to-[#FA9F2C] bg-clip-text text-transparent";
const money = (n:number)=>`₹${n.toLocaleString('en-IN')}`

export default function AstrologerProfile() {
  const { id } = useParams();
  const astro = ASTROLOGERS.find(a => a.id === id);

  if (!astro) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FFF8E7] ">
        <div className="text-center">
          <div className={`text-3xl font-bold ${gradientText} mb-4`}>Astrologer Not Found</div>
          <Link to="/astrotalk" className="inline-flex items-center gap-2 rounded-lg px-6 py-3 border border-gray-300 text-gray-700 font-medium bg-white hover:bg-gray-50 transition-colors">
            <ArrowLeft className="h-4 w-4"/>
            Back to Astrologers
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Navbar/>
    <div className="min-h-screen bg-[#FFF8E7] p-6">
      <div className="app-container py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link 
            to="/astrotalk" 
            className="inline-flex items-center gap-2 rounded-lg px-4 py-2.5 border border-gray-300 text-gray-700 font-medium bg-white hover:bg-gray-50 transition-colors shadow-sm"
          >
            <ArrowLeft className="h-4 w-4"/>
            Back
          </Link>
          <div className="flex-1">
            <h1 className={`text-3xl font-bold ${gradientText}`}>{astro.name}</h1>
            <p className="text-gray-600 mt-1">Vedic Astrologer & Spiritual Guide</p>
          </div>
        </div>

        {/* Main Profile Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr_340px] gap-6">
          {/* Profile Image & Basic Info */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <div className="text-center">
              <div className="relative inline-block">
                <img 
                  src={astro.img} 
                  alt={astro.name} 
                  className="w-48 h-48 rounded-xl object-cover border-4 border-white shadow-md mx-auto"
                />
                {astro.offer && (
                  <div className="absolute -top-2 -right-2">
                    <span className="inline-flex items-center gap-1 px-3 py-1 text-xs font-bold text-white bg-gradient-to-r from-orange-500 to-red-500 rounded-full shadow-lg">
                      <Zap className="h-3 w-3"/>
                      Offer
                    </span>
                  </div>
                )}
              </div>
              
              <div className="mt-6 space-y-4">
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm font-medium text-gray-600">Experience</span>
                  <span className="font-semibold text-gray-900">{astro.exp} years</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm font-medium text-gray-600">Rating</span>
                  <span className="font-semibold text-gray-900 flex items-center gap-1">
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400"/>
                    {astro.rating.toFixed(1)}
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm font-medium text-gray-600">Rate</span>
                  <span className="font-semibold text-gray-900">{money(astro.rate)}/min</span>
                </div>
              </div>
            </div>
          </div>

          {/* Bio & Details */}
          <section className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            {/* Stats Row */}
            <div className="flex flex-wrap gap-3 mb-6">
              <span className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg border border-gray-300 bg-white text-gray-700">
                <Award className="h-4 w-4 text-orange-500"/>
                {astro.exp} yrs exp
              </span>
              <span className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg border border-gray-300 bg-white text-gray-700">
                <Star className="h-4 w-4 fill-amber-500 text-amber-500"/>
                {astro.rating.toFixed(1)} Rating
              </span>
              <span className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg border border-gray-300 bg-white text-gray-700">
                <Clock className="h-4 w-4 text-orange-500"/>
                {money(astro.rate)}/min
              </span>
            </div>
            
            {/* Bio */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">About</h3>
              <p className="text-gray-700 leading-relaxed">{astro.bio}</p>
            </div>

            {/* Skills */}
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <Zap className="h-5 w-5 text-orange-500"/>
                <h3 className="text-lg font-semibold text-gray-900">Specializations</h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {astro.skills.map((s) => (
                  <span 
                    key={s} 
                    className="px-3 py-1.5 rounded-lg border border-gray-300 bg-gray-50 text-gray-700 text-sm font-medium"
                  >
                    {s}
                  </span>
                ))}
              </div>
            </div>

            {/* Languages */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Languages className="h-5 w-5 text-orange-500"/>
                <h3 className="text-lg font-semibold text-gray-900">Languages</h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {astro.languages.map(s => (
                  <span 
                    key={s} 
                    className="px-3 py-1.5 rounded-lg border border-gray-300 bg-gray-50 text-gray-700 text-sm font-medium"
                  >
                    {s}
                  </span>
                ))}
              </div>
            </div>
          </section>

          {/* Actions & Quick Info */}
          <aside className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm h-fit">
            {/* Rate */}
            <div className="text-center mb-6">
              <div className="text-sm font-medium text-gray-600 mb-1">Consultation Rate</div>
              <div className="text-3xl font-bold text-gray-900">
                {money(astro.rate)}<span className="text-base font-semibold text-gray-600">/min</span>
              </div>
              <div className="mt-2 h-1 rounded-full bg-gradient-to-r from-[#F53C44] via-[#FA7236] to-[#FA9F2C]"/>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3 mb-6">
              <Link 
                to={`/chat/${astro.id}`} 
                className="block w-full rounded-lg px-4 py-3 text-white font-semibold bg-gradient-to-r from-[#F53C44] via-[#FA7236] to-[#FA9F2C] hover:shadow-md transition-all items-center gap-2 justify-center"
              >
                <MessageCircle className="h-5 w-5"/>
                Start Live Chat
              </Link>
              <button className="w-full rounded-lg px-4 py-3 border border-gray-300 text-gray-700 font-medium bg-white hover:bg-gray-50 transition-colors inline-flex items-center gap-2 justify-center">
                <Calendar className="h-5 w-5"/>
                Schedule Call
              </button>
            </div>

            {/* Why Choose */}
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <Heart className="h-5 w-5 text-orange-500"/>
                <h4 className="font-semibold text-gray-900">Why Choose {astro.name}?</h4>
              </div>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 bg-orange-500 rounded-full mt-1.5 flex-shrink-0"></div>
                  Clear timelines and practical remedies
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 bg-orange-500 rounded-full mt-1.5 flex-shrink-0"></div>
                  Approachable and empathetic style
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 bg-orange-500 rounded-full mt-1.5 flex-shrink-0"></div>
                  Excellent reviews for {astro.skills[0]}
                </li>
              </ul>
            </div>

            {/* Trust Badges */}
            <div className="p-4 rounded-lg bg-gray-50 border border-gray-200">
              <div className="flex items-center gap-2 mb-2">
                <Shield className="h-4 w-4 text-green-500"/>
                <span className="text-sm font-medium text-gray-900">Verified Astrologer</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-blue-500"/>
                <span className="text-sm text-gray-600">500+ Satisfied Clients</span>
              </div>
            </div>
          </aside>
        </div>

        {/* Overview Section */}
        <section className="mt-8 bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Professional Overview</h2>
          <p className="text-gray-700 mb-6 leading-relaxed">{astro.shortDesc}</p>
          
          <div className="grid sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-lg border border-gray-300 bg-gray-50">
              <div className="flex items-center gap-2 mb-2">
                <Zap className="h-4 w-4 text-orange-500"/>
                <span className="font-medium text-gray-900">Expertise</span>
              </div>
              <div className="text-gray-600 text-sm">{astro.skills.join(', ')}</div>
            </div>
            <div className="p-4 rounded-lg border border-gray-300 bg-gray-50">
              <div className="flex items-center gap-2 mb-2">
                <Languages className="h-4 w-4 text-orange-500"/>
                <span className="font-medium text-gray-900">Languages</span>
              </div>
              <div className="text-gray-600 text-sm">{astro.languages.join(', ')}</div>
            </div>
            <div className="p-4 rounded-lg border border-gray-300 bg-gray-50">
              <div className="flex items-center gap-2 mb-2">
                <Award className="h-4 w-4 text-orange-500"/>
                <span className="font-medium text-gray-900">Experience</span>
              </div>
              <div className="text-gray-600 text-sm">{astro.exp} years of spiritual guidance</div>
            </div>
          </div>
        </section>

        {/* Features Footer */}
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <div className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 bg-white text-gray-700 text-sm font-medium">
            <Shield className="h-4 w-4 text-green-500"/>
            Secure Payment
          </div>
          <div className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 bg-white text-gray-700 text-sm font-medium">
            <Clock className="h-4 w-4 text-orange-500"/>
            24/7 Available
          </div>
          <div className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 bg-white text-gray-700 text-sm font-medium">
            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400"/>
            Verified Reviews
          </div>
          <div className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 bg-white text-gray-700 text-sm font-medium">
            <Heart className="h-4 w-4 text-red-400"/>
            Personalized
          </div>
        </div>
      </div>
    </div>
    </div>
  );
}