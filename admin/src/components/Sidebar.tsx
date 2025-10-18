import React from 'react'
import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  ShoppingBag,
  Sparkles,
  CalendarClock,
  Settings
} from 'lucide-react'

const ICON_CLASS = 'h-6 w-6 transition-colors duration-150'

const links = [
  { to: '/admin-dashboard', icon: LayoutDashboard, label: 'Overview' },
  { to: '/admin/store',     icon: ShoppingBag,     label: 'Store' },
  { to: '/admin/astrotalk', icon: Sparkles,        label: 'AstroTalk' },
  { to: '/admin/pandits',   icon: CalendarClock,   label: 'Pandit Booking' },
]

const Sidebar: React.FC = () => {
  return (
    <aside
      className="md:sticky md:top-0 mt-10 md:h-screen w-16 flex flex-col items-center gap-3 py-4"
      style={{ backgroundColor: '#F95007' }} // exact color you asked
    >
      {/* Top spacing / tiny brand dot (optional, remove if not needed) */}
      <div className="h-2" />

      {/* Icons stack */}
      <nav className="flex flex-col items-center gap-3">
        {links.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              [
                'grid place-items-center rounded-xl w-10 h-10',
                // only change icon color; keep bg same as bar
                // use text-white on hover and when active
                isActive ? 'text-white' : 'text-white/80 hover:text-white',
              ].join(' ')
            }
            title={label}
            aria-label={label}
          >
            <Icon className={ICON_CLASS} />
          </NavLink>
        ))}

        {/* Divider space */}
        <div className="h-2" />

        {/* Settings at bottom */}
        <div className="mt-auto" />
        <NavLink
          to="/admin/settings"
          className={({ isActive }) =>
            [
              'grid place-items-center rounded-xl w-10 h-10',
              isActive ? 'text-white' : 'text-white/80 hover:text-white',
            ].join(' ')
          }
          title="Settings"
          aria-label="Settings"
        >
          <Settings className={ICON_CLASS} />
        </NavLink>
      </nav>
    </aside>
  )
}

export default Sidebar
