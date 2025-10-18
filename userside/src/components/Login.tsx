import React, { useState, type FormEvent, type ChangeEvent } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import Navbar from './Navbar'
import loginlogo from "../assets/image.png"

const Login: React.FC = () => {
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const location = useLocation() as { state?: { returnTo?: string } }

  const [email, setEmail] = useState<string>("")
  const [password, setPassword] = useState<string>("")
  const [role] = useState<"user">("user")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const loggedInUser = await signIn(email, password) // should throw on failure
      // Supabase JS exposes metadata as user_metadata
      const userRole = (loggedInUser as any)?.user_metadata?.role

      // 1) Prefer returning to the path we came from
      const returnTo = location.state?.returnTo
      if (returnTo) {
        console.log('[Login] redirecting to returnTo:', returnTo)
        navigate(returnTo, { replace: true })
        return
      }

      if(userRole === 'user') {
        navigate('/collections', { replace: true })
      } else {
        // 3) Final fallback
        navigate('/', { replace: true })
      }
    } catch (err: any) {
      console.error('[Login] signIn error:', err)
      setError(err?.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  const handleEmailChange = (e: ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)
  const handlePasswordChange = (e: ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)

  return (
    <div>
      <Navbar/>
      <div className='bg-[#FFF6DF] min-h-screen flex flex-col font-[Poppins]'>
        <div className='flex-grow flex flex-col lg:flex-row items-center justify-between md:px-10'>
          <img src={loginlogo} alt="Login" className='w-full lg:w-2/3 max-h-[80vh] object-contain' />

          <div className="bg-white w-full max-w-sm sm:max-w-md md:max-w-lg lg:max-w-[400px] p-8 rounded-2xl shadow-lg flex-shrink-0">
            <h1 className='text-3xl font-bold mb-6 text-gray-800 text-center'>Welcome Back!!</h1>

            {error && (
              <div className="mb-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-[#B71C1C]">
                {error}
              </div>
            )}

            <form className='flex flex-col space-y-5' onSubmit={handleSubmit}>
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

              <button
                type="submit"
                disabled={loading}
                className='bg-gradient-to-r from-[#ef4444] via-[#b45309] to-[#f59e0b] text-white font-semibold py-2 rounded-lg cursor-pointer transition-all disabled:opacity-60'
              >
                {loading ? 'Signing in…' : `Login as ${role.charAt(0).toUpperCase() + role.slice(1)}`}
              </button>
            </form>

            <div className='mt-4 text-sm text-gray-600 flex justify-between'>
              <Link to="/forgot-password" className='hover:underline'>Forgot password?</Link>
              <Link to="/register" className='hover:underline'>Create account</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Login
