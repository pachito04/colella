
import { getAppointments, getDashboardStats } from "./actions"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { Calendar, Users, CheckCircle, TrendingUp, Clock, Wallet, Repeat, UserPlus } from "lucide-react"
import { AppointmentManager } from "./AppointmentManager"
import Link from "next/link"

export default async function AdminDashboard() {
  const [appointments, stats] = await Promise.all([
    getAppointments(),
    getDashboardStats()
  ])
  
  return (
    <div className="space-y-10 pb-20">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-gray-200 dark:border-neutral-800 pb-8">
        <div>
          <h1 className="text-4xl font-extrabold font-display tracking-tight text-gray-900 dark:text-white">Mi Agenda</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-2 font-medium">Gestión de turnos y pacientes.</p>
        </div>
        <div className="bg-white dark:bg-neutral-800 px-5 py-3 rounded-2xl shadow-sm border dark:border-neutral-700 flex items-center gap-3">
          <div className="p-2 bg-teal-50 dark:bg-teal-900/30 rounded-lg">
            <Calendar className="h-5 w-5 text-teal-600 dark:text-teal-400" />
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider font-bold text-gray-400">Hoy es</p>
            <p className="text-sm font-bold capitalize">{format(new Date(), "EEEE d 'de' MMMM", { locale: es })}</p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Link href="/admin/pacientes" className="bg-white dark:bg-neutral-900 rounded-2xl border border-gray-100 dark:border-neutral-800 p-5 hover:border-teal-500/30 transition-colors">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-teal-50 dark:bg-teal-900/20 rounded-xl">
              <Users className="h-4 w-4 text-teal-600 dark:text-teal-400" />
            </div>
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Pacientes</span>
          </div>
          <p className="text-3xl font-black text-gray-900 dark:text-white">{stats.totalPatients}</p>
          <p className="text-xs text-gray-400 mt-1">registrados en total</p>
        </Link>

        <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-gray-100 dark:border-neutral-800 p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-green-50 dark:bg-green-900/20 rounded-xl">
              <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
            </div>
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Confirmados</span>
          </div>
          <p className="text-3xl font-black text-gray-900 dark:text-white">{stats.totalConfirmed}</p>
          <p className="text-xs text-gray-400 mt-1">sesiones históricas</p>
        </div>

        <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-gray-100 dark:border-neutral-800 p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
              <TrendingUp className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </div>
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Este mes</span>
          </div>
          <p className="text-3xl font-black text-gray-900 dark:text-white">{stats.thisMonthConfirmed}</p>
          <p className="text-xs text-gray-400 mt-1">sesiones confirmadas</p>
        </div>

        <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-gray-100 dark:border-neutral-800 p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-amber-50 dark:bg-amber-900/20 rounded-xl">
              <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            </div>
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Próximos</span>
          </div>
          <p className="text-3xl font-black text-gray-900 dark:text-white">{stats.upcomingCount}</p>
          <p className="text-xs text-gray-400 mt-1">turnos agendados</p>
        </div>

        <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-gray-100 dark:border-neutral-800 p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl">
              <Wallet className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Cash en señas</span>
          </div>
          <p className="text-3xl font-black text-gray-900 dark:text-white">${stats.estimatedCashCollectedTotal.toLocaleString('es-AR')}</p>
          <p className="text-xs text-gray-400 mt-1">estimado acumulado</p>
        </div>

        <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-gray-100 dark:border-neutral-800 p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-teal-50 dark:bg-teal-900/20 rounded-xl">
              <Wallet className="h-4 w-4 text-teal-600 dark:text-teal-400" />
            </div>
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Cobros del mes</span>
          </div>
          <p className="text-3xl font-black text-gray-900 dark:text-white">${stats.estimatedMonthDeposits.toLocaleString('es-AR')}</p>
          <p className="text-xs text-gray-400 mt-1">estimado por señas</p>
        </div>

        <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-gray-100 dark:border-neutral-800 p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-violet-50 dark:bg-violet-900/20 rounded-xl">
              <Users className="h-4 w-4 text-violet-600 dark:text-violet-400" />
            </div>
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Clientes / semana</span>
          </div>
          <p className="text-3xl font-black text-gray-900 dark:text-white">{stats.weeklyUniqueClients}</p>
          <p className="text-xs text-gray-400 mt-1">únicos esta semana</p>
        </div>

        <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-gray-100 dark:border-neutral-800 p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-cyan-50 dark:bg-cyan-900/20 rounded-xl">
              <Repeat className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
            </div>
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Recurrentes</span>
          </div>
          <p className="text-3xl font-black text-gray-900 dark:text-white">{stats.recurringClients}</p>
          <p className="text-xs text-gray-400 mt-1">2+ sesiones confirmadas</p>
        </div>

        <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-gray-100 dark:border-neutral-800 p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl">
              <UserPlus className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
            </div>
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Clientes nuevos</span>
          </div>
          <p className="text-3xl font-black text-gray-900 dark:text-white">{stats.newClientsThisMonth}</p>
          <p className="text-xs text-gray-400 mt-1">altas del mes</p>
        </div>
      </div>

      <AppointmentManager appointments={appointments} />
    </div>
  )
}
