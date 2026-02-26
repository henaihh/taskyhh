export const MARGIN = 0.35;

export const CREDIT_PACKAGES = {
  USD: { min: 20, step: 5, max: 200 },
  ARS: { min: 30000, step: 5000, max: 300000 },
  BTC: { min: 0.0005, step: 0.00025, max: 0.005 },
};

export const PRIORITY_COLORS: Record<string, string> = {
  urgent: '#EF4444',
  high: '#F59E0B',
  medium: '#3B82F6',
  low: '#6B7280',
};

export const CURRENCY_PAYMENT_METHODS: Record<string, string[]> = {
  USD: ['stripe', 'lightning'],
  ARS: ['mercadopago', 'galiopay'],
  BTC: ['lightning'],
};

export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  stripe: 'Card (Stripe)',
  mercadopago: 'MercadoPago',
  galiopay: 'GalioPay',
  lightning: 'Lightning ⚡',
};

export const MODEL_PRICING = {
  'claude-sonnet-4-20250514': { input: 3 / 1_000_000, output: 15 / 1_000_000 },
};

export const MIN_BALANCE_FOR_EXECUTION = 0.01;
