import { NextRequest, NextResponse } from 'next/server';
import { payment } from '@/lib/mercadopago';
import { prisma } from '@/lib/prisma';

import { format, addMinutes } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';

const TIMEZONE = 'America/Argentina/Buenos_Aires';

export async function POST(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const topic = url.searchParams.get('topic') || url.searchParams.get('type');
    const id = url.searchParams.get('id') || url.searchParams.get('data.id');

    // MP sometimes sends data in body
    const body = await request.json().catch(() => ({}));
    const dataId = id || body?.data?.id;
    const type = topic || body?.type;

    if (type === 'payment' && dataId) {
      const paymentData = await payment.get({ id: dataId });
      
      if (paymentData.status === 'approved') {
        const externalReference = paymentData.external_reference;
        
        if (externalReference) {
          // Verify it exists first
          const appointment = await prisma.appointment.findUnique({
            where: { id: externalReference },
            include: { patient: true }
          });

          if (appointment) {
             // 1. INTENTO DE ACTUALIZACIÓN ATÓMICA
             // Solo actualizamos si el estado es 'PENDING'.
             // updateMany devuelve { count: N }
             const updateResult = await prisma.appointment.updateMany({
                where: {
                    id: externalReference,
                    status: 'PENDING'
                },
                data: {
                    status: 'CONFIRMED',
                    depositPaid: true,
                    paymentId: String(dataId)
                }
             });

             if (updateResult.count === 0) {
                 // Si count es 0, significa que:
                 // a) El turno no existe (ya chequeado arriba, poco probable)
                 // b) El turno YA NO ESTABA EN PENDING (O sea, ya fue procesado por otro request concurrente)
                 console.log(`Job ${externalReference} was already processed (Not Pending). Skipping notification.`);
                 return NextResponse.json({ status: 'ok', message: 'Already processed' });
             }

             // SI LLEGAMOS AQUI, SOMOS EL PROCESO QUE CONFIRMÓ EL TURNO.
             // Solo nosotros disparamos n8n y emails.
             console.log(`Atomic Update Success: Appointment ${externalReference} confirmed. PaymentId: ${dataId}`);
             
             // Recargar datos actualizados (necesitamos patient include)
             const freshAppointment = await prisma.appointment.findUnique({
                 where: { id: externalReference },
                 include: { patient: true }
             });

             if (!freshAppointment) { 
                 console.error('CRITICAL: Updated appointment disappears?'); 
                 return NextResponse.json({ status: 'error' });
             }

             // --- Trigger n8n Webhook ---
             const n8nWebhookUrl = process.env.N8N_WEBHOOK_URL;
             if (n8nWebhookUrl) {
                // Prepare data for n8n
                const settings = await prisma.globalSettings.findUnique({ where: { id: 'settings' } });
                const duration = settings?.sessionDuration || 30;

                const appointmentZoned = toZonedTime(freshAppointment.datetime, TIMEZONE);
                const startTime = format(appointmentZoned, 'HH:mm');
                const endTime = format(addMinutes(appointmentZoned, duration), 'HH:mm');
                const dateOnly = format(appointmentZoned, 'yyyy-MM-dd');

                fetch(n8nWebhookUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        event: 'appointment_confirmed',
                        appointmentId: freshAppointment.id,
                        type: freshAppointment.type,
                        patientName: freshAppointment.patient?.name || 'Sin Nombre',
                        phone: freshAppointment.patient?.phoneNumber || '',
                        email: freshAppointment.patient?.email || '',
                        date: dateOnly,
                        startTime,
                        endTime
                    })
                }).catch(err => console.error('n8n Webhook Error (MP Webhook):', err));
             }
          }
        }
      }
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Webhook Error:', error);
    // Always return 200 to MP to stop retries, unless it's a critical logic failure we want to retry
    return NextResponse.json({ success: false }, { status: 200 }); 
  }
}
