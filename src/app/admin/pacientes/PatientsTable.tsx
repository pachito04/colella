'use client'

import { useState } from 'react'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { Search, X, User, Phone, Mail, Calendar, FileText, ChevronRight } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'

type Appointment = {
  id: string
  datetime: string
  status: 'CONFIRMED' | 'PENDING' | 'CANCELLED'
  type: 'PRESENTIAL' | 'VIRTUAL'
  depositPaid: boolean
  patientNotes?: string | null
  medicalReportUrl?: string | null
  medicalFile?: {
    originalName: string
    size: number
  } | null
  meetLink?: string | null
}

type Patient = {
  id: string
  name: string | null
  email: string | null
  phoneNumber: string | null
  createdAt: string
  appointments: Appointment[]
}

export function PatientsTable({ patients }: { patients: Patient[] }) {
  const [selected, setSelected] = useState<Patient | null>(null)
  const [search, setSearch] = useState('')
  const router = useRouter()

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    router.push(`/admin/pacientes?q=${encodeURIComponent(search)}`)
  }

  const statusLabel: Record<string, string> = {
    CONFIRMED: 'Confirmado',
    PENDING: 'Pendiente',
    CANCELLED: 'Cancelado',
  }

  const statusColor: Record<string, string> = {
    CONFIRMED: 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400',
    PENDING: 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400',
    CANCELLED: 'bg-rose-50 text-rose-700 dark:bg-rose-900/20 dark:text-rose-400',
  }

  return (
    <>
      {/* Search */}
      <form onSubmit={handleSearch} className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar por nombre, email o teléfono..."
          className="w-full pl-10 pr-4 py-3 rounded-xl bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-700 text-sm focus:outline-none focus:border-teal-500/50 transition-colors"
        />
      </form>

      {/* Table */}
      <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-gray-100 dark:border-neutral-800 overflow-hidden">
        <div className="divide-y divide-gray-100 dark:divide-neutral-800">
          {patients.length === 0 && (
            <div className="py-16 text-center text-gray-400">No se encontraron pacientes</div>
          )}
          {patients.map(patient => {
            const confirmed = patient.appointments.filter(a => a.status === 'CONFIRMED').length
            const last = patient.appointments[0]
            return (
              <button
                key={patient.id}
                onClick={() => setSelected(patient)}
                className="w-full flex items-center justify-between px-6 py-4 hover:bg-teal-50/30 dark:hover:bg-teal-900/5 transition-colors text-left"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center shrink-0">
                    <User className="h-5 w-5 text-teal-600 dark:text-teal-400" />
                  </div>
                  <div>
                    <p className="font-bold text-gray-900 dark:text-white">{patient.name || 'Sin nombre'}</p>
                    <div className="flex gap-3 mt-0.5">
                      {patient.phoneNumber && (
                        <span className="text-xs text-teal-600 dark:text-teal-400 flex items-center gap-1">
                          <Phone className="h-3 w-3" />{patient.phoneNumber}
                        </span>
                      )}
                      <span className="text-xs text-gray-400 flex items-center gap-1">
                        <Mail className="h-3 w-3" />{patient.email}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-right hidden sm:block">
                    <p className="text-sm font-bold text-gray-700 dark:text-gray-300">{confirmed} sesiones</p>
                    {last && (
                      <p className="text-xs text-gray-400">
                        Última: {format(parseISO(last.datetime), "d MMM yyyy", { locale: es })}
                      </p>
                    )}
                  </div>
                  <ChevronRight className="h-4 w-4 text-gray-400" />
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Modal de historial */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-neutral-900 rounded-3xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-neutral-800">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center">
                  <User className="h-6 w-6 text-teal-600 dark:text-teal-400" />
                </div>
                <div>
                  <h2 className="text-xl font-extrabold text-gray-900 dark:text-white">{selected.name || 'Sin nombre'}</h2>
                  <div className="flex gap-3 mt-0.5">
                    {selected.phoneNumber && (
                      <span className="text-sm text-teal-600 dark:text-teal-400">{selected.phoneNumber}</span>
                    )}
                    <span className="text-sm text-gray-400">{selected.email}</span>
                  </div>
                </div>
              </div>
              <button onClick={() => setSelected(null)} className="p-2 hover:bg-gray-100 dark:hover:bg-neutral-800 rounded-xl transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Stats rápidas */}
            <div className="grid grid-cols-3 gap-3 p-6 border-b border-gray-100 dark:border-neutral-800">
              <div className="text-center">
                <p className="text-2xl font-black text-gray-900 dark:text-white">
                  {selected.appointments.filter(a => a.status === 'CONFIRMED').length}
                </p>
                <p className="text-xs text-gray-400">Confirmadas</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-black text-gray-900 dark:text-white">
                  {selected.appointments.filter(a => a.status === 'CANCELLED').length}
                </p>
                <p className="text-xs text-gray-400">Canceladas</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-black text-gray-900 dark:text-white">
                  {selected.appointments.filter(a => a.medicalReportUrl).length}
                </p>
                <p className="text-xs text-gray-400">Estudios</p>
              </div>
            </div>

            {/* Historial */}
            <div className="overflow-y-auto flex-1 p-6 space-y-3">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Historial de sesiones</p>
              {selected.appointments.length === 0 && (
                <p className="text-gray-400 text-sm text-center py-8">Sin sesiones registradas</p>
              )}
              {selected.appointments.map(app => (
                <div key={app.id} className="bg-gray-50 dark:bg-neutral-800 rounded-2xl p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-gray-400" />
                      <span className="font-bold text-sm text-gray-900 dark:text-white">
                        {format(parseISO(app.datetime), "EEEE d 'de' MMMM yyyy 'a las' HH:mm", { locale: es })}
                      </span>
                    </div>
                    <span className={`text-xs font-bold px-3 py-1 rounded-full ${statusColor[app.status]}`}>
                      {statusLabel[app.status]}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-xs text-gray-400 bg-gray-100 dark:bg-neutral-700 px-2 py-1 rounded-lg">
                      {app.type === 'PRESENTIAL' ? '🏥 Presencial' : '💻 Virtual'}
                    </span>
                    {app.depositPaid && (
                      <span className="text-xs text-green-600 bg-green-50 dark:bg-green-900/20 px-2 py-1 rounded-lg">
                        💰 Seña abonada
                      </span>
                    )}
                  </div>
                  {app.patientNotes && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 italic">"{app.patientNotes}"</p>
                  )}
                  {app.medicalReportUrl && (
                    <a
                      href={app.medicalReportUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      download
                      className="inline-flex items-center gap-1.5 text-xs text-teal-600 dark:text-teal-400 font-bold hover:underline"
                    >
                      <FileText className="h-3.5 w-3.5" />
                      {app.medicalFile?.originalName || 'Ver estudio adjunto'}
                    </a>
                  )}
                  {app.meetLink && (
                    <a
                      href={app.meetLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs text-blue-600 dark:text-blue-400 font-bold hover:underline"
                    >
                      💻 Abrir Google Meet
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
