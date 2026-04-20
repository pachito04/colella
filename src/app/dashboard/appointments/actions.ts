'use server'

import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { refundMercadoPagoPayment } from "@/lib/mercadopago"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

export async function getUserAppointments() {
  const session = await auth()

  if (!session?.user?.id) {
    redirect("/api/auth/signin")
  }

  try {
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const appointments = await prisma.appointment.findMany({
      where: {
        patientId: session.user.id,
        OR: [
            {
                datetime: {
                    gte: new Date() // Future appointments
                }
            },
            {
                datetime: {
                    gte: thirtyDaysAgo // Recent history (last 30 days)
                }
            }
        ]
      },
      select: {
        id: true,
        datetime: true,
        status: true,
        createdAt: true,
      },
      orderBy: {
        datetime: 'asc',
      },
    })
    
    return { success: true, data: appointments }
  } catch (error) {
    console.error("Error fetching user appointments:", error)
    return { success: false, error: "Failed to fetch appointments" }
  }
}

export async function cancelAppointment(appointmentId: string) {
    const session = await auth()

    if (!session?.user?.id) {
        return { success: false, message: "No autenticado" }
    }

    try {
        const appointment = await prisma.appointment.findUnique({
            where: { id: appointmentId },
            select: {
                id: true, datetime: true, status: true, patientId: true,
                depositPaid: true, paymentId: true, type: true
            }
        })

        if (!appointment) {
            return { success: false, message: "Turno no encontrado" }
        }

        if (appointment.patientId !== session.user.id) {
            return { success: false, message: "No tienes permiso para cancelar este turno" }
        }

        if (appointment.status === 'CANCELLED') {
             return { success: false, message: "El turno ya está cancelado" }
        }

        const now = new Date()
        const appointmentDate = new Date(appointment.datetime)

        // Fix: primero chequear si el turno ya pasó
        if (appointmentDate.getTime() < now.getTime()) {
            return {
                success: false,
                message: "Este turno ya pasó, no se puede cancelar."
            }
        }

        const diffInHours = (appointmentDate.getTime() - now.getTime()) / (1000 * 60 * 60)

        if (diffInHours < 24) {
            return {
                success: false,
                message: "No se puede cancelar con menos de 24hs de anticipación. Por favor contáctanos."
            }
        }

        // Intentar reembolso si hay pago registrado
        let refundMsg = ""
        if (appointment.depositPaid && appointment.paymentId) {
            const refund = await refundMercadoPagoPayment(appointment.paymentId)
            if (refund.success) {
                refundMsg = " El reembolso se procesó correctamente en Mercado Pago."
            } else {
                console.error(`Refund failed for appointment ${appointmentId}:`, refund.error)
                refundMsg = " El turno se canceló pero hubo un error procesando el reembolso — nos comunicaremos con vos."
            }
        }

        await prisma.appointment.update({
            where: { id: appointmentId },
            data: { status: 'CANCELLED' }
        })

        revalidatePath('/dashboard/appointments')
        return { success: true, message: "Turno cancelado exitosamente." + refundMsg }

    } catch (error) {
        console.error("Error cancelling appointment:", error)
        return { success: false, message: "Error al cancelar el turno" }
    }
}
