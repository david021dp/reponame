'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { getCsrfToken, CSRF_HEADER_NAME } from '@/lib/csrf/client'

interface RegisterFormProps {
  adminId: string
}

export default function RegisterForm({ adminId }: RegisterFormProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  
  // Get worker query parameter if present (for preserving filter on redirect)
  const workerParam = searchParams.get('worker')
  
  // Build redirect URL preserving worker filter
  const getDashboardUrl = () => {
    if (workerParam) {
      return `/admin/dashboard?worker=${encodeURIComponent(workerParam)}`
    }
    return '/admin/dashboard'
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(false)

    // Validate password confirmation
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setLoading(true)

    try {
      // Get CSRF token
      const csrfToken = await getCsrfToken()
      if (!csrfToken) {
        setError('Failed to get security token. Please refresh the page.')
        setLoading(false)
        return
      }

      const response = await fetch('/api/admin/register-client', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          [CSRF_HEADER_NAME]: csrfToken,
        },
        credentials: 'include', // Include cookies
        body: JSON.stringify({
          email,
          password,
          first_name: firstName,
          last_name: lastName,
          phone,
          admin_id: adminId,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to register client')
      }

      setSuccess(true)
      // Reset form
      setEmail('')
      setPassword('')
      setConfirmPassword('')
      setFirstName('')
      setLastName('')
      setPhone('')

      // Show success message for 2 seconds then redirect
      setTimeout(() => {
        router.push(getDashboardUrl())
        router.refresh()
      }, 2000)
    } catch (err: any) {
      setError(err.message || 'Failed to register client')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div>
          <label htmlFor="firstName" className="block text-sm font-semibold text-gray-700 mb-3">
            First Name <span className="text-pink-500">*</span>
          </label>
          <input
            type="text"
            id="firstName"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            required
            className="block w-full px-4 py-4 border-2 border-pink-100 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-pink-300 focus:border-pink-400 bg-white/50 backdrop-blur-sm transition-all text-gray-700 font-medium"
            placeholder="John"
          />
        </div>

        <div>
          <label htmlFor="lastName" className="block text-sm font-semibold text-gray-700 mb-3">
            Last Name <span className="text-pink-500">*</span>
          </label>
          <input
            type="text"
            id="lastName"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            required
            className="block w-full px-4 py-4 border-2 border-pink-100 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-pink-300 focus:border-pink-400 bg-white/50 backdrop-blur-sm transition-all text-gray-700 font-medium"
            placeholder="Doe"
          />
        </div>
      </div>

      <div>
        <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-3">
          Email Address <span className="text-pink-500">*</span>
        </label>
        <input
          type="email"
          id="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="block w-full px-4 py-4 border-2 border-pink-100 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-pink-300 focus:border-pink-400 bg-white/50 backdrop-blur-sm transition-all text-gray-700 font-medium"
          placeholder="john.doe@example.com"
        />
      </div>

      <div>
        <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-3">
          Password <span className="text-pink-500">*</span>
        </label>
        <input
          type="password"
          id="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={6}
          className="block w-full px-4 py-4 border-2 border-pink-100 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-pink-300 focus:border-pink-400 bg-white/50 backdrop-blur-sm transition-all text-gray-700 font-medium"
          placeholder="••••••••"
        />
        <p className="mt-2 text-sm text-gray-600">
          🔒 Minimum 6 characters
        </p>
      </div>

      <div>
        <label htmlFor="confirmPassword" className="block text-sm font-semibold text-gray-700 mb-3">
          Confirm Password <span className="text-pink-500">*</span>
        </label>
        <input
          type="password"
          id="confirmPassword"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
          minLength={6}
          className={`block w-full px-4 py-4 border-2 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-pink-300 focus:border-pink-400 bg-white/50 backdrop-blur-sm transition-all text-gray-700 font-medium ${
            confirmPassword && password !== confirmPassword
              ? 'border-red-300 focus:border-red-400 focus:ring-red-300'
              : 'border-pink-100'
          }`}
          placeholder="••••••••"
        />
        {confirmPassword && password !== confirmPassword && (
          <p className="mt-2 text-sm text-red-600">
            ⚠️ Passwords do not match
          </p>
        )}
        {confirmPassword && password === confirmPassword && password.length >= 6 && (
          <p className="mt-2 text-sm text-green-600">
            ✅ Passwords match
          </p>
        )}
      </div>

      <div>
        <label htmlFor="phone" className="block text-sm font-semibold text-gray-700 mb-3">
          Phone Number <span className="text-pink-500">*</span>
        </label>
        <input
          type="tel"
          id="phone"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          required
          className="block w-full px-4 py-4 border-2 border-pink-100 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-pink-300 focus:border-pink-400 bg-white/50 backdrop-blur-sm transition-all text-gray-700 font-medium"
          placeholder="+1 (555) 123-4567"
        />
      </div>

      {error && (
        <div className="rounded-xl bg-red-50 border-2 border-red-200 p-4">
          <p className="text-sm text-red-700 font-semibold">{error}</p>
        </div>
      )}

      {success && (
        <div className="rounded-xl bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 p-4">
          <p className="text-sm text-green-700 font-semibold">
            ✅ Client registered successfully! They will receive a verification email. Redirecting...
          </p>
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full py-4 px-4 bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-xl font-semibold hover:from-pink-600 hover:to-purple-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all"
      >
        {loading ? '✨ Registering...' : '✨ Register Client'}
      </button>
    </form>
  )
}

