'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { AlertCircle, CreditCard, ChevronLeft, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { getAppointmentPaymentUrl } from '@/app/actions'

function FailureContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  // Mercado Pago returns 'external_reference' which is our appointmentId
  const appointmentId = searchParams.get('external_reference')
  
  const [isRetrying, setIsRetrying] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const handleRetry = async () => {
    if (!appointmentId) {
        // Fallback if no ID found, redirect to dashboard manually (though button should handle this case)
        router.push('/dashboard/appointments')
        return
    }

    setIsRetrying(true)
    setErrorMessage(null)

    try {
        const res = await getAppointmentPaymentUrl(appointmentId)
        if (res.success && res.url) {
            window.location.href = res.url
        } else {
            setErrorMessage(res.error || 'No se pudo generar el link de pago.')
            setIsRetrying(false)
        }
    } catch {
        setErrorMessage('Ocurrió un error inesperado al intentar pagar.')
        setIsRetrying(false)
    }
  }

  return (
    <div className="min-h-screen bg-neutral-50/50 dark:bg-neutral-950 flex flex-col items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-xl border-dashed border-2">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto bg-orange-100 dark:bg-orange-900/20 p-4 rounded-full w-fit mb-4">
             <AlertCircle className="w-8 h-8 text-orange-600 dark:text-orange-500" />
          </div>
          <CardTitle className="text-xl font-bold text-gray-900 dark:text-white font-display">
            No pudimos procesar el pago
          </CardTitle>
        </CardHeader>
        
        <CardContent className="text-center space-y-4">
          <p className="text-base text-gray-500 dark:text-gray-400 leading-relaxed">
            Tu turno sigue reservado temporalmente, pero necesitamos recibir la seña para confirmarlo definitivamente.
          </p>
          <div className="text-sm text-gray-400 bg-gray-50 dark:bg-neutral-900 p-3 rounded-xl border border-gray-100 dark:border-neutral-800">
             <p>Puede haber sido un error temporal de la tarjeta o fondos insuficientes.</p>
          </div>
          
          {errorMessage && (
             <div className="p-3 text-sm font-medium text-red-600 bg-red-50 dark:bg-red-900/10 rounded-lg">
                 {errorMessage}
             </div>
          )}
        </CardContent>
        
        <CardFooter className="flex flex-col gap-3 pt-2">
           {appointmentId ? (
               <Button 
                onClick={handleRetry} 
                disabled={isRetrying}
                className="w-full font-bold h-12 text-base shadow-lg shadow-orange-500/20 bg-orange-600 hover:bg-orange-700 text-white"
               >
                 {isRetrying ? <Loader2 className="w-5 h-5 animate-spin" /> : <CreditCard className="w-5 h-5 mr-2" />}
                 Intentar pagar nuevamente
               </Button>
           ) : (
                <div className="text-sm text-amber-600 bg-amber-50 p-2 rounded-lg w-full text-center">
                    No encontramos el ID del turno para reintentar.
                </div>
           )}

           <Link href="/dashboard/appointments" className="w-full">
              <Button variant="ghost" className="w-full font-medium text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white">
                 <ChevronLeft className="w-4 h-4 mr-2" />
                 Volver a Mis Turnos
              </Button>
           </Link>
        </CardFooter>
      </Card>
      
      <p className="mt-8 text-xs text-gray-400 text-center max-w-sm">
        Si el problema persiste, podés intentar con otro medio de pago o contactarnos por WhatsApp.
      </p>
    </div>
  )
}

export default function BookingFailurePage() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin text-gray-400" /></div>}>
            <FailureContent />
        </Suspense>
    )
}
