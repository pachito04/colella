'use server'

import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'
import { revalidatePath } from 'next/cache'

async function requireAdmin() {
  const session = await auth()
  if (!session?.user || session.user.role !== 'ADMIN') {
    throw new Error('Unauthorized')
  }
  return session.user
}

export async function getAppointments(startDate?: string, endDate?: string) {
  await requireAdmin()
  
  const where: any = {}
  if (startDate) {
    where.datetime = { gte: new Date(startDate) }
  }
  if (endDate) {
    where.datetime = { ...where.datetime, lte: new Date(endDate) }
  }
  if (!startDate && !endDate) {
    where.datetime = { gte: new Date() }
  }

  const appointments = await prisma.appointment.findMany({
    where,
    include: {
      patient: true,
      medicalFile: {
        select: {
          id: true,
          fileName: true,
          originalName: true,
          mimeType: true,
          size: true,
          createdAt: true,
        }
      }
    },
    orderBy: { datetime: 'asc' },
  })
  
  return appointments.map((app: any) => ({
    ...app,
    datetime: app.datetime.toISOString(),
    createdAt: app.createdAt.toISOString(),
    updatedAt: app.updatedAt.toISOString(),
    medicalFile: app.medicalFile ? {
      ...app.medicalFile,
      createdAt: app.medicalFile.createdAt.toISOString(),
    } : null,
  }))
}

// --- Stats para el dashboard ---
export async function getDashboardStats() {
  await requireAdmin()

  const settings = await prisma.globalSettings.findUnique({ where: { id: 'settings' } })
  const currentPrice = Number(settings?.currentPrice ?? 40000)
  const depositPercentage = settings?.depositPercentage ?? 50
  const estimatedDepositAmount = currentPrice * (depositPercentage / 100)

  const totalPatients = await prisma.user.count({
    where: { role: 'PATIENT' }
  })

  const totalConfirmed = await prisma.appointment.count({
    where: { status: 'CONFIRMED' }
  })

  const now = new Date()
  const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)

  const thisMonthConfirmed = await prisma.appointment.count({
    where: {
      status: 'CONFIRMED',
      datetime: { gte: firstDayOfMonth, lte: lastDayOfMonth }
    }
  })

  const upcomingCount = await prisma.appointment.count({
    where: {
      status: 'CONFIRMED',
      datetime: { gte: new Date() }
    }
  })

  const thisMonthDepositPayments = await prisma.appointment.count({
    where: {
      depositPaid: true,
      datetime: { gte: firstDayOfMonth, lte: lastDayOfMonth }
    }
  })

  const totalDepositPayments = await prisma.appointment.count({
    where: {
      depositPaid: true,
    }
  })

  const nowDay = now.getDay()
  const diffToMonday = (nowDay + 6) % 7
  const startOfWeek = new Date(now)
  startOfWeek.setDate(now.getDate() - diffToMonday)
  startOfWeek.setHours(0, 0, 0, 0)

  const endOfWeek = new Date(startOfWeek)
  endOfWeek.setDate(startOfWeek.getDate() + 7)

  const weekAppointments = await prisma.appointment.findMany({
    where: {
      datetime: { gte: startOfWeek, lt: endOfWeek },
      status: { in: ['CONFIRMED', 'PENDING'] }
    },
    select: { patientId: true }
  })

  const weeklyUniqueClients = new Set(weekAppointments.map(app => app.patientId)).size

  const recurringGrouped = await prisma.appointment.groupBy({
    by: ['patientId'],
    where: { status: 'CONFIRMED' },
    _count: { patientId: true },
    having: {
      patientId: {
        _count: {
          gt: 1
        }
      }
    }
  })
  const recurringClients = recurringGrouped.length

  const newClientsThisMonth = await prisma.user.count({
    where: {
      role: 'PATIENT',
      createdAt: { gte: firstDayOfMonth, lte: lastDayOfMonth }
    }
  })

  return {
    totalPatients,
    totalConfirmed,
    thisMonthConfirmed,
    upcomingCount,
    estimatedCashCollectedTotal: Math.round(totalDepositPayments * estimatedDepositAmount),
    estimatedMonthDeposits: Math.round(thisMonthDepositPayments * estimatedDepositAmount),
    weeklyUniqueClients,
    recurringClients,
    newClientsThisMonth,
  }
}

