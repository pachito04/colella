'use client'

import { useState } from 'react'
import { format, parseISO } from "date-fns"
import { es } from "date-fns/locale"
import { Calendar, User, Clock, Phone, Mail, CheckCircle, AlertCircle, Clock3 } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

type Appointment = {
  id: string
  datetime: string
  status: 'CONFIRMED' | 'PENDING' | 'CANCELLED'
  patient: {
    name: string | null
    email: string | null
    phoneNumber: string | null
  }
  patientNotes?: string | null
  medicalReportUrl?: string | null
  medicalFile?: {
    originalName: string
    size: number
  } | null
}

interface AppointmentManagerProps {
  appointments: Appointment[]
}

export function AppointmentManager({ appointments }: AppointmentManagerProps) {
  
  const renderAppointmentList = (filteredAppointments: Appointment[], emptyMessage: string) => {
    if (filteredAppointments.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-24 bg-white dark:bg-neutral-800 rounded-3xl border-2 border-dashed border-gray-200 dark:border-neutral-800">
           <div className="h-16 w-16 bg-gray-50 dark:bg-neutral-900 rounded-full flex items-center justify-center mb-4">
              <Calendar className="h-8 w-8 text-gray-300" />
           </div>
           <p className="text-gray-400 font-medium text-lg">{emptyMessage}</p>
        </div>
      )
    }

    // Group by date
    const grouped = filteredAppointments.reduce((acc: any, app: any) => {
        const dateStr = format(parseISO(app.datetime), 'yyyy-MM-dd')
        if (!acc[dateStr]) acc[dateStr] = []
        acc[dateStr].push(app)
        return acc
    }, {} as Record<string, Appointment[]>)

    const sortedDates = Object.keys(grouped).sort()

    return (
        <div className="space-y-10">
            {sortedDates.map(dateStr => (
                <div key={dateStr} className="space-y-4">
                    <div className="flex items-center gap-3 ml-2">
                        <div className="h-2 w-2 rounded-full bg-teal-500" />
                        <h3 className="font-bold capitalize text-xl tracking-tight text-gray-800 dark:text-neutral-200">
                            {format(parseISO(dateStr), "EEEE d 'de' MMMM", { locale: es })}
                        </h3>
                    </div>

                    <div className="bg-white dark:bg-neutral-900 rounded-[2rem] shadow-sm border border-gray-100 dark:border-neutral-800 overflow-hidden divide-y dark:divide-neutral-800">
                        {grouped[dateStr].sort((a: Appointment, b: Appointment) => a.datetime.localeCompare(b.datetime)).map((app: Appointment) => (
                            <div key={app.id} className="group p-6 sm:px-8 flex flex-col sm:flex-row sm:items-center justify-between gap-6 hover:bg-teal-50/30 dark:hover:bg-teal-900/5 transition-all">
                                <div className="flex gap-6 items-center">
                                    <div className="flex flex-col items-center justify-center bg-teal-50 dark:bg-teal-900/20 text-teal-700 dark:text-teal-300 rounded-2xl w-20 h-20 shrink-0 border border-teal-100/50 dark:border-teal-800/30 group-hover:scale-105 transition-transform shadow-sm">
                                        <Clock className="h-4 w-4 mb-1 opacity-60" />
                                        <span className="text-xl font-black leading-none tracking-tight">
                                            {format(parseISO(app.datetime), 'HH:mm')}
                                        </span>
                                    </div>
                                    <div className="space-y-3">
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <p className="font-extrabold text-xl text-gray-900 dark:text-white leading-tight">
                                                    {app.patient.name || 'Sin nombre'}
                                                </p>
                                            </div>
                                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1">
                                                <span className="flex items-center gap-1.5 text-sm text-gray-500 font-medium">
                                                    <Mail className="h-3.5 w-3.5 opacity-60" />
                                                    {app.patient.email}
                                                </span>
                                                {app.patient.phoneNumber && (
                                                    <span className="flex items-center gap-1.5 text-sm font-bold text-teal-600 dark:text-teal-400">
                                                        <Phone className="h-3.5 w-3.5" />
                                                        {app.patient.phoneNumber}
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {(app.patientNotes || app.medicalReportUrl) && (
                                            <div className="p-3 bg-gray-50 dark:bg-neutral-800 rounded-xl border border-gray-100 dark:border-neutral-700 text-sm max-w-md">
                                                <p className="font-bold text-gray-700 dark:text-gray-300 mb-1 text-xs uppercase tracking-wide">Información Médica</p>
                                                {app.patientNotes && (
                                                    <p className="text-gray-600 dark:text-gray-400 mb-2 italic">"{app.patientNotes}"</p>
                                                )}
                                                {app.medicalReportUrl && (
                                                    <a 
                                                        href={app.medicalReportUrl} 
                                                        target="_blank" 
                                                        rel="noopener noreferrer"
                                                        download
                                                        className="inline-flex items-center gap-2 text-teal-600 dark:text-teal-400 font-bold hover:underline text-xs"
                                                    >
                                                        <span>📄 {app.medicalFile?.originalName || 'Ver Estudio Adjunto'}</span>
                                                    </a>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="flex items-center justify-between sm:justify-end gap-4 border-t sm:border-t-0 pt-4 sm:pt-0 border-gray-100 dark:border-neutral-800">
                                    <div className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-black uppercase tracking-widest border
                                        ${app.status === 'CONFIRMED' ? 'bg-green-50 text-green-700 border-green-200/50 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800/30' : 
                                          app.status === 'PENDING' ? 'bg-amber-50 text-amber-700 border-amber-200/50 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800/30' : 
                                          'bg-rose-50 text-rose-700 border-rose-200/50 dark:bg-rose-900/20 dark:text-rose-400 dark:border-rose-800/30'}`}>
                                        {app.status === 'CONFIRMED' && <CheckCircle className="h-3.5 w-3.5" />}
                                        {app.status === 'PENDING' && <Clock3 className="h-3.5 w-3.5" />}
                                        {app.status === 'CANCELLED' && <AlertCircle className="h-3.5 w-3.5" />}
                                        {app.status}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    )
  }

  return (
    <Tabs defaultValue="confirmed" className="w-full">
      <div className="flex items-center justify-between mb-8">
          <TabsList className="h-12 p-1 bg-gray-100/50 dark:bg-neutral-900 rounded-xl">
            <TabsTrigger value="confirmed" className="h-10 rounded-lg px-4 gap-2 data-[state=active]:bg-white data-[state=active]:text-teal-700 data-[state=active]:shadow-sm">
                <CheckCircle className="w-4 h-4" />
                Confirmados
            </TabsTrigger>
            <TabsTrigger value="pending" className="h-10 rounded-lg px-4 gap-2 data-[state=active]:bg-white data-[state=active]:text-amber-700 data-[state=active]:shadow-sm">
                <Clock3 className="w-4 h-4" />
                Pendientes
            </TabsTrigger>
             <TabsTrigger value="cancelled" className="h-10 rounded-lg px-4 gap-2 data-[state=active]:bg-white data-[state=active]:text-rose-700 data-[state=active]:shadow-sm">
                <AlertCircle className="w-4 h-4" />
                Cancelados
            </TabsTrigger>
          </TabsList>
      </div>

      <TabsContent value="confirmed" className="mt-0">
         {renderAppointmentList(appointments.filter(a => a.status === 'CONFIRMED'), 'No hay turnos confirmados próximos')}
      </TabsContent>
      
      <TabsContent value="pending" className="mt-0">
         {renderAppointmentList(appointments.filter(a => a.status === 'PENDING'), 'No hay turnos pendientes')}
      </TabsContent>

      <TabsContent value="cancelled" className="mt-0">
         {renderAppointmentList(appointments.filter(a => a.status === 'CANCELLED'), 'No hay turnos cancelados recientemente')}
      </TabsContent>
    </Tabs>
  )
}
