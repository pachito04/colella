'use client'

import { useState } from 'react'
import { Copy, Check, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'

interface Props {
  remainingAmount: number
  paymentAlias: string
  paymentHolder: string | null
  paymentCbu: string | null
}

export function BookingSuccessAlias({ remainingAmount, paymentAlias, paymentHolder, paymentCbu }: Props) {
  const [aliasCopied, setAliasCopied] = useState(false)
  const [cbuCopied, setCbuCopied] = useState(false)

  const copyText = async (text: string, label: 'alias' | 'cbu') => {
    try {
      await navigator.clipboard.writeText(text)
      if (label === 'alias') {
        setAliasCopied(true)
        setTimeout(() => setAliasCopied(false), 2000)
      } else {
        setCbuCopied(true)
        setTimeout(() => setCbuCopied(false), 2000)
      }
      toast.success(`${label === 'alias' ? 'Alias' : 'CBU'} copiado`)
    } catch {
      toast.error('No se pudo copiar')
    }
  }

  return (
    <div className="text-left bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
      <div className="flex items-start gap-2 mb-3">
        <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-bold text-amber-900">Falta abonar el 50% restante</p>
          <p className="text-xs text-amber-700 mt-0.5">
            Te quedan <span className="font-bold">${remainingAmount.toLocaleString('es-AR')}</span> a pagar el día de la sesión (o por adelantado al alias).
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={() => copyText(paymentAlias, 'alias')}
        className="w-full flex items-center justify-between gap-2 p-3 rounded-lg bg-white border border-amber-300 hover:bg-amber-100/40 transition-colors mb-2"
      >
        <div className="text-left flex-1 min-w-0">
          <span className="block text-[9px] font-bold uppercase tracking-wider text-amber-700">Alias MercadoPago</span>
          <span className="block text-sm font-bold text-neutral-900 select-all truncate">{paymentAlias}</span>
          {paymentHolder && (
            <span className="block text-[10px] text-neutral-500 mt-0.5">A nombre de {paymentHolder}</span>
          )}
        </div>
        {aliasCopied
          ? <Check className="w-4 h-4 text-green-600 shrink-0" />
          : <Copy className="w-4 h-4 text-amber-600 shrink-0" />}
      </button>

      {paymentCbu && (
        <button
          type="button"
          onClick={() => copyText(paymentCbu, 'cbu')}
          className="w-full flex items-center justify-between gap-2 p-3 rounded-lg bg-white border border-amber-300 hover:bg-amber-100/40 transition-colors"
        >
          <div className="text-left flex-1 min-w-0">
            <span className="block text-[9px] font-bold uppercase tracking-wider text-amber-700">CBU</span>
            <span className="block text-xs font-mono font-bold text-neutral-900 select-all truncate">{paymentCbu}</span>
          </div>
          {cbuCopied
            ? <Check className="w-4 h-4 text-green-600 shrink-0" />
            : <Copy className="w-4 h-4 text-amber-600 shrink-0" />}
        </button>
      )}
    </div>
  )
}
