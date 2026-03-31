import Link from 'next/link'

export default function GraciasPage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 py-24">
      <div className="max-w-lg w-full text-center space-y-8">
        {/* Icono */}
        <div className="flex justify-center">
          <div className="w-20 h-20 rounded-full bg-teal-500/10 border border-teal-500/30 flex items-center justify-center">
            <svg className="w-10 h-10 text-teal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.5 12.75l6 6 9-13.5" />
            </svg>
          </div>
        </div>

        {/* Título */}
        <div className="space-y-3">
          <h1 className="text-3xl font-display font-bold text-white">
            ¡Tu turno está confirmado!
          </h1>
          <p className="text-muted-foreground text-lg leading-relaxed">
            Recibimos tu seña correctamente. En breve recibirás un mensaje de WhatsApp con todos los detalles de tu sesión.
          </p>
        </div>

        {/* Info box */}
        <div className="bg-accent border border-border rounded-xl p-6 text-left space-y-4">
          <h2 className="text-sm font-semibold text-teal-400 uppercase tracking-wider">¿Qué sigue?</h2>
          <ul className="space-y-3 text-sm text-muted-foreground">
            <li className="flex gap-3">
              <span className="text-teal-400 mt-0.5">01</span>
              <span>Revisá tu WhatsApp — te enviamos la confirmación con fecha, hora y dirección.</span>
            </li>
            <li className="flex gap-3">
              <span className="text-teal-400 mt-0.5">02</span>
              <span>Si necesitás cancelar o reprogramar, tenés hasta 24 horas antes del turno.</span>
            </li>
            <li className="flex gap-3">
              <span className="text-teal-400 mt-0.5">03</span>
              <span>Llegá 5 minutos antes y traé ropa cómoda para la sesión.</span>
            </li>
          </ul>
        </div>

        {/* CTA */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/"
            className="px-6 py-3 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-sm font-medium transition-colors"
          >
            Volver al inicio
          </Link>
          <a
            href="https://wa.me/5493462640426"
            target="_blank"
            rel="noopener noreferrer"
            className="px-6 py-3 rounded-lg border border-border hover:bg-accent text-sm font-medium transition-colors text-white"
          >
            Contactar por WhatsApp
          </a>
        </div>
      </div>
    </main>
  )
}
