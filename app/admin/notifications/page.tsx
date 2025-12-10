import { getCurrentUser } from '@/lib/auth/server-helpers'
import { getAllNotifications } from '@/lib/queries/notifications'
import { redirect } from 'next/navigation'
import Navbar from '@/components/Navbar'
import NotificationsList from './NotificationsList'

export default async function AdminNotificationsPage({
  searchParams,
}: {
  searchParams: Promise<{ adminId?: string }>
}) {
  const user = await getCurrentUser()

  if (!user || (user.role !== 'admin' && user.role !== 'head_admin')) {
    redirect('/login')
  }

  // Await searchParams before accessing properties
  const resolvedSearchParams = await searchParams

  // Calculate which admin ID to use for notifications
  // If head_admin is filtering to view another admin, show that admin's notifications
  // Otherwise, show head_admin's own notifications
  let notificationsAdminId = user.id
  
  if (user.role === 'head_admin' && resolvedSearchParams?.adminId) {
    const adminIdParam = resolvedSearchParams.adminId
    
    // Validate if it's a valid UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (uuidRegex.test(adminIdParam)) {
      // It's a valid UUID, use it
      notificationsAdminId = adminIdParam
    }
    // If not valid UUID, use user.id (default)
  }

  const notifications = await getAllNotifications(notificationsAdminId)

  return (
    <div className="min-h-screen">
      <Navbar userRole={user.role} userName={user.first_name} userId={user.id} />
      
      <div className="max-w-5xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="mb-10 text-center">
          <div className="inline-block p-4 bg-gradient-to-br from-pink-100 to-purple-100 rounded-2xl mb-4">
            <svg className="w-12 h-12 text-pink-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent mb-3">
            Notifications
          </h1>
          <p className="text-gray-600 text-lg">
            View all your notifications and cancellation requests
          </p>
        </div>

        <NotificationsList 
          key={notificationsAdminId}
          initialNotifications={notifications} 
          adminId={notificationsAdminId} 
        />
      </div>
    </div>
  )
}

