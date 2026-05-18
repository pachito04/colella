'use server'

import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'
import { refundMercadoPagoPayment } from '@/lib/mercadopago'
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
      medicalFiles: {
        select: {
          id: true,
          fileName: true,
          originalName: true,
          mimeType: true,
          size: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'asc' },
      }
    },
    orderBy: { datetime: 'asc' },
  })
  
  return appointments.map((app: any) => ({
    ...app,
    datetime: app.datetime.toISOString(),
    createdAt: app.createdAt.toISOString(),
    updatedAt: app.updatedAt.toISOString(),
    medicalFiles: Array.isArray(app.medicalFiles) ? app.medicalFiles.map((f: any) => ({
      ...f,
      createdAt: f.createdAt.toISOString(),
    })) : [],
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
          medicalFiles: {
            select: {
              id: true,
              fileName: true,
              originalName: true,
              mimeType: true,
              size: true,
              createdAt: true,
            },
            orderBy: { createdAt: 'asc' },
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
      medicalFiles: Array.isArray(a.medicalFiles) ? a.medicalFiles.map((f: any) => ({
        ...f,
        createdAt: f.createdAt.toISOString(),
      })) : [],
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
          medicalFiles: {
            select: {
              id: true,
              fileName: true,
              originalName: true,
              mimeType: true,
              size: true,
              createdAt: true,
            },
            orderBy: { createdAt: 'asc' },
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
      medicalFiles: Array.isArray(a.medicalFiles) ? a.medicalFiles.map((f: any) => ({
        ...f,
        createdAt: f.createdAt.toISOString(),
      })) : [],
    }))
  }
}

// --- CMS: Success Stories ---
export async function getSuccessStories() {
  await requireAdmin()
  return await prisma.successStory.findMany({
    orderBy: { order: 'asc' },
    include: { images: { orderBy: { order: 'asc' } } }
  })
}

