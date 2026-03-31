'use client'

import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CalendarIcon, Clock, CreditCard, RefreshCw } from "lucide-react"
import { format, addMinutes, isBefore } from "date-fns"
import { es } from "date-fns/locale"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { toast } from "sonner"
import { cancelAppointment } from "./actions"
import { getAppointmentPaymentUrl } from "@/app/actions"
import { useState } from "react"
import { cn } from "@/lib/utils"

interface Appointment {
  id: string
  datetime: Date
  status: 'PENDING' | 'CONFIRMED' | 'CANCELLED'
  createdAt: Date
}

interface AppointmentCardProps {
  appointment: Appointment
}

export function AppointmentCard({ appointment }: AppointmentCardProps) {
  const [isCancelling, setIsCancelling] = useState(false)
  const [isPaying, setIsPaying] = useState(false)

  // Calculate Expiration
  // 15 minutes TTL
  const RESERVATION_TIMEOUT_MINUTES = 15
  const expirationTime = addMinutes(new Date(appointment.createdAt), RESERVATION_TIMEOUT_MINUTES)
  const isExpired = appointment.status === 'PENDING' && isBefore(expirationTime, new Date())

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'CONFIRMED':
        return <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-green-200">Confirmado</Badge>
      case 'PENDING':
        if (isExpired) {
            return <Badge variant="outline" className="text-gray-400 border-gray-200 bg-gray-50">Vencido</Badge>
        }
        return <Badge className="bg-yellow-100 text-yellow-700 hover:bg-yellow-100 border-yellow-200 animate-pulse">Pendiente de Pago</Badge>
      case 'CANCELLED':
        return <Badge variant="destructive">Cancelado</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  const handleCancel = async () => {
    setIsCancelling(true)
    const result = await cancelAppointment(appointment.id)
    setIsCancelling(false)

    if (result.success) {
      toast.success(result.message)
    } else {
      toast.error(result.message)
    }
  }

  const handlePayment = async () => {
      setIsPaying(true)
      const res = await getAppointmentPaymentUrl(appointment.id)
      setIsPaying(false)
      
      if (res.success && res.url) {
          window.open(res.url, '_blank')
      } else {
          toast.error(res.error || "Error al generar el link de pago")
      }
  }

  const isCancellable = (appointment.status === 'PENDING' || appointment.status === 'CONFIRMED') && new Date(appointment.datetime) > new Date() && !isExpired

  return (
    <Card className={cn(
        "overflow-hidden bg-white dark:bg-neutral-900 border-gray-100 dark:border-neutral-800 transition-shadow",
        isExpired ? "opacity-60 grayscale-[0.5]" : "hover:shadow-md"
    )}>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-6 gap-4">
        <div className="flex items-start gap-4">
          <div className={cn("p-3 rounded-lg", isExpired ? "bg-gray-100 text-gray-400" : "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400")}>
            <CalendarIcon className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-semibold text-lg text-gray-900 dark:text-gray-100">
              {format(new Date(appointment.datetime), "EEEE d 'de' MMMM", { locale: es })}
            </h3>
            <p className="text-gray-500 dark:text-gray-400 flex items-center gap-2">
              <Clock className="w-4 h-4" />
              {format(new Date(appointment.datetime), "HH:mm")} hs
            </p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-3 w-full sm:w-auto">
          <div className="flex items-center gap-4 justify-between w-full sm:w-auto sm:justify-end">
             {getStatusBadge(appointment.status)}
          </div>
          
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              {appointment.status === 'PENDING' && !isExpired && (
                  <Button 
                    size="sm" 
                    className="bg-green-600 hover:bg-green-700 text-white w-full sm:w-auto"
                    onClick={handlePayment}
                    disabled={isPaying}
                  >
                      {isPaying ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <CreditCard className="mr-2 h-4 w-4" />}
                      Pagar Seña
                  </Button>
              )}

              {isCancellable && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" size="sm" className="w-full sm:w-auto text-red-500 hover:text-red-700 hover:bg-red-50 border-red-200">
                      Cancelar
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>¿Estás seguro de cancelar este turno?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Ten en cuenta que las cancelaciones deben realizarse con al menos 24 horas de anticipación para no perder la seña. Esta acción es irreversible.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Volver</AlertDialogCancel>
                      <AlertDialogAction 
                        onClick={handleCancel}
                        className="bg-red-600 hover:bg-red-700 focus:ring-red-600 text-white"
                      >
                        {isCancelling ? "Cancelando..." : "Sí, Cancelar Turno"}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
          </div>
        </div>
      </div>
    </Card>
  )
}
