import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { getUserAppointments } from "./actions"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { CalendarIcon, Clock, AlertCircle } from "lucide-react"
import Link from "next/link"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { AppointmentCard } from "./AppointmentCard"

export default async function AppointmentsPage() {
  const session = await auth()

  if (!session?.user) {
    redirect("/api/auth/signin")
  }

  const { success, data: appointments } = await getUserAppointments()

  if (!success || !appointments) {
    return (
      <div className="container mx-auto py-10 px-4 text-center">
        <h1 className="text-2xl font-bold text-red-600">Error al cargar turnos</h1>
        <p className="text-gray-600">Por favor intenta recargar la página.</p>
      </div>
    )
  }

  const now = new Date()
  const upcomingAppointments = appointments.filter(app => new Date(app.datetime) >= now && app.status !== 'CANCELLED')
  const pastAppointments = appointments.filter(app => new Date(app.datetime) < now || app.status === 'CANCELLED')

  return (
    <div className="min-h-screen bg-neutral-50/50 dark:bg-neutral-950">
        <div className="container mx-auto py-10 px-4 max-w-4xl space-y-8 pt-32">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold font-display text-gray-900 dark:text-white">Mis Turnos</h1>
              <p className="text-gray-500 dark:text-gray-400">Gestiona tus próximas sesiones y revisa tu historial.</p>
            </div>
            <Link href="/#booking">
                <Button className="bg-[var(--color-brand-primary)] hover:bg-[var(--color-brand-primary)]/90 text-white">
                    Reservar Nuevo Turno
                </Button>
            </Link>
          </div>

          {/* Upcoming Appointments */}
          <section>
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2 text-gray-800 dark:text-gray-200">
              <Clock className="w-5 h-5 text-[var(--color-brand-primary)]" />
              Próximos Turnos
            </h2>
            {upcomingAppointments.length === 0 ? (
              <Card className="bg-white/50 dark:bg-neutral-800/50 border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                  <CalendarIcon className="w-12 h-12 text-gray-300 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No tienes turnos próximos</h3>
                  <p className="text-gray-500 dark:text-gray-400 max-w-sm mb-6">
                    ¿Listo para tu próxima sesión? Reserva un turno ahora y comienza tu recuperación.
                  </p>
                    <Link href="/#booking">
                        <Button variant="outline">Ir al Calendario</Button>
                    </Link>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {upcomingAppointments.map((app) => (
                  <AppointmentCard key={app.id} appointment={app} />
                ))}
              </div>
            )}
          </section>

          {/* Cancellation Policy Info */}
          <div className="bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 rounded-xl p-4">
            <p className="text-sm text-blue-800 dark:text-blue-300 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 mt-0.5 shrink-0" />
              <span>
                <strong>Política de Cancelación:</strong> Puedes cancelar o reprogramar tu turno sin costo hasta 24 horas antes de la cita. Pasado ese tiempo, la seña no será reembolsada.
              </span>
            </p>
          </div>

          {/* Past/Cancelled Appointments */}
          {pastAppointments.length > 0 && (
            <section className="pt-8 border-t dark:border-neutral-800">
               <h2 className="text-xl font-semibold mb-4 text-gray-500 dark:text-gray-400">
                Historial
              </h2>
               <div className="grid gap-4 opacity-75">
                {pastAppointments.map((app) => (
                  <AppointmentCard key={app.id} appointment={app} />
                ))}
              </div>
            </section>
          )}
        </div>
    </div>
  )
}