// --- Lista de pacientes ---
export async function getPatients(search?: string) {
  await requireAdmin()

  const where: any = { role: 'PATIENT' }
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { phoneNumber: { contains: search } },
      { email: { contains: search, mode: 'insensitive' } },
    ]
  }

  const patients = await prisma.user.findMany({
    where,
    include: {
      appointments: {
        include: {
          medicalFile: {
            select: {
              id: true,
              fileName: true,
              originalName: true,
              mimeType: true,
              size: true,
              createdAt: true,
            }
          },
        },
        orderBy: { datetime: 'desc' },
      }
    },
    orderBy: { createdAt: 'desc' }
  })

  return patients.map((p: any) => ({
    ...p,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
    appointments: p.appointments.map((a: any) => ({
      ...a,
      datetime: a.datetime.toISOString(),
      createdAt: a.createdAt.toISOString(),
      updatedAt: a.updatedAt.toISOString(),
      medicalFile: a.medicalFile ? {
        ...a.medicalFile,
        createdAt: a.medicalFile.createdAt.toISOString(),
      } : null,
    }))
  }))
}

// --- Historial de un paciente ---
export async function getPatientHistory(patientId: string) {
  await requireAdmin()

  const patient = await prisma.user.findUnique({
    where: { id: patientId },
    include: {
      appointments: {
        include: {
          medicalFile: {
            select: {
              id: true,
              fileName: true,
              originalName: true,
              mimeType: true,
              size: true,
              createdAt: true,
            }
          },
        },
        orderBy: { datetime: 'desc' },
      }
    }
  })

  if (!patient) throw new Error('Paciente no encontrado')

  return {
    ...patient,
    createdAt: patient.createdAt.toISOString(),
    updatedAt: patient.updatedAt.toISOString(),
    appointments: patient.appointments.map((a: any) => ({
      ...a,
      datetime: a.datetime.toISOString(),
      createdAt: a.createdAt.toISOString(),
      updatedAt: a.updatedAt.toISOString(),
      medicalFile: a.medicalFile ? {
        ...a.medicalFile,
        createdAt: a.medicalFile.createdAt.toISOString(),
      } : null,
    }))
  }
}

// --- CMS: Success Stories ---
export async function getSuccessStories() {
  await requireAdmin()
  return await prisma.successStory.findMany({ orderBy: { order: 'asc' } })
}

export async function getReviews() {
  await requireAdmin()
  return await prisma.review.findMany({ orderBy: { order: 'asc' } })
}

export async function upsertReview(data: { id?: string, author: string, content: string, rating: number, isActive: boolean }) {
  await requireAdmin()
  if (data.id) {
    await prisma.review.update({
      where: { id: data.id },
      data: { author: data.author, content: data.content, rating: data.rating, isActive: data.isActive }
    })
  } else {
    await prisma.review.create({
      data: { author: data.author, content: data.content, rating: data.rating, isActive: data.isActive }
    })
  }
  revalidatePath('/admin/cms')
  revalidatePath('/')
}

export async function deleteReview(id: string) {
  await requireAdmin()
  await prisma.review.delete({ where: { id } })
  revalidatePath('/admin/cms')
  revalidatePath('/')
}

export async function upsertSuccessStory(data: { id?: string, name: string, role: string, description?: string | null, imageUrl?: string, isActive: boolean }) {
  await requireAdmin()
  if (data.id) {
    await prisma.successStory.update({
      where: { id: data.id },
      data: { name: data.name, role: data.role, description: data.description, imageUrl: data.imageUrl, isActive: data.isActive }
    })
  } else {
    await prisma.successStory.create({
      data: { name: data.name, role: data.role, description: data.description, imageUrl: data.imageUrl, isActive: data.isActive }
    })
  }
  revalidatePath('/admin/cms')
  revalidatePath('/')
}

export async function deleteSuccessStory(id: string) {
  await requireAdmin()
  await prisma.successStory.delete({ where: { id } })
  revalidatePath('/admin/cms')
  revalidatePath('/')
}

// --- Settings ---
export async function getGlobalSettings() {
  await requireAdmin()
  let settings = await prisma.globalSettings.findUnique({ where: { id: 'settings' } })
  if (!settings) {
    settings = await prisma.globalSettings.create({
      data: { id: 'settings', currentPrice: 40000, sessionDuration: 30, depositPercentage: 50 }
    })
  }
  return settings
}

export async function updateGlobalSettings(data: { currentPrice: number, sessionDuration: number, depositPercentage: number }) {
  const user = await requireAdmin()
  const settings = await getGlobalSettings()
  if (Number(settings.currentPrice) !== data.currentPrice) {
    await prisma.priceLog.create({ data: { price: data.currentPrice, adminId: user.id! } })
  }
  await prisma.globalSettings.update({
    where: { id: 'settings' },
    data: { currentPrice: data.currentPrice, sessionDuration: data.sessionDuration, depositPercentage: data.depositPercentage }
  })
  revalidatePath('/admin/settings')
  revalidatePath('/booking')
}

