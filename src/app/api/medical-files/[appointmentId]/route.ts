import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

// Soporta dos formas:
//   /api/medical-files/{appointmentId}        -> primer archivo del turno (compat)
//   /api/medical-files/{appointmentId}?file={fileId} -> archivo específico
export async function GET(
  request: Request,
  { params }: { params: Promise<{ appointmentId: string }> }
) {
  const session = await auth()

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { appointmentId } = await params
  const url = new URL(request.url)
  const fileIdParam = url.searchParams.get('file')

  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: {
      medicalFiles: { orderBy: { createdAt: 'asc' } },
    }
  })

  if (!appointment || !appointment.medicalFiles || appointment.medicalFiles.length === 0) {
    return NextResponse.json({ error: 'Archivo no encontrado' }, { status: 404 })
  }

  const isAdmin = session.user.role === 'ADMIN'
  const isOwner = appointment.patientId === session.user.id

  if (!isAdmin && !isOwner) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const file = fileIdParam
    ? appointment.medicalFiles.find(f => f.id === fileIdParam)
    : appointment.medicalFiles[0]

  if (!file) {
    return NextResponse.json({ error: 'Archivo no encontrado' }, { status: 404 })
  }

  return new NextResponse(Buffer.from(file.data), {
    status: 200,
    headers: {
      'Content-Type': file.mimeType,
      'Content-Disposition': `attachment; filename="${encodeURIComponent(file.originalName)}"`,
      'Cache-Control': 'private, no-store',
    },
  })
}
