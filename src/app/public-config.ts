'use server'

import { prisma } from '@/lib/prisma'

export async function getPublicConfig() {
  const settings = await prisma.globalSettings.findUnique({ where: { id: 'settings' } })
  // Fallback defaults
  if (!settings) {
    return {
      price: 40000,
      duration: 30,
      depositPercentage: 50
    }
  }
  return {
    price: Number(settings.currentPrice),
    duration: settings.sessionDuration,
    depositPercentage: settings.depositPercentage
  }
}
