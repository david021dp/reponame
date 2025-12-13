import { getCurrentUser } from '@/lib/auth/server-helpers'
import { getAdmins } from '@/lib/queries/users'
import { getServices } from '@/lib/queries/services'
import { redirect } from 'next/navigation'
import Navbar from '@/components/Navbar'
import ScheduleForm from './ScheduleForm'
import ClientRescheduleModal from '@/components/ClientRescheduleModal'

export default async function ClientSchedulePage() {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/login')
  }

  const [admins, services] = await Promise.all([
    getAdmins(),
    getServices(),
  ])

  const workers = admins.map((admin) => ({
    id: admin.id,
    name: `${admin.first_name} ${admin.last_name}`,
  }))

  return (
    <div className="min-h-screen">
      <Navbar userRole="client" userName={user.first_name} userId={user.id} />
      <ClientRescheduleModal userId={user.id} />
      
      <div className="max-w-4xl mx-auto py-6 sm:py-12 px-4 sm:px-6 lg:px-8">
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl sm:rounded-3xl shadow-2xl border border-pink-100 p-6 sm:p-10">
          <div className="text-center mb-6 sm:mb-8">
            <div className="inline-block p-3 sm:p-4 bg-gradient-to-br from-pink-100 to-purple-100 rounded-2xl mb-3 sm:mb-4">
              <svg className="w-10 h-10 sm:w-12 sm:h-12 text-pink-600" fill="currentColor" viewBox="0 0 24 24">
                <path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10zM9 14H7v-2h2v2zm4 0h-2v-2h2v2zm4 0h-2v-2h2v2zm-8 4H7v-2h2v2zm4 0h-2v-2h2v2zm4 0h-2v-2h2v2z"/>
              </svg>
            </div>
            <h1 className="text-2xl sm:text-4xl font-bold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent mb-2 sm:mb-3 px-2">
              Schedule an Appointment
            </h1>
            <p className="text-gray-600 text-sm sm:text-lg px-2">
              Select your preferred worker, service, and time slot
            </p>
          </div>

          <ScheduleForm
            workers={workers}
            services={services}
            userId={user.id}
            userEmail={user.email}
            userFirstName={user.first_name}
            userLastName={user.last_name}
            userPhone={user.phone}
          />
        </div>
      </div>
    </div>
  )
}

