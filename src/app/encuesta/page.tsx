'use client'

import { useState } from 'react'
import Link from 'next/link'

function StarRating({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  const [hovered, setHovered] = useState(0)
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-muted-foreground">{label}</label>
      <div className="flex gap-1">
        {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
          <button
            key={n}
            type="button"
            onMouseEnter={() => setHovered(n)}
            onMouseLeave={() => setHovered(0)}
            onClick={() => onChange(n)}
            className={`w-8 h-8 rounded text-sm font-bold transition-all ${
              n <= (hovered || value)
                ? 'bg-teal-500 text-white'
                : 'bg-accent border border-border text-muted-foreground hover:border-teal-500/50'
            }`}
          >
            {n}
          </button>
        ))}
      </div>
      {value > 0 && <p className="text-xs text-teal-400">{value}/10</p>}
    </div>
  )
}

export default function EncuestaPage({ searchParams }: { searchParams: { phone?: string } }) {
  const [atencion, setAtencion] = useState(0)
  const [recuperacion, setRecuperacion] = useState(0)
  const [servicio, setServicio] = useState(0)
  const [comentario, setComentario] = useState('')
  const [enviado, setEnviado] = useState(false)
  const [loading, setLoading] = useState(false)

  const total = atencion > 0 && recuperacion > 0 && servicio > 0
    ? Math.round((atencion + recuperacion + servicio) / 3 * 10) / 10
    : null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await fetch('/api/encuesta', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientPhone: searchParams.phone || 'desconocido',
          atencion,
          recuperacion,
          servicio,
          total,
          comentario
        })
      })
    } catch (e) {
      // silently fail — no queremos bloquear al usuario
    }
    setEnviado(true)
    setLoading(false)
  }

  if (enviado) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center px-4 py-24">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="flex justify-center">
            <div className="w-16 h-16 rounded-full bg-teal-500/10 border border-teal-500/30 flex items-center justify-center">
              <svg className="w-8 h-8 text-teal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            </div>
          </div>
          <h1 className="text-2xl font-display font-bold text-white">¡Gracias por tu opinión!</h1>
          <p className="text-muted-foreground">Tu feedback ayuda a mejorar la atención para todos los pacientes.</p>
          <Link href="/" className="inline-block px-6 py-3 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-sm font-medium transition-colors">
            Volver al inicio
          </Link>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 py-24">
      <div className="max-w-lg w-full space-y-8">
        <div className="text-center space-y-2">
          <p className="text-teal-400 text-sm font-medium uppercase tracking-wider">Post-sesión</p>
          <h1 className="text-3xl font-display font-bold text-white">¿Cómo fue tu experiencia?</h1>
          <p className="text-muted-foreground">Tu opinión nos ayuda a seguir mejorando. Solo toma 1 minuto.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-accent border border-border rounded-xl p-6 space-y-6">
            <StarRating label="¿Cómo fue la atención del Lic. Colella?" value={atencion} onChange={setAtencion} />
            <div className="border-t border-border" />
            <StarRating label="¿Cómo fue tu recuperación o progreso?" value={recuperacion} onChange={setRecuperacion} />
            <div className="border-t border-border" />
            <StarRating label="¿Cómo calificás el servicio en general?" value={servicio} onChange={setServicio} />
            {total !== null && (
              <>
                <div className="border-t border-border" />
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-white">Puntaje total</span>
                  <span className="text-2xl font-display font-bold text-teal-400">{total}<span className="text-sm text-muted-foreground">/10</span></span>
                </div>
              </>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">
              ¿Querés dejarnos algún comentario? <span className="text-xs">(opcional)</span>
            </label>
            <textarea
              value={comentario}
              onChange={(e) => setComentario(e.target.value)}
              rows={4}
              placeholder="Contanos tu experiencia, sugerencias o lo que quieras compartir..."
              className="w-full px-4 py-3 rounded-lg bg-accent border border-border text-white placeholder:text-muted-foreground text-sm resize-none focus:outline-none focus:border-teal-500/50 transition-colors"
            />
          </div>

          <button
            type="submit"
            disabled={atencion === 0 || recuperacion === 0 || servicio === 0 || loading}
            className="w-full py-3 rounded-lg bg-teal-600 hover:bg-teal-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-medium text-sm transition-colors"
          >
            {loading ? 'Enviando...' : 'Enviar opinión'}
          </button>
        </form>
      </div>
    </main>
  )
}
