import { getRecurringSlots, getWorkSchedule } from '../actions'
import { RecurringSlotManager } from './RecurringSlotManager'
import { prisma } from '@/lib/prisma'

export default async function TurnosFijosPage() {
  const [slots, schedule] = await Promise.all([
    getRecurringSlots(),
    getWorkSchedule()
  ])

  // Fetch exceptions for each slot
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const exceptions = await prisma.recurringSlotException.findMany({
    where: { date: { gte: today } },
    orderBy: { date: 'asc' }
  })

  const slotsWithExceptions = slots.map((s: any) => ({
    ...s,
    exceptions: exceptions
      .filter((e: any) => e.recurringSlotId === s.id)
      .map((e: any) => ({ id: e.id, date: e.date.toISOString(), reason: e.reason }))
  }))

  const serializedSchedule = schedule.map((s: any) => ({
    dayOfWeek: s.dayOfWeek,
    startTime: s.startTime,
    endTime: s.endTime,
    isActive: s.isActive,
  }))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold font-display">Turnos Fijos Semanales</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          Configurar turnos recurrentes para pacientes regulares. Estos horarios se bloquean automaticamente en la agenda.
          Podes agregar excepciones para dias que se saltean.
        </p>
      </div>
      <RecurringSlotManager initialSlots={slotsWithExceptions} schedule={serializedSchedule} />
    </div>
  )
}
