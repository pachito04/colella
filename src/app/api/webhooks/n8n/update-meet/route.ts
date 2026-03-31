import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';

// Manejo de CORS Preflight
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

function safeCompare(a: string, b: string) {
  try {
      const bufferA = Buffer.from(a);
      const bufferB = Buffer.from(b);
      // timingSafeEqual throws if lengths are different, so check length first
      if (bufferA.length !== bufferB.length) return false;
      return crypto.timingSafeEqual(bufferA, bufferB);
  } catch (e) {
      return false;
  }
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    const customHeader = request.headers.get('x-n8n-token');
    const queryToken = request.nextUrl.searchParams.get('token');
    
    const secretToken = process.env.N8N_SECRET_TOKEN;

    console.log('--- n8n Webhook Debug ---');
    console.log('Authorization Header:', authHeader);
    console.log('x-n8n-token Header:', customHeader);
    console.log('Query Param Token:', queryToken);
    console.log('Expected Token (configured):', secretToken ? '***HIDDEN***' : 'UNDEFINED'); 

    // Extract token from multiple possible sources
    let receivedToken: string | null = null;
    
    if (authHeader?.startsWith('Bearer ')) {
        receivedToken = authHeader.split(' ')[1];
    } else if (customHeader) {
        receivedToken = customHeader;
    } else if (queryToken) {
        receivedToken = queryToken;
    }

    if (!secretToken) {
        console.error('SERVER ERROR: N8N_SECRET_TOKEN is not defined in environment variables.');
        return NextResponse.json({ error: 'Server Misconfiguration' }, { status: 500 });
    }

    if (!receivedToken || !safeCompare(secretToken, receivedToken)) {
      console.warn('❌ Token mismatch or missing');
      console.log(`Received: ${receivedToken ? receivedToken.substring(0, 3) + '...' : 'null'}`);
      
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { appointmentId, meetLink } = await request.json();

    if (!appointmentId || !meetLink) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    await prisma.appointment.update({
      where: { id: appointmentId },
      data: { meetLink }
    });
    
    console.log(`✅ Appointment ${appointmentId} updated with Meet Link`);

    return NextResponse.json({ success: true }, {
        headers: {
            'Access-Control-Allow-Origin': '*',
        }
    });

  } catch (error) {
    console.error('n8n Update Meet Error:', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
