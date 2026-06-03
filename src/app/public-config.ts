'use server'

import { prisma } from '@/lib/prisma'

export async function getPublicConfig() {
  const settings = await prisma.globalSettings.findUnique({ where: { id: 'settings' } })
  // Fallback defaults
  if (!settings) {
    return {
      price: 40000,
      duration: 30,
      depositPercentage: 50,
      depositFixedAmount: null as number | null,
      paymentAlias: null as string | null,
      paymentCbu: null as string | null,
      paymentHolder: null as string | null,
    }
  }
  return {
    price: Number(settings.currentPrice),
    duration: settings.sessionDuration,
    depositPercentage: settings.depositPercentage,
    depositFixedAmount: settings.depositFixedAmount != null ? Number(settings.depositFixedAmount) : null,
    paymentAlias: settings.paymentAlias,
    paymentCbu: settings.paymentCbu,
    paymentHolder: settings.paymentHolder,
  }
}
