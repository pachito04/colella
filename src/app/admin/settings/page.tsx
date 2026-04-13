import { getGlobalSettings, getWorkSchedule, getAvailabilityOverrides, getBlockoutDates, getBlockoutSlots } from "../actions"
import { SettingsManager } from "./SettingsManager"

export default async function SettingsPage() {
  const [settings, schedule, overrides, blockoutDates, blockoutSlots] = await Promise.all([
    getGlobalSettings(),
    getWorkSchedule(),
    getAvailabilityOverrides(),
    getBlockoutDates(),
    getBlockoutSlots(),
  ])

  const serializedSettings = {
      ...settings,
      currentPrice: Number(settings.currentPrice),
  }

  const serializedOverrides = overrides.map((ov: any) => ({
      ...ov,
      date: ov.date
  }))

  const serializedBlockouts = blockoutDates.map((bd: any) => ({
      ...bd,
      date: bd.date
  }))

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold font-display">Configuracion</h1>
      <p className="text-gray-500">Gestiona precios, horarios y excepciones.</p>

      <SettingsManager
        initialSettings={serializedSettings}
        initialSchedule={schedule}
        initialOverrides={serializedOverrides}
        initialBlockoutDates={serializedBlockouts}
        initialBlockoutSlots={blockoutSlots}
      />
    </div>
  )
}

