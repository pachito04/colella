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
          // Soportamos external_reference con múltiples IDs separados por "|" (sesión doble)
          const appointmentIds = externalReference.split('|').filter(Boolean);
          const isDouble = appointmentIds.length > 1;

          // Validar existencia primero
          const existing = await prisma.appointment.findMany({
            where: { id: { in: appointmentIds } },
            include: { patient: true }
          });

          if (existing.length > 0) {
             // Actualización atómica: sólo PENDING
             const updateResult = await prisma.appointment.updateMany({
                where: {
                    id: { in: appointmentIds },
                    status: 'PENDING'
                },
                data: {
                    status: 'CONFIRMED',
                    depositPaid: true,
                    paymentId: String(dataId)
                }
             });

             if (updateResult.count === 0) {
                 console.log(`Job ${externalReference} was already processed (Not Pending). Skipping notification.`);
                 return NextResponse.json({ status: 'ok', message: 'Already processed' });
             }

             console.log(`Atomic Update Success: ${updateResult.count} appointment(s) confirmed for ref ${externalReference}. PaymentId: ${dataId}`);

             // Recargar datos actualizados (necesitamos patient include) - usamos el primer turno como representante
             const freshAppointments = await prisma.appointment.findMany({
                 where: { id: { in: appointmentIds } },
                 include: { patient: true },
                 orderBy: { datetime: 'asc' }
             });

             const freshAppointment = freshAppointments[0];

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
                const price = Number(settings?.currentPrice || 40000);
                const depositPct = settings?.depositPercentage || 50;
                const depositFixed = settings?.depositFixedAmount != null ? Number(settings.depositFixedAmount) : null;
                const sessionsCount = freshAppointments.length;
                const isVirtual = freshAppointment.type === 'VIRTUAL';
                const totalPrice = price * sessionsCount;
                // Seña por sesión: monto fijo si está configurado (>0), si no el %.
                const depositPerSession = (depositFixed != null && depositFixed > 0) ? Math.min(depositFixed, price) : (price * depositPct / 100);
                const depositPaidAmount = isVirtual ? totalPrice : depositPerSession * sessionsCount;
                const remainingAmount = isVirtual ? 0 : (totalPrice - depositPaidAmount);

                const appointmentZoned = toZonedTime(freshAppointment.datetime, TIMEZONE);
                // Para sesión doble, el endTime usa el ÚLTIMO appointment + duration
                const lastApp = freshAppointments[freshAppointments.length - 1];
                const lastZoned = toZonedTime(lastApp.datetime, TIMEZONE);
                const startTime = format(appointmentZoned, 'HH:mm');
                const endTime = format(addMinutes(lastZoned, duration), 'HH:mm');
                const dateOnly = format(appointmentZoned, 'yyyy-MM-dd');

                fetch(n8nWebhookUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        event: 'appointment_confirmed',
                        appointmentId: freshAppointment.id,
                        appointmentIds: freshAppointments.map(a => a.id),
                        sessionsCount,
                        isDouble,
                        type: freshAppointment.type,
                        isVirtual,
                        patientName: freshAppointment.patient?.name || 'Sin Nombre',
                        phone: freshAppointment.patient?.phoneNumber || '',
                        email: freshAppointment.patient?.email || '',
                        date: dateOnly,
                        startTime,
                        endTime,
                        price,
                        totalPrice,
                        depositPaidAmount,
                        remainingAmount,
                        paymentAlias: (settings as any)?.paymentAlias || '',
                        paymentCbu: (settings as any)?.paymentCbu || '',
                        paymentHolder: (settings as any)?.paymentHolder || '',
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
