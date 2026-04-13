import { getRecurringSlots, getWorkSchedule } from '../actions'
import { RecurringSlotManager } from './RecurringSlotManager'

export default async function TurnosFijosPage() {
  const [slots, schedule] = await Promise.all([
    getRecurringSlots(),
    getWorkSchedule()
  ])

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
          Configurar turnos recurrentes para pacientes regulares. Estos horarios se bloquean automáticamente en la agenda.
        </p>
      </div>
      <RecurringSlotManager initialSlots={slots} schedule={serializedSchedule} />
    </div>
  )
}
