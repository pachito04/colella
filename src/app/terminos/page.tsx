import Link from 'next/link'

export default function TerminosPage() {
  return (
    <main className="min-h-screen px-4 py-24">
      <div className="max-w-2xl mx-auto space-y-10">
        <div className="space-y-3">
          <Link href="/" className="text-sm text-teal-400 hover:text-teal-300 transition-colors">← Volver al inicio</Link>
          <h1 className="text-3xl font-display font-bold text-white">Términos y Condiciones</h1>
          <p className="text-muted-foreground text-sm">Última actualización: {new Date().toLocaleDateString('es-AR', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>

        <div className="space-y-8 text-sm text-muted-foreground leading-relaxed">

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-white">1. Aceptación de los términos</h2>
            <p>Al reservar un turno o utilizar los servicios del <strong className="text-white">Lic. Federico Colella</strong>, aceptás los presentes términos y condiciones. Si no estás de acuerdo, te pedimos que no realices la reserva.</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-white">2. Servicios</h2>
            <p>Ofrecemos servicios de kinesiología deportiva, recuperación de lesiones y optimización del movimiento, tanto de forma presencial como virtual. Las sesiones son realizadas por el Lic. Federico Colella, profesional matriculado.</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-white">3. Reservas y señas</h2>
            <ul className="list-disc list-inside space-y-1 pl-2">
              <li>Para confirmar un turno, se requiere el pago de una seña del 50% del valor de la sesión.</li>
              <li>El pago de la seña se realiza a través de Mercado Pago, plataforma segura de pagos.</li>
              <li>El turno queda confirmado una vez acreditado el pago.</li>
              <li>El saldo restante se abona al momento de la sesión.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-white">4. Política de cancelación</h2>
            <ul className="list-disc list-inside space-y-1 pl-2">
              <li><strong className="text-white">Cancelación con más de 24 horas de anticipación:</strong> se reintegra el 100% de la seña.</li>
              <li><strong className="text-white">Cancelación con menos de 24 horas:</strong> la seña no es reembolsable.</li>
              <li><strong className="text-white">Reprogramación con más de 24 horas:</strong> podés reprogramar sin costo adicional.</li>
              <li>Para cancelar o reprogramar, contactanos por WhatsApp o a través del asistente virtual.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-white">5. Responsabilidades del paciente</h2>
            <ul className="list-disc list-inside space-y-1 pl-2">
              <li>Informar al profesional sobre condiciones médicas preexistentes, medicamentos o lesiones previas.</li>
              <li>Seguir las indicaciones y recomendaciones del Lic. Colella para optimizar los resultados.</li>
              <li>Asistir puntualmente a la sesión. Llegadas con más de 15 minutos de retraso podrán considerarse ausencia.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-white">6. Sesiones virtuales</h2>
            <p>Para sesiones virtuales, el paciente es responsable de contar con una conexión a internet estable y un espacio adecuado para realizar los ejercicios indicados. El link de videollamada será enviado con la confirmación del turno.</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-white">7. Limitación de responsabilidad</h2>
            <p>El Lic. Colella no será responsable por lesiones derivadas del incumplimiento de las indicaciones terapéuticas, ni por factores externos ajenos a la práctica profesional. Los resultados pueden variar según cada paciente.</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-white">8. Modificaciones</h2>
            <p>Nos reservamos el derecho de modificar estos términos en cualquier momento. Las modificaciones serán publicadas en esta página y entrarán en vigencia a partir de su publicación.</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-white">9. Jurisdicción</h2>
            <p>Ante cualquier controversia, las partes se someten a la jurisdicción de los tribunales ordinarios de la Provincia de Buenos Aires, República Argentina.</p>
          </section>

        </div>

        <div className="border-t border-border pt-6 flex gap-4 text-sm">
          <Link href="/privacidad" className="text-teal-400 hover:text-teal-300 transition-colors">Política de Privacidad</Link>
        </div>
      </div>
    </main>
  )
}
