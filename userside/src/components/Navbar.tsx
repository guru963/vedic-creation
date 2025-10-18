import  { useEffect, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Menu, X, ShoppingCart, ChevronDown, LogOut, User, Package } from "lucide-react";
// ⬇️ adjust this import path to your AuthContext
import { useAuth } from "../contexts/AuthContext";
import logo from "../assets/logo.jpeg"

export default function SaffronNav() {
  const [open, setOpen] = useState(false);
  const [cartCount, setCartCount] = useState(0);
  const [profileOpen, setProfileOpen] = useState(false);

  const { user, signOut } = useAuth();
  const nav = useNavigate();
  const location = useLocation();

  // brand gradient
  const gradient =
    "linear-gradient(90deg, #F53C44 0%, #FA7236 30%, #FA9F2C 65%, #FCD62B 100%)";

  // read count from localStorage
  const getCartCount = () => {
    try {
      const raw = localStorage.getItem("cart");
      if (!raw) return 0;
      const arr = JSON.parse(raw) as Array<{ qty?: number }>;
      return arr.reduce((s, it) => s + (it?.qty ?? 0), 0);
    } catch {
      return 0;
    }
  };

  useEffect(() => {
    setCartCount(getCartCount());
    const onChange = () => setCartCount(getCartCount());
    window.addEventListener("cart-updated", onChange);
    window.addEventListener("storage", onChange);
    return () => {
      window.removeEventListener("cart-updated", onChange);
      window.removeEventListener("storage", onChange);
    };
  }, []);

  // profile initial
  const initial =
    (user as any)?.user_metadata?.full_name?.[0]?.toUpperCase() ||
    user?.email?.[0]?.toUpperCase() ||
    "U";

  // user display name
  const displayName =
    (user as any)?.user_metadata?.full_name || user?.email?.split('@')[0] || "User";

  const handleLogout = async () => {
    try {
      await signOut();
      setProfileOpen(false);
      nav("/login");
    } catch (e) {
      console.error("[Navbar] logout failed:", e);
    }
  };

  const goLoginWithReturn = () => {
    nav("/login", { state: { returnTo: location.pathname + location.search } });
  };

  return (
    <header className="sticky top-0 z-50 text-white">
      <nav className="relative" style={{ background: gradient }}>
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex gap-1.5 items-center">
              <img className ="h-11 w-11 rounded-full"src={logo}></img>
            {/* Left: Brand */}
            <Link to="/" className="font-extrabold tracking-wide text-white">
              Vedic Creation
            </Link>
            </div>

            {/* Center links (md+) */}
            <ul className="hidden md:flex items-center gap-6 lg:gap-8 text-sm lg:text-[15px] font-semibold">
              {[
                ["Home", "/"],
                // ["About", "/about"],
                ["Astrotalk", "/astrotalk"],
                ["Store", "/collections"],
                ["Pandit Booking", "/pandits"],
              ].map(([label, href]) => (
                <li key={href as string}>
                  <Link
                    to={href as string}
                    className="relative inline-block py-2 transition-all duration-200 hover:-translate-y-0.5 focus:-translate-y-0.5"
                  >
                    <span className="after:absolute after:left-0 after:-bottom-0.5 after:h-[2px] after:w-0 after:bg-white after:transition-all after:duration-300 hover:after:w-full focus:after:w-full">
                      {label}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>

            {/* Right: Auth + Cart (md+) */}
            <div className="hidden md:flex items-center gap-4">
              {!user ? (
                <>
                  <button
                    onClick={goLoginWithReturn}
                    className="rounded-xl border border-white/90 px-4 py-2 text-sm font-bold text-white transition-all hover:bg-white/15 active:scale-[0.98]"
                  >
                    Login
                  </button>
                  <Link
                    to="/register"
                    className="rounded-xl px-4 py-2 text-sm font-extrabold text-[#5A1A00] bg-white/95 shadow-[0_6px_18px_rgba(0,0,0,0.15)] transition-all hover:shadow-[0_10px_28px_rgba(0,0,0,0.18)] hover:-translate-y-0.5 active:translate-y-0"
                  >
                    Register
                  </Link>
                </>
              ) : (
                <>
                  {/* Orders Icon */}
                  <Link
                    to="/orders-place"
                    className="relative inline-flex items-center justify-center rounded-xl border border-white/90 p-2.5 hover:bg-white/15 transition-all duration-200 hover:-translate-y-0.5"
                    aria-label="Orders"
                    title="My Orders"
                  >
                    <Package className="h-5 w-5" />
                  </Link>

                  {/* Cart */}
                  <Link
                    to="/cart"
                    className="relative inline-flex items-center justify-center rounded-xl border border-white/90 p-2.5 hover:bg-white/15 transition-all duration-200 hover:-translate-y-0.5"
                    aria-label="Cart"
                    title="Cart"
                  >
                    <ShoppingCart className="h-5 w-5" />
                    {cartCount > 0 && (
                      <span className="absolute -top-2 -right-2 min-w-[1.25rem] h-5 rounded-full px-1 text-[11px] font-bold text-[#5A1A00] bg-white flex items-center justify-center">
                        {cartCount}
                      </span>
                    )}
                  </Link>

                  {/* Enhanced Profile bubble + dropdown */}
                  <div className="relative">
                    <button
                      onClick={() => setProfileOpen((s) => !s)}
                      className="inline-flex items-center gap-2 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20 px-3 py-2 transition-all duration-200 hover:bg-white/20 hover:-translate-y-0.5 group"
                      aria-label="Profile menu"
                    >
                      {/* Avatar */}
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-white text-[#5A1A00] font-bold text-sm shadow-sm group-hover:scale-105 transition-transform">
                        {initial}
                      </div>
                      
                      {/* User info - hidden on smaller screens, shown on larger */}
                      <div className="hidden lg:block text-left">
                        <div className="text-xs font-medium text-white/90 leading-tight">
                          Hello,
                        </div>
                        <div className="text-sm font-bold text-white leading-tight max-w-[120px] truncate">
                          {displayName}
                        </div>
                      </div>
                      
                      <ChevronDown 
                        className={`h-4 w-4 text-white transition-transform duration-200 ${
                          profileOpen ? "rotate-180" : ""
                        }`} 
                      />
                    </button>
                    
                    {/* Enhanced Dropdown */}
                    {profileOpen && (
                      <div
                        className="absolute right-0 mt-3 w-64 rounded-2xl bg-white/95 backdrop-blur-md text-[#5A1A00] shadow-xl ring-1 ring-white/20 overflow-hidden border border-white/30"
                        onMouseLeave={() => setProfileOpen(false)}
                      >
                        {/* Header with user info */}
                        <div className="px-4 py-4 bg-gradient-to-r from-white to-white/80 border-b border-white/20">
                          <div className="flex items-center gap-3">
                            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-[#F53C44] to-[#FA9F2C] text-white font-bold text-sm shadow-md">
                              {initial}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-semibold text-gray-900 truncate">
                                {displayName}
                              </div>
                              <div className="text-xs text-gray-600 truncate mt-0.5">
                                {user?.email}
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        {/* Menu items */}
                        <div className="p-2">
                          <Link
                            to="/profile"
                            onClick={() => setProfileOpen(false)}
                            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100/80 transition-colors"
                          >
                            <User className="h-4 w-4" />
                            My Profile
                          </Link>

                          <Link
                            to="/orders-place"
                            onClick={() => setProfileOpen(false)}
                            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100/80 transition-colors"
                          >
                            <Package className="h-4 w-4" />
                            My Orders
                          </Link>
                          
                          <div className="h-px bg-gray-200/60 my-1" />
                          
                          <button
                            onClick={handleLogout}
                            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50/80 transition-colors"
                          >
                            <LogOut className="h-4 w-4" />
                            Sign Out
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Mobile burger */}
            <button
              onClick={() => setOpen((v) => !v)}
              className="md:hidden inline-flex items-center justify-center rounded-lg p-2 text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
              aria-expanded={open}
              aria-label="Toggle menu"
            >
              {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>

        {/* Mobile panel */}
        <div
          className={`md:hidden overflow-hidden transition-[max-height] duration-300 ${
            open ? "max-h-96" : "max-h-0"
          }`}
        >
          <div className="px-4 pb-4 pt-2">
            <ul className="space-y-1 text-sm font-semibold">
              {[
                ["Home", "/"],
                ["About", "/about"],
                ["Astrotalk", "/astrotalk"],
                ["Store", "/collections"],
                ["Pandit Booking", "/pandits"],
              ].map(([label, href]) => (
                <li key={href as string}>
                  <Link
                    to={href as string}
                    className="block rounded-lg px-3 py-2 text-white hover:bg-white/15"
                    onClick={() => setOpen(false)}
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>

            <div className="mt-3 grid grid-cols-3 gap-2">
              {!user ? (
                <>
                  <button
                    onClick={() => {
                      setOpen(false);
                      goLoginWithReturn();
                    }}
                    className="rounded-lg border border-white/90 px-3 py-2 text-center text-sm font-bold text-white hover:bg-white/15"
                  >
                    Login
                  </button>
                  <Link
                    to="/register"
                    onClick={() => setOpen(false)}
                    className="rounded-lg px-3 py-2 text-center text-sm font-extrabold text-[#5A1A00] bg-white/95 hover:bg-white"
                  >
                    Register
                  </Link>
                  <Link
                    to="/cart"
                    onClick={() => setOpen(false)}
                    className="relative rounded-lg border border-white/90 px-3 py-2 text-center text-sm font-bold text-white hover:bg-white/15"
                    aria-label="Cart"
                  >
                    Cart
                    {cartCount > 0 && (
                      <span className="ml-1 inline-flex min-w-[1.25rem] justify-center rounded-full px-1 text-[11px] font-bold text-[#5A1A00] bg-white">
                        {cartCount}
                      </span>
                    )}
                  </Link>
                </>
              ) : (
                <>
                  <Link
                    to="/orders-place"
                    onClick={() => setOpen(false)}
                    className="rounded-lg border border-white/90 px-3 py-2 text-center text-sm font-bold text-white hover:bg-white/15"
                  >
                    Orders
                  </Link>
                  <Link
                    to="/cart"
                    onClick={() => setOpen(false)}
                    className="relative rounded-lg border border-white/90 px-3 py-2 text-center text-sm font-bold text-white hover:bg-white/15"
                  >
                    Cart
                    {cartCount > 0 && (
                      <span className="ml-1 inline-flex min-w-[1.25rem] justify-center rounded-full px-1 text-[11px] font-bold text-[#5A1A00] bg-white">
                        {cartCount}
                      </span>
                    )}
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="rounded-lg border border-white/90 px-3 py-2 text-center text-sm font-bold text-white hover:bg-white/15"
                  >
                    Logout
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>
    </header>
  );
}