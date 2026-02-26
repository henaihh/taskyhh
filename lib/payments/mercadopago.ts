import { MercadoPagoConfig, Preference, Payment } from 'mercadopago';

let _preference: Preference | null = null;
let _payment: Payment | null = null;

function getClient() {
  return new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN! });
}

export function getPreference(): Preference {
  if (!_preference) _preference = new Preference(getClient());
  return _preference;
}

export function getPayment(): Payment {
  if (!_payment) _payment = new Payment(getClient());
  return _payment;
}
