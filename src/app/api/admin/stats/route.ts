import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'

export async function GET() {
  let stats = await prisma.siteStats.findUnique({ where: { id: 'stats' } })
  if (!stats) {
    stats = await prisma.siteStats.create({ data: { id: 'stats' } })
  }
  return NextResponse.json(stats)
}

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user || (session.user as any).role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()

  const stats = await prisma.siteStats.upsert({
    where: { id: 'stats' },
    update: body,
    create: { id: 'stats', ...body }
  })

  return NextResponse.json(stats)
}
