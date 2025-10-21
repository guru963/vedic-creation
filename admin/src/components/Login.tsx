import React, { useState, type FormEvent, type ChangeEvent } from 'react'
//import { Navbar } from './Navbar'
import loginlogo from "../assets/image.png"
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const Login: React.FC = () => {
  // State for form fields
  const [email, setEmail] = useState<string>("")
  const [password, setPassword] = useState<string>("")
  const [role] = useState<"admin">("admin")
  const {signIn} = useAuth() // Assuming useAuth is imported from AuthContext
  const navigate = useNavigate()

  // Submit handler
  const handleSubmit = async(e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    try {
      const loggedInUser = await signIn(email, password) // returns user from context
      const role = loggedInUser?.user_metadata?.role

      console.log("Login successful:", { role, email })

      if (role === "student") {
        navigate("/student-dashboard")
      } else if (role === "staff") {
        navigate("/staff-dashboard")
      } else if (role === "admin") {
        navigate("/admin-dashboard")
      } else {
        console.error("No role assigned to user.")
      }
    } catch (error) {
      console.error("Login error:", error)
    }
}

  // Input handlers
  const handleEmailChange = (e: ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)
  const handlePasswordChange = (e: ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)

  return (
    <div className='bg-[#FFF6DF] min-h-screen flex flex-col font-[Poppins]'>
     
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
            {/* Role Selector */}
            {/* <div className="flex justify-between bg-gray-100 rounded-lg p-1">
              {["admin"].map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRole(r as "admin")}
                  className={`flex-1 py-2 rounded-lg font-medium capitalize transition ${
                    role === r 
                      ? "bg-gradient-to-r from-[#ef4444] via-[#b45309] to-[#f59e0b] text-white" 
                      : "text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  {r}
                </button>
              ))}
            </div> */}

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
              Login as {role.charAt(0).toUpperCase() + role.slice(1)}
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
