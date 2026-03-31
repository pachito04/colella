import { getGlobalSettings, getWorkSchedule, getAvailabilityOverrides, getBlockoutDates } from "../actions"
import { SettingsManager } from "./SettingsManager"

export default async function SettingsPage() {
  const settings = await getGlobalSettings()
  const schedule = await getWorkSchedule()
  const overrides = await getAvailabilityOverrides()
  const blockoutDates = await getBlockoutDates()
  
  // Serialize for Client Component
  const serializedSettings = {
      ...settings,
      currentPrice: Number(settings.currentPrice), // Decimal to Number
      // sessionDuration is Int
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
      <h1 className="text-3xl font-bold font-display">Configuración</h1>
      <p className="text-gray-500">Gestiona precios, horarios y excepciones.</p>
      
      <SettingsManager 
        initialSettings={serializedSettings}
        initialSchedule={schedule}
        initialOverrides={serializedOverrides}
        initialBlockoutDates={serializedBlockouts}
      />
    </div>
  )
}

