'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { signOut } from '@/lib/auth/helpers'
import NotificationBell from './NotificationBell'
import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'

interface NavbarProps {
  userRole: 'admin' | 'client' | 'head_admin'
  userName?: string
  userId?: string
  notificationsAdminId?: string
}

export default function Navbar({ userRole, userName, userId, notificationsAdminId }: NavbarProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [clientUnreadCount, setClientUnreadCount] = useState(0)
  const [isHydrated, setIsHydrated] = useState(false)
  
  // Create stable Supabase client
  const supabase = useMemo(() => createClient(), [])
  
  // Get worker query parameter if present (for head_admin filter preservation)
  const workerParam = searchParams.get('worker')
  
  // Build query string for admin pages (preserve worker filter for head_admin)
  const getAdminQueryString = () => {
    if (userRole === 'head_admin' && workerParam) {
      return `?worker=${encodeURIComponent(workerParam)}`
    }
    return ''
  }
  
  const adminQueryString = getAdminQueryString()

  // Fetch client unread notification count
  useEffect(() => {
    setIsHydrated(true)
  }, [])

  useEffect(() => {
    if (!isHydrated || userRole !== 'client' || !userId) return

    const fetchUnreadCount = async () => {
      try {
        const response = await fetch('/api/client/notifications')
        if (response.ok) {
          const data = await response.json()
          setClientUnreadCount(data.unreadCount || 0)
        }
      } catch (error) {
        console.error('Error fetching client unread count:', error)
      }
    }

    fetchUnreadCount()

    // Subscribe to realtime changes for client notifications
    let isSubscribed = true

    const syncRealtimeAuth = async () => {
      try {
        const { data, error } = await supabase.auth.getSession()
        if (error) return
        const token = data.session?.access_token
        if (token && isSubscribed) {
          supabase.realtime.setAuth(token)
        }
      } catch (err) {
        console.warn('Navbar: Error syncing Realtime auth', err)
      }
    }

    syncRealtimeAuth()

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (isSubscribed && session?.access_token) {
        supabase.realtime.setAuth(session.access_token)
      }
    })

    const channel = supabase
      .channel(`navbar-client-notifications-${userId}`, {
        config: {
          broadcast: { self: true },
        },
      })
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          if (!isSubscribed) return

          if (payload.eventType === 'INSERT') {
            const newNotification = payload.new as { is_read: boolean }
            if (!newNotification.is_read) {
              setClientUnreadCount((prev) => prev + 1)
            }
          } else if (payload.eventType === 'UPDATE') {
            const updatedNotification = payload.new as { is_read: boolean }
            if (updatedNotification.is_read) {
              setClientUnreadCount((prev) => Math.max(0, prev - 1))
            }
          }
        }
      )
      .subscribe((status, err) => {
        if (status === 'CHANNEL_ERROR' && isSubscribed) {
          console.error('Navbar client notification subscription error:', err?.message || err || 'Unknown error')
        }
      })

    return () => {
      isSubscribed = false
      authListener?.subscription.unsubscribe()
      supabase.removeChannel(channel)
    }
  }, [isHydrated, userRole, userId, supabase])

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
            <Link href={(userRole === 'admin' || userRole === 'head_admin') ? `/admin/dashboard${adminQueryString}` : '/client/schedule'}>
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
                  href={`/admin/dashboard${adminQueryString}`}
                  className="text-gray-700 hover:text-pink-600 hover:bg-pink-50 px-2 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all"
                >
                  <span className="hidden sm:inline">Dashboard</span>
                  <svg className="w-5 h-5 sm:hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                  </svg>
                </Link>
                <Link
                  href={`/admin/register${adminQueryString}`}
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
                  className="relative text-gray-700 hover:text-pink-600 hover:bg-pink-50 px-2 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all"
                >
                  <span className="hidden sm:inline">Appointments</span>
                  <svg className="w-5 h-5 sm:hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  {/* Red dot indicator for unread notifications */}
                  {clientUnreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-gradient-to-r from-pink-500 to-rose-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center shadow-lg animate-pulse">
                      {clientUnreadCount > 9 ? '9+' : clientUnreadCount}
                    </span>
                  )}
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

