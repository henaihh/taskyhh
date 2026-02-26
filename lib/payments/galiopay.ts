// TODO: Replace with actual GalioPay API endpoints and auth
// Reference: https://admin-pay.galio.app/login

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

export async function createGalioPayment(amount: number, userId: string) {
  // TODO: Replace with actual GalioPay API endpoints
  const response = await fetch('https://api.galio.app/v1/payments', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.GALIOPAY_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      amount,
      currency: 'ARS',
      description: 'TaskBot Credits',
      callback_url: `${BASE_URL}/api/payments/galiopay`,
      success_url: `${BASE_URL}/?credits=success`,
      metadata: { user_id: userId },
    }),
  });
  return response.json();
}

export function verifyGalioWebhook(body: string, signature: string): boolean {
  // TODO: Implement actual webhook signature verification
  const secret = process.env.GALIOPAY_WEBHOOK_SECRET;
  if (!secret) return false;
  // Placeholder: accept all for now
  return true;
}
