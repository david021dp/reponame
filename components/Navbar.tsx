'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { signOut } from '@/lib/auth/helpers'
import NotificationBell from './NotificationBell'

interface NavbarProps {
  userRole: 'admin' | 'client' | 'head_admin'
  userName?: string
  userId?: string
  notificationsAdminId?: string
}

export default function Navbar({ userRole, userName, userId, notificationsAdminId }: NavbarProps) {
  const router = useRouter()

  const handleSignOut = async () => {
    try {
      await signOut()
      router.push('/login')
      router.refresh()
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  return (
    <nav className="bg-white/80 backdrop-blur-md shadow-lg border-b border-pink-100">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16 sm:h-20">
          <div className="flex items-center">
            <Link href={(userRole === 'admin' || userRole === 'head_admin') ? '/admin/dashboard' : '/client/schedule'}>
              <div className="flex items-center space-x-2 sm:space-x-3 group cursor-pointer">
                <div className="p-1.5 sm:p-2 bg-gradient-to-br from-pink-100 to-purple-100 rounded-lg sm:rounded-xl group-hover:from-pink-200 group-hover:to-purple-200 transition-all">
                  <svg className="w-5 h-5 sm:w-7 sm:h-7 text-pink-600" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                  </svg>
                </div>
                <span className="text-lg sm:text-2xl font-bold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">
                  Nail Salon
                </span>
              </div>
            </Link>
          </div>

          <div className="flex items-center space-x-1 sm:space-x-2">
            {(userRole === 'admin' || userRole === 'head_admin') ? (
              <>
                <Link
                  href="/admin/dashboard"
                  className="text-gray-700 hover:text-pink-600 hover:bg-pink-50 px-2 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all"
                >
                  <span className="hidden sm:inline">Dashboard</span>
                  <svg className="w-5 h-5 sm:hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                  </svg>
                </Link>
                <Link
                  href="/admin/register"
                  className="text-gray-700 hover:text-pink-600 hover:bg-pink-50 px-2 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all"
                >
                  <span className="hidden sm:inline">Register</span>
                  <svg className="w-5 h-5 sm:hidden" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M15 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm-9-2V7H4v3H1v2h3v3h2v-3h3v-2H6zm9 4c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                  </svg>
                </Link>
                
                {/* Notification Bell - Admins Only */}
                {userId && <NotificationBell userId={notificationsAdminId || userId} />}
              </>
            ) : (
              <>
                <Link
                  href="/client/schedule"
                  className="text-gray-700 hover:text-pink-600 hover:bg-pink-50 px-2 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all"
                >
                  <span className="hidden sm:inline">Schedule</span>
                  <svg className="w-5 h-5 sm:hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </Link>
                <Link
                  href="/client/appointments"
                  className="text-gray-700 hover:text-pink-600 hover:bg-pink-50 px-2 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all"
                >
                  <span className="hidden sm:inline">Appointments</span>
                  <svg className="w-5 h-5 sm:hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </Link>
              </>
            )}

            {userName && (
              <div className="hidden lg:flex items-center space-x-2 bg-gradient-to-r from-pink-50 to-purple-50 px-3 py-2 rounded-xl border border-pink-100">
                <svg className="w-4 h-4 text-pink-600" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/>
                </svg>
                <span className="text-gray-700 text-sm font-semibold">
                  {userName}
                </span>
              </div>
            )}

            <button
              onClick={handleSignOut}
              className="bg-gradient-to-r from-pink-500 to-purple-500 text-white px-3 sm:px-5 py-2 sm:py-2.5 rounded-lg sm:rounded-xl text-xs sm:text-sm font-semibold hover:from-pink-600 hover:to-purple-600 shadow-md hover:shadow-lg transform hover:-translate-y-0.5 transition-all"
            >
              <span className="hidden sm:inline">Sign Out</span>
              <svg className="w-5 h-5 sm:hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </nav>
  )
}

