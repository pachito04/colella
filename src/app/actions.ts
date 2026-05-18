'use server'

import { prisma } from '@/lib/prisma'
// import { BUSINESS_RULES } from '@/lib/config/business-rules' // Deprecated
import { preference } from '@/lib/mercadopago'
import { randomUUID } from 'crypto'

import {
  addDays,
  setHours,
  setMinutes,
  startOfDay,
  endOfDay,
  isBefore,
  addMinutes,
  format,
  parseISO,
  getDay,
  isEqual,
  subMinutes
} from 'date-fns'

import { auth } from '@/auth'

const RESERVATION_TIMEOUT_MINUTES = 15

type DayWindow = { startTime: string; endTime: string }
type DaySchedule = {
  startTime: string
  endTime: string
  byType: Partial<Record<'PRESENTIAL' | 'VIRTUAL', DayWindow>>
}

async function getSystemConfig(targetDate?: Date) {
  const config: {
    price: number
    duration: number
    depositPercentage: number
    schedule: Record<number, DaySchedule>
  } = {
    price: 40000,
    duration: 30,
    depositPercentage: 50,
    schedule: {}
  }

  const settings = await prisma.globalSettings.findUnique({
    where: { id: 'settings' }
  })

  if (settings) {
    config.price = Number(settings.currentPrice)
    config.duration = settings.sessionDuration
    config.depositPercentage = settings.depositPercentage
  }

  let override = null

  if (targetDate) {
    const start = startOfDay(targetDate)
    const end = endOfDay(targetDate)

    override = await prisma.availabilityOverride.findFirst({
      where: {
        date: {
          gte: start,
          lte: end
        }
      }
    })
  }

  if (override) {
    const dayOfWeek = getDay(targetDate!)
    // Override impacta ambos tipos (es un override "puntual" del día completo)
    config.schedule[dayOfWeek] = {
      startTime: override.startTime,
      endTime: override.endTime,
      byType: {
        PRESENTIAL: { startTime: override.startTime, endTime: override.endTime },
        VIRTUAL:    { startTime: override.startTime, endTime: override.endTime },
      }
    }
  } else {
    const dbSchedule = await prisma.workSchedule.findMany({
      where: { isActive: true }
    })

    dbSchedule.forEach((s: any) => {
      if (!config.schedule[s.dayOfWeek]) {
        config.schedule[s.dayOfWeek] = {
          startTime: s.startTime,
          endTime: s.endTime,
          byType: {},
        } as DaySchedule
      }
      const day = config.schedule[s.dayOfWeek]
      const type = (s.type ?? 'PRESENTIAL') as 'PRESENTIAL' | 'VIRTUAL'
      day.byType[type] = { startTime: s.startTime, endTime: s.endTime }
      if (type === 'PRESENTIAL' || !day.byType.PRESENTIAL) {
        day.startTime = s.startTime
        day.endTime = s.endTime
      }
    })
  }

  return config
}

import { fromZonedTime, toZonedTime } from 'date-fns-tz'

const TIMEZONE = 'America/Argentina/Buenos_Aires'

