'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createPortal } from 'react-dom'
import { Notification } from '@/types/database.types'
import { createClient } from '@/lib/supabase/client'
import { getCsrfToken, CSRF_HEADER_NAME } from '@/lib/csrf/client'
import { sanitizeText } from '@/lib/utils/sanitize'

interface NotificationBellProps {
  userId: string
}

export default function NotificationBell({ userId }: NotificationBellProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [isHydrated, setIsHydrated] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, right: 0 })
  const router = useRouter()
  
  // Create stable Supabase client
  const supabase = useMemo(() => createClient(), [])

  useEffect(() => {
    setMounted(true)
    setIsHydrated(true)
  }, [])

  // Sync Realtime auth token to prevent connection errors
  useEffect(() => {
    if (!isHydrated) return

    let mounted = true

    const syncRealtimeAuth = async () => {
      try {
        const { data, error } = await supabase.auth.getSession()
        if (error) {
          console.warn('NotificationBell: getSession error', error)
          return
        }
        const token = data.session?.access_token
        if (token && mounted) {
          supabase.realtime.setAuth(token)
        }
      } catch (err) {
        console.warn('NotificationBell: Error syncing Realtime auth', err)
      }
    }

    syncRealtimeAuth()

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (mounted && session?.access_token) {
        supabase.realtime.setAuth(session.access_token)
      }
    })

    return () => {
      mounted = false
      authListener?.subscription.unsubscribe()
    }
  }, [isHydrated, supabase])

  // Refetch notifications when userId changes (important for head admin filtering)
  useEffect(() => {
    fetchNotifications()
  }, [userId])

  useEffect(() => {
    // Don't subscribe until component is fully hydrated
    if (!isHydrated) return

    // Validate userId before creating subscription
    if (!userId || userId.trim() === '') {
      console.warn('NotificationBell: userId is invalid, skipping subscription')
      return
    }

    let isSubscribed = true
    let retryTimeout: NodeJS.Timeout

    // FIX #3: Subscription with status tracking and retry logic
    const setupSubscription = () => {
      const channel = supabase
        .channel(`notification-bell-${userId}`, {
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
            filter: `admin_id=eq.${userId}`,
          },
          (payload) => {
            if (!isSubscribed) return

            if (payload.eventType === 'INSERT') {
              const newNotification = payload.new as Notification
              setNotifications((prev) => [newNotification, ...prev])
              setUnreadCount((prev) => prev + 1)
            } else if (payload.eventType === 'UPDATE') {
              const updatedNotification = payload.new as Notification
              setNotifications((prev) =>
                prev.map((notif) =>
                  notif.id === updatedNotification.id ? updatedNotification : notif
                )
              )
              fetchNotifications()
            } else if (payload.eventType === 'DELETE') {
              const deletedId = payload.old.id
              setNotifications((prev) => prev.filter((notif) => notif.id !== deletedId))
              fetchNotifications()
            }
          }
        )
        .subscribe((status, err) => {
          if (status === 'CHANNEL_ERROR' && isSubscribed) {
            console.error('Notification subscription error, retrying in 2s...', err)
            // FIX #4: Auto-reconnect on error
            retryTimeout = setTimeout(() => {
              if (isSubscribed) {
                supabase.removeChannel(channel)
                setupSubscription()
              }
            }, 2000)
          }
        })

      return channel
    }

    const channel = setupSubscription()

    // Cleanup subscription on unmount
    return () => {
      isSubscribed = false
      clearTimeout(retryTimeout)
      supabase.removeChannel(channel)
    }
  }, [isHydrated, userId, supabase])

  useEffect(() => {
    // Calculate dropdown position when opened
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect()
      setDropdownPosition({
        top: rect.bottom + 8,
        right: window.innerWidth - rect.right,
      })
    }
  }, [isOpen])

  useEffect(() => {
    // Close dropdown when clicking outside
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node) &&
          buttonRef.current && !buttonRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const fetchNotifications = async () => {
    try {
      const response = await fetch(`/api/notifications?userId=${userId}`)
      if (response.ok) {
        const data = await response.json()
        setNotifications(data.notifications)
        setUnreadCount(data.unreadCount)
      }
    } catch (error) {
      console.error('Error fetching notifications:', error)
    }
  }

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      // Get CSRF token
      const csrfToken = await getCsrfToken()
      if (!csrfToken) {
        console.error('Failed to get CSRF token')
        return
      }

      const response = await fetch('/api/notifications/mark-read', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          [CSRF_HEADER_NAME]: csrfToken,
        },
        credentials: 'include',
        body: JSON.stringify({ notification_id: notificationId }),
      })

      if (response.ok) {
        await fetchNotifications()
      }
    } catch (error) {
      console.error('Error marking notification as read:', error)
    }
  }

  const handleMarkAllAsRead = async () => {
    setLoading(true)
    try {
      // Get CSRF token
      const csrfToken = await getCsrfToken()
      if (!csrfToken) {
        console.error('Failed to get CSRF token')
        setLoading(false)
        return
      }

      const response = await fetch('/api/notifications/mark-all-read', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          [CSRF_HEADER_NAME]: csrfToken,
        },
        credentials: 'include',
        body: JSON.stringify({ admin_id: userId }),
      })

      if (response.ok) {
        await fetchNotifications()
      }
    } catch (error) {
      console.error('Error marking all as read:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000)

    if (seconds < 60) return 'Just now'
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
    return `${Math.floor(seconds / 86400)}d ago`
  }

  const recentNotifications = notifications.slice(0, 5)

  return (
    <>
      {/* Bell Button */}
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 sm:p-2.5 hover:bg-pink-50 rounded-xl transition-all group"
      >
        <svg
          className="w-6 h-6 text-gray-700 group-hover:text-pink-600 transition-colors"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>

        {/* Unread Badge */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-gradient-to-r from-pink-500 to-rose-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center shadow-lg animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown - Rendered as Portal */}
      {isOpen && mounted && createPortal(
        <div 
          ref={dropdownRef}
          className="fixed w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border-2 border-pink-100 overflow-hidden z-[9999] animate-[scale-in_0.2s_ease-out]"
          style={{
            top: `${dropdownPosition.top}px`,
            right: `${dropdownPosition.right}px`,
          }}
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-pink-50 to-purple-50 p-4 border-b border-pink-100">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-gray-900">Notifications</h3>
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllAsRead}
                  disabled={loading}
                  className="text-xs font-semibold text-pink-600 hover:text-pink-700 disabled:opacity-50"
                >
                  Mark all as read
                </button>
              )}
            </div>
          </div>

          {/* Notifications List */}
          <div className="max-h-96 overflow-y-auto">
            {recentNotifications.length === 0 ? (
              <div className="p-8 text-center">
                <svg className="w-12 h-12 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                </svg>
                <p className="text-gray-500 text-sm">No notifications</p>
              </div>
            ) : (
              recentNotifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-4 border-b border-pink-50 hover:bg-pink-50/50 transition-colors ${
                    !notification.is_read ? 'bg-gradient-to-r from-pink-50/50 to-purple-50/50' : ''
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex-1">
                      <p className="text-sm text-gray-900 font-medium leading-snug">
                        {sanitizeText(notification.message)}
                      </p>
                      {notification.cancellation_reason && (
                        <div className="mt-2 p-2 bg-white rounded-lg border border-pink-100">
                          <p className="text-xs text-gray-600">
                            <span className="font-semibold">Reason:</span> {sanitizeText(notification.cancellation_reason)}
                          </p>
                        </div>
                      )}
                    </div>
                    {!notification.is_read && (
                      <div className="w-2 h-2 bg-pink-500 rounded-full flex-shrink-0 mt-1"></div>
                    )}
                  </div>

                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs text-gray-500">
                      {formatTimeAgo(notification.created_at)}
                    </span>
                    {!notification.is_read && (
                      <button
                        onClick={() => handleMarkAsRead(notification.id)}
                        className="text-xs font-semibold text-pink-600 hover:text-pink-700"
                      >
                        Mark as read
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="p-3 bg-gray-50 border-t border-pink-100">
              <button
                onClick={() => {
                  setIsOpen(false)
                  router.push(`/admin/notifications?adminId=${userId}`)
                }}
                className="w-full text-center text-sm font-semibold text-pink-600 hover:text-pink-700 py-2"
              >
                View All Notifications
              </button>
            </div>
          )}
        </div>,
        document.body
      )}

      <style jsx>{`
        @keyframes scale-in {
          from {
            transform: scale(0.95);
            opacity: 0;
          }
          to {
            transform: scale(1);
            opacity: 1;
          }
        }
      `}</style>
    </>
  )
}

