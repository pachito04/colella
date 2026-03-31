import { auth } from "@/auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { 
  Calendar, 
  Settings, 
  Star, 
  LayoutDashboard, 
  ArrowLeft,
  User,
  Menu,
  Users,
  BarChart2
} from "lucide-react"
import { LogoutButton } from "./LogoutButton"
import { AdminMobileNav } from "./AdminMobileNav"


import logoIso from "../../../public/assets/logo/iso_sobre_color.jpg"

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()

  if (!session?.user || session.user.role !== "ADMIN") {
    redirect("/")
  }

  const navItems = [
    { href: "/admin", label: "Agenda del Día", icon: Calendar },
    { href: "/admin/pacientes", label: "Pacientes", icon: Users },
    { href: "/admin/stats", label: "Estadísticas Web", icon: BarChart2 },
    { href: "/admin/cms", label: "Casos de Éxito", icon: Star },
    { href: "/admin/settings", label: "Configuración General", icon: Settings },
  ]

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-neutral-950">
      {/* Sidebar Desktop */}
      <aside className="hidden md:flex w-72 flex-col bg-[var(--color-brand-dark)] text-white shadow-2xl z-20">
        <div className="p-8 border-b border-teal-800/40">
          <Link href="/admin" className="flex items-center gap-4 group transition-transform hover:scale-[1.02]">
             <div className="relative h-11 w-11 overflow-hidden rounded-xl bg-white p-1.5 shadow-inner">
                <Image
                  src={logoIso}
                  alt="Logo"
                  fill
                  className="object-cover"
                />
             </div>
             <div>
                <h2 className="text-lg font-bold font-display tracking-tight leading-none text-white">Panel Admin</h2>
                <p className="text-[10px] uppercase tracking-widest text-teal-400 font-bold mt-1.5 opacity-80">Gestión Profesional</p>
             </div>
          </Link>
        </div>

        <nav className="flex-1 px-4 py-8 space-y-1.5">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href}>
              <Button 
                variant="ghost" 
                className="w-full justify-start text-teal-100/90 hover:text-white hover:bg-white/10 transition-all font-semibold py-6 rounded-xl group"
              >
                <item.icon className="mr-3 h-5 w-5 opacity-70 group-hover:opacity-100 transition-opacity" />
                {item.label}
              </Button>
            </Link>
          ))}
        </nav>

        <div className="p-6 border-t border-teal-800/40 space-y-3">
          <p className="px-4 text-[10px] font-bold text-teal-500 uppercase tracking-widest mb-2">Cuenta</p>
          <div className="flex items-center gap-3 px-4 mb-4">
             <div className="h-8 w-8 rounded-full bg-teal-500/20 flex items-center justify-center border border-teal-500/30">
                <User className="h-4 w-4 text-teal-300" />
             </div>
             <div className="overflow-hidden">
                <p className="text-xs font-bold truncate text-white">{session.user.name}</p>
                <p className="text-[10px] text-teal-400 truncate opacity-70">Administrador</p>
             </div>
          </div>
          
          <Link href="/">
             <Button variant="ghost" className="w-full justify-start text-teal-100/60 hover:text-white hover:bg-white/5 py-5 rounded-xl text-xs">
                <ArrowLeft className="mr-3 h-4 w-4 opacity-50" />
                Volver al Sitio
             </Button>
          </Link>
          <LogoutButton />
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        <AdminMobileNav user={session.user} />

        {/* Dynamic Content */}
        <main className="flex-1 overflow-y-auto bg-gray-50/50 dark:bg-neutral-950 scroll-smooth">
          <div className="max-w-7xl mx-auto p-6 md:p-10 lg:p-12">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
