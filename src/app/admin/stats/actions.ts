'use server'

import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'
import { revalidatePath } from 'next/cache'

export async function updateSiteStats(data: {
  stat1Value: number; stat1Suffix: string; stat1Label: string; stat1Icon: string
  stat2Value: number; stat2Suffix: string; stat2Label: string; stat2Icon: string
  stat3Value: number; stat3Suffix: string; stat3Label: string; stat3Icon: string
  stat4Value: number; stat4Suffix: string; stat4Label: string; stat4Icon: string
}) {
  const session = await auth()
  if (!session?.user || session.user.role !== 'ADMIN') throw new Error('Unauthorized')

  await prisma.siteStats.upsert({
    where: { id: 'stats' },
    update: data,
    create: { id: 'stats', ...data }
  })

  revalidatePath('/')
  revalidatePath('/admin/stats')
}
