import React, { useState } from "react"
import { Menu, X } from "lucide-react"
// import TablyLogo from "../assets/image.png"
import { useAuth } from "../context/AuthContext" // <-- use your AuthContext
import { useNavigate } from "react-router-dom"
import logo from "../assets/logo.png"

const Navbar: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false)
  const { user, signOut } = useAuth() 
  const navigate = useNavigate() 

  const handleLogout = async () => {
    try {
      await signOut()
      console.log("Logged out successfully")
      navigate("/login")
    } catch (error) {
      console.error("Logout failed:", error)
    }
  }

  // Get first letter of full_name or fallback to email
  const initial =
    user?.user_metadata?.full_name?.[0]?.toUpperCase() ||
    user?.email?.[0]?.toUpperCase() ||
    "?"

  return (
    <nav className="fixed top-0 w-full bg-[#f95007] text-black shadow-md font-[Poppins] z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center gap-2">
           <img src={logo} className="h-10 w-10 rounded-full"></img>
            <h1 className="text-2xl font-bold text-white">Vedic Creation</h1>
          </div>

          {/* Desktop Buttons */}
          <div className="hidden md:flex items-center gap-4">
            {!user ? (
              <>
                <button className="text-white font-medium px-4 py-2 rounded-md transition-all duration-300 hover:bg-white hover:text-[#f95007] hover:shadow-md">
                  Login
                </button>
                <button className="bg-white text-[#f95007] font-semibold px-5 py-2 rounded-full shadow-md transition-all duration-300 hover:bg-orange-100 hover:scale-105">
                  Sign Up
                </button>
              </>
            ) : (
              <>
                <div className="w-10 h-10 flex items-center justify-center rounded-full bg-white text-[#f95007] font-bold shadow-md">
                  {initial}
                </div>
                <button
                  onClick={handleLogout}
                  className="text-white font-medium px-4 py-2 rounded-md transition-all duration-300 hover:bg-white hover:text-[#f95007] hover:shadow-md"
                >
                  Logout
                </button>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="text-white hover:scale-110 transition"
            >
              {isOpen ? <X size={28} /> : <Menu size={28} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Dropdown Menu */}
      {isOpen && (
        <div className="md:hidden bg-[#f95007] shadow-lg px-4 pb-4 flex flex-col gap-3 animate-slideDown">
          {!user ? (
            <>
              <button className="text-white font-medium px-4 py-2 rounded-md transition-all duration-300 hover:bg-white hover:text-[#f95007] hover:shadow-md">
                Login
              </button>
              <button className="bg-white text-[#f95007] font-semibold px-5 py-2 rounded-full shadow-md transition-all duration-300 hover:bg-orange-100 hover:scale-105">
                Sign Up
              </button>
            </>
          ) : (
            <>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 flex items-center justify-center rounded-full bg-white text-[#f95007] font-bold shadow-md">
                  {initial}
                </div>
                <span className="text-white font-medium">
                  {user.user_metadata?.full_name || user.email}
                </span>
              </div>
              <button
                onClick={handleLogout}
                className="text-white font-medium px-4 py-2 rounded-md transition-all duration-300 hover:bg-white hover:text-[#f95007] hover:shadow-md"
              >
                Logout
              </button>
            </>
          )}
        </div>
      )}
    </nav>
  )
}

export default Navbar
