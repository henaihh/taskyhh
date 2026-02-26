const PROVIDER = process.env.LIGHTNING_PROVIDER || 'alby';

interface LightningInvoice {
  invoice: string;
  paymentId: string;
  amount_sats: number;
}

export async function createLightningInvoice(amountSats: number, memo: string): Promise<LightningInvoice> {
  if (PROVIDER === 'lnbits') {
    return createLNBitsInvoice(amountSats, memo);
  }
  // Default: Alby
  return createAlbyInvoice(amountSats, memo);
}

async function createAlbyInvoice(amountSats: number, memo: string): Promise<LightningInvoice> {
  const response = await fetch('https://api.getalby.com/invoices', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.ALBY_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      amount: amountSats,
      description: memo,
    }),
  });
  const data = await response.json();
  return {
    invoice: data.payment_request,
    paymentId: data.payment_hash,
    amount_sats: amountSats,
  };
}

async function createLNBitsInvoice(amountSats: number, memo: string): Promise<LightningInvoice> {
  const response = await fetch(`${process.env.LNBITS_URL}/api/v1/payments`, {
    method: 'POST',
    headers: {
      'X-Api-Key': process.env.LNBITS_ADMIN_KEY!,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      out: false,
      amount: amountSats,
      memo,
    }),
  });
  const data = await response.json();
  return {
    invoice: data.payment_request,
    paymentId: data.payment_hash,
    amount_sats: amountSats,
  };
}

export async function verifyLightningPayment(paymentId: string): Promise<boolean> {
  if (PROVIDER === 'lnbits') {
    const response = await fetch(`${process.env.LNBITS_URL}/api/v1/payments/${paymentId}`, {
      headers: { 'X-Api-Key': process.env.LNBITS_ADMIN_KEY! },
    });
    const data = await response.json();
    return data.paid === true;
  }

  // Alby
  const response = await fetch(`https://api.getalby.com/invoices/${paymentId}`, {
    headers: { 'Authorization': `Bearer ${process.env.ALBY_API_KEY}` },
  });
  const data = await response.json();
  return data.settled === true;
}

export async function getBtcUsdRate(): Promise<number> {
  try {
    const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd');
    const data = await response.json();
    return data.bitcoin.usd;
  } catch {
    return 100000; // Fallback
  }
}

export function satsToUsd(sats: number, btcPrice: number): number {
  return (sats / 100_000_000) * btcPrice;
}

export function btcToSats(btc: number): number {
  return Math.round(btc * 100_000_000);
}
