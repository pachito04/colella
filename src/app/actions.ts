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

async function getSystemConfig(targetDate?: Date) {
  let config = {
    price: 40000,
    duration: 30,
    depositPercentage: 50,
    schedule: {} as Record<number, { startTime: string; endTime: string }>
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

    config.schedule[dayOfWeek] = {
      startTime: override.startTime,
      endTime: override.endTime
    }
  } else {
    const dbSchedule = await prisma.workSchedule.findMany({
      where: { isActive: true }
    })

    dbSchedule.forEach((s: any) => {
      config.schedule[s.dayOfWeek] = {
        startTime: s.startTime,
        endTime: s.endTime
      }
    })
  }

  return config
}

import { fromZonedTime, toZonedTime } from 'date-fns-tz'

const TIMEZONE = 'America/Argentina/Buenos_Aires'

export async function getAvailability(dateStr: string) {
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

  const [startHour, startMinute] = daySchedule.startTime.split(':').map(Number)
  const [endHour, endMinute] = daySchedule.endTime.split(':').map(Number)

  const formatTime = (h: number, m: number) =>
    `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`

  const startTimeStr = `${dateOnly}T${formatTime(startHour, startMinute)}`
  const endTimeStr = `${dateOnly}T${formatTime(endHour, endMinute)}`

  const start = fromZonedTime(startTimeStr, TIMEZONE)
  const end = fromZonedTime(endTimeStr, TIMEZONE)

  const now = new Date()
  const expirationThreshold = subMinutes(now, RESERVATION_TIMEOUT_MINUTES)

  const existingAppointments = await prisma.appointment.findMany({
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
  })

  const isSlotFree = (slotDate: Date) => {
    return !existingAppointments.some((app: any) =>
      isEqual(app.datetime, slotDate)
    )
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
  const patientNotes = formData.get('patientNotes') as string | null
  const medicalFile = formData.get('medicalFile') as File | null

  if (!name || !phone || !date) {
    return { success: false, error: 'Missing required fields' }
  }

  const userId = session.user.id
  const config = await getSystemConfig()

  try {
    let medicalReportUrl: string | null = null
    let medicalFileData:
      | {
          fileName: string
          originalName: string
          mimeType: string
          size: number
          data: Buffer
        }
      | null = null

    if (medicalFile && medicalFile.size > 0) {
      const validTypes = ['application/pdf', 'image/jpeg', 'image/png']
      const maxSize = 5 * 1024 * 1024

      if (!validTypes.includes(medicalFile.type)) {
        return {
          success: false,
          error: 'Formato de archivo no válido. Solo PDF, JPG o PNG.'
        }
      }

      if (medicalFile.size > maxSize) {
        return {
          success: false,
          error: 'El archivo es demasiado grande (Máx 5MB).'
        }
      }

      const bytes = await medicalFile.arrayBuffer()
      const buffer = Buffer.from(bytes)

      const fileName = `${Date.now()}-${randomUUID()}-${medicalFile.name.replace(
        /\s+/g,
        '-'
      )}`

      medicalFileData = {
        fileName,
        originalName: medicalFile.name,
        mimeType: medicalFile.type,
        size: medicalFile.size,
        data: buffer
      }
    }

    const depositAmount = config.price * (config.depositPercentage / 100)
    const bookingDate = new Date(date)

    const appointment = await prisma.$transaction(async (tx: any) => {
      const existing = await tx.appointment.findFirst({
        where: {
          datetime: bookingDate,
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

      const bookingDateZoned = toZonedTime(bookingDate, TIMEZONE)

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

      return await tx.appointment.create({
        data: {
          datetime: bookingDate,
          status: 'PENDING',
          type: type as any,
          patientId: userId,
          depositPaid: false,
          patientNotes: patientNotes || null,
          medicalReportUrl: null
        },
        include: {
          patient: true
        }
      })
    })

    if (medicalFileData) {
      const url = `/api/medical-files/${appointment.id}`

      await prisma.appointmentFile.upsert({
        where: { appointmentId: appointment.id },
        update: { ...medicalFileData },
        create: {
          appointmentId: appointment.id,
          ...medicalFileData
        }
      })

      await prisma.appointment.update({
        where: { id: appointment.id },
        data: { medicalReportUrl: url }
      })
    }

    const paymentUrl = await createPreferenceForAppointment(
      appointment,
      name,
      session.user.email,
      depositAmount
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

async function createPreferenceForAppointment(appointment: any, payerName: string, payerEmail: string | null | undefined, amount: number) {
  const appUrl = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || process.env.AUTH_URL || 'http://localhost:3000'
  const preferenceBody = {
    items: [{ id: 'deposit', title: `Seña: Sesión de Kinesiología`, quantity: 1, unit_price: amount, currency_id: 'ARS' }],
    payer: { email: payerEmail || 'unknown@email.com', name: payerName },
    external_reference: appointment.id,
    back_urls: { success: `${appUrl}/booking/success`, failure: `${appUrl}/booking/failure`, pending: `${appUrl}/booking/pending` },
    notification_url: `${appUrl}/api/webhooks/mercadopago`,
    metadata: { appointment_id: appointment.id },
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
  const depositAmount = config.price * (config.depositPercentage / 100)
  try {
    const url = await createPreferenceForAppointment(appointment, appointment.patient?.name || 'Paciente', appointment.patient?.email, depositAmount)
    return { success: true, url }
  } catch (e) {
    return { success: false, error: 'Failed to generate payment link' }
  }
}
