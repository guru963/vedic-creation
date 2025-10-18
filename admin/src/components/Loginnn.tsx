import React, { useState, type FormEvent, type ChangeEvent } from 'react'
import Navbar from '../components/Navbar'
import loginlogo from "../assets/image.png"
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

type UiAdmin = "admin" | "products" | "orders" | "returns" | "pandits"

const ADMIN_ROUTE_BY_KEY: Record<UiAdmin, string> = {
  admin: "/admin-dashboard",
  products: "/admin/products",
  orders: "/admin/orders",
  returns: "/admin/returns",
  pandits: "/admin/pandits",
}

const ADMIN_PRIORITY: UiAdmin[] = ["admin", "products", "orders", "returns", "pandits"]

const Login: React.FC = () => {
  const [email, setEmail] = useState<string>("")
  const [password, setPassword] = useState<string>("")
  const [uiRole, setUiRole] = useState<UiAdmin>("admin")

  const { signIn } = useAuth()
  const navigate = useNavigate()

  const routeFromMeta = (meta: any) => {
    const roles = Array.isArray(meta?.admin_roles) ? meta.admin_roles as string[] : []

    if (roles.length > 0) {
      for (const key of ADMIN_PRIORITY) {
        if (roles.includes(key)) {
          navigate(ADMIN_ROUTE_BY_KEY[key])
          return
        }
      }
    }

    const scalar: string | undefined = meta?.role
    if (scalar && scalar in ADMIN_ROUTE_BY_KEY) {
      navigate(ADMIN_ROUTE_BY_KEY[scalar as UiAdmin])
      return
    }

    navigate("/admin-dashboard")
  }

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    try {
      const loggedInUser = await signIn(email, password)
      const meta = loggedInUser?.user_metadata || {}
      routeFromMeta(meta)
    } catch (error) {
      console.error("Login error:", error)
    }
  }

  const handleEmailChange = (e: ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)
  const handlePasswordChange = (e: ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)

  return (
    <div className='bg-[#FFF7DF] min-h-screen flex flex-col font-[Poppins]'>
      <Navbar />
      <div className='flex-grow flex flex-col lg:flex-row items-center justify-between md:px-10'>
        {/* Left side - Image */}
        <img
          src={loginlogo}
          alt="Login"
          className='w-full lg:w-2/3 max-h-[80vh] object-contain'
        />

        {/* Right side - Login form */}
        <div className="bg-white w-full max-w-sm sm:max-w-md md:max-w-lg lg:max-w-[400px] p-8 rounded-2xl shadow-lg flex-shrink-0">
          <h1 className='text-3xl font-bold mb-6 text-gray-800 text-center'>Welcome Back!!</h1>

          <form className='flex flex-col space-y-5' onSubmit={handleSubmit}>
            {/* Admin Category Toggle - Improved Spacing */}
            <div className="bg-gray-100 rounded-lg p-1">
              <div className="grid grid-cols-5 gap-1">
                {(["admin", "products", "orders", "returns", "pandits"] as UiAdmin[]).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setUiRole(r)}
                    className={`
                      py-2 px-1 rounded-md font-medium text-xs capitalize transition
                      ${uiRole === r
                        ? "bg-gradient-to-r from-[#ef4444] via-[#b45309] to-[#f59e0b] text-white"
                        : "text-gray-700 hover:bg-gray-200"
                      }
                    `}
                  >
                    {r.replace("_", " ")}
                  </button>
                ))}
              </div>
            </div>

            {/* Email */}
            <div className='flex flex-col'>
              <label htmlFor="email" className='mb-1 text-gray-600 font-medium'>Email</label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={handleEmailChange}
                placeholder="Enter your email"
                className='border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-orange-400'
                required
              />
            </div>

            {/* Password */}
            <div className='flex flex-col'>
              <label htmlFor="password" className='mb-1 text-gray-600 font-medium'>Password</label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={handlePasswordChange}
                placeholder="Enter your password"
                className='border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-orange-400'
                required
              />
            </div>

            {/* Login Button */}
            <button
              type="submit"
              className='bg-gradient-to-r from-[#ef4444] via-[#b45309] to-[#f59e0b] text-white font-semibold py-2 rounded-lg cursor-pointer hover:opacity-90 transition-all'
            >
              Login as {uiRole.charAt(0).toUpperCase() + uiRole.slice(1)}
            </button>
          </form>

          {/* Extra Links */}
          <div className='mt-4 text-sm text-gray-600 flex justify-between'>
            <Link to="/forgot-password" className='hover:underline'>Forgot password?</Link>
            <Link to="/register" className='hover:underline'>Create account</Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Login