export async function getSuccessStoriesAdmin() {
  await requireAdmin()
  return await prisma.successStory.findMany({
    orderBy: { order: 'asc' },
    include: { images: { orderBy: { order: 'asc' } } }
  })
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

export async function upsertSuccessStory(data: {
  id?: string,
  name: string,
  role: string,
  description?: string | null,
  imageUrl?: string,
  images?: string[],
  isActive: boolean
}) {
  await requireAdmin()
  const images = Array.isArray(data.images) ? data.images.filter(u => u && u.trim()) : []
  const primary = data.imageUrl && data.imageUrl.trim() ? data.imageUrl : (images[0] || null)

  let storyId = data.id
  if (storyId) {
    await prisma.successStory.update({
      where: { id: storyId },
      data: { name: data.name, role: data.role, description: data.description, imageUrl: primary, isActive: data.isActive }
    })
  } else {
    const created = await prisma.successStory.create({
      data: { name: data.name, role: data.role, description: data.description, imageUrl: primary, isActive: data.isActive }
    })
    storyId = created.id
  }

  if (images.length > 0) {
    // Replace all images con la nueva lista, mantiene orden determinista
    await prisma.storyImage.deleteMany({ where: { storyId } })
    await prisma.storyImage.createMany({
      data: images.map((url, idx) => ({ storyId: storyId!, url, order: idx }))
    })
  }

  revalidatePath('/admin/cms')
  revalidatePath('/')
  return { id: storyId }
}

export async function deleteSuccessStory(id: string) {
  await requireAdmin()
  // storyImages se borran en cascada via FK onDelete: Cascade
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

export async function updateGlobalSettings(data: {
  currentPrice: number,
  sessionDuration: number,
  depositPercentage: number,
  paymentAlias?: string | null,
  paymentCbu?: string | null,
  paymentHolder?: string | null,
  vacationMessage?: string | null,
}) {
  const user = await requireAdmin()
  const settings = await getGlobalSettings()
  if (Number(settings.currentPrice) !== data.currentPrice) {
    await prisma.priceLog.create({ data: { price: data.currentPrice, adminId: user.id! } })
  }
  await prisma.globalSettings.update({
    where: { id: 'settings' },
    data: {
      currentPrice: data.currentPrice,
      sessionDuration: data.sessionDuration,
      depositPercentage: data.depositPercentage,
      paymentAlias: data.paymentAlias ?? null,
      paymentCbu: data.paymentCbu ?? null,
      paymentHolder: data.paymentHolder ?? null,
      vacationMessage: data.vacationMessage ?? null,
    }
  })
  revalidatePath('/admin/settings')
  revalidatePath('/booking')
}

export async function getWorkSchedule() {
  await requireAdmin()
  return await prisma.workSchedule.findMany({ orderBy: { dayOfWeek: 'asc' } })
}

export async function updateWorkSchedule(schedule: {
  dayOfWeek: number,
  type?: 'PRESENTIAL' | 'VIRTUAL',
  startTime: string,
  endTime: string,
  isActive: boolean
}[]) {
  await requireAdmin()
  try {
    for (const day of schedule) {
      const type: 'PRESENTIAL' | 'VIRTUAL' = day.type ?? 'PRESENTIAL'
      await prisma.workSchedule.upsert({
        where: { dayOfWeek_type: { dayOfWeek: day.dayOfWeek, type } },
        update: { startTime: day.startTime, endTime: day.endTime, isActive: day.isActive },
        create: { dayOfWeek: day.dayOfWeek, type, startTime: day.startTime, endTime: day.endTime, isActive: day.isActive }
      })
    }
  } catch (e: any) {
    console.error('[updateWorkSchedule] error:', e)
    if (
      String(e?.message || '').includes('dayOfWeek_type') ||
      String(e?.code) === 'P2003' ||
      (String(e?.message || '').toLowerCase().includes('column') && String(e?.message || '').toLowerCase().includes('type'))
    ) {
      throw new Error('La base de datos no tiene la columna `type` en WorkSchedule. Hay que correr `npx prisma migrate deploy` en el VPS.')
    }
    throw new Error(`Error guardando horarios: ${e?.message || 'desconocido'}`)
  }
  revalidatePath('/admin/settings')
  revalidatePath('/')
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

  // Buscar turnos confirmados en este día ANTES de crear el blockout
  const startOfDay = new Date(date)
  startOfDay.setHours(0, 0, 0, 0)
  const endOfDay = new Date(date)
  endOfDay.setHours(23, 59, 59, 999)

  const affectedAppointments = await prisma.appointment.findMany({
    where: {
      datetime: { gte: startOfDay, lte: endOfDay },
      status: { in: ['CONFIRMED', 'PENDING'] }
    },
    include: { patient: true }
  })

  // Cancelar los turnos afectados + refund + notificacion
  if (affectedAppointments.length > 0) {
    await prisma.appointment.updateMany({
      where: { id: { in: affectedAppointments.map(a => a.id) } },
      data: { status: 'CANCELLED' }
    })

    // Intentar reembolso de cada turno pago
    for (const app of affectedAppointments) {
      if (app.depositPaid && app.paymentId) {
        try {
          const refund = await refundMercadoPagoPayment(app.paymentId)
          if (!refund.success) {
            console.error(`[Blockout Refund] Falló para ${app.id}:`, refund.error)
          } else {
            console.log(`[Blockout Refund] OK ${app.id}: ${refund.refundId}`)
          }
        } catch (e) { console.error('[Blockout Refund] Error:', e) }
      }
    }

    // Notificar a cada paciente via n8n (webhook "day-blocked-notify")
    const webhookUrl = 'https://n8n.colella.gachetponzellini.com/webhook/day-blocked-notify'
    for (const app of affectedAppointments) {
      if (app.patient?.phoneNumber) {
        fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            event: 'day_blocked',
            appointmentId: app.id,
            patientName: app.patient.name || 'Paciente',
            phone: app.patient.phoneNumber,
            email: app.patient.email || '',
            originalDatetime: app.datetime.toISOString(),
            reason: reason || 'motivos de fuerza mayor',
            wasRefunded: app.depositPaid && !!app.paymentId,
          })
        }).catch(err => console.error('n8n day blocked notify error:', err))
      }
    }
  }

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

  const patient = await prisma.user.findUnique({ where: { id: data.patientId }, select: { name: true } })

  let slot
  if (existing && !existing.isActive) {
    slot = await prisma.recurringSlot.update({
      where: { id: existing.id },
      data: { patientId: data.patientId, isActive: true, calendarEventId: null }
    })
  } else {
    slot = await prisma.recurringSlot.create({
      data: { dayOfWeek: data.dayOfWeek, startTime: data.startTime, patientId: data.patientId }
    })
  }

  // Sincronizar con Google Calendar via n8n
  const settings = await prisma.globalSettings.findUnique({ where: { id: 'settings' } })
  const webhookUrl = 'https://n8n.colella.gachetponzellini.com/webhook/HFB8jibX8wIjmTdT/webhook/recurring-slot-sync'
  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'create',
        slotId: slot.id,
        dayOfWeek: data.dayOfWeek,
        startTime: data.startTime,
        patientName: patient?.name || 'Paciente',
        sessionDuration: settings?.sessionDuration || 30,
      })
    })
    console.log('[CalendarSync Create]', res.status)
  } catch (e) { console.error('n8n Calendar Sync Error:', e) }

  revalidatePath('/admin/turnos-fijos')
  revalidatePath('/')
}

