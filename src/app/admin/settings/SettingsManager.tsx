'use client'

import { useState, useEffect } from 'react'
import { updateGlobalSettings, updateWorkSchedule, addAvailabilityOverride, deleteAvailabilityOverride, addBlockoutDate, deleteBlockoutDate, getBlockoutSlots, addBlockoutSlot, deleteBlockoutSlot } from '../actions'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'
import { format, parseISO } from 'date-fns'
import { cn } from '@/lib/utils'


type Settings = {
    currentPrice: number
    sessionDuration: number
    depositPercentage: number
    depositFixedAmount?: number | null
    paymentAlias?: string | null
    paymentCbu?: string | null
    paymentHolder?: string | null
    vacationMessage?: string | null
}

type ScheduleType = 'PRESENTIAL' | 'VIRTUAL'
type Schedule = {
    dayOfWeek: number
    type?: ScheduleType
    startTime: string
    endTime: string
    isActive: boolean
}

type Override = {
    id: string
    date: Date
    startTime: string
    endTime: string
}

type Blockout = {
    id: string
    date: Date
    reason?: string | null
}

type BlockoutSlotType = {
    id: string
    date: string
    startTime: string
    reason?: string | null
}

export function SettingsManager({
    initialSettings,
    initialSchedule,
    initialOverrides,
    initialBlockoutDates,
    initialBlockoutSlots = []
}: {
    initialSettings: Settings,
    initialSchedule: Schedule[],
    initialOverrides: Override[],
    initialBlockoutDates: Blockout[],
    initialBlockoutSlots?: BlockoutSlotType[]
}) {
    const router = useRouter()
    
    // -- General Settings --
    const [settings, setSettings] = useState(initialSettings)
    const [isSavingSettings, setIsSavingSettings] = useState(false)
    // Modo de seña: 'PERCENT' (por %) o 'FIXED' (monto fijo). Deriva del valor guardado.
    const [depositMode, setDepositMode] = useState<'PERCENT' | 'FIXED'>(
        (initialSettings.depositFixedAmount != null && Number(initialSettings.depositFixedAmount) > 0) ? 'FIXED' : 'PERCENT'
    )

    const saveSettings = async () => {
        setIsSavingSettings(true)
        await updateGlobalSettings({
            currentPrice: Number(settings.currentPrice),
            sessionDuration: Number(settings.sessionDuration),
            depositPercentage: Number(settings.depositPercentage),
            // Si el modo es FIJO mandamos el monto; si es % mandamos null (usa el porcentaje)
            depositFixedAmount: depositMode === 'FIXED' ? Number(settings.depositFixedAmount || 0) : null,
            paymentAlias: settings.paymentAlias || null,
            paymentCbu: settings.paymentCbu || null,
            paymentHolder: settings.paymentHolder || null,
            vacationMessage: settings.vacationMessage || null,
        })
        setIsSavingSettings(false)
        router.refresh()
    }

    // -- Schedule --
    // Key: `${day}-${type}` -> allows independent ventanas para PRESENCIAL y VIRTUAL.
    const SCHEDULE_TYPES: ScheduleType[] = ['PRESENTIAL', 'VIRTUAL']
    const scheduleKey = (day: number, type: ScheduleType) => `${day}-${type}`
    const [schedule, setSchedule] = useState<Record<string, Schedule>>(() => {
        const map: Record<string, Schedule> = {}
        for (let i = 0; i <= 6; i++) {
            for (const t of SCHEDULE_TYPES) {
                const existing = initialSchedule.find(s => s.dayOfWeek === i && (s.type ?? 'PRESENTIAL') === t)
                map[scheduleKey(i, t)] = existing
                    ? { dayOfWeek: i, type: t, startTime: existing.startTime, endTime: existing.endTime, isActive: existing.isActive }
                    : { dayOfWeek: i, type: t, startTime: t === 'VIRTUAL' ? '09:00' : '13:00', endTime: t === 'VIRTUAL' ? '20:00' : '18:00', isActive: false }
            }
        }
        return map
    })
    const [isSavingSchedule, setIsSavingSchedule] = useState(false)
    const [scheduleSaveStatus, setScheduleSaveStatus] = useState<{ kind: 'idle' | 'ok' | 'err', msg?: string }>({ kind: 'idle' })

    // Re-sync from server data after refresh so admin sees what was actually persisted.
    useEffect(() => {
        setSchedule(() => {
            const map: Record<string, Schedule> = {}
            for (let i = 0; i <= 6; i++) {
                for (const t of SCHEDULE_TYPES) {
                    const existing = initialSchedule.find(s => s.dayOfWeek === i && (s.type ?? 'PRESENTIAL') === t)
                    map[scheduleKey(i, t)] = existing
                        ? { dayOfWeek: i, type: t, startTime: existing.startTime, endTime: existing.endTime, isActive: existing.isActive }
                        : { dayOfWeek: i, type: t, startTime: t === 'VIRTUAL' ? '09:00' : '13:00', endTime: t === 'VIRTUAL' ? '20:00' : '18:00', isActive: false }
                }
            }
            return map
        })
    }, [initialSchedule])

    const handleScheduleChange = (day: number, type: ScheduleType, field: keyof Schedule, value: any) => {
        const k = scheduleKey(day, type)
        setSchedule(prev => ({
            ...prev,
            [k]: { ...prev[k], [field]: value }
        }))
        setScheduleSaveStatus({ kind: 'idle' })
    }

    const saveSchedule = async () => {
        setIsSavingSchedule(true)
        setScheduleSaveStatus({ kind: 'idle' })
        try {
            // Validar inputs antes de enviar — un endTime <= startTime guarda silenciosamente y rompe getAvailability.
            for (const row of Object.values(schedule)) {
                if (!row.isActive) continue
                if (!row.startTime || !row.endTime) {
                    throw new Error(`Faltan horarios en ${DAYS[row.dayOfWeek]} (${row.type === 'VIRTUAL' ? 'Virtual' : 'Presencial'})`)
                }
                if (row.startTime >= row.endTime) {
                    throw new Error(`En ${DAYS[row.dayOfWeek]} (${row.type === 'VIRTUAL' ? 'Virtual' : 'Presencial'}) el horario de inicio debe ser anterior al de fin.`)
                }
            }
            await updateWorkSchedule(Object.values(schedule))
            setScheduleSaveStatus({ kind: 'ok', msg: 'Horarios guardados correctamente.' })
            router.refresh()
        } catch (err: any) {
            console.error('Schedule save error:', err)
            setScheduleSaveStatus({ kind: 'err', msg: err?.message || 'Error guardando horarios. Volvé a intentar.' })
        } finally {
            setIsSavingSchedule(false)
        }
    }

    const DAYS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']

    // -- Overrides --
    const [overrides, setOverrides] = useState(initialOverrides)
    const [newOverride, setNewOverride] = useState({ date: '', startTime: '09:00', endTime: '18:00' })
    const [isAddingOverride, setIsAddingOverride] = useState(false)
    const [dateError, setDateError] = useState<string | null>(null)

    // Sync from props if they change (e.g. initial load or subsequent server refresh)
    useEffect(() => {
        setOverrides(initialOverrides)
    }, [initialOverrides])

    // -- Blockouts --
    const [blockouts, setBlockouts] = useState(initialBlockoutDates)
    const [isAddingBlockout, setIsAddingBlockout] = useState(false)

    useEffect(() => {
        setBlockouts(initialBlockoutDates)
    }, [initialBlockoutDates])

    const handleDeleteBlockout = async (id: string) => {
        if (!confirm('Eliminar bloqueo?')) return
        setBlockouts(prev => prev.filter(b => b.id !== id))
        await deleteBlockoutDate(id)
        router.refresh()
    }
    
    // Using the same "newOverride" state for adding blockouts for simplicity? 
    // Or should we create a separate input for blocked dates?
    // Let's create `addBlockout` that uses the same date input but adds as BLOCKOUT instead of OVERRIDE.
    
    const handleAddBlockout = async () => {
         if (!newOverride.date || dateError) return
         setIsAddingBlockout(true)

         const [year, month, day] = newOverride.date.split('-').map(Number)
         const localDate = new Date(year, month - 1, day)

         const savedBlockout = await addBlockoutDate(localDate, "Manual Admin Block")
         
         setBlockouts(prev => {
             const exists = prev.find(b => b.id === savedBlockout.id)
             const dateObj = new Date(savedBlockout.date)
             if (exists) {
                 return prev.map(b => b.id === savedBlockout.id ? { ...savedBlockout, date: dateObj } : b)
             }
             return [...prev, { ...savedBlockout, date: dateObj }]
         })

         setNewOverride({ date: '', startTime: '09:00', endTime: '18:00' })
         setIsAddingBlockout(false)
         router.refresh()
    }


    // -- Blockout Slots (horarios específicos) --
    const [blockoutSlots, setBlockoutSlots] = useState(initialBlockoutSlots)
    const [newSlotDate, setNewSlotDate] = useState('')
    const [newSlotTime, setNewSlotTime] = useState('')
    const [newSlotReason, setNewSlotReason] = useState('')

    const handleAddBlockoutSlot = async () => {
        if (!newSlotDate || !newSlotTime) return
        const [year, month, day] = newSlotDate.split('-').map(Number)
        const localDate = new Date(year, month - 1, day)
        try {
            await addBlockoutSlot({ date: localDate, startTime: newSlotTime, reason: newSlotReason || undefined })
            setBlockoutSlots(prev => [...prev, { id: 'temp-' + Date.now(), date: newSlotDate, startTime: newSlotTime, reason: newSlotReason || null }])
            setNewSlotDate('')
            setNewSlotTime('')
            setNewSlotReason('')
            router.refresh()
        } catch (err: any) { alert(err.message || 'Error') }
    }

    const handleDeleteBlockoutSlot = async (id: string) => {
        if (!confirm('Eliminar bloqueo de horario?')) return
        setBlockoutSlots(prev => prev.filter(s => s.id !== id))
        await deleteBlockoutSlot(id)
        router.refresh()
    }

    const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const dateStr = e.target.value
        setNewOverride({...newOverride, date: dateStr})
        
        if (!dateStr) {
            setDateError(null)
            return
        }

        // Validate date vs today
        const todayStr = format(new Date(), 'yyyy-MM-dd')
         
         if (dateStr < todayStr) {
             setDateError('La fecha no puede ser anterior a hoy.')
         } else {
             setDateError(null)
         }
    }

    const addOverride = async () => {
        if (!newOverride.date || dateError) return
        setIsAddingOverride(true)

        // Parse YYYY-MM-DD manually to local midnight to avoid UTC timezone shift
        const [year, month, day] = newOverride.date.split('-').map(Number)
        const localDate = new Date(year, month - 1, day)

        const savedOverride = await addAvailabilityOverride({
            date: localDate,
            startTime: newOverride.startTime,
            endTime: newOverride.endTime
        })
        
        // Update local state immediately
        setOverrides(prev => {
             const exists = prev.find(o => o.id === savedOverride.id)
             // Ensure date is Date object for client state
             const dateObj = new Date(savedOverride.date)
             
             if (exists) {
                 return prev.map(o => o.id === savedOverride.id ? { ...savedOverride, date: dateObj } : o)
             }
             return [...prev, { ...savedOverride, date: dateObj }]
        })

        setNewOverride({ date: '', startTime: '09:00', endTime: '18:00' })
        setIsAddingOverride(false)
        router.refresh()
    }


    const deleteOverride = async (id: string) => {
        if (!confirm('Eliminar excepción?')) return
        // Optimistic update
        setOverrides(prev => prev.filter(o => o.id !== id))
        await deleteAvailabilityOverride(id)
        router.refresh()
    }

    return (
        <div className="space-y-12 max-w-4xl">
            
            {/* General Settings */}
            <section className="bg-white dark:bg-neutral-800 p-6 rounded-xl shadow-sm border dark:border-neutral-700">
                <h2 className="text-xl font-bold mb-4">Configuración General</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-medium mb-1">Precio por Sesión ($)</label>
                        <input 
                            type="number"
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-neutral-900 dark:border-neutral-700"
                            value={settings.currentPrice}
                            onChange={(e) => setSettings({...settings, currentPrice: Number(e.target.value)})}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">Seña</label>
                        {/* Toggle: por porcentaje o monto fijo */}
                        <div className="flex gap-2 mb-2">
                            <button
                                type="button"
                                onClick={() => setDepositMode('PERCENT')}
                                className={cn("flex-1 h-9 rounded-md text-xs font-bold border transition-colors",
                                    depositMode === 'PERCENT'
                                        ? "border-teal-500 bg-teal-50 dark:bg-teal-900/20 text-teal-700 dark:text-teal-400"
                                        : "border-gray-200 dark:border-neutral-700 text-gray-500")}
                            >Porcentaje (%)</button>
                            <button
                                type="button"
                                onClick={() => setDepositMode('FIXED')}
                                className={cn("flex-1 h-9 rounded-md text-xs font-bold border transition-colors",
                                    depositMode === 'FIXED'
                                        ? "border-teal-500 bg-teal-50 dark:bg-teal-900/20 text-teal-700 dark:text-teal-400"
                                        : "border-gray-200 dark:border-neutral-700 text-gray-500")}
                            >Monto fijo ($)</button>
                        </div>
                        {depositMode === 'PERCENT' ? (
                            <input
                                type="number" min={1} max={100}
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 dark:bg-neutral-900 dark:border-neutral-700"
                                value={settings.depositPercentage}
                                onChange={(e) => setSettings({...settings, depositPercentage: Number(e.target.value)})}
                                placeholder="50"
                            />
                        ) : (
                            <input
                                type="number" min={0}
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 dark:bg-neutral-900 dark:border-neutral-700"
                                value={settings.depositFixedAmount ?? ''}
                                onChange={(e) => setSettings({...settings, depositFixedAmount: e.target.value === '' ? null : Number(e.target.value)})}
                                placeholder="Ej: 21000"
                            />
                        )}
                        <p className="text-[11px] text-gray-400 mt-1">
                            {depositMode === 'PERCENT'
                                ? `Seña = ${settings.depositPercentage}% de $${Number(settings.currentPrice).toLocaleString('es-AR')} = $${Math.round(Number(settings.currentPrice) * (Number(settings.depositPercentage)/100)).toLocaleString('es-AR')}`
                                : `Seña fija de $${Number(settings.depositFixedAmount || 0).toLocaleString('es-AR')} (el saldo restante es $${Math.max(0, Number(settings.currentPrice) - Number(settings.depositFixedAmount || 0)).toLocaleString('es-AR')})`}
                        </p>
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">Duración Sesión (minutos)</label>
                        <input
                            type="number"
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-neutral-900 dark:border-neutral-700"
                            value={settings.sessionDuration}
                            onChange={(e) => setSettings({...settings, sessionDuration: Number(e.target.value)})}
                        />
                    </div>
                </div>

                <div className="mt-6 pt-6 border-t border-gray-200 dark:border-neutral-700">
                    <h3 className="font-semibold text-gray-700 dark:text-gray-300 mb-3">Datos de Transferencia (saldo al finalizar sesión)</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium mb-1">Alias</label>
                            <input type="text" placeholder="federico.colella.mp"
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm dark:bg-neutral-900 dark:border-neutral-700"
                                value={settings.paymentAlias || ''}
                                onChange={(e) => setSettings({...settings, paymentAlias: e.target.value})}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">CBU/CVU</label>
                            <input type="text" placeholder="0000003100000000000000"
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm dark:bg-neutral-900 dark:border-neutral-700"
                                value={settings.paymentCbu || ''}
                                onChange={(e) => setSettings({...settings, paymentCbu: e.target.value})}
                            />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium mb-1">Titular (Nombre completo)</label>
                            <input type="text" placeholder="Federico Colella"
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm dark:bg-neutral-900 dark:border-neutral-700"
                                value={settings.paymentHolder || ''}
                                onChange={(e) => setSettings({...settings, paymentHolder: e.target.value})}
                            />
                        </div>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">Estos datos se envían por WhatsApp en el mensaje de confirmación de turno presencial.</p>
                </div>

                <div className="mt-4 flex justify-end">
                    <Button onClick={saveSettings} disabled={isSavingSettings}>
                        {isSavingSettings ? 'Guardando...' : 'Guardar Cambios'}
                    </Button>
                </div>
            </section>

            {/* Weekly Schedule */}
            <section className="bg-white dark:bg-neutral-800 p-6 rounded-xl shadow-sm border dark:border-neutral-700">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold">Horarios Semanales</h2>
                    <div className="flex flex-col items-end gap-1">
                        <Button onClick={saveSchedule} disabled={isSavingSchedule}>
                            {isSavingSchedule ? 'Guardando...' : 'Guardar Horarios'}
                        </Button>
                        {scheduleSaveStatus.kind === 'ok' && (
                            <span className="text-xs text-green-600 dark:text-green-400">✓ {scheduleSaveStatus.msg}</span>
                        )}
                        {scheduleSaveStatus.kind === 'err' && (
                            <span className="text-xs text-red-600 dark:text-red-400 max-w-xs text-right">⚠ {scheduleSaveStatus.msg}</span>
                        )}
                    </div>
                </div>
                <p className="text-sm text-gray-500 mb-4">Cada día tiene dos ventanas independientes: <b>Presencial</b> y <b>Virtual</b>. Comparten los mismos slots — si alguien reserva online a las 14, ese horario queda ocupado para el presencial también.</p>
                <div className="space-y-4">
                    {DAYS.map((dayName, idx) => {
                        const presK = scheduleKey(idx, 'PRESENTIAL')
                        const virtK = scheduleKey(idx, 'VIRTUAL')
                        const presActive = schedule[presK].isActive
                        const virtActive = schedule[virtK].isActive
                        const anyActive = presActive || virtActive
                        return (
                        <div key={idx} className={`rounded-xl border p-4 ${anyActive ? 'bg-white dark:bg-neutral-800 border-gray-200 dark:border-neutral-700 shadow-sm' : 'bg-gray-50 dark:bg-neutral-900 border-transparent opacity-70'}`}>
                            <div className={cn("font-bold text-base mb-3", anyActive ? "text-gray-900 dark:text-white" : "text-gray-500")}>{dayName}</div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {SCHEDULE_TYPES.map(t => {
                                    const k = scheduleKey(idx, t)
                                    const row = schedule[k]
                                    const label = t === 'PRESENTIAL' ? 'Presencial' : 'Virtual'
                                    return (
                                        <div key={t} className={`flex items-center gap-3 p-3 rounded-lg border ${row.isActive ? 'bg-white dark:bg-neutral-800 border-gray-200 dark:border-neutral-700' : 'bg-gray-50/50 dark:bg-neutral-900/50 border-transparent'}`}>
                                            <label className="flex items-center gap-2 min-w-[110px]">
                                                <input
                                                    type="checkbox"
                                                    className="h-5 w-5 rounded-md border-gray-300 accent-teal-600 cursor-pointer"
                                                    checked={row.isActive}
                                                    onChange={(e) => handleScheduleChange(idx, t, 'isActive', e.target.checked)}
                                                />
                                                <span className={cn("font-medium text-sm", row.isActive ? "text-gray-900 dark:text-white" : "text-gray-500")}>{label}</span>
                                            </label>
                                            {row.isActive && (
                                                <div className="flex items-center gap-2 flex-1">
                                                    <input
                                                        type="time"
                                                        className="h-9 flex-1 sm:w-28 rounded-lg border border-gray-200 bg-white px-2 text-sm dark:bg-neutral-900 dark:border-neutral-700"
                                                        value={row.startTime}
                                                        onChange={(e) => handleScheduleChange(idx, t, 'startTime', e.target.value)}
                                                    />
                                                    <span className="text-gray-400 text-xs">a</span>
                                                    <input
                                                        type="time"
                                                        className="h-9 flex-1 sm:w-28 rounded-lg border border-gray-200 bg-white px-2 text-sm dark:bg-neutral-900 dark:border-neutral-700"
                                                        value={row.endTime}
                                                        onChange={(e) => handleScheduleChange(idx, t, 'endTime', e.target.value)}
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    )})}
                </div>
            </section>

            {/* Exceptions */}
            <section className="bg-white dark:bg-neutral-800 p-6 rounded-xl shadow-sm border dark:border-neutral-700">
                <h2 className="text-xl font-bold mb-4">Días Excepcionales</h2>
                <p className="text-sm text-gray-500 mb-4">Agrega disponibilidad específica para una fecha puntual. Esto sobreescribe (o agrega) al horario semanal.</p>
                
                <div className="flex flex-wrap gap-4 items-end mb-6 bg-gray-50 dark:bg-neutral-900 p-4 rounded-lg">
                    <div>
                        <label className="block text-sm font-medium mb-1">Fecha</label>
                        <input 
                            type="date" 
                            className={cn(
                                "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-neutral-900 dark:border-neutral-700",
                                dateError ? "border-red-500 focus-visible:ring-red-500" : ""
                            )}
                            value={newOverride.date}
                            onChange={handleDateChange}
                        />
                        {dateError && <p className="text-red-500 text-xs mt-1">{dateError}</p>}
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">Inicio</label>
                        <input 
                            type="time" 
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-neutral-900 dark:border-neutral-700"
                            value={newOverride.startTime}
                            onChange={(e) => setNewOverride({...newOverride, startTime: e.target.value})}
                        />
                    </div>
                     <div>
                        <label className="block text-sm font-medium mb-1">Fin</label>
                        <input 
                            type="time" 
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-neutral-900 dark:border-neutral-700"
                            value={newOverride.endTime}
                            onChange={(e) => setNewOverride({...newOverride, endTime: e.target.value})}
                        />
                    </div>
                    <div className="flex gap-2">
                        <Button onClick={addOverride} disabled={isAddingOverride || isAddingBlockout || !!dateError || !newOverride.date}>
                            Agregar Excepción
                        </Button>
                        <Button variant="destructive" onClick={handleAddBlockout} disabled={isAddingOverride || isAddingBlockout || !!dateError || !newOverride.date}>
                            Bloquear Día
                        </Button>
                    </div>
                </div>

                <div className="space-y-6">
                    <div>
                        <h3 className="font-semibold mb-2">Excepciones (Horarios Especiales)</h3>
                        <div className="space-y-2">
                            {overrides.map(ov => (
                                <div key={ov.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-neutral-900 rounded-lg border border-teal-100 dark:border-teal-900/30">
                                    <div className="flex gap-4 items-center">
                                        <div className="h-2 w-2 rounded-full bg-teal-500"></div>
                                        <span className="font-bold">{format(ov.date, 'dd/MM/yyyy')}</span>
                                        <span className="text-sm text-gray-600 dark:text-gray-400">{ov.startTime} - {ov.endTime}</span>
                                    </div>
                                    <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => deleteOverride(ov.id)}>
                                        Eliminar
                                    </Button>
                                </div>
                            ))}
                            {overrides.length === 0 && (
                                <p className="text-gray-400 italic text-sm">No hay horarios especiales configurados.</p>
                            )}
                        </div>
                    </div>

                    <div>
                         <h3 className="font-semibold mb-2 text-red-600 dark:text-red-400">Días Bloqueados Completamente</h3>
                         <div className="space-y-2">
                            {blockouts.map(b => (
                                <div key={b.id} className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-950/20 rounded-lg border border-red-100 dark:border-red-900/30">
                                    <div className="flex gap-4 items-center">
                                        <div className="h-2 w-2 rounded-full bg-red-500"></div>
                                        <span className="font-bold">
                                            {(() => {
                                                // Correction for timezone: If date is UTC midnight (e.g. 27th 00:00Z)
                                                // Browser in -3 shows 26th 21:00.
                                                // We want to show 27th.
                                                // So we treat the UTC components as if they were local.
                                                const d = new Date(b.date)
                                                const userTimezoneOffset = d.getTimezoneOffset() * 60000
                                                const adjustedDate = new Date(d.getTime() + userTimezoneOffset)
                                                return format(adjustedDate, 'dd/MM/yyyy')
                                            })()}
                                        </span>
                                        <span className="text-sm text-gray-600 dark:text-gray-400">{b.reason || 'Sin motivo'}</span>
                                    </div>
                                    <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => handleDeleteBlockout(b.id)}>
                                        Eliminar
                                    </Button>
                                </div>
                            ))}
                             {blockouts.length === 0 && (
                                <p className="text-gray-400 italic text-sm">No hay días bloqueados.</p>
                            )}
                         </div>
                    </div>

                    <div>
                        <h3 className="font-semibold mb-2 text-orange-600 dark:text-orange-400">Bloquear Horarios Puntuales</h3>
                        <p className="text-xs text-gray-500 mb-3">Bloquea un horario especifico sin bloquear todo el dia.</p>
                        <div className="space-y-2">
                            {blockoutSlots.map(bs => (
                                <div key={bs.id} className="flex items-center justify-between p-3 bg-orange-50 dark:bg-orange-950/20 rounded-lg border border-orange-100 dark:border-orange-900/30">
                                    <div className="flex gap-4 items-center">
                                        <div className="h-2 w-2 rounded-full bg-orange-500"></div>
                                        <span className="font-bold">
                                            {(() => {
                                                const d = new Date(bs.date + (bs.date.includes('T') ? '' : 'T12:00:00'))
                                                return format(d, 'dd/MM/yyyy')
                                            })()}
                                        </span>
                                        <span className="font-semibold text-orange-700 dark:text-orange-300">{bs.startTime} hs</span>
                                        <span className="text-sm text-gray-600 dark:text-gray-400">{bs.reason || 'Sin motivo'}</span>
                                    </div>
                                    <Button variant="ghost" size="sm" className="text-orange-500 hover:text-orange-700 hover:bg-orange-50"
                                        onClick={() => handleDeleteBlockoutSlot(bs.id)}>
                                        Eliminar
                                    </Button>
                                </div>
                            ))}
                            {blockoutSlots.length === 0 && (
                                <p className="text-gray-400 italic text-sm">No hay horarios bloqueados.</p>
                            )}
                        </div>
                        <div className="mt-3 flex flex-col sm:flex-row gap-2">
                            <input type="date" value={newSlotDate} onChange={e => setNewSlotDate(e.target.value)}
                                className="flex-1 p-2.5 rounded-lg border border-gray-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-sm" />
                            <input type="time" value={newSlotTime} onChange={e => setNewSlotTime(e.target.value)}
                                className="w-28 p-2.5 rounded-lg border border-gray-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-sm" />
                            <input type="text" value={newSlotReason} onChange={e => setNewSlotReason(e.target.value)}
                                placeholder="Motivo (opcional)" className="flex-1 p-2.5 rounded-lg border border-gray-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-sm" />
                            <Button size="sm" className="bg-orange-600 hover:bg-orange-700 text-white rounded-lg"
                                onClick={handleAddBlockoutSlot} disabled={!newSlotDate || !newSlotTime}>
                                Bloquear Horario
                            </Button>
                        </div>
                    </div>

                </div>
            </section>
        </div>
    )
}