export async function getAvailability(dateStr: string, appointmentType?: 'PRESENTIAL' | 'VIRTUAL') {
  const dateOnly = dateStr.split('T')[0]

  const targetDateZoned = fromZonedTime(`${dateOnly}T00:00:00`, TIMEZONE)

  const zonedDate = toZonedTime(targetDateZoned, TIMEZONE)
  const dayIndex = getDay(zonedDate)

  const config = await getSystemConfig(targetDateZoned)

  const startUtc = fromZonedTime(`${dateOnly}T00:00:00`, TIMEZONE)
  const endUtc = fromZonedTime(`${dateOnly}T23:59:59.999`, TIMEZONE)

  const blockout = await prisma.blockoutDate.findFirst({
    where: {
      date: {
        gte: startUtc,
        lte: endUtc
      }
    }
  })

  if (blockout) {
    return { slots: [] }
  }

  const daySchedule = config.schedule[dayIndex]

  if (!daySchedule) {
    return { slots: [] }
  }

  // Ventana específica del type (PRESENTIAL/VIRTUAL). Si no se especificó type, usa legacy.
  const window = appointmentType
    ? daySchedule.byType[appointmentType]
    : { startTime: daySchedule.startTime, endTime: daySchedule.endTime }

  if (!window) {
    return { slots: [] }
  }

  const [startHour, startMinute] = window.startTime.split(':').map(Number)
  const [endHour, endMinute] = window.endTime.split(':').map(Number)

  const formatTime = (h: number, m: number) =>
    `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`

  const startTimeStr = `${dateOnly}T${formatTime(startHour, startMinute)}`
  const endTimeStr = `${dateOnly}T${formatTime(endHour, endMinute)}`

  const start = fromZonedTime(startTimeStr, TIMEZONE)
  const end = fromZonedTime(endTimeStr, TIMEZONE)

  const now = new Date()
  const expirationThreshold = subMinutes(now, RESERVATION_TIMEOUT_MINUTES)

  const [existingAppointments, recurringSlots, blockoutSlots] = await Promise.all([
    prisma.appointment.findMany({
      where: {
        datetime: {
          gte: start,
          lt: end
        },
        OR: [
          { status: 'CONFIRMED' },
          {
            status: 'PENDING',
            createdAt: { gte: expirationThreshold }
          }
        ]
      }
    }),
    prisma.recurringSlot.findMany({
      where: {
        dayOfWeek: dayIndex,
        isActive: true
      },
      include: {
        exceptions: {
          where: {
            date: {
              gte: startUtc,
              lte: endUtc
            }
          }
        }
      }
    }),
    prisma.blockoutSlot.findMany({
      where: {
        date: {
          gte: startUtc,
          lte: endUtc
        }
      }
    })
  ])

  // Turnos fijos activos, excluyendo los que tienen excepción para este día
  const recurringTimes = new Set(
    recurringSlots
      .filter((rs: any) => rs.exceptions.length === 0)
      .map((rs: any) => rs.startTime)
  )

  // Horarios bloqueados puntualmente para este día
  const blockedTimes = new Set(blockoutSlots.map((bs: any) => bs.startTime))

  const isSlotFree = (slotDate: Date) => {
    // Check if taken by an existing appointment
    if (existingAppointments.some((app: any) => isEqual(app.datetime, slotDate))) {
      return false
    }
    const slotZoned = toZonedTime(slotDate, TIMEZONE)
    const slotTime = `${String(slotZoned.getHours()).padStart(2, '0')}:${String(slotZoned.getMinutes()).padStart(2, '0')}`
    // Check if blocked by a recurring fixed slot (without exception for this date)
    if (recurringTimes.has(slotTime)) {
      return false
    }
    // Check if blocked by a specific hour blockout
    if (blockedTimes.has(slotTime)) {
      return false
    }
    return true
  }

  const slots = []
  let current = start

  while (isBefore(current, end)) {
    if (isSlotFree(current)) {
      slots.push(current.toISOString())
    }

    current = addMinutes(current, config.duration)
  }

  return { slots }
}