export async function deleteRecurringSlot(id: string) {
  await requireAdmin()
  const slot = await prisma.recurringSlot.findUnique({ where: { id } })

  await prisma.recurringSlot.update({
    where: { id },
    data: { isActive: false }
  })

  // Eliminar evento de Google Calendar via n8n
  if (slot?.calendarEventId) {
    const webhookUrl = 'https://n8n.colella.gachetponzellini.com/webhook/HFB8jibX8wIjmTdT/webhook/recurring-slot-sync'
    try {
      const res = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'delete',
          slotId: id,
          calendarEventId: slot.calendarEventId,
        })
      })
      console.log('[CalendarSync Delete]', res.status)
    } catch (e) { console.error('n8n Calendar Delete Error:', e) }
  }

  revalidatePath('/admin/turnos-fijos')
  revalidatePath('/')
}

export async function deletePatient(patientId: string) {
  await requireAdmin()

  const patient = await prisma.user.findUnique({
    where: { id: patientId },
    include: {
      appointments: { where: { status: 'CONFIRMED', datetime: { gte: new Date() } } },
      recurringSlots: { where: { isActive: true } },
    }
  })

  if (!patient) throw new Error('Paciente no encontrado')
  if (patient.role === 'ADMIN') throw new Error('No se puede eliminar a un administrador')

  if (patient.appointments.length > 0) {
    throw new Error(`Este paciente tiene ${patient.appointments.length} turno(s) confirmado(s) a futuro. Cancelalos primero antes de eliminarlo.`)
  }

  // Desactivar y borrar de Calendar cualquier turno fijo activo
  for (const slot of patient.recurringSlots) {
    if (slot.calendarEventId) {
      const webhookUrl = 'https://n8n.colella.gachetponzellini.com/webhook/HFB8jibX8wIjmTdT/webhook/recurring-slot-sync'
      try {
        await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'delete',
            slotId: slot.id,
            calendarEventId: slot.calendarEventId,
          })
        })
      } catch (e) { console.error('n8n Calendar Delete on PatientDelete:', e) }
    }
  }

  // Borrar todos los registros relacionados en transacción
  await prisma.$transaction([
    prisma.recurringSlotException.deleteMany({ where: { recurringSlot: { patientId } } }),
    prisma.recurringSlot.deleteMany({ where: { patientId } }),
    prisma.enrollment.deleteMany({ where: { userId: patientId } }),
    prisma.appointment.deleteMany({ where: { patientId } }),
    prisma.user.delete({ where: { id: patientId } }),
  ])

  revalidatePath('/admin/pacientes')
  revalidatePath('/admin')
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

// --- Excepciones de Turnos Fijos ---
export async function addRecurringSlotException(data: { recurringSlotId: string, date: Date, reason?: string }) {
  await requireAdmin()

  // Traer datos del slot ANTES de crear la excepción (necesitamos patient para notificar)
  const slot = await prisma.recurringSlot.findUnique({
    where: { id: data.recurringSlotId },
    include: { patient: true }
  })

  await prisma.recurringSlotException.create({
    data: {
      recurringSlotId: data.recurringSlotId,
      date: data.date,
      reason: data.reason || null,
    }
  })

  // 1) Eliminar la ocurrencia de Google Calendar via n8n (workflow recurring-slot-sync)
  if (slot?.calendarEventId) {
    const webhookUrl = 'https://n8n.colella.gachetponzellini.com/webhook/HFB8jibX8wIjmTdT/webhook/recurring-slot-sync'
    try {
      const res = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'delete-exception',
          slotId: slot.id,
          calendarEventId: slot.calendarEventId,
          dayOfWeek: slot.dayOfWeek,
          startTime: slot.startTime,
          date: data.date.toISOString(),
          patientName: slot.patient?.name || 'Paciente',
          reason: data.reason || null,
        })
      })
      console.log('[CalendarSync DeleteException]', res.status)
    } catch (e) { console.error('n8n Calendar DeleteException Error:', e) }
  }

  // 2) Notificar al paciente por WhatsApp via n8n (workflow day-blocked-notify)
  if (slot?.patient?.phoneNumber) {
    const [hh, mm] = slot.startTime.split(':').map(Number)
    const originalDatetime = new Date(data.date)
    originalDatetime.setUTCHours(hh + 3, mm, 0, 0)

    const webhookUrl = 'https://n8n.colella.gachetponzellini.com/webhook/day-blocked-notify'
    fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event: 'recurring_exception',
        appointmentId: data.recurringSlotId,
        patientName: slot.patient.name || 'Paciente',
        phone: slot.patient.phoneNumber,
        email: slot.patient.email || '',
        originalDatetime: originalDatetime.toISOString(),
        reason: data.reason || 'motivos de fuerza mayor',
        wasRefunded: false,
      })
    }).catch(err => console.error('n8n recurring exception notify error:', err))
  }

  revalidatePath('/admin/turnos-fijos')
  revalidatePath('/')
}

