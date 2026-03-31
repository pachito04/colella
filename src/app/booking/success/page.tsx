import React from 'react';
import Link from 'next/link';
import { CheckCircle2 } from 'lucide-react';

export default function BookingSuccessPage() {
  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col items-center justify-center p-4">
      <div className="bg-white p-8 rounded-xl shadow-sm max-w-md w-full text-center border border-neutral-100">
        <div className="flex justify-center mb-6">
          <div className="bg-green-100 p-3 rounded-full">
            <CheckCircle2 className="w-8 h-8 text-green-600" />
          </div>
        </div>
        
        <h1 className="text-2xl font-bold text-neutral-900 mb-2">¡Turno Confirmado!</h1>
        <p className="text-neutral-600 mb-4">
          Tu pago ha sido recibido y tu turno está confirmado. Te esperamos.
        </p>
        
         <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 mb-8">
            <p className="text-sm text-blue-800">
                ¡Listo! Te hemos enviado un mensaje de WhatsApp con todos los detalles de tu turno. Nos vemos pronto.
            </p>
        </div>

        <Link href="/" className="block w-full bg-neutral-900 text-white font-medium py-3 px-4 rounded-lg hover:bg-neutral-800 transition-colors">
          Volver al Inicio
        </Link>
      </div>
    </div>
  );
}
