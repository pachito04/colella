import Link from 'next/link'

export default function PrivacidadPage() {
  return (
    <main className="min-h-screen px-4 py-24">
      <div className="max-w-2xl mx-auto space-y-10">
        <div className="space-y-3">
          <Link href="/" className="text-sm text-teal-400 hover:text-teal-300 transition-colors">← Volver al inicio</Link>
          <h1 className="text-3xl font-display font-bold text-white">Política de Privacidad</h1>
          <p className="text-muted-foreground text-sm">Última actualización: {new Date().toLocaleDateString('es-AR', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>

        <div className="space-y-8 text-sm text-muted-foreground leading-relaxed">

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-white">1. Responsable del tratamiento</h2>
            <p>El responsable del tratamiento de los datos personales es el <strong className="text-white">Lic. Federico Colella</strong>, Kinesiólogo Deportivo, con domicilio en la provincia de Buenos Aires, República Argentina. Podés contactarnos en cualquier momento a través de WhatsApp o del formulario de contacto del sitio.</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-white">2. Datos que recopilamos</h2>
            <p>Recopilamos únicamente los datos necesarios para brindar nuestros servicios:</p>
            <ul className="list-disc list-inside space-y-1 pl-2">
              <li>Nombre y apellido</li>
              <li>Dirección de correo electrónico</li>
              <li>Número de teléfono (WhatsApp)</li>
              <li>Información clínica relevante para la sesión (notas del paciente, informes médicos)</li>
              <li>Datos de pago procesados por Mercado Pago (no almacenamos datos de tarjetas)</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-white">3. Finalidad del tratamiento</h2>
            <p>Utilizamos tus datos para:</p>
            <ul className="list-disc list-inside space-y-1 pl-2">
              <li>Gestionar y confirmar tus turnos</li>
              <li>Enviarte recordatorios y comunicaciones relacionadas con tu atención</li>
              <li>Procesar pagos de señas a través de Mercado Pago</li>
              <li>Mejorar la calidad de nuestros servicios</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-white">4. Almacenamiento y seguridad</h2>
            <p>Tus datos se almacenan en servidores seguros. La información clínica es confidencial y está protegida bajo el secreto profesional. Nunca compartimos tus datos personales con terceros con fines comerciales.</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-white">5. Tus derechos</h2>
            <p>De acuerdo a la Ley 25.326 de Protección de Datos Personales (Argentina), tenés derecho a:</p>
            <ul className="list-disc list-inside space-y-1 pl-2">
              <li>Acceder a tus datos personales</li>
              <li>Rectificar datos incorrectos o desactualizados</li>
              <li>Solicitar la eliminación de tus datos</li>
              <li>Oponerte al tratamiento de tus datos</li>
            </ul>
            <p>Para ejercer estos derechos, contactanos por WhatsApp.</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-white">6. Cookies</h2>
            <p>El sitio utiliza cookies de sesión estrictamente necesarias para el funcionamiento de la autenticación. No utilizamos cookies de seguimiento ni publicidad.</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-white">7. Cambios en esta política</h2>
            <p>Podemos actualizar esta política en cualquier momento. Los cambios serán publicados en esta página con la fecha de actualización correspondiente.</p>
          </section>

        </div>

        <div className="border-t border-border pt-6 flex gap-4 text-sm">
          <Link href="/terminos" className="text-teal-400 hover:text-teal-300 transition-colors">Términos y Condiciones</Link>
        </div>
      </div>
    </main>
  )
}