export async function deleteRecurringSlotException(id: string) {
  await requireAdmin()

  // Antes de borrar, traer los datos para re-sincronizar Calendar (re-crear la ocurrencia)
  const exception = await prisma.recurringSlotException.findUnique({
    where: { id },
    include: {
      recurringSlot: {
        include: { patient: { select: { name: true } } }
      }
    }
  })

  await prisma.recurringSlotException.delete({ where: { id } })

  if (exception?.recurringSlot?.calendarEventId) {
    const webhookUrl = 'https://n8n.colella.gachetponzellini.com/webhook/HFB8jibX8wIjmTdT/webhook/recurring-slot-sync'
    try {
      const res = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'restore-exception',
          slotId: exception.recurringSlotId,
          calendarEventId: exception.recurringSlot.calendarEventId,
          dayOfWeek: exception.recurringSlot.dayOfWeek,
          startTime: exception.recurringSlot.startTime,
          date: exception.date.toISOString(),
          patientName: exception.recurringSlot.patient?.name || 'Paciente',
        })
      })
      console.log('[CalendarSync RestoreException]', res.status)
    } catch (e) { console.error('n8n Calendar RestoreException Error:', e) }
  }

  revalidatePath('/admin/turnos-fijos')
  revalidatePath('/')
}

export async function syncAllRecurringSlots() {
  await requireAdmin()

  const slots = await prisma.recurringSlot.findMany({
    where: { isActive: true },
    include: { patient: { select: { name: true } } }
  })

  const settings = await prisma.globalSettings.findUnique({ where: { id: 'settings' } })
  const webhookUrl = 'https://n8n.colella.gachetponzellini.com/webhook/HFB8jibX8wIjmTdT/webhook/recurring-slot-sync'

  let synced = 0
  let failed = 0

  for (const slot of slots) {
    try {
      const res = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          slotId: slot.id,
          dayOfWeek: slot.dayOfWeek,
          startTime: slot.startTime,
          patientName: slot.patient?.name || 'Paciente',
          sessionDuration: settings?.sessionDuration || 30,
        })
      })
      if (res.ok) {
        synced++
        console.log(`[CalendarSync Bulk] OK slotId=${slot.id} day=${slot.dayOfWeek} time=${slot.startTime}`)
      } else {
        failed++
        console.error(`[CalendarSync Bulk] FAIL slotId=${slot.id} status=${res.status}`)
      }
    } catch (e) {
      failed++
      console.error(`[CalendarSync Bulk] ERROR slotId=${slot.id}`, e)
    }
  }

  revalidatePath('/admin/turnos-fijos')
  return { synced, failed, total: slots.length }
}

export async function getRecurringSlotExceptions(recurringSlotId: string) {
  await requireAdmin()
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return await prisma.recurringSlotException.findMany({
    where: { recurringSlotId, date: { gte: today } },
    orderBy: { date: 'asc' }
  })
}

// --- Bloqueo de Horarios Específicos ---
export async function getBlockoutSlots() {
  await requireAdmin()
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const slots = await prisma.blockoutSlot.findMany({
    where: { date: { gte: today } },
    orderBy: [{ date: 'asc' }, { startTime: 'asc' }]
  })
  return slots.map((s: any) => ({
    ...s,
    date: s.date.toISOString(),
    createdAt: s.createdAt.toISOString(),
  }))
}

export async function addBlockoutSlot(data: { date: Date, startTime: string, reason?: string }) {
  await requireAdmin()
  await prisma.blockoutSlot.create({
    data: {
      date: data.date,
      startTime: data.startTime,
      reason: data.reason || null,
    }
  })
  revalidatePath('/admin/settings')
  revalidatePath('/')
}

export async function deleteBlockoutSlot(id: string) {
  await requireAdmin()
  await prisma.blockoutSlot.delete({ where: { id } })
  revalidatePath('/admin/settings')
  revalidatePath('/')
}
