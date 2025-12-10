'use client'

import { useState, useEffect, useMemo } from 'react'
import { Notification } from '@/types/database.types'
import { createClient } from '@/lib/supabase/client'
import { getCsrfToken, CSRF_HEADER_NAME } from '@/lib/csrf/client'
import { sanitizeText } from '@/lib/utils/sanitize'

interface NotificationsListProps {
  initialNotifications: Notification[]
  adminId: string
}

export default function NotificationsList({ initialNotifications, adminId }: NotificationsListProps) {
  const [notifications, setNotifications] = useState<Notification[]>(initialNotifications)
  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all')
  const [isHydrated, setIsHydrated] = useState(false)
  
  // Create stable Supabase client
  const supabase = useMemo(() => createClient(), [])

  useEffect(() => {
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
          console.warn('NotificationsList: getSession error', error)
          return
        }
        const token = data.session?.access_token
        if (token && mounted) {
          supabase.realtime.setAuth(token)
        }
      } catch (err) {
        console.warn('NotificationsList: Error syncing Realtime auth', err)
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

  // Sync initial notifications to state when props change
  // Also reset when adminId changes (important for head admin filtering to different admins)
  useEffect(() => {
    setNotifications(initialNotifications)
  }, [initialNotifications, adminId])

  // Real-time subscription for notifications
  useEffect(() => {
    if (!isHydrated) return

    // Validate adminId before creating subscription
    if (!adminId || adminId.trim() === '') {
      console.warn('NotificationsList: adminId is invalid, skipping subscription')
      return
    }

    let isSubscribed = true
    let retryTimeout: NodeJS.Timeout

    const setupSubscription = () => {
      const channel = supabase
        .channel(`admin-notifications-list-${adminId}`, {
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
            filter: `admin_id=eq.${adminId}`,
          },
          (payload) => {
            if (!isSubscribed) return

            if (payload.eventType === 'INSERT') {
              const newNotification = payload.new as Notification
              setNotifications((prev) => [newNotification, ...prev])
            } else if (payload.eventType === 'UPDATE') {
              const updatedNotification = payload.new as Notification
              setNotifications((prev) =>
                prev.map((notif) =>
                  notif.id === updatedNotification.id ? updatedNotification : notif
                )
              )
            } else if (payload.eventType === 'DELETE') {
              const deletedId = payload.old.id
              setNotifications((prev) => prev.filter((notif) => notif.id !== deletedId))
            }
          }
        )
        .subscribe((status, err) => {
          if (status === 'CHANNEL_ERROR' && isSubscribed) {
            console.error('Notification subscription error, retrying in 2s...', err)
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

    return () => {
      isSubscribed = false
      clearTimeout(retryTimeout)
      supabase.removeChannel(channel)
    }
  }, [isHydrated, adminId, supabase])

  const filteredNotifications = notifications.filter((notification) => {
    if (filter === 'unread') return !notification.is_read
    if (filter === 'read') return notification.is_read
    return true
  })

  const unreadCount = notifications.filter((n) => !n.is_read).length

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      // Get CSRF token
      const csrfToken = await getCsrfToken()
      if (!csrfToken) {
        console.error('Failed to get CSRF token')
        return
      }

      await fetch('/api/notifications/mark-read', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          [CSRF_HEADER_NAME]: csrfToken,
        },
        credentials: 'include',
        body: JSON.stringify({ notification_id: notificationId }),
      })
      
      // Update local state immediately (real-time will also update it)
      setNotifications((prev) =>
        prev.map((notif) =>
          notif.id === notificationId ? { ...notif, is_read: true } : notif
        )
      )
    } catch (error) {
      console.error('Error marking as read:', error)
    }
  }

  const handleMarkAllAsRead = async () => {
    try {
      // Get CSRF token
      const csrfToken = await getCsrfToken()
      if (!csrfToken) {
        console.error('Failed to get CSRF token')
        return
      }

      await fetch('/api/notifications/mark-all-read', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          [CSRF_HEADER_NAME]: csrfToken,
        },
        credentials: 'include',
        body: JSON.stringify({ admin_id: adminId }),
      })
      
      // Update local state immediately
      setNotifications((prev) =>
        prev.map((notif) => ({ ...notif, is_read: true }))
      )
    } catch (error) {
      console.error('Error marking all as read:', error)
    }
  }

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    })
  }

  return (
    <div className="space-y-6">
      {/* Filter Tabs */}
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-pink-100 p-2 flex gap-2">
        <button
          onClick={() => setFilter('all')}
          className={`flex-1 px-4 py-3 rounded-xl font-semibold transition-all ${
            filter === 'all'
              ? 'bg-gradient-to-r from-pink-500 to-purple-500 text-white shadow-md'
              : 'text-gray-600 hover:bg-pink-50'
          }`}
        >
          All ({notifications.length})
        </button>
        <button
          onClick={() => setFilter('unread')}
          className={`flex-1 px-4 py-3 rounded-xl font-semibold transition-all ${
            filter === 'unread'
              ? 'bg-gradient-to-r from-pink-500 to-purple-500 text-white shadow-md'
              : 'text-gray-600 hover:bg-pink-50'
          }`}
        >
          Unread ({unreadCount})
        </button>
        <button
          onClick={() => setFilter('read')}
          className={`flex-1 px-4 py-3 rounded-xl font-semibold transition-all ${
            filter === 'read'
              ? 'bg-gradient-to-r from-pink-500 to-purple-500 text-white shadow-md'
              : 'text-gray-600 hover:bg-pink-50'
          }`}
        >
          Read ({notifications.length - unreadCount})
        </button>
      </div>

      {/* Mark All as Read Button */}
      {unreadCount > 0 && (
        <div className="flex justify-end">
          <button
            onClick={handleMarkAllAsRead}
            className="px-6 py-2 text-sm font-semibold text-pink-600 hover:text-pink-700 hover:bg-pink-50 rounded-xl transition-all"
          >
            Mark all as read
          </button>
        </div>
      )}

      {/* Notifications List */}
      {filteredNotifications.length === 0 ? (
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-pink-100 p-12 text-center">
          <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
          </svg>
          <p className="text-gray-500">No {filter !== 'all' ? filter : ''} notifications</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredNotifications.map((notification) => (
            <div
              key={notification.id}
              className={`bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border-2 p-6 transition-all ${
                !notification.is_read
                  ? 'border-pink-300 bg-gradient-to-r from-pink-50/50 to-purple-50/50'
                  : 'border-pink-100'
              }`}
            >
              <div className="flex items-start justify-between gap-4 mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    {notification.type === 'appointment_cancelled' && (
                      <div className="p-2 bg-red-100 rounded-lg">
                        <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </div>
                    )}
                    <h3 className="font-bold text-gray-900">{sanitizeText(notification.message)}</h3>
                  </div>

                  {notification.cancellation_reason && (
                    <div className="mt-3 p-4 bg-gradient-to-r from-pink-50 to-purple-50 rounded-xl border border-pink-200">
                      <p className="text-sm font-semibold text-gray-700 mb-1">Cancellation Reason:</p>
                      <p className="text-sm text-gray-600">{sanitizeText(notification.cancellation_reason)}</p>
                    </div>
                  )}

                  <p className="text-sm text-gray-500 mt-3">
                    {formatDateTime(notification.created_at)}
                  </p>
                </div>

                {!notification.is_read && (
                  <div className="flex flex-col items-end gap-2">
                    <div className="px-3 py-1 bg-gradient-to-r from-pink-500 to-rose-500 text-white text-xs font-bold rounded-full">
                      New
                    </div>
                    <button
                      onClick={() => handleMarkAsRead(notification.id)}
                      className="text-sm font-semibold text-pink-600 hover:text-pink-700 hover:underline"
                    >
                      Mark as read
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