export async function getWorkSchedule() {
  await requireAdmin()
  return await prisma.workSchedule.findMany({ orderBy: { dayOfWeek: 'asc' } })
}

export async function updateWorkSchedule(schedule: { dayOfWeek: number, startTime: string, endTime: string, isActive: boolean }[]) {
  await requireAdmin()
  for (const day of schedule) {
    await prisma.workSchedule.upsert({
      where: { dayOfWeek: day.dayOfWeek },
      update: { startTime: day.startTime, endTime: day.endTime, isActive: day.isActive },
      create: { dayOfWeek: day.dayOfWeek, startTime: day.startTime, endTime: day.endTime, isActive: day.isActive }
    })
  }
  revalidatePath('/admin/settings')
}

export async function addAvailabilityOverride(data: { date: Date, startTime: string, endTime: string }) {
  await requireAdmin()
  const override = await prisma.availabilityOverride.upsert({
    where: { date: data.date },
    update: { startTime: data.startTime, endTime: data.endTime },
    create: { date: data.date, startTime: data.startTime, endTime: data.endTime }
  })
  revalidatePath('/admin/settings')
  return override
}

export async function getAvailabilityOverrides() {
  await requireAdmin()
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return await prisma.availabilityOverride.findMany({
    where: { date: { gte: today } },
    orderBy: { date: 'asc' }
  })
}

export async function deleteAvailabilityOverride(id: string) {
  await requireAdmin()
  await prisma.availabilityOverride.delete({ where: { id } })
  revalidatePath('/admin/settings')
}

export async function getBlockoutDates() {
  await requireAdmin()
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return await prisma.blockoutDate.findMany({
    where: { date: { gte: today } },
    orderBy: { date: 'asc' }
  })
}

export async function addBlockoutDate(date: Date, reason?: string) {
  await requireAdmin()
  const blockout = await prisma.blockoutDate.upsert({
    where: { date },
    update: { reason },
    create: { date, reason }
  })
  revalidatePath('/admin/settings')
  return blockout
}

export async function deleteBlockoutDate(id: string) {
  await requireAdmin()
  await prisma.blockoutDate.delete({ where: { id } })
  revalidatePath('/admin/settings')
}

// --- Turnos Fijos Semanales ---
export async function getRecurringSlots() {
  await requireAdmin()
  const slots = await prisma.recurringSlot.findMany({
    where: { isActive: true },
    include: { patient: { select: { id: true, name: true, email: true, phoneNumber: true } } },
    orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }]
  })
  return slots.map((s: any) => ({
    ...s,
    createdAt: s.createdAt.toISOString(),
    updatedAt: s.updatedAt.toISOString(),
  }))
}

export async function createRecurringSlot(data: { dayOfWeek: number, startTime: string, patientId: string }) {
  await requireAdmin()
  const existing = await prisma.recurringSlot.findUnique({
    where: { dayOfWeek_startTime: { dayOfWeek: data.dayOfWeek, startTime: data.startTime } }
  })
  if (existing && existing.isActive) {
    throw new Error('Ya existe un turno fijo en ese día y horario')
  }
  if (existing && !existing.isActive) {
    await prisma.recurringSlot.update({
      where: { id: existing.id },
      data: { patientId: data.patientId, isActive: true }
    })
  } else {
    await prisma.recurringSlot.create({
      data: { dayOfWeek: data.dayOfWeek, startTime: data.startTime, patientId: data.patientId }
    })
  }
  revalidatePath('/admin/turnos-fijos')
  revalidatePath('/')
}

export async function deleteRecurringSlot(id: string) {
  await requireAdmin()
  await prisma.recurringSlot.update({
    where: { id },
    data: { isActive: false }
  })
  revalidatePath('/admin/turnos-fijos')
  revalidatePath('/')
}

export async function searchPatients(query: string) {
  await requireAdmin()
  if (!query || query.length < 2) return []
  return await prisma.user.findMany({
    where: {
      role: 'PATIENT',
      OR: [
        { name: { contains: query, mode: 'insensitive' } },
        { email: { contains: query, mode: 'insensitive' } },
        { phoneNumber: { contains: query } },
      ]
    },
    select: { id: true, name: true, email: true, phoneNumber: true },
    take: 10
  })
}
