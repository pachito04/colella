'use client'

import { motion } from 'framer-motion'
import Image from 'next/image'
import { Button } from '@/components/ui/button'

export function HeroSection() {
  const scrollToBooking = () => {
    const element = document.getElementById('booking')
    element?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <section className="relative flex min-h-[90vh] flex-col items-center justify-center overflow-hidden px-4 md:px-8 bg-transparent py-20">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="relative mb-8 h-48 w-48 overflow-hidden rounded-full border-4 border-teal-500 shadow-[0_0_30px_rgba(20,184,166,0.5)] md:h-64 md:w-64"
      >
        <div className="absolute inset-0 bg-neutral-900">
          <Image
            src="/assets/profile/iso_sobre_color.jpg"
            alt="Lic. Federico Colella"
            fill
            className="object-cover"
            priority
          />
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.5 }}
        className="text-center max-w-3xl"
      >
        <h1 className="mb-2 text-balance text-4xl font-bold tracking-tight text-white md:text-6xl lg:text-7xl font-display">
          Lic. Federico Colella
        </h1>
        <p className="mb-6 text-xl font-semibold text-teal-400 md:text-2xl">
          Terapia Manual Fascial & Entrenamiento Físico Adaptado
        </p>
        
        <p className="mb-8 text-lg text-gray-300 leading-relaxed max-w-2xl mx-auto">
          Recuperación funcional mediante un método innovador que integra la <strong className="text-white">Terapia Manual Fascial</strong> con el <strong className="text-white">Entrenamiento Físico Adaptado</strong>, basado en evidencia científica de vanguardia y una intervención personalizada de alta precisión.
        </p>

        {/* Credentials / Trust Badges */}
        <div className="mb-10 flex flex-wrap justify-center gap-4 text-xs md:text-sm font-semibold text-teal-200">
          {[
            "Co-fundador de Adapted Postural Training",
            "Director en GAP Salud",
            "Master Teacher en Pilates Terapéutico",
            "Especialista en Biomecánica"
          ].map((badge, idx) => (
            <motion.span
              key={idx}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.5 + idx * 0.1 }}
              className="rounded-full bg-teal-950/50 px-4 py-2 shadow-sm border border-teal-500/20 backdrop-blur-sm"
            >
              {badge}
            </motion.span>
          ))}
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.5 }}
      >
        <Button
          size="lg"
          onClick={scrollToBooking}
          className="h-14 px-10 text-lg font-bold shadow-[0_0_20px_rgba(20,184,166,0.3)] hover:shadow-[0_0_30px_rgba(20,184,166,0.5)] transition-all hover:scale-105 rounded-full bg-teal-600 hover:bg-teal-500 text-white border-none"
        >
          AGENDÁ TU SESIÓN
        </Button>
      </motion.div>
    </section>
  )
}
