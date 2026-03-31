import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ appointmentId: string }> }
) {
  const session = await auth()

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { appointmentId } = await params

  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: {
      medicalFile: true,
    }
  })

  if (!appointment || !appointment.medicalFile) {
    return NextResponse.json({ error: 'Archivo no encontrado' }, { status: 404 })
  }

  const isAdmin = session.user.role === 'ADMIN'
  const isOwner = appointment.patientId === session.user.id

  if (!isAdmin && !isOwner) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const file = appointment.medicalFile

  return new NextResponse(Buffer.from(file.data), {
    status: 200,
    headers: {
      'Content-Type': file.mimeType,
      'Content-Disposition': `attachment; filename="${encodeURIComponent(file.originalName)}"`,
      'Cache-Control': 'private, no-store',
    },
  })
}
