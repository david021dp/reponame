'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { signIn } from '@/lib/auth/helpers'
import { ShineBorder } from '@/components/magicui/shine-border'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const { user } = await signIn(email, password)
      
      console.log('User signed in:', user.id)
      
      // Get user role
      const supabase = createClient()
      const { data: userData, error: roleError } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single()

      console.log('User data:', userData)
      console.log('Role error:', roleError)

      if (roleError) {
        throw new Error(`Failed to fetch user role: ${roleError.message}`)
      }

      // Redirect based on role with full page reload
      if (userData?.role === 'admin' || userData?.role === 'head_admin') {
        console.log('Redirecting to admin dashboard')
        window.location.href = '/admin/dashboard'
      } else if (userData?.role === 'client') {
        console.log('Redirecting to client schedule')
        window.location.href = '/client/schedule'
      } else {
        console.log('No role found, redirecting to home')
        window.location.href = '/'
      }
    } catch (err: any) {
      console.error('Login error:', err)
      setError(err.message || 'Failed to sign in')
      
      // Log failed login attempt (non-blocking, don't wait for it)
      fetch('/api/security/log-event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // Include cookies if needed
        body: JSON.stringify({
          event_type: 'failed_login',
          error_message: err.message || 'Login failed',
          metadata: {
            error_code: err.status || 'unknown',
          },
        }),
      })
        .then(async (response) => {
          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}))
            console.error('[Login] Failed to log security event:', response.status, errorData)
          } else {
            console.log('[Login] Security event logged successfully')
          }
        })
        .catch((fetchError) => {
          // Log but don't break login flow
          console.error('[Login] Error calling security log endpoint:', fetchError)
        })
      
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      {/* Outer wrapper with shine border */}
      <div className="relative max-w-md w-full p-[2px] rounded-[26px] bg-gradient-to-r from-pink-500 via-purple-500 to-pink-500 overflow-hidden">
        {/* Shine Border Animation */}
        <ShineBorder
          shineColor={["#f43f5e", "#ec4899", "#a855f7"]}
          duration={10}
          borderWidth={2}
        />
        
        {/* Inner login card */}
        <div className="space-y-8 bg-white/80 backdrop-blur-sm p-10 rounded-3xl shadow-2xl relative overflow-hidden">
          {/* Decorative elements */}
          <div className="absolute top-8 right-8 w-32 h-32 bg-gradient-to-br from-pink-200 to-purple-200 rounded-full blur-3xl opacity-30"></div>
          <div className="absolute bottom-8 left-8 w-40 h-40 bg-gradient-to-br from-rose-200 to-pink-200 rounded-full blur-3xl opacity-30"></div>
          
          <div className="relative">
          <div className="text-center mb-2">
            <div className="inline-block p-3 bg-gradient-to-br from-pink-100 to-purple-100 rounded-2xl mb-4">
              <svg className="w-12 h-12 text-pink-600" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/>
              </svg>
            </div>
            <h2 className="text-4xl font-bold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">
              Welcome Back
            </h2>
            <p className="mt-2 text-gray-600">
              Sign in to your account
            </p>
          </div>

          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-5">
              <div>
                <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-2">
                  Email address
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full px-4 py-3.5 border-2 border-pink-100 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-pink-300 focus:border-pink-400 bg-white/50 backdrop-blur-sm transition-all"
                  placeholder="you@example.com"
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-2">
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full px-4 py-3.5 border-2 border-pink-100 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-pink-300 focus:border-pink-400 bg-white/50 backdrop-blur-sm transition-all"
                  placeholder="••••••••"
                />
              </div>
            </div>

            {error && (
              <div className="rounded-xl bg-red-50 border border-red-200 p-4">
                <p className="text-sm text-red-700 font-medium">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-4 px-4 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all"
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>
        </div>
      </div>
      </div>
    </div>
  )
}

