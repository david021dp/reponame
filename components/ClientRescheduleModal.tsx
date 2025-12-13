'use client'

import { useState, useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { createClient } from '@/lib/supabase/client'
import { Notification } from '@/types/database.types'
import { getCsrfToken, CSRF_HEADER_NAME } from '@/lib/csrf/client'
import { sanitizeText } from '@/lib/utils/sanitize'

interface ClientRescheduleModalProps {
  userId: string
}

export default function ClientRescheduleModal({ userId }: ClientRescheduleModalProps) {
  const [mounted, setMounted] = useState(false)
  const [isHydrated, setIsHydrated] = useState(false)
  const [unreadNotifications, setUnreadNotifications] = useState<Notification[]>([])
  const [currentNotification, setCurrentNotification] = useState<Notification | null>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  // Create stable Supabase client
  const supabase = useMemo(() => createClient(), [])

  useEffect(() => {
    setMounted(true)
    setIsHydrated(true)
  }, [])

  // Sync Realtime auth token
  useEffect(() => {
    if (!isHydrated) return

    let mounted = true

    const syncRealtimeAuth = async () => {
      try {
        const { data, error } = await supabase.auth.getSession()
        if (error) {
          console.warn('ClientRescheduleModal: getSession error', error)
          return
        }
        const token = data.session?.access_token
        if (token && mounted) {
          supabase.realtime.setAuth(token)
        }
      } catch (err) {
        console.warn('ClientRescheduleModal: Error syncing Realtime auth', err)
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

  // Fetch unread reschedule and cancellation notifications
  const fetchUnreadNotifications = async () => {
    try {
      const response = await fetch(`/api/client/notifications`)
      if (response.ok) {
        const data = await response.json()
        const relevantNotifications = (data.notifications || []).filter(
          (n: Notification) => (n.type === 'appointment_rescheduled' || n.type === 'appointment_cancelled') && !n.is_read
        )
        setUnreadNotifications(relevantNotifications)
        
        // Show modal with latest notification if there are unread ones
        if (relevantNotifications.length > 0 && !isOpen) {
          setCurrentNotification(relevantNotifications[0])
          setIsOpen(true)
        }
      }
    } catch (error) {
      console.error('Error fetching unread notifications:', error)
    }
  }

  // Fetch on mount
  useEffect(() => {
    if (isHydrated && userId) {
      fetchUnreadNotifications()
    }
  }, [isHydrated, userId])

  // Subscribe to realtime changes
  useEffect(() => {
    if (!isHydrated || !userId) return

    let isSubscribed = true

    const channel = supabase
      .channel(`client-reschedule-modal-${userId}`, {
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
            const newNotification = payload.new as Notification
            if ((newNotification.type === 'appointment_rescheduled' || newNotification.type === 'appointment_cancelled') && !newNotification.is_read) {
              setUnreadNotifications((prev) => [newNotification, ...prev])
              if (!isOpen) {
                setCurrentNotification(newNotification)
                setIsOpen(true)
              }
            }
          } else if (payload.eventType === 'UPDATE') {
            // If notification was marked as read, remove from list
            const updatedNotification = payload.new as Notification
            if (updatedNotification.is_read) {
              setUnreadNotifications((prev) =>
                prev.filter((notif) => notif.id !== updatedNotification.id)
              )
              // If current notification was marked as read, close modal or show next
              if (currentNotification?.id === updatedNotification.id) {
                const remaining = unreadNotifications.filter((n) => n.id !== updatedNotification.id)
                if (remaining.length > 0) {
                  setCurrentNotification(remaining[0])
                } else {
                  setIsOpen(false)
                  setCurrentNotification(null)
                }
              }
            }
          }
        }
      )
      .subscribe((status, err) => {
        if (status === 'CHANNEL_ERROR' && isSubscribed) {
          console.error('Client reschedule notification subscription error:', err?.message || err || 'Unknown error')
        }
      })

    return () => {
      isSubscribed = false
      supabase.removeChannel(channel)
    }
  }, [isHydrated, userId, supabase, isOpen, currentNotification, unreadNotifications])

  const handleOkay = async () => {
    if (!currentNotification) return

    setLoading(true)
    try {
      // Get CSRF token
      const csrfToken = await getCsrfToken()
      if (!csrfToken) {
        console.error('Failed to get CSRF token')
        setLoading(false)
        return
      }

      // Mark notification as read
      const response = await fetch('/api/client/notifications/mark-read', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          [CSRF_HEADER_NAME]: csrfToken,
        },
        credentials: 'include',
        body: JSON.stringify({ notification_id: currentNotification.id }),
      })

      if (response.ok) {
        // Remove current notification from list
        const remaining = unreadNotifications.filter((n) => n.id !== currentNotification.id)
        setUnreadNotifications(remaining)

        // Show next notification or close modal
        if (remaining.length > 0) {
          setCurrentNotification(remaining[0])
        } else {
          setIsOpen(false)
          setCurrentNotification(null)
        }
      }
    } catch (error) {
      console.error('Error marking notification as read:', error)
    } finally {
      setLoading(false)
    }
  }

  if (!mounted || !isOpen || !currentNotification) {
    return null
  }

  return createPortal(
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[10000] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border-2 border-pink-100 max-w-md w-full animate-[scale-in_0.2s_ease-out]">
        {/* Header */}
        <div className="bg-gradient-to-r from-pink-50 to-purple-50 p-6 border-b border-pink-100 rounded-t-2xl">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-pink-100 rounded-lg">
              {currentNotification.type === 'appointment_rescheduled' ? (
                <svg className="w-6 h-6 text-pink-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              ) : (
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              )}
            </div>
            <h2 className="text-xl font-bold text-gray-900">
              {currentNotification.type === 'appointment_rescheduled' ? 'Appointment Rescheduled' : 'Appointment Cancelled'}
            </h2>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          <p className="text-gray-700 text-base leading-relaxed mb-4">
            {sanitizeText(currentNotification.message)}
          </p>

          {currentNotification.cancellation_reason && (
            <div className="mt-4 p-3 bg-pink-50 rounded-lg border border-pink-100">
              <p className="text-xs text-gray-600">
                <span className="font-semibold">Worker:</span> {sanitizeText(currentNotification.cancellation_reason)}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-pink-100 flex justify-end">
          <button
            onClick={handleOkay}
            disabled={loading}
            className="bg-gradient-to-r from-pink-500 to-purple-500 text-white px-6 py-3 rounded-xl font-semibold hover:from-pink-600 hover:to-purple-600 shadow-md hover:shadow-lg transform hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Processing...' : 'Okay'}
          </button>
        </div>
      </div>

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
    </div>,
    document.body
  )
}

