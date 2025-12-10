import { getCurrentUser } from '@/lib/auth/server-helpers'
import { getAdminAppointments } from '@/lib/queries/appointments'
import { getUnreadNotifications } from '@/lib/queries/notifications'
import { getAdmins } from '@/lib/queries/users'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import Navbar from '@/components/Navbar'
import RecentNotifications from './RecentNotifications'
import RealTimeAdminAppointments from './RealTimeAdminAppointments'
import WorkerFilterDropdown from './WorkerFilterDropdown'

export default async function AdminDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ worker?: string }>
}) {
  const user = await getCurrentUser()

  if (!user || (user.role !== 'admin' && user.role !== 'head_admin')) {
    redirect('/login')
  }

  const workerName = `${user.first_name} ${user.last_name}`
  const workerId = user.id
  
  // Await searchParams before accessing properties
  const resolvedSearchParams = await searchParams
  
  // For head_admin: get filter from search params, default to their own ID
  let filterWorkerId: string | 'all' | undefined = undefined
  if (user.role === 'head_admin') {
    const workerParam = resolvedSearchParams?.worker
    
    if (workerParam === 'all') {
      filterWorkerId = 'all'
    } else if (workerParam) {
      // Validate if it's a valid UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      if (uuidRegex.test(workerParam)) {
        // It's a valid UUID, use it directly
        filterWorkerId = workerParam
      } else {
        // It's not a UUID (probably an old worker name), default to current worker's ID
        filterWorkerId = workerId
      }
    } else {
      // No param, default to current worker's ID
      filterWorkerId = workerId
    }
  }

  // Fetch admins list for head_admin dropdown
  const admins = user.role === 'head_admin' 
    ? await getAdmins()
    : []

  // Get worker name for the selected admin (for display and API calls)
  // If filtering to another admin, get that admin's name; otherwise use head admin's name
  let workerNameForActions = workerName
  if (user.role === 'head_admin' && filterWorkerId && filterWorkerId !== 'all') {
    const selectedAdmin = admins.find(admin => admin.id === filterWorkerId)
    if (selectedAdmin) {
      workerNameForActions = `${selectedAdmin.first_name} ${selectedAdmin.last_name}`
    }
  }

  // Calculate which admin ID to use for notifications
  // If head_admin is filtering to view another admin, show that admin's notifications
  // Otherwise, show head_admin's own notifications
  const notificationsAdminId = 
    user.role === 'head_admin' && 
    filterWorkerId && 
    filterWorkerId !== 'all'
      ? filterWorkerId  // Selected admin's notifications
      : user.id        // Own notifications

  // Calculate which admin ID to use for creating appointments and blocking time
  // If head_admin is filtering to view another admin, create appointments/block time for that admin
  // Otherwise, create for head_admin themselves
  const workerAdminIdForActions = 
    user.role === 'head_admin' && 
    filterWorkerId && 
    filterWorkerId !== 'all'
      ? filterWorkerId  // Selected admin's appointments/time blocks
      : user.id        // Own appointments/time blocks

  const [appointments, unreadNotifications] = await Promise.all([
    getAdminAppointments(user.role, workerId, filterWorkerId),
    getUnreadNotifications(notificationsAdminId),
  ])

  return (
    <div className="min-h-screen">
      <Navbar 
        userRole={user.role} 
        userName={user.first_name} 
        userId={user.id}
        notificationsAdminId={notificationsAdminId}
      />
      
      <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        {/* Worker Filter Dropdown - Head Admin Only */}
        {user.role === 'head_admin' && (
          <WorkerFilterDropdown 
            admins={admins}
            currentFilter={filterWorkerId === 'all' ? 'all' : (filterWorkerId || workerId)}
            currentWorkerId={workerId}
          />
        )}

        <div className="mb-10 text-center">
          <div className="inline-block p-4 bg-gradient-to-br from-pink-100 to-purple-100 rounded-2xl mb-4">
            <svg className="w-12 h-12 text-pink-600" fill="currentColor" viewBox="0 0 24 24">
              <path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z"/>
            </svg>
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent mb-3">
            Admin Dashboard
          </h1>
          <p className="text-gray-600 text-lg">
            Manage appointments scheduled with you ({workerName})
          </p>
        </div>

        {/* Recent Notifications */}
        {unreadNotifications.length > 0 && (
          <RecentNotifications 
            key={notificationsAdminId}
            notifications={unreadNotifications} 
            adminId={notificationsAdminId} 
          />
        )}

        {/* Real-time Appointments with Stats */}
        <RealTimeAdminAppointments
          initialAppointments={appointments}
          workerId={workerId}
          workerName={workerNameForActions}
          adminId={user.id}
          userRole={user.role}
          filterWorkerId={filterWorkerId}
          workerAdminIdForActions={workerAdminIdForActions}
        />
      </div>
    </div>
  )
}

