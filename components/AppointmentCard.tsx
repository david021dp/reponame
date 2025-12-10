import { Appointment } from '@/types/database.types'
import { sanitizeText } from '@/lib/utils/sanitize'

interface AppointmentCardProps {
  appointment: Appointment
  showClientInfo?: boolean
  onCancel?: (id: string) => void
  onReschedule?: (id: string) => void
  onCancelClick?: (appointment: Appointment) => void
  showCancelButton?: boolean
}

export default function AppointmentCard({
  appointment,
  showClientInfo = false,
  onCancel,
  onReschedule,
  onCancelClick,
  showCancelButton = false,
}: AppointmentCardProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  const formatTime = (timeString: string) => {
    // Return time in 24-hour format (already in HH:mm format)
    return timeString
  }

  const statusConfig =
    appointment.status === 'cancelled'
      ? {
          bg: 'bg-gradient-to-r from-red-100 to-rose-100',
          text: 'text-red-700',
          border: 'border-red-200'
        }
      : {
          bg: 'bg-gradient-to-r from-emerald-100 to-green-100',
          text: 'text-emerald-700',
          border: 'border-emerald-200'
        }

  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-pink-100 hover:shadow-xl transition-all duration-300 overflow-hidden">
      {/* Card Header with Service Name */}
      <div className="bg-gradient-to-r from-pink-50 to-purple-50 p-6 border-b border-pink-100">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <h3 className="text-xl font-bold text-gray-900 mb-1">
              {appointment.service.includes(',') ? (
                <div>
                  <div className="text-lg">{appointment.service.split(',')[0].trim()}</div>
                  {appointment.service.split(',').length > 1 && (
                    <div className="text-sm font-normal text-gray-600 mt-1">
                      +{appointment.service.split(',').length - 1} more service{appointment.service.split(',').length - 1 > 1 ? 's' : ''}
                    </div>
                  )}
                </div>
              ) : (
                appointment.service
              )}
            </h3>
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <svg className="w-4 h-4 text-pink-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
              </svg>
              <span>{appointment.duration} minutes</span>
              {appointment.is_rescheduled && (
                <span className="ml-2 text-blue-600 font-semibold">• Rescheduled</span>
              )}
            </div>
          </div>
          <span className={`px-4 py-2 rounded-full text-xs font-bold ${statusConfig.bg} ${statusConfig.text} ${statusConfig.border} border-2`}>
            {appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
          </span>
        </div>
      </div>

      {/* Card Body */}
      <div className="p-6 space-y-4">
        {showClientInfo && (
          <div className="pb-4 border-b border-pink-100">
            <div className="flex items-start space-x-3">
              <div className="p-2 bg-gradient-to-br from-pink-100 to-purple-100 rounded-lg">
                <svg className="w-5 h-5 text-pink-600" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/>
                </svg>
              </div>
              <div className="flex-1">
                <h4 className="font-bold text-gray-900 mb-1">Client Information</h4>
                <p className="text-sm text-gray-700 font-medium">
                  {appointment.first_name} {appointment.last_name}
                </p>
                <p className="text-sm text-gray-600">{appointment.email}</p>
                {appointment.phone && (
                  <p className="text-sm text-gray-600">{appointment.phone}</p>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="space-y-3">
          <div className="flex items-center space-x-3 text-gray-700">
            <div className="p-2 bg-pink-50 rounded-lg">
              <svg className="w-5 h-5 text-pink-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <span className="text-sm font-medium">Worker: {appointment.worker}</span>
          </div>

          <div className="flex items-center space-x-3 text-gray-700">
            <div className="p-2 bg-purple-50 rounded-lg">
              <svg className="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <span className="text-sm font-medium">{formatDate(appointment.appointment_date)}</span>
          </div>

          <div className="flex items-center space-x-3 text-gray-700">
            <div className="p-2 bg-pink-50 rounded-lg">
              <svg className="w-5 h-5 text-pink-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <span className="text-sm font-medium">{formatTime(appointment.appointment_time)}</span>
          </div>
        </div>

        {appointment.notes && (
          <div className="mt-4 p-4 bg-gradient-to-r from-pink-50 to-purple-50 rounded-xl border border-pink-100">
            <div className="flex items-start space-x-2">
              <svg className="w-5 h-5 text-pink-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path d="M2 5a2 2 0 012-2h7a2 2 0 012 2v4a2 2 0 01-2 2H9l-3 3v-3H4a2 2 0 01-2-2V5z" />
                <path d="M15 7v2a4 4 0 01-4 4H9.828l-1.766 1.767c.28.149.599.233.938.233h2l3 3v-3h2a2 2 0 002-2V9a2 2 0 00-2-2h-1z" />
              </svg>
              <div>
                <p className="text-xs font-bold text-gray-700 uppercase tracking-wide mb-1">Notes</p>
                <p className="text-sm text-gray-700">{sanitizeText(appointment.notes)}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Card Actions */}
      {(onCancel || onReschedule || (showCancelButton && onCancelClick)) && appointment.status === 'scheduled' && (
        <div className="px-6 pb-6 flex gap-3">
          {showCancelButton && onCancelClick && (
            <button
              onClick={() => onCancelClick(appointment)}
              className="flex-1 px-4 py-3 bg-gradient-to-r from-red-500 to-rose-500 text-white rounded-xl hover:from-red-600 hover:to-rose-600 transition-all text-sm font-semibold shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
            >
              Cancel
            </button>
          )}
          {onCancel && (
            <button
              onClick={() => onCancel(appointment.id)}
              className="flex-1 px-4 py-3 bg-gradient-to-r from-red-500 to-rose-500 text-white rounded-xl hover:from-red-600 hover:to-rose-600 transition-all text-sm font-semibold shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
            >
              Cancel
            </button>
          )}
          {onReschedule && (
            <button
              onClick={() => onReschedule(appointment.id)}
              className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-xl hover:from-blue-600 hover:to-indigo-600 transition-all text-sm font-semibold shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
            >
              Reschedule
            </button>
          )}
        </div>
      )}
    </div>
  )
}