export async function bookAppointment(formData: FormData) {
  const session = await auth()

  if (!session?.user?.id) {
    return { success: false, error: 'Unauthorized' }
  }

  const name = formData.get('name') as string
  const phone = (formData.get('phone') as string).replace(/[\s()-]/g, '')
  const date = formData.get('date') as string
  const type = (formData.get('type') as string) || 'PRESENTIAL'
  const isDouble = formData.get('isDouble') === 'true'
  const patientNotes = formData.get('patientNotes') as string | null
  // Soporta múltiples archivos: legacy `medicalFile` + nuevo `medicalFiles`
  const rawFiles = [
    ...formData.getAll('medicalFiles'),
    ...formData.getAll('medicalFile'),
  ].filter((f): f is File => f instanceof File && f.size > 0)

  if (!name || !phone || !date) {
    return { success: false, error: 'Missing required fields' }
  }

  const MAX_FILES = 5
  const MAX_FILE_SIZE = 5 * 1024 * 1024
  if (rawFiles.length > MAX_FILES) {
    return { success: false, error: `Podés subir hasta ${MAX_FILES} archivos por turno.` }
  }

  const userId = session.user.id
  const config = await getSystemConfig()

  // Para sesión doble, calculamos el segundo slot consecutivo
  const slotsToBook: Date[] = [new Date(date)]
  if (isDouble) {
    slotsToBook.push(addMinutes(slotsToBook[0], config.duration))
  }

  try {
    const medicalFilesData: {
      fileName: string
      originalName: string
      mimeType: string
      size: number
      data: Buffer
    }[] = []

    if (rawFiles.length > 0) {
      const validTypes = ['application/pdf', 'image/jpeg', 'image/png']

      for (const medicalFile of rawFiles) {
        if (!validTypes.includes(medicalFile.type)) {
          return {
            success: false,
            error: `Formato no válido para "${medicalFile.name}". Solo PDF, JPG o PNG.`
          }
        }

        if (medicalFile.size > MAX_FILE_SIZE) {
          return {
            success: false,
            error: `El archivo "${medicalFile.name}" supera los 5MB.`
          }
        }

        const bytes = await medicalFile.arrayBuffer()
        const buffer = Buffer.from(bytes)

        const fileName = `${Date.now()}-${randomUUID()}-${medicalFile.name.replace(
          /\s+/g,
          '-'
        )}`

        medicalFilesData.push({
          fileName,
          originalName: medicalFile.name,
          mimeType: medicalFile.type,
          size: medicalFile.size,
          data: buffer,
        })
      }
    }

    // Virtuales: se paga el total. Presenciales: solo seña.
    const isVirtual = type === 'VIRTUAL'
    const sessionsCount = slotsToBook.length
    const amountToPay = isVirtual
      ? config.price * sessionsCount
      : config.price * (config.depositPercentage / 100) * sessionsCount

    const appointments = await prisma.$transaction(async (tx: any) => {
      // Validar que ningún slot esté tomado
      for (const slot of slotsToBook) {
        const existing = await tx.appointment.findFirst({
          where: {
            datetime: slot,
            status: { in: ['CONFIRMED', 'PENDING'] }
          }
        })

        if (existing) {
          const isPending = existing.status === 'PENDING'
          const now = new Date()
          const expirationThreshold = subMinutes(now, RESERVATION_TIMEOUT_MINUTES)
          const isExpired = existing.createdAt < expirationThreshold

          if (isPending && isExpired) {
            await tx.appointment.update({
              where: { id: existing.id },
              data: { status: 'CANCELLED' }
            })
          } else {
            throw new Error('SLOT_TAKEN')
          }
        }
      }

      // Bloqueo del día (chequear con el primer slot, todos son el mismo día)
      const bookingDateZoned = toZonedTime(slotsToBook[0], TIMEZONE)
      const year = bookingDateZoned.getFullYear()
      const month = String(bookingDateZoned.getMonth() + 1).padStart(2, '0')
      const day = String(bookingDateZoned.getDate()).padStart(2, '0')
      const dateOnly = `${year}-${month}-${day}`

      const startUtc = fromZonedTime(`${dateOnly}T00:00:00`, TIMEZONE)
      const endUtc = fromZonedTime(`${dateOnly}T23:59:59.999`, TIMEZONE)

      const blockout = await tx.blockoutDate.findFirst({
        where: {
          date: {
            gte: startUtc,
            lte: endUtc
          }
        }
      })

      if (blockout) {
        throw new Error('DATE_BLOCKED')
      }

      try {
        await tx.user.update({
          where: { id: userId },
          data: {
            phoneNumber: phone,
            name: name
          }
        })
      } catch (error: any) {
        const isPhoneConflict =
          error?.code === 'P2002' ||
          String(error?.message || '').includes('phoneNumber')

        if (isPhoneConflict) {
          throw new Error('PHONE_ALREADY_IN_USE')
        }

        throw error
      }

      // Crear todos los appointments (1 o 2)
      const created = []
      for (let i = 0; i < slotsToBook.length; i++) {
        const slot = slotsToBook[i]
        const app = await tx.appointment.create({
          data: {
            datetime: slot,
            status: 'PENDING',
            type: type as any,
            patientId: userId,
            depositPaid: false,
            // Sólo el primer turno guarda las notas/archivo (los demás son la "continuación" del primero)
            patientNotes: i === 0 ? (patientNotes || null) : null,
            medicalReportUrl: null,
          },
          include: { patient: true }
        })
        created.push(app)
      }
      return created
    })

    const firstAppointment = appointments[0]

    if (medicalFilesData.length > 0) {
      // Crear todos los AppointmentFile en una sola query
      await prisma.appointmentFile.createMany({
        data: medicalFilesData.map(f => ({
          appointmentId: firstAppointment.id,
          fileName: f.fileName,
          originalName: f.originalName,
          mimeType: f.mimeType,
          size: f.size,
          data: f.data as unknown as Uint8Array<ArrayBuffer>,
        })),
      })

      // medicalReportUrl apunta al endpoint del turno (sirve el primer archivo por compat)
      await prisma.appointment.update({
        where: { id: firstAppointment.id },
        data: { medicalReportUrl: `/api/medical-files/${firstAppointment.id}` }
      })
    }

    const paymentUrl = await createPreferenceForAppointment(
      appointments,
      name,
      session.user.email,
      amountToPay,
      isVirtual
    )

    return {
      success: true,
      paymentUrl: paymentUrl
    }
  } catch (error: any) {
    console.error('Book Appointment Error:', error)

    if (error.message === 'SLOT_TAKEN' || error.message === 'DATE_BLOCKED') {
      return {
        success: false,
        error:
          'Este horario ya ha sido reservado por otra persona o no está disponible. Por favor, selecciona un horario diferente.'
      }
    }

    if (error.message === 'PHONE_ALREADY_IN_USE') {
      return {
        success: false,
        error:
          'Ese número de WhatsApp ya está asociado a otro paciente. Usá otro número para continuar.'
      }
    }

    return { success: false, error: 'Booking failed. Please try again.' }
  }
}

