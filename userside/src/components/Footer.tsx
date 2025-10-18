// src/components/Footer.tsx
import React from "react"
import { Link } from "react-router-dom"
import { Mail, Phone, MapPin, Facebook, Instagram, Youtube } from "lucide-react"
import logo from "../assets/logo.jpeg"

const Footer: React.FC = () => {
  return (
    <footer className="text-white">
      {/* Top wave / border */}
      <div className="h-[3px] w-full bg-gradient-to-r from-[#F53C44] via-[#FA7236] to-[#FA9F2C]" />

      {/* Main */}
      <div
        className="py-10"
        style={{
          background:
            "linear-gradient(90deg, #F53C44 0%, #FA7236 45%, #FA9F2C 100%)",
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {/* Brand / Logo */}
            <div>
              <div className="flex items-center gap-3">
                <img src={logo} className="h-15 w-15"></img>
                <div className="text-xl font-extrabold tracking-wide">
                  Vedic Creation
                </div>
              </div>
              <p className="mt-3 text-white/90 text-sm leading-relaxed">
                Authentic puja essentials, spiritual décor, wellness remedies,
                and on-demand services from trusted pandits & astrologers.
              </p>
            </div>

            {/* Links */}
            <div>
              <h4 className="font-bold uppercase tracking-wide mb-3">
                Quick Links
              </h4>
              <ul className="space-y-2 text-sm">
                <li><Link to="/" className="hover:underline">Home</Link></li>
                <li><Link to="/collections" className="hover:underline">Store</Link></li>
                <li><Link to="/astrotalk" className="hover:underline">Astrotalk</Link></li>
                <li><Link to="/pandits" className="hover:underline">Pandit Booking</Link></li>
                <li><Link to="/contact" className="hover:underline">Contact</Link></li>
              </ul>
            </div>

            {/* Policies */}
            <div>
              <h4 className="font-bold uppercase tracking-wide mb-3">
                Policies
              </h4>
              <ul className="space-y-2 text-sm">
                <li><Link to="/privacy" className="hover:underline">Privacy Policy</Link></li>
                <li><Link to="/terms" className="hover:underline">Terms of Service</Link></li>
                <li><Link to="/shipping" className="hover:underline">Shipping & Returns</Link></li>
                <li><Link to="/faq" className="hover:underline">FAQ</Link></li>
              </ul>
            </div>

            {/* Contact */}
            <div>
              <h4 className="font-bold uppercase tracking-wide mb-3">
                Get in touch
              </h4>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <Mail className="h-4 w-4" /> support@vediccreation.com
                </li>
                <li className="flex items-center gap-2">
                  <Phone className="h-4 w-4" /> +91 98765 43210
                </li>
                <li className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" /> Chennai, India
                </li>
              </ul>

              <div className="mt-4 flex items-center gap-3">
                <a href="https://facebook.com" target="_blank" rel="noreferrer" aria-label="Facebook"
                   className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition">
                  <Facebook className="h-4 w-4" />
                </a>
                <a href="https://instagram.com" target="_blank" rel="noreferrer" aria-label="Instagram"
                   className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition">
                  <Instagram className="h-4 w-4" />
                </a>
                <a href="https://youtube.com" target="_blank" rel="noreferrer" aria-label="YouTube"
                   className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition">
                  <Youtube className="h-4 w-4" />
                </a>
              </div>
            </div>
          </div>

          {/* Bottom strip */}
          <div className="mt-10 pt-6 border-t border-white/20 text-xs sm:text-sm flex flex-col sm:flex-row items-center justify-between gap-3">
            <div>© {new Date().getFullYear()} Vedic Creation. All rights reserved.</div>
            <div className="text-white/90">
              Made with <span className="font-semibold">🙏</span> in India
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}

export default Footer
