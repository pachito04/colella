import MercadoPagoConfig, { Payment, PaymentRefund, Preference } from 'mercadopago';

const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;

if (!accessToken) {
  console.warn("MERCADO_PAGO_ACCESS_TOKEN is not defined in environment variables.");
}

export const client = new MercadoPagoConfig({
  accessToken: accessToken || '',
  options: { timeout: 5000 }
});

export const payment = new Payment(client);
export const preference = new Preference(client);
export const paymentRefund = new PaymentRefund(client);

/**
 * Realiza un reembolso total del pago indicado.
 * Retorna { success, refundId?, status?, error? }
 */
export async function refundMercadoPagoPayment(paymentId: string): Promise<{ success: boolean; refundId?: string; status?: string; error?: string }> {
  if (!paymentId) {
    console.error('[MP Refund] Missing paymentId');
    return { success: false, error: 'Missing paymentId' };
  }
  console.log(`[MP Refund] Iniciando refund total para paymentId=${paymentId}`);
  try {
    // .total() hace refund completo. Pasa body:{} por defecto a la API de MP.
    const result: any = await paymentRefund.total({ payment_id: paymentId });
    console.log('[MP Refund] Response:', JSON.stringify(result)?.slice(0, 500));

    // Un refund exitoso siempre retorna un id. El status puede ser 'approved' o 'in_process'.
    if (result && result.id) {
      return {
        success: true,
        refundId: String(result.id),
        status: result.status || 'unknown'
      };
    }
    return { success: false, error: `Refund sin id: ${JSON.stringify(result)?.slice(0, 200)}` };
  } catch (error: any) {
    // Errores tipicos: pago ya reembolsado, pago no encontrado, pago muy viejo
    const msg = error?.message || error?.error || error?.cause || 'refund failed';
    const apiMsg = error?.cause?.[0]?.description || error?.data?.message;
    console.error('[MP Refund] Error:', msg, apiMsg || '');
    return { success: false, error: apiMsg || msg };
  }
}
