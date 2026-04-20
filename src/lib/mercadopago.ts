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
 * Retorna { success, refundId?, error? }
 */
export async function refundMercadoPagoPayment(paymentId: string): Promise<{ success: boolean; refundId?: string; error?: string }> {
  if (!paymentId) return { success: false, error: 'Missing paymentId' };
  try {
    const result = await paymentRefund.create({ payment_id: paymentId });
    if (result && (result as any).status === 'approved') {
      return { success: true, refundId: String((result as any).id) };
    }
    return { success: false, error: `Refund status: ${(result as any)?.status || 'unknown'}` };
  } catch (error: any) {
    console.error('[MP Refund] Error:', error?.message || error);
    return { success: false, error: error?.message || 'refund failed' };
  }
}
