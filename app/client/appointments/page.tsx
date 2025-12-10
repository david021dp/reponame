import { getCurrentUser } from '@/lib/auth/server-helpers'
import { getUserAppointments } from '@/lib/queries/appointments'
import { redirect } from 'next/navigation'
import Navbar from '@/components/Navbar'
import Link from 'next/link'
import RealTimeClientAppointments from './RealTimeClientAppointments'

export default async function ClientAppointmentsPage() {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/login')
  }

  const appointments = await getUserAppointments(user.id)

  return (
    <div className="min-h-screen">
      <Navbar userRole="client" userName={user.first_name} userId={user.id} />
      
      <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="mb-10 text-center">
          <div className="inline-block p-4 bg-gradient-to-br from-pink-100 to-purple-100 rounded-2xl mb-4">
            <svg className="w-12 h-12 text-pink-600" fill="currentColor" viewBox="0 0 24 24">
              <path d="M9 1v2H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h5v2h2v-2h2v2h2v-2h5c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2h-5V1h-2zm-5 6h16v12H4V7z"/>
            </svg>
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent mb-3">
            My Appointments
          </h1>
          <p className="text-gray-600 text-lg">
            View all your scheduled appointments
          </p>
        </div>

        <RealTimeClientAppointments 
          initialAppointments={appointments}
          userId={user.id}
        />
      </div>
    </div>
  )
}

