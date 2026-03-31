'use client'

import React, { useState, useEffect } from 'react'
import { Clock } from 'lucide-react'
import { cn } from '@/lib/utils'

interface BookingTimerProps {
  durationMinutes: number
  onExpire?: () => void
  onWarning?: () => void
}

export function BookingTimer({ durationMinutes, onExpire, onWarning }: BookingTimerProps) {
  // Use a fixed end timestamp based on mount
  // Ideally, this should come from the server appointment.createdAt, but for the fresh booking flow, 
  // keeping it simple as "15 mins from now" is sufficient as long as backend validates.
  const [timeLeft, setTimeLeft] = useState(durationMinutes * 60)
  
  useEffect(() => {
    // Decrement every second
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval)
          if (onExpire) onExpire()
          return 0
        }
        if (prev === 60 && onWarning) {
             onWarning() // Warning at 1 min
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [onExpire, onWarning])

  const minutes = Math.floor(timeLeft / 60)
  const seconds = timeLeft % 60
  
  const isWarning = timeLeft < 60 && timeLeft > 0
  const isExpired = timeLeft === 0

  return (
    <div className={cn(
        "flex items-center gap-2 px-4 py-2 rounded-full font-mono font-bold transition-all",
        isExpired ? "bg-red-100 text-red-600" : 
        isWarning ? "bg-orange-100 text-orange-600 animate-pulse" : 
        "bg-teal-50 text-teal-700 dark:bg-teal-900/20 dark:text-teal-400"
    )}>
       <Clock className="w-4 h-4" />
       <span>
         {minutes.toString().padStart(2, '0')}:{seconds.toString().padStart(2, '0')}
       </span>
       {isExpired && <span className="ml-1 text-xs uppercase tracking-tight">Expirado</span>}
    </div>
  )
}
