import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext' // adjust path if different

const RequireAuth: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth()
  const location = useLocation()

  if (!user) {
    // send them to login and remember where they were going
    return <Navigate to="/login" replace state={{ returnTo: location.pathname + location.search }} />
  }
  return <>{children}</>
}

export default RequireAuth
