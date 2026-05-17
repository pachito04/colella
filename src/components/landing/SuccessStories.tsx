'use client'

import { motion } from 'framer-motion'
import Image from 'next/image'
import { useEffect, useState } from 'react'
import { getPublicSuccessStories } from '@/app/public-stories'
import { ChevronLeft, ChevronRight } from 'lucide-react'

type Story = {
    id: string
    name: string
    role: string
    description: string | null
    imageUrl: string | null
    images?: string[]
}

function StoryCard({ athlete, index }: { athlete: Story, index: number }) {
  const gallery = (athlete.images && athlete.images.length > 0)
    ? athlete.images
    : (athlete.imageUrl ? [athlete.imageUrl] : [])
  const [idx, setIdx] = useState(0)
  const hasMultiple = gallery.length > 1
  const current = gallery[idx] ?? null

  const prev = (e: React.MouseEvent) => { e.preventDefault(); setIdx(i => (i - 1 + gallery.length) % gallery.length) }
  const next = (e: React.MouseEvent) => { e.preventDefault(); setIdx(i => (i + 1) % gallery.length) }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      viewport={{ once: true }}
      className="group relative overflow-hidden rounded-[2rem] bg-neutral-900 shadow-md aspect-[4/5] border border-neutral-800"
    >
      <div className="absolute inset-0 grayscale transition-all duration-700 group-hover:grayscale-0">
        <div className="h-full w-full bg-neutral-800 relative">
          {current ? (
            <img src={current} alt={athlete.name} className="w-full h-full object-cover object-top transition-opacity duration-300" />
          ) : (
            <div className="flex items-center justify-center h-full text-neutral-600">Sin Imagen</div>
          )}
        </div>
      </div>

      {hasMultiple && (
        <>
          <button onClick={prev} aria-label="Anterior" className="absolute top-1/2 -translate-y-1/2 left-3 z-20 h-9 w-9 rounded-full bg-black/50 hover:bg-black/80 text-white backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button onClick={next} aria-label="Siguiente" className="absolute top-1/2 -translate-y-1/2 right-3 z-20 h-9 w-9 rounded-full bg-black/50 hover:bg-black/80 text-white backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <ChevronRight className="h-5 w-5" />
          </button>
          <div className="absolute top-4 right-4 z-20 bg-black/60 backdrop-blur-md text-white text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full">
            {idx + 1}/{gallery.length}
          </div>
        </>
      )}

      <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/50 to-transparent opacity-90 transition-opacity duration-500" />

      <div className="absolute bottom-0 left-0 right-0 p-8 text-white transform transition-transform duration-500 translate-y-2 group-hover:translate-y-0">
        <h3 className="text-2xl font-bold mb-1">{athlete.name}</h3>
        <p className="text-teal-400 font-bold uppercase tracking-wider text-xs mb-3">{athlete.role}</p>
        <div className="grid grid-rows-[0fr] group-hover:grid-rows-[1fr] transition-[grid-template-rows] duration-500">
          <div className="overflow-hidden">
            {athlete.description && (
              <p className="text-gray-300 text-sm leading-relaxed opacity-0 group-hover:opacity-100 transition-opacity duration-500 delay-100 line-clamp-3">
                {athlete.description}
              </p>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  )
}

export function SuccessStories() {
  const [stories, setStories] = useState<Story[]>([])

  useEffect(() => {
    getPublicSuccessStories().then(data => setStories(data as any))
  }, [])

  if (stories.length === 0) return null

  return (
    <section className="relative bg-transparent py-20">
      <div className="container mx-auto px-4">
        <h2 className="mb-12 text-center text-3xl font-bold font-display text-white">
          Casos de Éxito
        </h2>
        
        <div className="grid gap-8 md:grid-cols-3">
          {stories.map((athlete, index) => (
            <StoryCard key={athlete.id} athlete={athlete} index={index} />
          ))}
        </div>
      </div>
    </section>
  )
}
