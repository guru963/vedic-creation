// src/pages/AdminLayout.tsx
import React from 'react'
import Sidebar from '../components/Sidebar'

const AdminLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="min-h-screen grid grid-cols-[64px_1fr]">
      <Sidebar />
      <main className="p-6 md:p-6 bg-[#FAF7F2]">{children}</main>
    </div>
  )
}
export default AdminLayout
