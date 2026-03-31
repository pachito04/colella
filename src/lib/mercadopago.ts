import MercadoPagoConfig, { Payment, Preference } from 'mercadopago';

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
