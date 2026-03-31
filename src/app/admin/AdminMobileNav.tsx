'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Menu, X, Calendar, Star, Settings, User, ArrowLeft, LogOut, Users, BarChart2 } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { signOut } from 'next-auth/react'
import { AnimatePresence, motion } from 'framer-motion'
import { cn } from '@/lib/utils'

export function AdminMobileNav({ user }: { user: { name?: string | null, email?: string | null } }) {
  const [isOpen, setIsOpen] = useState(false)

  const navItems = [
    { href: "/admin", label: "Agenda del Día", icon: Calendar },
    { href: "/admin/pacientes", label: "Pacientes", icon: Users },
    { href: "/admin/stats", label: "Estadísticas Web", icon: BarChart2 },
    { href: "/admin/cms", label: "Casos de Éxito", icon: Star },
    { href: "/admin/settings", label: "Configuración General", icon: Settings },
  ]

  return (
    <>
      <header className="md:hidden bg-[var(--color-brand-dark)] text-white px-6 py-4 flex items-center justify-between shadow-lg z-30 relative">
        <Link href="/admin" className="flex items-center gap-3">
            <div className="relative h-9 w-9 overflow-hidden rounded-lg bg-white p-1">
                <Image src="/assets/logo/iso_sobre_color.jpg" alt="Logo" fill className="object-cover" />
            </div>
            <span className="font-bold font-display text-lg">Admin</span>
        </Link>
        <div className="flex items-center gap-3">
             <Button 
                variant="ghost" 
                size="icon" 
                className="text-white hover:bg-white/10"
                onClick={() => setIsOpen(true)}
             >
                <Menu className="h-6 w-6" />
             </Button>
        </div>
      </header>

      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div 
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               exit={{ opacity: 0 }}
               onClick={() => setIsOpen(false)}
               className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 md:hidden"
            />
            
            {/* Drawer */}
            <motion.div
               initial={{ x: '100%' }}
               animate={{ x: 0 }}
               exit={{ x: '100%' }}
               transition={{ type: 'spring', damping: 25, stiffness: 200 }}
               className="fixed inset-y-0 right-0 w-[80%] max-w-sm bg-[var(--color-brand-dark)] text-white shadow-2xl z-50 md:hidden flex flex-col"
            >
               <div className="p-6 border-b border-teal-800/40 flex items-center justify-between">
                  <span className="font-bold font-display text-xl">Menú</span>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="text-teal-200 hover:text-white hover:bg-white/10"
                    onClick={() => setIsOpen(false)}
                  >
                    <X className="h-6 w-6" />
                  </Button>
               </div>

               <div className="flex-1 overflow-y-auto p-4 space-y-2">
                  {navItems.map((item) => (
                    <Link key={item.href} href={item.href} onClick={() => setIsOpen(false)}>
                      <Button 
                        variant="ghost" 
                        className="w-full justify-start text-teal-100/90 hover:text-white hover:bg-white/10 transition-all font-semibold py-6 rounded-xl group text-base"
                      >
                        <item.icon className="mr-3 h-5 w-5 opacity-70 group-hover:opacity-100 transition-opacity" />
                        {item.label}
                      </Button>
                    </Link>
                  ))}
               </div>

               <div className="p-6 border-t border-teal-800/40 space-y-3 bg-black/10">
                  <div className="flex items-center gap-3 px-2 mb-4">
                     <div className="h-10 w-10 rounded-full bg-teal-500/20 flex items-center justify-center border border-teal-500/30">
                        <User className="h-5 w-5 text-teal-300" />
                     </div>
                     <div className="overflow-hidden">
                        <p className="text-sm font-bold truncate text-white">{user.name}</p>
                        <p className="text-xs text-teal-400 truncate opacity-70">Administrador</p>
                     </div>
                  </div>
                  
                  <Link href="/" onClick={() => setIsOpen(false)}>
                     <Button variant="ghost" className="w-full justify-start text-teal-100/60 hover:text-white hover:bg-white/5 py-4 rounded-xl text-sm">
                        <ArrowLeft className="mr-3 h-4 w-4 opacity-50" />
                        Volver al Sitio
                     </Button>
                  </Link>
                  
                  <Button 
                    variant="ghost" 
                    onClick={() => signOut()}
                    className="w-full justify-start text-red-300 hover:text-red-100 hover:bg-red-900/30 py-4 rounded-xl text-sm"
                  >
                    <LogOut className="mr-3 h-4 w-4" />
                    Cerrar Sesión
                  </Button>
               </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
