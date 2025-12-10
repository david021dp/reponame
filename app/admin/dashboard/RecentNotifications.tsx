'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Notification } from '@/types/database.types'
import Link from 'next/link'
import { getCsrfToken, CSRF_HEADER_NAME } from '@/lib/csrf/client'
import { sanitizeText } from '@/lib/utils/sanitize'

interface RecentNotificationsProps {
  notifications: Notification[]
  adminId: string
}

export default function RecentNotifications({ notifications, adminId }: RecentNotificationsProps) {
  const router = useRouter()
  const [notificationList, setNotificationList] = useState<Notification[]>(notifications)
  const [isHydrated, setIsHydrated] = useState(false)
  
  // Create stable Supabase client
  const supabase = useMemo(() => createClient(), [])

  // Wait for hydration to complete before subscribing
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
          console.warn('RecentNotifications: getSession error', error)
          return
        }
        const token = data.session?.access_token
        if (token && mounted) {
          supabase.realtime.setAuth(token)
        }
      } catch (err) {
        console.warn('RecentNotifications: Error syncing Realtime auth', err)
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
    setNotificationList(notifications)
  }, [notifications, adminId])

  // Real-time subscription for notifications
  useEffect(() => {
    // Don't subscribe until component is fully hydrated
    if (!isHydrated) return

    // Validate adminId before creating subscription
    if (!adminId || adminId.trim() === '') {
      console.warn('RecentNotifications: adminId is invalid, skipping subscription')
      return
    }

    let isSubscribed = true
    let retryTimeout: NodeJS.Timeout

    const setupSubscription = () => {
      const channel = supabase
        .channel(`recent-notifications-${adminId}`, {
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
              setNotificationList((prev) => {
                // Check if notification already exists
                if (prev.some((notif) => notif.id === newNotification.id)) {
                  return prev
                }
                // Add new notification at the beginning and sort by created_at
                const updated = [newNotification, ...prev].sort((a, b) => 
                  new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
                )
                return updated
              })
            } else if (payload.eventType === 'UPDATE') {
              const updatedNotification = payload.new as Notification
              setNotificationList((prev) => {
                // Update notification if it exists
                const updated = prev.map((notif) =>
                  notif.id === updatedNotification.id ? updatedNotification : notif
                )
                // Re-sort by created_at
                return updated.sort((a, b) => 
                  new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
                )
              })
            } else if (payload.eventType === 'DELETE') {
              const deletedId = payload.old.id
              setNotificationList((prev) => prev.filter((notif) => notif.id !== deletedId))
            }
          }
        )
        .subscribe((status, err) => {
          if (status === 'CHANNEL_ERROR' && isSubscribed) {
            console.error('Notification subscription error, retrying in 2s...', err)
            // Auto-reconnect on error
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
  }, [isHydrated, adminId, supabase])

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      // Optimistically update UI
      setNotificationList((prev) =>
        prev.map((notif) =>
          notif.id === notificationId ? { ...notif, is_read: true } : notif
        )
      )

      // Get CSRF token
      const csrfToken = await getCsrfToken()
      if (!csrfToken) {
        console.error('Failed to get CSRF token')
        // Revert optimistic update on error
        setNotificationList((prev) =>
          prev.map((notif) =>
            notif.id === notificationId ? { ...notif, is_read: false } : notif
          )
        )
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
      
      // Real-time subscription will handle the update, but we can refresh to sync with server
      router.refresh()
    } catch (error) {
      console.error('Error marking as read:', error)
      // Revert optimistic update on error
      setNotificationList((prev) =>
        prev.map((notif) =>
          notif.id === notificationId ? { ...notif, is_read: false } : notif
        )
      )
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

  // Filter unread notifications and get recent 3
  const unreadNotifications = notificationList.filter((notif) => !notif.is_read)
  const recentNotifications = unreadNotifications.slice(0, 3)

  // Don't render if there are no unread notifications
  if (recentNotifications.length === 0) {
    return null
  }

  return (
    <div className="mb-12">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-3xl font-bold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">
          Recent Cancellations
        </h2>
        <Link
          href={`/admin/notifications?adminId=${adminId}`}
          className="text-sm font-semibold text-pink-600 hover:text-pink-700 hover:underline"
        >
          View All →
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {recentNotifications.map((notification) => (
          <div
            key={notification.id}
            className="bg-gradient-to-br from-pink-50 to-purple-50 border-2 border-pink-200 rounded-2xl p-5 shadow-lg"
          >
            <div className="flex items-start gap-3 mb-3">
              <div className="p-2 bg-white rounded-lg">
                <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <div className="flex-1">
                <p className="text-sm text-gray-900 font-semibold leading-snug mb-2">
                  {sanitizeText(notification.message)}
                </p>
                {notification.cancellation_reason && (
                  <div className="p-3 bg-white rounded-lg border border-pink-200 mb-2">
                    <p className="text-xs font-semibold text-gray-700 mb-1">Reason:</p>
                    <p className="text-xs text-gray-600">{sanitizeText(notification.cancellation_reason)}</p>
                  </div>
                )}
                <p className="text-xs text-gray-500">{formatTimeAgo(notification.created_at)}</p>
              </div>
            </div>
            <button
              onClick={() => handleMarkAsRead(notification.id)}
              className="w-full mt-2 px-4 py-2 bg-white text-pink-600 border-2 border-pink-200 rounded-xl hover:bg-pink-50 transition-all text-xs font-semibold"
            >
              Mark as Read
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

