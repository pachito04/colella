export const dynamic = 'force-dynamic'

import { Suspense } from 'react'
import Link from 'next/link'
import { HeroSection } from "@/components/landing/HeroSection"
import { StatsSection } from "@/components/landing/StatsSection"
import { SuccessStories } from "@/components/landing/SuccessStories"
import { BookingWidget } from "@/components/booking/BookingWidget"
import { WhatsAppFloatingButton } from "@/components/ui/WhatsAppFloatingButton"
import { AboutSection } from "@/components/landing/AboutSection"
import { ReviewsSection } from '@/components/landing/ReviewsSection'

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col">
      <HeroSection />
      <StatsSection />
      <section id="methodology">
        <SuccessStories />
      </section>
      <AboutSection />
      <Suspense fallback={<div className="py-24 text-center">Cargando reserva...</div>}>
        <BookingWidget />
      </Suspense>
      <ReviewsSection />
      <WhatsAppFloatingButton />
      <footer className="py-8 text-center text-sm text-gray-500 dark:text-gray-400 space-y-3">
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <p>© {new Date().getFullYear()} Lic. Federico Colella. Todos los derechos reservados.</p>
          <a
            href="https://gachetponzellini.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center rounded-full border border-teal-500/30 px-3 py-1 text-xs font-semibold text-teal-400 hover:bg-teal-500/10 transition-colors"
          >
            Créditos
          </a>
        </div>
        <div className="flex justify-center gap-6">
          <Link href="/privacidad" className="hover:text-teal-400 transition-colors">Política de Privacidad</Link>
          <Link href="/terminos" className="hover:text-teal-400 transition-colors">Términos y Condiciones</Link>
        </div>
      </footer>
    </main>
  )
}
