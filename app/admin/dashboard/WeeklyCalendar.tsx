'use client'

import { useState, useEffect } from 'react'
import { Appointment } from '@/types/database.types'
import {
  getCurrentWeekDates,
  getWeekDays,
  formatDayHeader,
  formatWeekRange,
  getTimeSlots,
  groupAppointmentsByDate,
  formatDateKey,
  isToday,
  calculateAppointmentPosition,
  getAppointmentColor,
  formatTime,
  formatTimeRange,
  parseAppointmentDate,
} from '@/lib/utils/calendarHelpers'
import CreateAppointmentModal from './CreateAppointmentModal'
import BlockTimeModal from './BlockTimeModal'
import { sanitizeText } from '@/lib/utils/sanitize'

interface WeeklyCalendarProps {
  appointments: Appointment[]
  onCancelAppointment: (appointmentId: string) => void
  adminId: string
  workerName: string
  onWeekChange?: (weekStart: Date) => void
}

interface AppointmentBlockProps {
  appointment: Appointment
  onCancel: (id: string) => void
  onClick: (appointment: Appointment) => void
}

function AppointmentBlock({ appointment, onCancel, onClick }: AppointmentBlockProps) {
  const colorClass = getAppointmentColor(appointment)
  const { top, height } = calculateAppointmentPosition(appointment)
  
  const handleClick = () => {
    onClick(appointment)
  }
  
  const timeRange = formatTimeRange(appointment.appointment_time, appointment.duration)
  
  // Check if this is blocked time
  const isBlockedTime = appointment.first_name === 'Blocked' && appointment.last_name === 'Time'
  
  if (isBlockedTime) {
    return (
      <div
        className="absolute left-0 right-0 mx-1 rounded-lg p-2 text-xs overflow-hidden bg-gray-200 border-l-4 border-gray-500 opacity-80 cursor-pointer hover:opacity-100 transition-opacity"
        style={{
          top: `${top}px`,
          height: `${height}px`,
          minHeight: '20px',
        }}
        onClick={handleClick}
      >
        <div className="font-bold text-gray-700">
          🚫 Blocked
        </div>
        <div className="text-gray-600 text-[10px] mt-0.5">
          {timeRange}
        </div>
      </div>
    )
  }
  
  if (appointment.status === 'cancelled') {
    return (
      <div
        className={`${colorClass} absolute left-0 right-0 mx-1 rounded p-2 text-xs overflow-hidden opacity-60 shadow-sm cursor-pointer hover:opacity-80`}
        style={{
          top: `${top}px`,
          height: `${height}px`,
        }}
        onClick={handleClick}
      >
        <div className="font-semibold truncate text-gray-500 line-through">
          {appointment.first_name} {appointment.last_name}
        </div>
        <div className="text-gray-400 truncate text-[10px]" title={appointment.service}>
          {appointment.service.length > 20 ? `${appointment.service.substring(0, 17)}...` : appointment.service}
        </div>
        <div className="text-gray-400 text-[10px]">Cancelled</div>
      </div>
    )
  }
  
  return (
    <div
      className={`${colorClass} absolute left-0 right-0 mx-1 rounded-lg p-2 text-xs overflow-hidden cursor-pointer hover:shadow-lg transition-all hover:mx-0 hover:z-10 hover:scale-[1.02]`}
      style={{
        top: `${top}px`,
        height: `${height}px`,
        minHeight: '20px', // Ensure even 15-min appointments are visible
      }}
      onClick={handleClick}
    >
      <div className="font-semibold truncate text-gray-800 leading-tight text-sm">
        {appointment.first_name} {appointment.last_name}
      </div>
        <div className="text-gray-600 truncate text-[11px] font-medium leading-tight mt-1" title={appointment.service}>
          {appointment.service.length > 25 ? `${appointment.service.substring(0, 22)}...` : appointment.service}
        </div>
      <div className="text-gray-700 text-xs font-semibold mt-1 leading-tight">
        {timeRange}
      </div>
      {appointment.phone && height > 50 && (
        <div className="text-gray-400 text-[9px] truncate mt-1">
          📞 {appointment.phone}
        </div>
      )}
    </div>
  )
}

