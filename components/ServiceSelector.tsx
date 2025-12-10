'use client'

import { useState, useMemo } from 'react'
import { Service } from '@/types/database.types'

interface ServiceSelectorProps {
  services: Service[]
  selectedServices: string[]
  onToggle: (serviceId: string) => void
  className?: string
}

type ServiceCategory = 'Manicures' | 'Pedicures' | 'Extensions' | 'Treatments' | 'Maintenance'

const getServiceCategory = (serviceName: string): ServiceCategory => {
  const name = serviceName.toLowerCase()
  if (name.includes('manicure') || name.includes('polish') || name.includes('french')) {
    return 'Manicures'
  }
  if (name.includes('pedicure')) {
    return 'Pedicures'
  }
  if (name.includes('extension') || name.includes('acrylic') || name.includes('dip')) {
    return 'Extensions'
  }
  if (name.includes('massage') || name.includes('paraffin') || name.includes('spa')) {
    return 'Treatments'
  }
  return 'Maintenance'
}

const categoryColors: Record<ServiceCategory, { bg: string; border: string; text: string }> = {
  Manicures: {
    bg: 'bg-gray-50',
    border: 'border-gray-200',
    text: 'text-gray-800'
  },
  Pedicures: {
    bg: 'bg-gray-50',
    border: 'border-gray-200',
    text: 'text-gray-800'
  },
  Extensions: {
    bg: 'bg-gray-50',
    border: 'border-gray-200',
    text: 'text-gray-800'
  },
  Treatments: {
    bg: 'bg-gray-50',
    border: 'border-gray-200',
    text: 'text-gray-800'
  },
  Maintenance: {
    bg: 'bg-gray-50',
    border: 'border-gray-200',
    text: 'text-gray-800'
  }
}

