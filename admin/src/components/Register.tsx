import React, { useState, type FormEvent, type ChangeEvent } from "react"
// import Navbar from "../components/Navbar"
import registerlogo from "../assets/image.png"
import { Link, useNavigate } from "react-router-dom"
import supabase from "../lib/supabase"

type UiAdmin = "admin" | "products" | "orders" | "returns" | "pandits"
type AdminRole = "admin" | "products" | "orders" | "returns" | "pandits"

const ADMIN_ROUTE_BY_UI: Record<UiAdmin, string> = {
  admin:   "/admin-dashboard",
  products:"/admin/products",
  orders:  "/admin/orders",
  returns: "/admin/returns",
  pandits: "/admin/pandits",
}

const UI_TO_ADMIN_ROLE: Record<UiAdmin, AdminRole[]> = {
  admin:   ["admin"],
  products:["products"],
  orders:  ["orders"],
  returns: ["returns"],
  pandits: ["pandits"],
}

const Register: React.FC = () => {
  const [name, setName] = useState<string>("")
  const [email, setEmail] = useState<string>("")
  const [password, setPassword] = useState<string>("")
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)

  // NEW: single-choice admin category (toggle like your Login)
  const [uiRole, setUiRole] = useState<UiAdmin>("admin")

  const navigate = useNavigate()

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    setInfo(null)

    if (!name.trim() || !email.trim() || !password.trim()) {
      setError("All fields are required")
      return
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters long")
      return
    }

    const adminRoles = UI_TO_ADMIN_ROLE[uiRole] // array for future-proofing
    const targetRoute = ADMIN_ROUTE_BY_UI[uiRole]

    setLoading(true)
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: name,
            // keep a simple scalar for backwards compatibility
            role: uiRole,                 // "admin" | "products" | ...
            // and a structured array for category-aware routing later
            admin_roles: adminRoles,      // ["super_admin"] or ["products"] etc.
          },
        },
      })

      if (error) {
        if (error.message.includes("User already registered")) {
          setError("This email is already registered. Try logging in.")
        } else if (error.message.includes("Invalid email")) {
          setError("Please enter a valid email address")
        } else {
          setError(`Registration failed: ${error.message}`)
        }
        return
      }

      // If email confirmations are off, Supabase returns a session -> go straight in
      if (data?.session) {
        navigate(targetRoute)
      } else {
        // If confirmations are on, send them to verify with redirect hint
        setInfo("Registration successful! Please verify your email to continue.")
        navigate(`/verify-email?next=${encodeURIComponent(targetRoute)}`)
      }
    } catch (err: any) {
      console.error("Unexpected error:", err)
      setError("Unexpected error occurred. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-[#fff6eb] min-h-screen flex flex-col font-[Poppins]">
      {/* <Navbar /> */}
      <div className="flex-grow flex flex-col-reverse lg:flex-row items-center justify-between px-6 md:px-10 gap-8">
        <div className="bg-white w-full max-w-[500px] p-8 rounded-2xl shadow-lg flex-shrink-0">
          <h1 className="text-3xl font-bold mb-6 text-gray-800 text-center">
            Create Your Admin Account
          </h1>

          {(error || info) && (
            <div
              className={`mb-3 rounded-xl border px-3 py-2 text-sm ${
                error
                  ? "border-red-200 bg-red-50 text-[#B71C1C]"
                  : "border-green-200 bg-green-50 text-[#1B5E20]"
              }`}
            >
              {error || info}
            </div>
          )}

          <form className="flex flex-col space-y-5" onSubmit={handleSubmit}>
            {/* TOP TOGGLE — choose exactly one admin category */}
            <div className="flex justify-between bg-gray-100 rounded-lg p-1">
              {(["admin","products","orders","returns","pandits"] as UiAdmin[]).map(r => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setUiRole(r)}
                  className={`flex-1 py-2 rounded-lg font-medium capitalize transition ${
                    uiRole === r
                      ? "bg-gradient-to-r from-[#ef4444] via-[#b45309] to-[#f59e0b] text-white"
                      : "text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  {r.replace("_", " ")}
                </button>
              ))}
            </div>

            <div className="flex flex-col">
              <label htmlFor="name" className="mb-1 text-gray-600 font-medium">
                Full Name
              </label>
              <input
                type="text"
                id="name"
                value={name}
                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                  setName(e.target.value)
                }
                placeholder="Enter your full name"
                className="border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-orange-400"
                required
              />
            </div>

            <div className="flex flex-col">
              <label htmlFor="email" className="mb-1 text-gray-600 font-medium">
                Email
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                  setEmail(e.target.value)
                }
                placeholder="Enter your email"
                className="border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-orange-400"
                required
              />
            </div>

            <div className="flex flex-col">
              <label htmlFor="password" className="mb-1 text-gray-600 font-medium">
                Password
              </label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                  setPassword(e.target.value)
                }
                placeholder="Enter your password"
                className="border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-orange-400"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`bg-gradient-to-r from-[#ef4444] via-[#b45309] to-[#f59e0b] text-white font-semibold py-2 rounded-lg cursor-pointer transition-all ${
                loading ? "opacity-60 cursor-not-allowed" : "hover:opacity-90"
              }`}
            >
              {loading ? "Registering..." : `Register as ${uiRole.replace("_"," ")}`}
            </button>
          </form>

          <div className="mt-4 text-sm text-gray-600 text-center">
            <span>Already have an account? </span>
            <Link to="/login" className="hover:underline font-medium">
              Login
            </Link>
          </div>
        </div>

        <img
          src={registerlogo}
          alt="Register"
          className="w-full lg:w-2/3 max-h-[80vh] object-contain"
        />
      </div>
    </div>
  )
}

export default Register
