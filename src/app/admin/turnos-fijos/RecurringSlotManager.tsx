'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { toast } from 'sonner'
import { Trash2, Plus, Search, Clock, User, Repeat, CalendarOff, ChevronDown, ChevronUp } from 'lucide-react'
import { createRecurringSlot, deleteRecurringSlot, searchPatients, addRecurringSlotException, deleteRecurringSlotException } from '../actions'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

const DAY_NAMES = ['Domingo', 'Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado']

interface SlotException {
  id: string
  date: string
  reason: string | null
}

interface RecurringSlot {
  id: string
  dayOfWeek: number
  startTime: string
  isActive: boolean
  exceptions?: SlotException[]
  patient: { id: string; name: string | null; email: string; phoneNumber: string | null }
}

interface ScheduleDay {
  dayOfWeek: number
  startTime: string
  endTime: string
  isActive: boolean
}

interface Patient {
  id: string
  name: string | null
  email: string
  phoneNumber: string | null
}

export function RecurringSlotManager({
  initialSlots,
  schedule,
}: {
  initialSlots: RecurringSlot[]
  schedule: ScheduleDay[]
}) {
  const [slots, setSlots] = useState(initialSlots)
  const [isAdding, setIsAdding] = useState(false)
  const [selectedDay, setSelectedDay] = useState<number | null>(null)
  const [selectedTime, setSelectedTime] = useState('')
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Patient[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [expandedSlot, setExpandedSlot] = useState<string | null>(null)
  const [exceptionDate, setExceptionDate] = useState('')
  const [exceptionReason, setExceptionReason] = useState('')

  const activeDays = schedule.filter(s => s.isActive)

  const getTimeSlotsForDay = (dayOfWeek: number) => {
    const day = schedule.find(s => s.dayOfWeek === dayOfWeek)
    if (!day || !day.isActive) return []
    const [startH, startM] = day.startTime.split(':').map(Number)
    const [endH, endM] = day.endTime.split(':').map(Number)
    const result: string[] = []
    let h = startH, m = startM
    while (h < endH || (h === endH && m < endM)) {
      result.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`)
      m += 30
      if (m >= 60) { h++; m -= 60 }
    }
    return result
  }

  const isSlotTaken = (dayOfWeek: number, time: string) => {
    return slots.some(s => s.dayOfWeek === dayOfWeek && s.startTime === time)
  }

  const handleSearch = async (query: string) => {
    setSearchQuery(query)
    if (query.length < 2) { setSearchResults([]); return }
    setIsSearching(true)
    try {
      const results = await searchPatients(query)
      setSearchResults(results)
    } catch { toast.error('Error buscando pacientes') }
    setIsSearching(false)
  }

  const handleSave = async () => {
    if (selectedDay === null || !selectedTime || !selectedPatient) {
      toast.error('Completa todos los campos')
      return
    }
    setIsSaving(true)
    try {
      await createRecurringSlot({ dayOfWeek: selectedDay, startTime: selectedTime, patientId: selectedPatient.id })
      toast.success('Turno fijo creado')
      setSlots(prev => [...prev, {
        id: 'temp-' + Date.now(), dayOfWeek: selectedDay, startTime: selectedTime,
        isActive: true, patient: selectedPatient, exceptions: [],
      }])
      resetForm()
    } catch (err: any) { toast.error(err.message || 'Error al crear turno fijo') }
    setIsSaving(false)
  }

  const handleDelete = async (id: string) => {
    try {
      await deleteRecurringSlot(id)
      setSlots(prev => prev.filter(s => s.id !== id))
      toast.success('Turno fijo eliminado')
    } catch { toast.error('Error al eliminar') }
  }

  const handleAddException = async (slotId: string) => {
    if (!exceptionDate) { toast.error('Selecciona una fecha'); return }
    try {
      await addRecurringSlotException({
        recurringSlotId: slotId,
        date: new Date(exceptionDate + 'T12:00:00'),
        reason: exceptionReason || undefined,
      })
      toast.success('Excepcion agregada')
      setSlots(prev => prev.map(s => s.id === slotId ? {
        ...s,
        exceptions: [...(s.exceptions || []), { id: 'temp-' + Date.now(), date: exceptionDate, reason: exceptionReason || null }]
      } : s))
      setExceptionDate('')
      setExceptionReason('')
    } catch (err: any) { toast.error(err.message || 'Error al agregar excepcion') }
  }

  const handleDeleteException = async (slotId: string, exceptionId: string) => {
    try {
      await deleteRecurringSlotException(exceptionId)
      setSlots(prev => prev.map(s => s.id === slotId ? {
        ...s, exceptions: (s.exceptions || []).filter(e => e.id !== exceptionId)
      } : s))
      toast.success('Excepcion eliminada')
    } catch { toast.error('Error al eliminar excepcion') }
  }

  const resetForm = () => {
    setIsAdding(false)
    setSelectedDay(null)
    setSelectedTime('')
    setSelectedPatient(null)
    setSearchQuery('')
    setSearchResults([])
  }

  const slotsByDay = DAY_NAMES.map((name, index) => ({
    name, dayOfWeek: index,
    slots: slots.filter(s => s.dayOfWeek === index),
  })).filter(d => d.slots.length > 0 || activeDays.some(ad => ad.dayOfWeek === d.dayOfWeek))

  return (
    <div className="space-y-6">
      {slots.length === 0 ? (
        <Card className="p-8 text-center bg-white dark:bg-neutral-900 border-gray-100 dark:border-neutral-800">
          <Repeat className="w-12 h-12 text-gray-300 dark:text-neutral-700 mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400 font-medium">No hay turnos fijos configurados</p>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Crea turnos recurrentes para pacientes regulares</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {slotsByDay.filter(d => d.slots.length > 0).map(day => (
            <div key={day.dayOfWeek}>
              <h3 className="text-sm font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2 px-1">{day.name}</h3>
              <div className="grid gap-2">
                {day.slots.map(slot => (
                  <Card key={slot.id} className="bg-white dark:bg-neutral-900 border-gray-100 dark:border-neutral-800 overflow-hidden">
                    <div className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="p-2 rounded-lg bg-teal-50 dark:bg-teal-900/20 text-teal-600 dark:text-teal-400">
                          <Clock className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900 dark:text-gray-100">{slot.startTime} hs</p>
                          <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1">
                            <User className="w-3 h-3" />
                            {slot.patient.name || slot.patient.email}
                          </p>
                        </div>
                        {(slot.exceptions?.length || 0) > 0 && (
                          <span className="text-xs bg-amber-100 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 px-2 py-0.5 rounded-full font-medium">
                            {slot.exceptions!.length} excep.
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm"
                          className="text-gray-400 hover:text-gray-600"
                          onClick={() => setExpandedSlot(expandedSlot === slot.id ? null : slot.id)}>
                          <CalendarOff className="w-4 h-4 mr-1" />
                          {expandedSlot === slot.id ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                        </Button>
                        <Button variant="ghost" size="sm"
                          className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                          onClick={() => handleDelete(slot.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    {expandedSlot === slot.id && (
                      <div className="border-t border-gray-100 dark:border-neutral-800 p-4 bg-gray-50/50 dark:bg-neutral-950/50 space-y-3">
                        <p className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                          Excepciones (dias que se saltea este turno)
                        </p>

                        {(slot.exceptions || []).map(exc => (
                          <div key={exc.id} className="flex items-center justify-between bg-white dark:bg-neutral-900 p-3 rounded-xl border border-gray-100 dark:border-neutral-800">
                            <div>
                              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                {format(new Date(exc.date + (exc.date.includes('T') ? '' : 'T12:00:00')), "EEEE d 'de' MMMM yyyy", { locale: es })}
                              </p>
                              {exc.reason && <p className="text-xs text-gray-500">{exc.reason}</p>}
                            </div>
                            <Button variant="ghost" size="sm" className="text-red-400 hover:text-red-600"
                              onClick={() => handleDeleteException(slot.id, exc.id)}>
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        ))}

                        <div className="flex flex-col sm:flex-row gap-2">
                          <input type="date" value={exceptionDate} onChange={e => setExceptionDate(e.target.value)}
                            className="flex-1 p-2 rounded-xl border border-gray-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-gray-900 dark:text-gray-100 text-sm" />
                          <input type="text" value={exceptionReason} onChange={e => setExceptionReason(e.target.value)}
                            placeholder="Motivo (opcional)" className="flex-1 p-2 rounded-xl border border-gray-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-gray-900 dark:text-gray-100 text-sm" />
                          <Button size="sm" onClick={() => handleAddException(slot.id)} className="bg-amber-600 hover:bg-amber-700 text-white rounded-xl">
                            <Plus className="w-4 h-4 mr-1" /> Agregar
                          </Button>
                        </div>
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add New Slot */}
      {!isAdding ? (
        <Button onClick={() => setIsAdding(true)} className="bg-teal-600 hover:bg-teal-700 text-white rounded-xl">
          <Plus className="w-4 h-4 mr-2" /> Agregar Turno Fijo
        </Button>
      ) : (
        <Card className="p-6 bg-white dark:bg-neutral-900 border-gray-100 dark:border-neutral-800 space-y-5">
          <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">Nuevo Turno Fijo</h3>
          {/* Patient Search */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Paciente</label>
            {selectedPatient ? (
              <div className="flex items-center justify-between p-3 bg-teal-50 dark:bg-teal-900/10 rounded-xl border border-teal-200 dark:border-teal-800">
                <div>
                  <p className="font-semibold text-gray-900 dark:text-gray-100">{selectedPatient.name || selectedPatient.email}</p>
                  {selectedPatient.phoneNumber && <p className="text-sm text-gray-500">{selectedPatient.phoneNumber}</p>}
                </div>
                <Button variant="ghost" size="sm" onClick={() => { setSelectedPatient(null); setSearchQuery('') }} className="text-gray-400">Cambiar</Button>
              </div>
            ) : (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input type="text" value={searchQuery} onChange={(e) => handleSearch(e.target.value)}
                  placeholder="Buscar por nombre, email o telefono..."
                  className="w-full pl-10 p-3 rounded-xl border border-gray-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-gray-900 dark:text-gray-100 focus:ring-2 ring-teal-500 outline-none" />
                {searchResults.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-xl shadow-lg z-10 max-h-48 overflow-y-auto">
                    {searchResults.map(p => (
                      <button key={p.id} onClick={() => { setSelectedPatient(p); setSearchResults([]) }}
                        className="w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-neutral-700 border-b last:border-0 border-gray-100 dark:border-neutral-700">
                        <p className="font-medium text-gray-900 dark:text-gray-100">{p.name || 'Sin nombre'}</p>
                        <p className="text-xs text-gray-500">{p.email} {p.phoneNumber ? `- ${p.phoneNumber}` : ''}</p>
                      </button>
                    ))}
                  </div>
                )}
                {isSearching && <p className="text-xs text-gray-400 mt-1">Buscando...</p>}
              </div>
            )}
          </div>
          {/* Day Selection */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Dia de la semana</label>
            <div className="flex flex-wrap gap-2">
              {activeDays.map(day => (
                <button key={day.dayOfWeek} onClick={() => { setSelectedDay(day.dayOfWeek); setSelectedTime('') }}
                  className={cn("px-4 py-2 rounded-xl border text-sm font-medium transition-all",
                    selectedDay === day.dayOfWeek
                      ? "border-teal-500 bg-teal-50 dark:bg-teal-900/20 text-teal-700 dark:text-teal-400"
                      : "border-gray-200 dark:border-neutral-700 text-gray-600 dark:text-gray-400 hover:border-gray-300")}>
                  {DAY_NAMES[day.dayOfWeek]}
                </button>
              ))}
            </div>
          </div>
          {/* Time Selection */}
          {selectedDay !== null && (
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Horario</label>
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                {getTimeSlotsForDay(selectedDay).map(time => {
                  const taken = isSlotTaken(selectedDay, time)
                  return (
                    <button key={time} disabled={taken} onClick={() => setSelectedTime(time)}
                      className={cn("p-2 rounded-xl border text-sm font-medium transition-all",
                        taken ? "border-gray-200 dark:border-neutral-800 text-gray-300 dark:text-gray-600 cursor-not-allowed bg-gray-50 dark:bg-neutral-900"
                          : selectedTime === time ? "border-teal-500 bg-teal-50 dark:bg-teal-900/20 text-teal-700 dark:text-teal-400"
                          : "border-gray-200 dark:border-neutral-700 text-gray-600 dark:text-gray-400 hover:border-gray-300")}>
                      {time}
                    </button>
                  )
                })}
              </div>
            </div>
          )}
          <div className="flex gap-3 pt-2">
            <Button variant="ghost" onClick={resetForm} className="flex-1">Cancelar</Button>
            <Button onClick={handleSave} disabled={!selectedPatient || selectedDay === null || !selectedTime || isSaving}
              className="flex-[2] bg-teal-600 hover:bg-teal-700 text-white rounded-xl">
              {isSaving ? 'Guardando...' : 'Crear Turno Fijo'}
            </Button>
          </div>
        </Card>
      )}
    </div>
  )
}