export default function ServiceSelector({
  services,
  selectedServices,
  onToggle,
  className = '',
}: ServiceSelectorProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<ServiceCategory | 'All'>('All')

  // Group services by category
  const servicesByCategory = useMemo(() => {
    const grouped: Record<ServiceCategory, Service[]> = {
      Manicures: [],
      Pedicures: [],
      Extensions: [],
      Treatments: [],
      Maintenance: [],
    }

    services.forEach((service) => {
      const category = getServiceCategory(service.name)
      grouped[category].push(service)
    })

    // Sort services within each category by name
    Object.keys(grouped).forEach((cat) => {
      grouped[cat as ServiceCategory].sort((a, b) => a.name.localeCompare(b.name))
    })

    return grouped
  }, [services])

  // Filter services based on search and category
  const filteredServices = useMemo(() => {
    let filtered = services

    // Filter by category
    if (selectedCategory !== 'All') {
      filtered = servicesByCategory[selectedCategory]
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (service) =>
          service.name.toLowerCase().includes(query) ||
          service.price.toString().includes(query) ||
          service.duration.toString().includes(query)
      )
    }

    return filtered
  }, [services, selectedCategory, searchQuery, servicesByCategory])

  const categories: (ServiceCategory | 'All')[] = ['All', 'Manicures', 'Pedicures', 'Extensions', 'Treatments', 'Maintenance']

  return (
    <div className={className}>
      {/* Search Bar */}
      <div className="mb-4">
        <div className="relative">
          <input
            type="text"
            placeholder="Search services..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-3 pl-11 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-gray-400 bg-white text-gray-700 placeholder-gray-400 transition-all"
          />
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="mb-4 flex flex-wrap gap-2">
        {categories.map((category) => {
          const isActive = selectedCategory === category
          const count = category === 'All' 
            ? services.length 
            : servicesByCategory[category].length

          return (
            <button
              key={category}
              type="button"
              onClick={() => setSelectedCategory(category)}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                isActive
                  ? 'bg-gray-800 text-white shadow-sm'
                  : 'bg-white border border-gray-300 text-gray-700 hover:border-gray-400 hover:bg-gray-50'
              }`}
            >
              {category}
              <span className={`ml-2 text-xs ${isActive ? 'text-gray-300' : 'text-gray-500'}`}>
                ({count})
              </span>
            </button>
          )
        })}
      </div>

      {/* Services Grid */}
      {selectedCategory === 'All' ? (
        // Show by category when "All" is selected
        <div className="space-y-6">
          {categories.slice(1).map((category) => {
            let categoryServices = servicesByCategory[category as ServiceCategory]
            
            // Apply search filter if there's a query
            if (searchQuery.trim()) {
              const query = searchQuery.toLowerCase()
              categoryServices = categoryServices.filter(
                (service) =>
                  service.name.toLowerCase().includes(query) ||
                  service.price.toString().includes(query) ||
                  service.duration.toString().includes(query)
              )
            }
            
            if (categoryServices.length === 0) return null

            const colors = categoryColors[category as ServiceCategory]

            return (
              <div key={category} className={`${colors.bg} rounded-lg p-4 border ${colors.border}`}>
                <div className="flex items-center gap-2 mb-4">
                  <h3 className={`font-semibold text-base ${colors.text}`}>{category}</h3>
                  <span className={`text-xs px-2 py-0.5 rounded-full bg-gray-200 text-gray-600 font-medium`}>
                    {categoryServices.length}
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {categoryServices.map((service) => {
                    const isSelected = selectedServices.includes(service.id)
                    return (
                      <label
                        key={service.id}
                        className={`flex items-center gap-3 p-4 bg-white rounded-lg border cursor-pointer transition-all ${
                          isSelected
                            ? `border-gray-800 bg-gray-50 shadow-sm`
                            : 'border-gray-200 hover:border-gray-400 hover:shadow-sm'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => onToggle(service.id)}
                          className="w-5 h-5 text-gray-800 border-2 border-gray-300 rounded focus:ring-2 focus:ring-gray-400 focus:ring-offset-1 cursor-pointer"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-gray-900 truncate">{service.name}</div>
                          <div className="flex items-center gap-3 mt-1 text-sm text-gray-600">
                            <span className="font-medium text-gray-700">${service.price}</span>
                            <span className="text-gray-400">•</span>
                            <span className="text-gray-600">{service.duration} min</span>
                          </div>
                        </div>
                        {isSelected && (
                          <div className="flex-shrink-0">
                            <svg className="w-5 h-5 text-gray-800" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                          </div>
                        )}
                      </label>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        // Show filtered services when a specific category is selected
        <div className={`${categoryColors[selectedCategory].bg} rounded-lg p-4 border ${categoryColors[selectedCategory].border}`}>
          <div className="flex items-center gap-2 mb-4">
            <h3 className={`font-semibold text-base ${categoryColors[selectedCategory].text}`}>
              {selectedCategory}
            </h3>
            <span className={`text-xs px-2 py-0.5 rounded-full bg-gray-200 text-gray-600 font-medium`}>
              {filteredServices.length}
            </span>
          </div>
          {filteredServices.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>No services found matching your search.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredServices.map((service) => {
                const isSelected = selectedServices.includes(service.id)
                return (
                  <label
                    key={service.id}
                    className={`flex items-center gap-3 p-4 bg-white rounded-lg border cursor-pointer transition-all ${
                      isSelected
                        ? 'border-gray-800 bg-gray-50 shadow-sm'
                        : 'border-gray-200 hover:border-gray-400 hover:shadow-sm'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => onToggle(service.id)}
                      className="w-5 h-5 text-gray-800 border-2 border-gray-300 rounded focus:ring-2 focus:ring-gray-400 focus:ring-offset-1 cursor-pointer"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-gray-900 truncate">{service.name}</div>
                      <div className="flex items-center gap-3 mt-1 text-sm text-gray-600">
                        <span className="font-medium text-gray-700">${service.price}</span>
                        <span className="text-gray-400">•</span>
                        <span className="text-gray-600">{service.duration} min</span>
                      </div>
                    </div>
                    {isSelected && (
                      <div className="flex-shrink-0">
                        <svg className="w-5 h-5 text-gray-800" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      </div>
                    )}
                  </label>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

