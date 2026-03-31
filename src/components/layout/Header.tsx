'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useSession, signOut, signIn } from 'next-auth/react'

import { usePathname } from 'next/navigation'

export function Header() {
  const pathname = usePathname()
  const { data: session } = useSession()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  
  const { scrollY } = useScroll()
  const headerOpacity = useTransform(scrollY, [0, 100], [0, 1])
  
  // Mobile menu still triggers solid background
  const bgOpacity = mobileMenuOpen ? 1 : headerOpacity

  const isAdmin = session?.user?.role === 'ADMIN'

  // Ocultar el header en el panel de administrador
  if (pathname?.startsWith('/admin')) return null

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' })
      setMobileMenuOpen(false)
    }
  }

  return (
    <motion.header
      className="fixed top-0 z-50 w-full px-4 md:px-8 py-3"
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.5 }}
    >
        {/* Background Layer */}
        <motion.div 
            className="absolute inset-0 bg-neutral-900/80 backdrop-blur-md shadow-sm -z-10 border-b border-white/5"
            style={{ opacity: bgOpacity }}
        />

      <div className="mx-auto flex max-w-7xl items-center justify-between">
        {/* Left Side: Logo + Admin Panel */}
        <div className="flex items-center gap-6">
            <Link 
              href="/" 
              className="flex items-center gap-3 group relative z-50"
              onClick={(e) => {
                if (window.location.pathname === '/') {
                  e.preventDefault();
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                  setMobileMenuOpen(false);
                }
              }}
            >
              <div className="relative h-12 w-12 overflow-hidden rounded-md transition-transform group-hover:scale-105">
                <Image
                  src="/assets/logo/iso_sobre_color.jpg"
                  alt="Logo Federico Colella"
                  fill
                  className="object-cover"
                />
              </div>
              <span className={cn(
                "text-xl font-bold tracking-tight font-display transition-colors text-white",
                 mobileMenuOpen ? "text-white" : ""
              )}>
                Federico Colella
              </span>
            </Link>

            {isAdmin && (
                 <Link href="/admin" className="hidden md:block">
                   <Button variant="ghost" size="sm" className="text-sm font-bold text-gray-400 hover:text-teal-400 hover:bg-teal-900/20 transition-colors">
                     Panel Admin
                   </Button>
                 </Link>
            )}
        </div>

        {/* Desktop Navigation */}
        <nav className="hidden items-center gap-6 md:flex">
          <Link 
             href="/"
             className="text-sm font-medium text-gray-300 hover:text-teal-400 transition-colors"
          >
            Inicio
          </Link>

          <button 
            onClick={() => scrollToSection('methodology')}
            className="text-sm font-medium text-gray-300 hover:text-teal-400 transition-colors"
          >
            La Metodología
          </button>
          <button 
            onClick={() => scrollToSection('about')}
            className="text-sm font-medium text-gray-300 hover:text-teal-400 transition-colors"
          >
            Sobre Mí
          </button>
          
          {session && (
              <Link
                href="/dashboard/appointments"
                className="text-sm font-medium text-gray-300 hover:text-teal-400 transition-colors"
              >
                Mis Turnos
              </Link>
          )}

          {session ? (
             <button 
               onClick={() => signOut()}
               className="text-sm font-medium text-gray-400 hover:text-red-400 transition-colors"
             >
               Cerrar Sesión
             </button>
          ) : (
            <button 
              onClick={() => signIn('google')}
              className="text-sm font-medium text-gray-400 hover:text-teal-400 transition-colors"
            >
              Iniciar Sesión
            </button>
          )}

          <Button 
            variant="default" 
            size="sm"
            onClick={() => scrollToSection('booking')}
            className="font-bold ml-2 bg-teal-600 hover:bg-teal-700 text-white shadow-lg shadow-teal-500/20"
          >
            Reservar
          </Button>
        </nav>

        {/* Mobile Menu Toggle */}
        <div className="md:hidden flex items-center gap-4 z-50">
           <Button 
            variant="default" 
            size="sm"
            onClick={() => scrollToSection('booking')}
            className={cn("font-bold text-xs px-4 h-9 bg-teal-600 hover:bg-teal-700 text-white", mobileMenuOpen ? "hidden" : "flex")}
          >
            Reservar
          </Button>
          <button 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 text-white"
          >
             {mobileMenuOpen ? (
                 <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 18 12"/></svg>
             ) : (
                 <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" x2="20" y1="12" y2="12"/><line x1="4" x2="20" y1="6" y2="6"/><line x1="4" x2="20" y1="18" y2="18"/></svg>
             )}
          </button>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
             initial={{ opacity: 0, height: 0 }}
             animate={{ opacity: 1, height: '100vh' }}
             exit={{ opacity: 0, height: 0 }}
             className="fixed inset-0 top-0 left-0 w-full bg-neutral-950/95 backdrop-blur-xl z-40 flex flex-col pt-28 px-6 border-b border-white/5"
          >
             <nav className="flex flex-col gap-8 text-2xl font-bold font-display text-white">
                {isAdmin && (
                   <Link 
                     href="/admin"
                     onClick={() => setMobileMenuOpen(false)}
                     className="text-left border-b border-white/10 pb-4 text-teal-400"
                   >
                     Panel Admin
                   </Link>
                )}
                <motion.button 
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.1 }}
                  onClick={() => scrollToSection('methodology')}
                  className="text-left border-b border-white/10 pb-4 hover:text-teal-400 transition-colors"
                >
                  La Metodología
                </motion.button>
                <motion.button 
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  onClick={() => scrollToSection('about')}
                  className="text-left border-b border-white/10 pb-4 hover:text-teal-400 transition-colors"
                >
                  Sobre Mí
                </motion.button>
                {session && (
                  <Link
                    href="/dashboard/appointments"
                    onClick={() => setMobileMenuOpen(false)}
                    className="text-left border-b border-white/10 pb-4 hover:text-teal-400 transition-colors"
                  >
                    Mis Turnos
                  </Link>
                )}
                {session ? (
                   <button 
                     onClick={() => {
                       signOut();
                       setMobileMenuOpen(false);
                     }}
                     className="text-left border-b border-white/10 pb-4 text-red-400 hover:text-red-300 transition-colors"
                   >
                     Cerrar Sesión
                   </button>
                ) : (
                  <motion.button 
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: 0.25 }}
                    onClick={() => {
                      signIn('google');
                      setMobileMenuOpen(false);
                    }}
                    className="text-left border-b border-white/10 pb-4 text-gray-400 font-medium hover:text-white transition-colors"
                  >
                    Iniciar Sesión
                  </motion.button>
                )}
                <motion.div 
                   initial={{ x: -20, opacity: 0 }}
                   animate={{ x: 0, opacity: 1 }}
                   transition={{ delay: 0.3 }}
                   className="pt-4"
                >
                   <Button 
                    size="lg"
                    className="w-full text-lg h-14 bg-teal-600 hover:bg-teal-700 text-white shadow-xl shadow-teal-500/20 rounded-2xl"
                    onClick={() => scrollToSection('booking')}
                  >
                    Agendá tu Sesión
                  </Button>
                </motion.div>
             </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  )
}