export default function WeeklyCalendar({
  appointments,
  onCancelAppointment,
  adminId,
  workerName,
  onWeekChange,
}: WeeklyCalendarProps) {
  const [currentWeekStart, setCurrentWeekStart] = useState(() => {
    const { start } = getCurrentWeekDates()
    return start
  })

  // Notify parent component when week changes
  useEffect(() => {
    if (onWeekChange) {
      onWeekChange(currentWeekStart)
    }
  }, [currentWeekStart, onWeekChange])
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showBlockModal, setShowBlockModal] = useState(false)
  
  const weekDates = getWeekDays(currentWeekStart)
  const timeSlots = getTimeSlots()
  
  // Filter out all cancelled appointments
  const filteredAppointments = appointments.filter((apt) => apt.status !== 'cancelled')
  
  const appointmentsByDate = groupAppointmentsByDate(filteredAppointments)
  
  const handlePreviousWeek = () => {
    const newDate = new Date(currentWeekStart.getFullYear(), currentWeekStart.getMonth(), currentWeekStart.getDate() - 7)
    setCurrentWeekStart(newDate)
  }
  
  const handleNextWeek = () => {
    const newDate = new Date(currentWeekStart.getFullYear(), currentWeekStart.getMonth(), currentWeekStart.getDate() + 7)
    setCurrentWeekStart(newDate)
  }
  
  const weekEnd = new Date(currentWeekStart.getFullYear(), currentWeekStart.getMonth(), currentWeekStart.getDate() + 6)
  
  return (
    <div className="bg-white rounded-2xl shadow-lg border border-pink-100 overflow-hidden">
      {/* Calendar Header */}
      <div className="bg-gradient-to-r from-pink-50 to-purple-50 p-4 border-b border-pink-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-lg text-sm font-semibold hover:from-pink-600 hover:to-purple-600 transition-colors shadow-md flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              New Appointment
            </button>
            
            <button
              onClick={() => setShowBlockModal(true)}
              className="px-4 py-2 bg-gradient-to-r from-gray-500 to-gray-600 text-white rounded-lg text-sm font-semibold hover:from-gray-600 hover:to-gray-700 transition-colors shadow-md flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
              </svg>
              Block Time
            </button>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={handlePreviousWeek}
              className="p-2 hover:bg-white rounded-lg transition-colors"
            >
              <svg
                className="w-6 h-6 text-gray-700"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </button>
            
            <div className="text-gray-800 font-semibold text-base px-4">
              {formatWeekRange(currentWeekStart, weekEnd)}
            </div>
            
            <button
              onClick={handleNextWeek}
              className="p-2 hover:bg-white rounded-lg transition-colors"
            >
              <svg
                className="w-6 h-6 text-gray-700"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>
      
      {/* Calendar Grid */}
      <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-pink-300 scrollbar-track-pink-50">
        <div className="min-w-[900px] lg:min-w-0">
          {/* Day Headers */}
          <div className="grid bg-gray-50 border-b border-gray-200" style={{ gridTemplateColumns: '80px repeat(7, 1fr)' }}>
            <div className="p-2 flex items-center justify-center text-xs font-semibold text-gray-500 border-r border-gray-200">
              Time
            </div>
            {weekDates.map((date, index) => {
              const { dayName, dayNumber } = formatDayHeader(date)
              const today = isToday(date)
               return (
                 <div
                   key={index}
                   className={`p-2 text-center border-r border-gray-200 ${
                     today ? 'bg-pink-50' : ''
                   }`}
                 >
                   <div className={`text-xs font-semibold ${today ? 'text-pink-600' : 'text-gray-600'}`}>
                     {dayName}
                   </div>
                   <div
                     className={`text-xl font-bold mt-1 ${
                       today
                         ? 'text-white bg-pink-500 rounded-full w-8 h-8 flex items-center justify-center mx-auto'
                         : 'text-gray-800'
                     }`}
                   >
                     {dayNumber}
                   </div>
                 </div>
               )
             })}
          </div>
          
           {/* Time Grid - Fixed height container for perfect alignment */}
           <div className="grid" style={{ gridTemplateColumns: '80px repeat(7, 1fr)' }}>
             {/* Time slots column - Fixed width 80px for perfect alignment */}
             <div className="border-r border-gray-200" style={{ width: '80px' }}>
               {timeSlots.map((time) => (
                 <div
                   key={time}
                   className="border-b border-gray-100 flex items-start justify-end text-[11px] text-gray-500 font-medium pr-2 pt-1"
                   style={{ height: '120px' }}
                 >
                   {formatTime(time)}
                 </div>
               ))}
             </div>
             
             {/* Day columns with appointments */}
             {weekDates.map((date, dayIndex) => {
               const dateKey = formatDateKey(date)
               const dayAppointments = appointmentsByDate.get(dateKey) || []
               
               // Calculate total height: 13 time slots × 120px per slot
               const totalHeight = timeSlots.length * 120
               
               return (
                 <div
                   key={dayIndex}
                   className="relative border-r border-gray-200"
                   style={{ height: `${totalHeight}px` }}
                 >
                   {/* Background time slot lines */}
                   {timeSlots.map((time, slotIndex) => (
                     <div
                       key={`${dayIndex}-${time}`}
                       className="absolute w-full border-b border-gray-100 hover:bg-pink-50/30 transition-colors cursor-pointer group"
                       style={{ 
                         top: `${slotIndex * 120}px`,
                         height: '120px'
                       }}
                     >
                       {/* Hover tooltip for available slot */}
                       <div className="opacity-0 group-hover:opacity-100 absolute inset-0 flex items-center justify-center pointer-events-none">
                         <span className="text-[10px] text-gray-400 font-medium">Available</span>
                       </div>
                     </div>
                   ))}
                   
                   {/* Appointment blocks - absolutely positioned */}
                   {dayAppointments.map((appointment) => (
                     <AppointmentBlock
                       key={appointment.id}
                       appointment={appointment}
                       onCancel={onCancelAppointment}
                       onClick={setSelectedAppointment}
                     />
                   ))}
                 </div>
               )
             })}
           </div>
        </div>
      </div>
      
      {/* Create Appointment Modal */}
      <CreateAppointmentModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        adminId={adminId}
        workerName={workerName}
      />

      {/* Block Time Modal */}
      <BlockTimeModal
        isOpen={showBlockModal}
        onClose={() => setShowBlockModal(false)}
        adminId={adminId}
        workerName={workerName}
      />
      
      {/* Appointment Details Modal */}
      {selectedAppointment && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100]"
          onClick={() => setSelectedAppointment(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl p-8 max-w-2xl w-full mx-4 border-4 border-pink-400"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Check if this is blocked time */}
            {selectedAppointment.first_name === 'Blocked' && selectedAppointment.last_name === 'Time' ? (
              <>
                {/* Blocked Time Modal Content */}
                <div className="flex items-start justify-between mb-6">
                  <div className="flex-1">
                    <h2 className="text-3xl font-bold text-gray-800 mb-2">
                      🚫 Blocked Time
                    </h2>
                    <div className="inline-block px-3 py-1 rounded-full text-sm font-semibold bg-gray-100 text-gray-700">
                      Unavailable
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedAppointment(null)}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <div className="space-y-4">
                  <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <div className="text-gray-500 text-xs mb-1">Date</div>
                        <div className="font-semibold text-gray-900">
                          {parseAppointmentDate(selectedAppointment.appointment_date).toLocaleDateString('en-US', {
                            weekday: 'long',
                            month: 'long',
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </div>
                      </div>
                      <div>
                        <div className="text-gray-500 text-xs mb-1">Time</div>
                        <div className="font-semibold text-gray-900">
                          {formatTimeRange(selectedAppointment.appointment_time, selectedAppointment.duration)}
                        </div>
                      </div>
                    </div>
                  </div>

                  {selectedAppointment.notes && (
                    <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
                      <div className="text-xs text-gray-500 mb-1">Notes</div>
                      <div className="text-gray-700">{sanitizeText(selectedAppointment.notes)}</div>
                    </div>
                  )}
                </div>

                <div className="flex gap-3 mt-6">
                  <button
                    onClick={() => setSelectedAppointment(null)}
                    className="flex-1 px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-colors"
                  >
                    Close
                  </button>
                  <button
                    onClick={(e) => {
                      handleCancel(e, selectedAppointment.id)
                      setSelectedAppointment(null)
                    }}
                    className="flex-1 px-6 py-3 bg-gradient-to-r from-red-500 to-rose-500 text-white rounded-xl font-semibold hover:from-red-600 hover:to-rose-600 transition-all shadow-lg"
                  >
                    🗑️ Unblock Time
                  </button>
                </div>
              </>
            ) : (
              <>
                {/* Regular Appointment Modal Content */}
                <div className="flex items-start justify-between mb-6">
                  <div className="flex-1">
                    <h2 className="text-3xl font-bold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent mb-2">
                      Appointment Details
                    </h2>
                    <div className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${
                      selectedAppointment.status === 'scheduled' 
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-700'
                    }`}>
                      {selectedAppointment.status === 'scheduled' ? '✓ Scheduled' : '✕ Cancelled'}
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedAppointment(null)}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

            {/* Client Information */}
            <div className="space-y-4 mb-6">
              <div className="bg-gradient-to-r from-pink-50 to-purple-50 rounded-xl p-4 border border-pink-100">
                <h3 className="text-sm font-semibold text-gray-500 uppercase mb-2">Client Information</h3>
                <div className="text-2xl font-bold text-gray-900 mb-2">
                  {selectedAppointment.first_name} {selectedAppointment.last_name}
                </div>
                {selectedAppointment.email && (
                  <div className="text-gray-700 mb-1 flex items-center gap-2">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                      <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                    </svg>
                    {selectedAppointment.email}
                  </div>
                )}
                {selectedAppointment.phone && (
                  <div className="text-gray-700 flex items-center gap-2">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
                    </svg>
                    {selectedAppointment.phone}
                  </div>
                )}
              </div>

              {/* Service & Schedule */}
              <div className="bg-white rounded-xl p-4 border-2 border-gray-200">
                <h3 className="text-sm font-semibold text-gray-500 uppercase mb-3">Service Details</h3>
                <div className="text-xl font-bold text-gray-900 mb-3">
                  {selectedAppointment.service.includes(',') ? (
                    <div className="space-y-1">
                      {selectedAppointment.service.split(',').map((service, idx) => (
                        <div key={idx}>• {service.trim()}</div>
                      ))}
                    </div>
                  ) : (
                    selectedAppointment.service
                  )}
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-gray-500 text-xs mb-1">Date</div>
                    <div className="font-semibold text-gray-900">
                      {parseAppointmentDate(selectedAppointment.appointment_date).toLocaleDateString('en-US', {
                        weekday: 'long',
                        month: 'long',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-500 text-xs mb-1">Time</div>
                    <div className="font-semibold text-gray-900">
                      {formatTimeRange(selectedAppointment.appointment_time, selectedAppointment.duration)}
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-500 text-xs mb-1">Duration</div>
                    <div className="font-semibold text-gray-900">{selectedAppointment.duration} minutes</div>
                  </div>
                  <div>
                    <div className="text-gray-500 text-xs mb-1">Worker</div>
                    <div className="font-semibold text-gray-900">{selectedAppointment.worker}</div>
                  </div>
                </div>
              </div>

              {/* Notes */}
              {selectedAppointment.notes && (
                <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
                  <h3 className="text-sm font-semibold text-gray-500 uppercase mb-2">Notes</h3>
                  <div className="text-gray-700">{sanitizeText(selectedAppointment.notes)}</div>
                </div>
              )}

              {/* Cancellation Info */}
              {selectedAppointment.status === 'cancelled' && selectedAppointment.cancellation_reason && (
                <div className="bg-red-50 rounded-xl p-4 border border-red-200">
                  <h3 className="text-sm font-semibold text-red-600 uppercase mb-2">Cancellation Reason</h3>
                  <div className="text-gray-700">{sanitizeText(selectedAppointment.cancellation_reason)}</div>
                  {selectedAppointment.cancelled_at && (
                    <div className="text-xs text-gray-500 mt-2">
                      Cancelled on {new Date(selectedAppointment.cancelled_at).toLocaleString()}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={() => setSelectedAppointment(null)}
                className="flex-1 px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-colors"
              >
                Close
              </button>
              {selectedAppointment.status === 'scheduled' && (
                <button
                  onClick={(e) => {
                    handleCancel(e, selectedAppointment.id)
                    setSelectedAppointment(null)
                  }}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-red-500 to-rose-500 text-white rounded-xl font-semibold hover:from-red-600 hover:to-rose-600 transition-all shadow-lg"
                >
                  ✕ Cancel Appointment
                </button>
              )}
              </div>
            </>
            )}
          </div>
        </div>
      )}
    </div>
  )
  
  function handleCancel(e: React.MouseEvent, appointmentId: string) {
    e.stopPropagation()
    // Check if appointment still exists in the filtered appointments list
    const appointmentExists = filteredAppointments.some((apt) => apt.id === appointmentId)
    if (!appointmentExists) {
      alert('This appointment no longer exists. The page will refresh.')
      window.location.reload()
      return
    }
    if (confirm('Are you sure you want to cancel this appointment?')) {
      onCancelAppointment(appointmentId)
    }
  }
}

