// src/pages/AdminLayout.tsx
import React from 'react'

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="min-h-screen">
      <main className="p-6 md:p-6 bg-[#FAF7F2]">{children}</main>
    </div>
  )
}
export default Layout