async function createPreferenceForAppointment(appointments: any | any[], payerName: string, payerEmail: string | null | undefined, amount: number, isVirtual: boolean = false) {
  const appointmentsList = Array.isArray(appointments) ? appointments : [appointments]
  const isDouble = appointmentsList.length > 1
  const appUrl = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || process.env.AUTH_URL || 'http://localhost:3000'
  const itemTitle = isVirtual
    ? (isDouble ? `Sesión Virtual de Kinesiología (doble, pago total)` : `Sesión Virtual de Kinesiología (pago total)`)
    : (isDouble ? `Seña: Sesión Doble de Kinesiología (60 min)` : `Seña: Sesión de Kinesiología`)
  // Usamos pipe-separated IDs en external_reference para sesiones dobles
  const externalReference = appointmentsList.map(a => a.id).join('|')
  const preferenceBody = {
    items: [{ id: isVirtual ? 'full' : 'deposit', title: itemTitle, quantity: 1, unit_price: amount, currency_id: 'ARS' }],
    payer: { email: payerEmail || 'unknown@email.com', name: payerName },
    external_reference: externalReference,
    back_urls: { success: `${appUrl}/booking/success`, failure: `${appUrl}/booking/failure`, pending: `${appUrl}/booking/pending` },
    notification_url: `${appUrl}/api/webhooks/mercadopago`,
    metadata: { appointment_id: appointmentsList[0].id, appointment_ids: externalReference, is_virtual: isVirtual, is_double: isDouble },
    expires: true,
  }
  const preferenceResponse = await preference.create({ body: preferenceBody })
  if (!preferenceResponse.init_point) throw new Error('Failed to create payment preference')
  return preferenceResponse.init_point
}

export async function getAppointmentPaymentUrl(appointmentId: string) {
  const session = await auth()
  if (!session?.user?.id) return { success: false, error: 'Not authenticated' }
  const appointment = await prisma.appointment.findUnique({ where: { id: appointmentId }, include: { patient: true } })
  if (!appointment) return { success: false, error: 'Appointment not found' }
  if (appointment.patientId !== session.user.id) return { success: false, error: 'Unauthorized' }
  if (appointment.status !== 'PENDING') return { success: false, error: 'Appointment is not pending' }
  const now = new Date()
  const expirationThreshold = subMinutes(now, RESERVATION_TIMEOUT_MINUTES)
  if (appointment.createdAt < expirationThreshold) return { success: false, error: 'Appointment expired' }
  const config = await getSystemConfig()
  const isVirtual = appointment.type === 'VIRTUAL'
  const amountToPay = isVirtual
    ? config.price
    : config.price * (config.depositPercentage / 100)
  try {
    const url = await createPreferenceForAppointment(appointment, appointment.patient?.name || 'Paciente', appointment.patient?.email, amountToPay, isVirtual)
    return { success: true, url }
  } catch (e) {
    return { success: false, error: 'Failed to generate payment link' }
  }
}
