import { getCurrentUser } from '@/lib/auth/server-helpers'
import { redirect } from 'next/navigation'
import Navbar from '@/components/Navbar'
import RegisterForm from './RegisterForm'

export default async function AdminRegisterPage() {
  const user = await getCurrentUser()

  if (!user || (user.role !== 'admin' && user.role !== 'head_admin')) {
    redirect('/login')
  }

  return (
    <div className="min-h-screen">
      <Navbar userRole={user.role} userName={user.first_name} userId={user.id} />
      
      <div className="max-w-2xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-2xl border border-pink-100 p-10">
          <div className="text-center mb-8">
            <div className="inline-block p-4 bg-gradient-to-br from-pink-100 to-purple-100 rounded-2xl mb-4">
              <svg className="w-12 h-12 text-pink-600" fill="currentColor" viewBox="0 0 24 24">
                <path d="M15 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm-9-2V7H4v3H1v2h3v3h2v-3h3v-2H6zm9 4c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
              </svg>
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent mb-3">
              Register New Client
            </h1>
            <p className="text-gray-600 text-lg">
              Create a new client account with email verification
            </p>
          </div>

          <RegisterForm adminId={user.id} />
        </div>
      </div>
    </div>
  )
}

