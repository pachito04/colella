'use client'

import { toast } from "sonner"

import { useState, useEffect, useRef } from 'react'
import { DayPicker } from 'react-day-picker'
import { format, startOfToday, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { motion, AnimatePresence } from 'framer-motion'
import { Loader2, Calendar as CalendarIcon, Clock, User, CheckCircle2, AlertTriangle, ChevronLeft, ChevronRight, MapPin, Video, Copy, Check } from 'lucide-react'
import { useSession, signIn } from "next-auth/react"
import { useSearchParams } from "next/navigation"

import { Button } from '@/components/ui/button'
import { useBookingStore } from '@/lib/store/booking-store'
import { getAvailability, bookAppointment } from '@/app/actions'
import { getPublicConfig } from '@/app/public-config' // New action
import { cn } from '@/lib/utils'
import { PhoneInput } from '@/components/ui/phone-input'
import { BookingTimer } from './BookingTimer'

import { isValidPhoneNumber, type Value } from 'react-phone-number-input'
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { CANCELLATION_POLICY_TEXT } from '@/lib/config/terms'

import 'react-day-picker/dist/style.css'

export function BookingWidget() {
  const { data: session, status } = useSession()
  const searchParams = useSearchParams()
  
  const { selectedDate, selectedSlot, isDoubleSession, step, setDate, setSlot, setDoubleSession, setStep } = useBookingStore()
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [slots, setSlots] = useState<string[]>([])
  const [bookingStatus, setBookingStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null)
  const [phoneNumber, setPhoneNumber] = useState<Value>()
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [showTermsError, setShowTermsError] = useState(false)
  const [isExpired, setIsExpired] = useState(false)
  const [isMounted, setIsMounted] = useState(false)
  const [appointmentType, setAppointmentType] = useState<'PRESENTIAL' | 'VIRTUAL'>('PRESENTIAL')
  const [userTimezone, setUserTimezone] = useState<string>('America/Argentina/Buenos_Aires')

  useEffect(() => {
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
      if (tz) setUserTimezone(tz)
    } catch {}
  }, [])

  const isDifferentTz = userTimezone !== 'America/Argentina/Buenos_Aires'
  
  // Dynamic Config State
  const [errors, setErrors] = useState<{ name?: string, phone?: string }>({})
  const [config, setConfig] = useState<{
    price: number,
    duration: number,
    depositPercentage: number,
    paymentAlias: string | null,
    paymentCbu: string | null,
    paymentHolder: string | null,
  } | null>(null)
  const [aliasCopied, setAliasCopied] = useState(false)

  const copyAlias = async () => {
    if (!config?.paymentAlias) return
    try {
      await navigator.clipboard.writeText(config.paymentAlias)
      setAliasCopied(true)
      toast.success('Alias copiado')
      setTimeout(() => setAliasCopied(false), 2000)
    } catch {
      toast.error('No se pudo copiar')
    }
  }

  useEffect(() => {
      setIsMounted(true)
      getPublicConfig().then(setConfig)
  }, [])

  // Restore state from URL if returning from Auth
  useEffect(() => {
    const dateParam = searchParams.get('date')
    const slotParam = searchParams.get('slot')
    const doubleParam = searchParams.get('double')

    if (dateParam && slotParam && status === 'authenticated') {
        const date = parseISO(dateParam)

        // Only update if different to avoid loops (though dependency fix helps more)
        if (!selectedDate || selectedDate.getTime() !== date.getTime()) {
            if (doubleParam === '1') setDoubleSession(true)
            setDate(date)
            setSlot(slotParam)
            setStep('details')

            // Clear URL params to prevent "locking" the date selection
            // Using window.history.replaceState to avoid a full router refresh/flicker
            window.history.replaceState({}, '', window.location.pathname)
        }
    }
  }, [searchParams, status, setDate, setSlot, setStep, setDoubleSession, selectedDate]) // Added selectedDate to dep array to satisfy linter but added logic check inside

  useEffect(() => {
    if (session?.user?.phoneNumber && !phoneNumber) {
      setPhoneNumber(session.user.phoneNumber as Value)
    }
  }, [session, phoneNumber])

  useEffect(() => {
    if (selectedDate) {
      setLoadingSlots(true)
      getAvailability(selectedDate.toISOString(), appointmentType)
        .then((data) => {
          setSlots(data.slots)
          setLoadingSlots(false)
        })
        .catch(() => setLoadingSlots(false))
    }
  }, [selectedDate, appointmentType])

  const rightColumnRef = useRef<HTMLDivElement | null>(null)
  const prevStepRef = useRef(step)

  // Mantener al usuario enfocado en cada paso del flujo (clave en mobile, donde la columna derecha queda debajo del calendario)
  useEffect(() => {
    const prev = prevStepRef.current
    prevStepRef.current = step
    // No hacer scroll en el primer render
    if (prev === step) return

    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768
    const targetId = step === 'confirmation' ? 'booking' : null

    setTimeout(() => {
      // En desktop, sólo confirmamos: vista completa de la sección de pago
      if (!isMobile) {
        if (targetId) {
          document.getElementById(targetId)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }
        return
      }
      // En mobile, llevamos al usuario al panel dinámico (columna derecha)
      if (rightColumnRef.current) {
        const rect = rightColumnRef.current.getBoundingClientRect()
        const offset = window.scrollY + rect.top - 16
        window.scrollTo({ top: offset, behavior: 'smooth' })
      }
    }, 120)
  }, [step])

  // Para sesión doble: verifica si el siguiente slot consecutivo (slot + duration) también está disponible
  const canDoubleSlot = (slot: string) => {
    if (!config) return false
    const slotMs = new Date(slot).getTime()
    const nextSlotMs = slotMs + config.duration * 60 * 1000
    return slots.some(s => new Date(s).getTime() === nextSlotMs)
  }

  const handleSlotClick = (slot: string) => {
    if (isDoubleSession && !canDoubleSlot(slot)) {
      toast.error('Este horario no permite sesión doble (el siguiente turno no está disponible)')
      return
    }

    if (status === 'unauthenticated') {
        // Trigger generic sign in, preserving state
        const params = new URLSearchParams()
        if (selectedDate) params.set('date', selectedDate.toISOString())
        params.set('slot', slot)
        if (isDoubleSession) params.set('double', '1')

        signIn('google', {
            callbackUrl: `${window.location.pathname}?${params.toString()}`
        })
        return
    }

    setSlot(slot)
    setStep('details')
  }

  const handleBooking = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!selectedDate || !selectedSlot) return

    if (!termsAccepted) {
      setShowTermsError(true)
      return
    }
    setShowTermsError(false)

    setBookingStatus('loading')
    setErrors({})
    
    const formData = new FormData(e.currentTarget)
    const name = formData.get('name') as string
    const newErrors: { name?: string, phone?: string } = {}

    // Validate Name
    if (!name || name.trim() === '') {
        newErrors.name = 'Por favor, ingresá tu nombre'
    }

    // Validate Phone
    if (!phoneNumber) {
        newErrors.phone = 'Por favor, ingresá tu celular'
    } else if (!isValidPhoneNumber(phoneNumber)) {
        newErrors.phone = 'El formato del teléfono es incorrecto'
    }

    if (Object.keys(newErrors).length > 0) {
        setErrors(newErrors)
        setBookingStatus('idle')
        return
    }

    // Append standard fields
    formData.set('phone', phoneNumber as string)
    formData.set('date', selectedSlot)
    formData.set('type', appointmentType)
    formData.set('isDouble', isDoubleSession ? 'true' : 'false')

    try {
      const res = await bookAppointment(formData)
      
      if (res.success) {
        setPaymentUrl(res.paymentUrl || null)
        setBookingStatus('success')
        setStep('confirmation')
      } else {
        if (res.error) {
             toast.error(res.error)
        }
        setBookingStatus('error')
      }
    } catch {
      setBookingStatus('error')
    }
  }

  // Show loading state if config not ready or not mounted
  if (!config || !isMounted) return <div className="py-24 flex justify-center"><Loader2 className="animate-spin text-teal-500" /></div>

  return (
    <section id="booking" className="py-24 bg-transparent">
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold font-display mb-4 tracking-tight text-white">Agendá tu Sesión</h2>
          <p className="text-neutral-400 max-w-lg mx-auto">
            Seleccioná el día y horario que mejor te quede para comenzar tu proceso de recuperación.
          </p>
        </div>
        
        <div className="bg-neutral-900/50 border border-neutral-800 rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col md:flex-row min-h-[500px] backdrop-blur-sm">
          
          {/* Left Column: Calendar */}
          <div className="w-full md:w-1/2 p-4 md:p-12 border-b md:border-b-0 md:border-r border-neutral-800 bg-white/5">
            <div className="flex flex-col">
              <header className="flex justify-between items-center mb-8">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-teal-500/10 flex items-center justify-center text-teal-500">
                    <CalendarIcon className="w-5 h-5" />
                  </div>
                  <h3 className="text-xl font-bold font-display text-white">
                    1. Fecha
                  </h3>
                </div>
              </header>

              <div className="calendar-container min-h-[340px] flex items-start justify-center">
                <DayPicker
                  mode="single"
                  selected={selectedDate}
                  onSelect={setDate}
                  disabled={{ before: startOfToday() }}
                  locale={es}
                  classNames={{
                    month: 'space-y-6',
                    month_caption: 'flex justify-center mb-10 text-lg font-bold capitalize h-8 items-center w-full text-white',
                    nav: 'flex items-center gap-1.5 absolute right-0 top-0 h-8 z-10',
                    nav_button: cn(
                      "h-8 w-8 bg-transparent p-0 transition-all hover:bg-teal-900/20 rounded-xl flex items-center justify-center border border-neutral-800 text-teal-400 relative z-20 cursor-pointer"
                    ),
                    month_grid: 'border-collapse',
                    weekdays: 'flex justify-between mb-4',
                    weekday: 'text-neutral-500 w-10 font-bold text-[0.7rem] uppercase tracking-widest text-center',
                    weeks: 'space-y-1',
                    week: 'flex w-full justify-between',
                    day: cn(
                      "h-10 w-10 p-0 font-medium transition-all duration-300 hover:scale-110 hover:shadow-md hover:bg-teal-500/20 hover:text-teal-400 rounded-full flex items-center justify-center relative cursor-pointer text-white"
                    ),
                    day_button: 'h-10 w-10 p-0 font-medium rounded-full flex items-center justify-center',
                    selected: 'bg-teal-600 text-white hover:bg-teal-600 hover:text-white shadow-lg shadow-teal-500/30',
                    today: 'text-teal-400 font-black after:content-[""] after:absolute after:bottom-1 after:w-1 after:h-1 after:bg-teal-400 after:rounded-full',
                    outside: 'text-neutral-700 opacity-50',
                    disabled: 'text-neutral-800 cursor-not-allowed opacity-30',
                  }}
                  components={{
                    Chevron: ({ orientation }) => {
                      return orientation === 'left' 
                        ? <ChevronLeft className="w-4 h-4" /> 
                        : <ChevronRight className="w-4 h-4" />
                    }
                  }}
                />
              </div>
            </div>
          </div>

          {/* Right Column: Dynamic Content */}
          <div ref={rightColumnRef} className="w-full md:w-1/2 p-4 md:p-12 flex flex-col bg-white/5 scroll-mt-4">
             <AnimatePresence mode="wait">
                {step === 'date' && (
                   <motion.div 
                     initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
                     className="flex flex-col h-full"
                   >
                     <div className="flex-1 flex flex-col justify-center items-center text-center space-y-8 p-6">
                        <div className="space-y-4 max-w-sm">
                            <h4 className="text-3xl font-bold font-display tracking-tight text-white">
                                Tu Recuperación<br/>
                                <span className="text-teal-400">Comienza Acá</span>
                            </h4>
                            <p className="text-neutral-400 leading-relaxed">
                                Sesiones personalizadas de Kinesiología y Terapia Manual para ayudarte a volver a moverte sin dolor.
                            </p>
                        </div>

                        <div className="grid grid-cols-2 gap-4 w-full max-w-sm">
                            <div className="p-4 rounded-2xl bg-teal-900/10 border border-teal-900/50 flex flex-col items-center justify-center gap-2">
                                <Clock className="w-6 h-6 text-teal-400" />
                                <div className="text-center">
                                    <span className="block text-sm font-medium text-neutral-400 uppercase tracking-wider text-[10px]">Duración</span>
                                    <span className="text-lg font-bold text-gray-200">{config.duration} min</span>
                                </div>
                            </div>
                            <div className="p-4 rounded-2xl bg-teal-900/10 border border-teal-900/50 flex flex-col items-center justify-center gap-2">
                                <span className="text-xl font-bold text-teal-400">$</span>
                                <div className="text-center">
                                    <span className="block text-sm font-medium text-neutral-400 uppercase tracking-wider text-[10px]">Inversion</span>
                                    <span className="text-lg font-bold text-gray-200">${config.price.toLocaleString('es-AR')}</span>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 text-sm text-neutral-500 animate-pulse">
                            <CalendarIcon className="w-4 h-4" />
                            <span>Seleccioná una fecha para continuar</span>
                        </div>
                     </div>
                   </motion.div>
                )}

                {step === 'slot' && (
                    <motion.div
                        key="slots"
                        initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                        className="flex flex-col h-full"
                    >
                        <header className="mb-8">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-teal-500/10 flex items-center justify-center text-teal-500">
                              <Clock className="w-5 h-5" />
                            </div>
                            <div>
                              <h3 className="text-xl font-bold font-display text-white">
                                2. Horarios
                              </h3>
                              <p className="text-sm text-neutral-400 font-medium">
                                {selectedDate && format(selectedDate, "eeee d 'de' MMMM", { locale: es })}
                              </p>
                            </div>
                          </div>
                        </header>

                        {/* Selector PRESENCIAL / VIRTUAL — visible siempre en el paso de horarios */}
                        <div className="mb-4 space-y-2">
                          <label className="block text-[10px] font-black uppercase tracking-widest text-neutral-400">
                            ¿Cómo querés la sesión?
                          </label>
                          <div className="grid grid-cols-2 gap-3">
                            <button
                              type="button"
                              onClick={() => { setAppointmentType('PRESENTIAL'); setSlot(null) }}
                              className={cn(
                                "relative p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 group",
                                appointmentType === 'PRESENTIAL'
                                  ? "border-teal-500 bg-teal-500/10 shadow-lg shadow-teal-500/10"
                                  : "border-neutral-800 bg-black/20 hover:border-neutral-600"
                              )}
                            >
                              <MapPin className={cn(
                                "w-6 h-6 transition-colors",
                                appointmentType === 'PRESENTIAL' ? "text-teal-400" : "text-neutral-500"
                              )} />
                              <div className="text-center">
                                <span className={cn(
                                  "block text-sm font-black uppercase tracking-wider transition-colors",
                                  appointmentType === 'PRESENTIAL' ? "text-teal-300" : "text-neutral-300"
                                )}>
                                  Consultorio
                                </span>
                                <span className="block text-[10px] text-neutral-500 mt-0.5 font-medium">Presencial</span>
                              </div>
                              {appointmentType === 'PRESENTIAL' && (
                                <span className="absolute top-2 right-2 text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-teal-500 text-white">✓</span>
                              )}
                            </button>
                            <button
                              type="button"
                              onClick={() => { setAppointmentType('VIRTUAL'); setSlot(null) }}
                              className={cn(
                                "relative p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 group",
                                appointmentType === 'VIRTUAL'
                                  ? "border-blue-500 bg-blue-500/10 shadow-lg shadow-blue-500/10"
                                  : "border-neutral-800 bg-black/20 hover:border-neutral-600"
                              )}
                            >
                              <Video className={cn(
                                "w-6 h-6 transition-colors",
                                appointmentType === 'VIRTUAL' ? "text-blue-400" : "text-neutral-500"
                              )} />
                              <div className="text-center">
                                <span className={cn(
                                  "block text-sm font-black uppercase tracking-wider transition-colors",
                                  appointmentType === 'VIRTUAL' ? "text-blue-300" : "text-neutral-300"
                                )}>
                                  Online
                                </span>
                                <span className="block text-[10px] text-neutral-500 mt-0.5 font-medium">Por videollamada</span>
                              </div>
                              {appointmentType === 'VIRTUAL' && (
                                <span className="absolute top-2 right-2 text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-blue-500 text-white">✓</span>
                              )}
                            </button>
                          </div>
                          {appointmentType === 'VIRTUAL' && (
                            <p className="text-[11px] text-blue-300/80 leading-relaxed bg-blue-500/5 border border-blue-500/20 rounded-xl p-2.5 flex gap-2">
                              <Video className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                              <span>Sesión por <b>Google Meet</b> — pago anticipado completo</span>
                            </p>
                          )}
                        </div>

                        {loadingSlots ? (
                            <div className="flex flex-col items-center justify-center py-12 space-y-4">
                                <Loader2 className="animate-spin h-10 w-10 text-teal-500" />
                                <p className="text-sm text-neutral-400 font-medium tracking-wide">Buscando disponibilidad...</p>
                            </div>
                        ) : slots.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 p-8 bg-black/20 rounded-[2rem] border border-dashed border-neutral-800">
                                <p className="text-neutral-500 font-medium mb-2 text-center">
                                  No hay horarios <span className="font-bold">{appointmentType === 'VIRTUAL' ? 'online' : 'presenciales'}</span> disponibles para esta fecha.
                                </p>
                                <p className="text-neutral-600 text-xs text-center mb-4">Probá cambiar el tipo arriba o elegir otro día.</p>
                                <Button variant="outline" onClick={() => setDate(undefined)} className="rounded-xl border-neutral-800 text-neutral-300 hover:bg-neutral-800 hover:text-white">Ver otros días</Button>
                            </div>
                        ) : (
                            <div className="flex flex-col gap-4 h-full">
                                {isDifferentTz && (
                                    <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs text-blue-300 leading-relaxed">
                                        <span className="font-bold">📍 Tu zona horaria: {userTimezone}</span>
                                        <br />
                                        Los horarios se muestran en tu hora local. En el consultorio son hora Argentina (ARG).
                                    </div>
                                )}

                                {/* Toggle Sesión Doble */}
                                <button
                                    type="button"
                                    onClick={() => setDoubleSession(!isDoubleSession)}
                                    className={cn(
                                      "flex items-center justify-between gap-3 p-3 rounded-2xl border transition-all text-left",
                                      isDoubleSession
                                        ? "border-teal-500 bg-teal-500/10"
                                        : "border-neutral-800 bg-black/20 hover:border-neutral-700"
                                    )}
                                >
                                    <div className="flex-1">
                                        <span className={cn(
                                          "block text-xs font-black uppercase tracking-wider",
                                          isDoubleSession ? "text-teal-300" : "text-neutral-300"
                                        )}>
                                            Sesión doble (60 min)
                                        </span>
                                        <span className="block text-[10px] text-neutral-500 mt-0.5">
                                            {isDoubleSession
                                              ? `Reservás 2 turnos consecutivos · Total ${ '$' + (config.price * 2).toLocaleString('es-AR')}`
                                              : 'Activá si querés una sesión extendida de 60 minutos'}
                                        </span>
                                    </div>
                                    <div className={cn(
                                      "relative w-10 h-6 rounded-full transition-colors shrink-0",
                                      isDoubleSession ? "bg-teal-500" : "bg-neutral-700"
                                    )}>
                                        <span className={cn(
                                          "absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-md transition-transform",
                                          isDoubleSession ? "translate-x-[18px]" : "translate-x-0.5"
                                        )} />
                                    </div>
                                </button>

                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 overflow-y-auto pr-2 max-h-[340px]">
                                    {slots.map((slot, index) => {
                                      const d = new Date(slot)
                                      const localTime = d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: userTimezone })
                                      const argTime = d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'America/Argentina/Buenos_Aires' })
                                      const endLocal = new Date(d.getTime() + config.duration * 2 * 60 * 1000)
                                          .toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: userTimezone })
                                      const slotDoubleable = canDoubleSlot(slot)
                                      const isDisabled = isDoubleSession && !slotDoubleable
                                      return (
                                        <button
                                            key={`${slot}-${index}`}
                                            onClick={() => !isDisabled && handleSlotClick(slot)}
                                            disabled={isDisabled}
                                            className={cn(
                                              "group relative p-5 rounded-2xl border transition-all duration-300 text-center",
                                              isDisabled
                                                ? "border-neutral-800 bg-neutral-900/40 opacity-40 cursor-not-allowed"
                                                : "border-neutral-800 bg-neutral-900 shadow-sm hover:shadow-md hover:border-teal-500 hover:bg-teal-900/20"
                                            )}
                                            title={isDisabled ? 'El siguiente turno no está libre' : undefined}
                                        >
                                            <span className={cn(
                                              "text-lg font-bold transition-colors",
                                              isDisabled ? "text-neutral-600" : "text-gray-200 group-hover:text-teal-400"
                                            )}>
                                              {isDoubleSession ? `${localTime} - ${endLocal}` : localTime}
                                            </span>
                                            {isDifferentTz && (
                                              <span className="block text-[10px] text-neutral-500 mt-0.5">{argTime} ARG</span>
                                            )}
                                            {!isDisabled && (
                                              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-teal-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                                            )}
                                        </button>
                                      )
                                    })}
                                </div>
                                <div className="mt-auto pt-4 p-4 rounded-[1.5rem] bg-teal-500/5 border border-teal-500/10 flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-teal-500 animate-pulse" />
                                        <span className="text-xs font-bold text-teal-400 uppercase tracking-wider">
                                          Sesión de {isDoubleSession ? config.duration * 2 : config.duration} min
                                        </span>
                                    </div>
                                    <span className="text-sm font-black text-gray-100">
                                        ${(config.price * (isDoubleSession ? 2 : 1)).toLocaleString('es-AR')}
                                    </span>
                                </div>
                            </div>
                        )}
                    </motion.div>
                )}

                {step === 'details' && (
                    <motion.div
                        key="form"
                        initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                        className="flex flex-col h-full"
                    >
                         <header className="mb-8">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-teal-500/10 flex items-center justify-center text-teal-500">
                                <User className="w-5 h-5" />
                              </div>
                              <div>
                                <h3 className="text-xl font-bold font-display tracking-tight text-white">
                                  3. Tus Datos
                                </h3>
                                <div className="mt-1 flex flex-wrap gap-3 text-[10px] font-black uppercase tracking-[0.1em] text-neutral-500">
                                   <span className="flex items-center gap-1">
                                      {selectedDate && format(selectedDate, 'dd/MM/yy')}
                                   </span>
                                   <span>•</span>
                                   <span className="flex items-center gap-1">
                                      {selectedSlot && new Date(selectedSlot).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: userTimezone })}
                                      {isDoubleSession && selectedSlot && (
                                        <>
                                          {' - '}
                                          {new Date(new Date(selectedSlot).getTime() + config.duration * 2 * 60 * 1000).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: userTimezone })}
                                        </>
                                      )} HS
                                      {isDifferentTz && selectedSlot && (
                                        <span className="text-neutral-600 ml-1 normal-case font-medium">
                                          ({new Date(selectedSlot).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'America/Argentina/Buenos_Aires' })} ARG)
                                        </span>
                                      )}
                                   </span>
                                   {isDoubleSession && (
                                     <>
                                       <span>•</span>
                                       <span className="text-teal-400">Sesión doble · 60 min</span>
                                     </>
                                   )}
                                </div>
                              </div>
                            </div>
                         </header>
                         
                         <form onSubmit={handleBooking} className="flex flex-col gap-6">
                              {/* Appointment Type Selector */}
                              {isMounted && (
                                <div className={cn(
                                  "flex items-center justify-between gap-3 p-3 rounded-2xl border-2",
                                  appointmentType === 'VIRTUAL'
                                    ? "border-blue-500/40 bg-blue-500/5"
                                    : "border-teal-500/40 bg-teal-500/5"
                                )}>
                                  <div className="flex items-center gap-2.5">
                                    {appointmentType === 'VIRTUAL'
                                      ? <Video className="w-5 h-5 text-blue-400" />
                                      : <MapPin className="w-5 h-5 text-teal-400" />}
                                    <div>
                                      <span className="block text-[10px] font-black uppercase tracking-wider text-neutral-400">Tipo de sesión</span>
                                      <span className={cn(
                                        "block text-sm font-bold",
                                        appointmentType === 'VIRTUAL' ? "text-blue-300" : "text-teal-300"
                                      )}>
                                        {appointmentType === 'VIRTUAL' ? 'Online (videollamada)' : 'Presencial (consultorio)'}
                                      </span>
                                    </div>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => { setSlot(null); setStep('slot') }}
                                    className="text-[10px] font-black uppercase tracking-wider text-neutral-400 hover:text-white px-2 py-1 rounded-lg hover:bg-neutral-800 transition-colors"
                                  >
                                    Cambiar
                                  </button>
                                </div>
                              )}
                              <div className="space-y-3">
                                 <label className={cn(
                                     "block text-xs font-black uppercase tracking-widest transition-colors",
                                     errors.name ? "text-red-500" : "text-neutral-400"
                                 )}>
                                     Nombre Completo
                                 </label>
                                 <div className="relative">
                                   <input 
                                     required 
                                     name="name" 
                                     defaultValue={session?.user?.name || ''}
                                     onChange={() => { if (errors.name) setErrors(prev => ({ ...prev, name: undefined })) }}
                                     className={cn(
                                         "w-full p-4 bg-black/20 border rounded-2xl focus:ring-2 outline-none transition-all focus:shadow-lg text-white placeholder:text-neutral-600",
                                         errors.name 
                                             ? "border-red-500 focus:ring-red-500 bg-red-500/5" 
                                             : "border-neutral-800 focus:ring-teal-500 focus:bg-black/40"
                                     )}
                                     placeholder="Juan Pérez" 
                                   />
                                   {errors.name && (
                                       <p className="text-[10px] font-bold text-red-500 mt-1.5 ml-1 uppercase tracking-wider animate-in fade-in slide-in-from-top-1">
                                           {errors.name}
                                       </p>
                                   )}
                                 </div>
                             </div>
                             <div className="space-y-3">
                                 <label className={cn(
                                     "block text-xs font-black uppercase tracking-widest transition-colors",
                                     errors.phone ? "text-red-500" : "text-neutral-400"
                                 )}>
                                     WhatsApp
                                 </label>
                                 <div className="relative">
                                   <PhoneInput
                                     name="phone"
                                     value={phoneNumber}
                                     onChange={(val: Value) => {
                                         setPhoneNumber(val);
                                         if (errors.phone) setErrors(prev => ({ ...prev, phone: undefined }));
                                     }}
                                     required
                                     placeholder="11 1234 5678"
                                     className={cn(
                                         "bg-black/20 border rounded-2xl focus-within:ring-2 transition-all focus-within:shadow-lg text-white placeholder:text-neutral-600",
                                         errors.phone 
                                             ? "border-red-500 focus-within:ring-red-500 bg-red-500/5" 
                                             : "border-neutral-800 focus-within:ring-teal-500"
                                     )}
                                   />
                                   {errors.phone && (
                                       <p className="text-[10px] font-bold text-red-500 mt-1.5 ml-1 uppercase tracking-wider animate-in fade-in slide-in-from-top-1">
                                           {errors.phone}
                                       </p>
                                   )}
                                 </div>
                             </div>
                             
                                 <div className="bg-black/20 p-5 rounded-2xl border border-neutral-800 space-y-3">
                                     <div className="flex justify-between items-center">
                                         <span className="text-sm text-neutral-400 font-medium">
                                           {isDoubleSession ? `Sesión doble (2 x ${config.duration} min)` : 'Valor de la sesión'}
                                         </span>
                                         <span className="text-lg font-bold text-white">${(config.price * (isDoubleSession ? 2 : 1)).toLocaleString('es-AR')}</span>
                                     </div>
                                     {appointmentType === 'VIRTUAL' ? (
                                       <div className="flex justify-between items-center">
                                           <div className="flex flex-col">
                                               <span className="text-sm text-neutral-400 font-medium">Pago completo (a pagar ahora)</span>
                                               <span className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider">Sesión virtual - pago anticipado</span>
                                           </div>
                                           <span className="text-lg font-bold text-teal-400">
                                              ${(config.price * (isDoubleSession ? 2 : 1)).toLocaleString('es-AR')}
                                           </span>
                                       </div>
                                     ) : (
                                       <>
                                         <div className="flex justify-between items-center">
                                             <div className="flex flex-col">
                                                 <span className="text-sm text-neutral-400 font-medium">Seña (a pagar ahora)</span>
                                                 <span className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider">Asegura tu lugar</span>
                                             </div>
                                             <span className="text-lg font-bold text-teal-400">
                                                ${(config.price * (config.depositPercentage / 100) * (isDoubleSession ? 2 : 1)).toLocaleString('es-AR')}
                                             </span>
                                         </div>
                                         <div className="pt-3 border-t border-neutral-800/50 flex justify-between items-center">
                                             <span className="text-xs font-medium text-neutral-500 italic">El saldo restante se abona el día de la sesión</span>
                                             <span className="text-xs font-bold text-neutral-500">
                                                ${(config.price * (1 - config.depositPercentage / 100) * (isDoubleSession ? 2 : 1)).toLocaleString('es-AR')}
                                             </span>
                                         </div>
                                         {config.paymentAlias && (
                                           <div className="mt-3 pt-3 border-t border-neutral-800/50 space-y-2">
                                              <p className="text-[10px] font-black uppercase tracking-widest text-teal-400">Para abonar el saldo restante</p>
                                              <button
                                                type="button"
                                                onClick={copyAlias}
                                                className="w-full flex items-center justify-between gap-2 p-3 rounded-xl bg-teal-500/10 border border-teal-500/30 hover:bg-teal-500/15 transition-colors"
                                              >
                                                <div className="text-left">
                                                  <span className="block text-[9px] font-bold uppercase tracking-wider text-teal-400/70">Alias MercadoPago</span>
                                                  <span className="block text-sm font-bold text-teal-300 select-all">{config.paymentAlias}</span>
                                                  {config.paymentHolder && (
                                                    <span className="block text-[10px] text-neutral-500 mt-0.5">A nombre de {config.paymentHolder}</span>
                                                  )}
                                                </div>
                                                {aliasCopied
                                                  ? <Check className="w-4 h-4 text-green-400 shrink-0" />
                                                  : <Copy className="w-4 h-4 text-teal-400 shrink-0" />}
                                              </button>
                                           </div>
                                         )}
                                       </>
                                     )}
                                 </div>

                                 <div className="space-y-6">
                                     <div className="space-y-3">
                                         <label className="block text-xs font-black uppercase tracking-widest text-neutral-400">Notas sobre la lesión / Motivo (Opcional)</label>
                                         <textarea 
                                             name="patientNotes"
                                             rows={3}
                                             className="w-full p-4 bg-black/20 border border-neutral-800 rounded-2xl focus:ring-2 ring-teal-500 focus:bg-transparent outline-none transition-all resize-none text-sm text-white placeholder:text-neutral-600"
                                             placeholder="Describí brevemente tu dolor o motivo de consulta..."
                                         />
                                     </div>

                                     <div className="space-y-3">
                                         <label className="block text-xs font-black uppercase tracking-widest text-neutral-400 flex justify-between">
                                             <span>Adjuntar estudios (PDF/Imagen)</span>
                                             <span className="text-[10px] font-bold opacity-50">Hasta 5 · MÁX 5MB c/u</span>
                                         </label>
                                         <div className="p-4 bg-black/20 border border-neutral-800 rounded-2xl">
                                             <input
                                                 type="file"
                                                 name="medicalFiles"
                                                 accept=".pdf,.jpg,.jpeg,.png"
                                                 multiple
                                                 onChange={(e) => {
                                                     const files = Array.from(e.target.files || [])
                                                     if (files.length > 5) {
                                                         toast.error('Podés subir hasta 5 archivos por turno')
                                                         e.target.value = ''
                                                         return
                                                     }
                                                     const tooBig = files.find(f => f.size > 5 * 1024 * 1024)
                                                     if (tooBig) {
                                                         toast.error(`"${tooBig.name}" supera los 5MB`)
                                                         e.target.value = ''
                                                         return
                                                     }
                                                     if (files.length > 0) {
                                                         toast.success(`${files.length} archivo${files.length === 1 ? '' : 's'} seleccionado${files.length === 1 ? '' : 's'}`)
                                                     }
                                                 }}
                                                 className="w-full text-sm text-neutral-500
                                                 file:mr-4 file:py-2 file:px-4
                                                 file:rounded-xl file:border-0
                                                 file:text-xs file:font-black file:uppercase
                                                 file:bg-teal-500/10 file:text-teal-400
                                                 hover:file:bg-teal-500/20
                                                 cursor-pointer"
                                             />
                                             <p className="text-[10px] text-neutral-500 mt-2 italic">Podés seleccionar varios archivos a la vez (Ctrl/Cmd + click)</p>
                                         </div>
                                     </div>
                                 </div>

                                 <div className="flex items-center gap-3 px-1 my-4">
                                    <Checkbox 
                                        id="terms" 
                                        checked={termsAccepted}
                                        onCheckedChange={(checked) => {
                                            setTermsAccepted(checked as boolean)
                                            if (checked) setShowTermsError(false)
                                        }}
                                        className={cn(showTermsError && "border-red-500")}
                                    />
                                    <div className="space-y-1 leading-none">
                                        <label
                                            htmlFor="terms"
                                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-neutral-400"
                                        >
                                            He leído y acepto la{' '}
                                            <Dialog>
                                                <DialogTrigger asChild>
                                                    <span className="text-teal-400 hover:underline cursor-pointer font-bold">
                                                        Política de Cancelación
                                                    </span>
                                                </DialogTrigger>
                                                <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
                                                    <DialogHeader>
                                                        <DialogTitle>Política de Cancelación</DialogTitle>
                                                        <DialogDescription className="whitespace-pre-wrap mt-4 text-left">
                                                            {CANCELLATION_POLICY_TEXT}
                                                        </DialogDescription>
                                                    </DialogHeader>
                                                </DialogContent>
                                            </Dialog>
                                            .
                                        </label>
                                        {showTermsError && (
                                            <p className="text-xs text-red-500 font-medium">
                                                Debes aceptar la política de cancelación para continuar.
                                            </p>
                                        )}
                                    </div>
                                 </div>

                                 <div className="mb-6 p-4 rounded-xl bg-orange-900/10 border border-orange-800/50 flex gap-3 text-orange-200/90 text-xs leading-relaxed">
                                    <AlertTriangle className="w-5 h-5 shrink-0 text-orange-400" />
                                    <p>
                                        <span className="font-bold block mb-1 uppercase tracking-wide text-orange-300">Importante: 24hs de Anticipación</span>
                                        Recordá que tenés hasta 24hs antes para cancelar o reprogramar el turno. De no poder asistir o no avisar a tiempo, <span className="font-bold">la seña se perderá.</span>
                                    </p>
                                 </div>

                                 <div className="flex flex-col sm:flex-row gap-4 mt-2">
                                     <Button type="button" variant="ghost" onClick={() => setStep('slot')} className="flex-1 h-14 rounded-2xl font-bold text-neutral-500 hover:text-white hover:bg-neutral-800">
                                         Atrás
                                     </Button>
                                 <Button type="submit" disabled={bookingStatus === 'loading'} className="flex-[2] h-14 rounded-2xl font-bold shadow-xl shadow-teal-500/20 bg-teal-600 hover:bg-teal-700 text-white">
                                     {bookingStatus === 'loading' ? <Loader2 className="animate-spin mr-2" /> : null}
                                     {session?.user?.phoneNumber ? 'Confirmar Reserva' : 'Guardar y Reservar'}
                                 </Button>
                             </div>
                             <div className="mx-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300/80 leading-relaxed">
                               <span className="font-bold">⚠️ Pacientes menores de 18 años:</span> deben concurrir acompañados por un padre o tutor con DNI. El tutor deberá firmar el consentimiento informado al inicio de la primera sesión.
                             </div>
                             <p className="text-[10px] text-center text-neutral-500/80 px-4 leading-relaxed italic">
                                Al confirmar, serás redirigido para realizar el pago de la seña y asegurar tu lugar en la agenda.
                             </p>
                         </form>
                    </motion.div>
                )}

                {step === 'confirmation' && (
                    <motion.div
                         key="confirmation"
                         initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                         className="flex flex-col items-center justify-center h-full text-center space-y-10 p-4"
                    >
                        <div className="relative">
                           <div className="absolute inset-0 bg-green-500 blur-[60px] opacity-20 animate-pulse" />
                           <div className="relative w-28 h-28 bg-green-500/20 rounded-full flex items-center justify-center border-2 border-green-500/30">
                              <CheckCircle2 className="w-14 h-14 text-green-500" />
                           </div>
                        </div>
                        
                        <div>
                          <h3 className="text-3xl font-bold mb-3 tracking-tight text-white">¡Casi listo!</h3>
                          <div className="flex justify-center mb-4">
                            {!isExpired && (
                                <BookingTimer 
                                    durationMinutes={15} 
                                    onExpire={() => setIsExpired(true)} 
                                />
                            )}
                          </div>
                          <p className="text-neutral-400 max-w-sm mx-auto leading-relaxed">
                            Hemos reservado {isDoubleSession ? 'tus 2 turnos consecutivos' : 'tu lugar'} temporalmente. Completá el pago de {appointmentType === 'VIRTUAL' ? 'la sesión' : 'la seña'} para confirmar definitivamente {isDoubleSession ? 'tus turnos' : 'tu turno'}.
                          </p>
                          {appointmentType !== 'VIRTUAL' && config.paymentAlias && (
                            <div className="mt-4 mx-auto max-w-sm p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-left">
                              <p className="text-[10px] font-black uppercase tracking-widest text-amber-400 mb-1">Para el 50% restante</p>
                              <p className="text-sm font-bold text-amber-300 select-all">{config.paymentAlias}</p>
                              {config.paymentHolder && (
                                <p className="text-[10px] text-neutral-500 mt-0.5">A nombre de {config.paymentHolder}</p>
                              )}
                            </div>
                          )}
                        </div>

                        <div className="w-full space-y-4">
                          {paymentUrl && !isExpired && (
                              <Button size="lg" className="h-16 w-full text-lg font-bold rounded-2xl shadow-2xl shadow-green-500/20 bg-green-600 hover:bg-green-700 active:scale-95 transition-transform text-white" onClick={() => window.open(paymentUrl, '_blank')}>
                                  {appointmentType === 'VIRTUAL' ? 'Pagar con Mercado Pago' : 'Pagar Seña con Mercado Pago'}
                              </Button>
                          )}

                          {isExpired && (
                              <div className="p-4 bg-red-900/10 border border-red-900/30 rounded-2xl text-red-400 font-medium text-sm">
                                  El tiempo de reserva ha expirado. Por favor, selecciona un horario nuevamente.
                              </div>
                          )}
                           <Button variant="ghost" className="w-full text-neutral-400 hover:text-white font-bold hover:bg-neutral-800" onClick={() => {
                               setDate(undefined);
                               setSlot(null);
                               setDoubleSession(false);
                               setStep('date');
                           }}>
                               Empezar de nuevo
                           </Button>
                        </div>
                    </motion.div>
                )}
             </AnimatePresence>
          </div>
        </div>
      </div>
    </section>
  )
}
