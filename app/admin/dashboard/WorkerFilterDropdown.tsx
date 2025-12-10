'use client'

import { useRouter, useSearchParams } from 'next/navigation'

interface WorkerFilterDropdownProps {
  admins: Array<{ id: string; first_name: string; last_name: string }>
  currentFilter: string | null
  currentWorkerId: string
}

export default function WorkerFilterDropdown({ 
  admins, 
  currentFilter, 
  currentWorkerId 
}: WorkerFilterDropdownProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  // Find current head admin's name for display
  const currentHeadAdmin = admins.find(admin => admin.id === currentWorkerId)
  const currentWorkerName = currentHeadAdmin ? `${currentHeadAdmin.first_name} ${currentHeadAdmin.last_name}` : ''

  const handleChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value === 'all') {
      params.set('worker', 'all')
    } else {
      params.set('worker', value)
    }
    router.push(`/admin/dashboard?${params.toString()}`)
  }

  // Filter out current head admin from admins list (they'll be shown as "Me")
  const otherAdmins = admins.filter(
    (admin) => admin.id !== currentWorkerId
  )

  // Determine the current value: use currentFilter (which defaults to currentWorkerId from parent)
  // Convert null to undefined for select value prop compatibility
  const currentValue = currentFilter ?? undefined

  return (
    <div className="mb-6">
      <label htmlFor="worker-filter" className="block text-sm font-semibold text-gray-700 mb-2">
        Filter by Worker:
      </label>
      <select
        id="worker-filter"
        value={currentValue}
        onChange={(e) => handleChange(e.target.value)}
        className="w-full sm:w-auto px-4 py-2 border border-pink-200 rounded-xl bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
      >
        <option value="all">All workers</option>
        <option value={currentWorkerId}>Me ({currentWorkerName})</option>
        {otherAdmins.map((admin) => {
          const fullName = `${admin.first_name} ${admin.last_name}`
          return (
            <option key={admin.id} value={admin.id}>
              {fullName}
            </option>
          )
        })}
      </select>
    </div>
  )
}

