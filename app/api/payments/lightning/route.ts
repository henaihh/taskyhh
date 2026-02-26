import { NextRequest, NextResponse } from 'next/server';
import { createLightningInvoice, verifyLightningPayment, getBtcUsdRate, btcToSats, satsToUsd } from '@/lib/payments/lightning';
import { createServiceClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  try {
    const { amount, currency, userId } = await req.json();

    const btcPrice = await getBtcUsdRate();
    let amountSats: number;
    let amountUsd: number;

    if (currency === 'BTC') {
      amountSats = btcToSats(amount);
      amountUsd = satsToUsd(amountSats, btcPrice);
    } else {
      // USD amount
      amountUsd = amount;
      amountSats = btcToSats(amount / btcPrice);
    }

    const invoice = await createLightningInvoice(amountSats, `TaskBot Credits: ${amountSats} sats`);

    const supabase = await createServiceClient();
    await supabase.from('credit_transactions').insert({
      user_id: userId,
      type: 'topup',
      amount_usd: amountUsd,
      currency_original: currency || 'BTC',
      amount_original: amount,
      payment_method: 'lightning',
      payment_id: invoice.paymentId,
      payment_status: 'pending',
      description: `Lightning top-up: ${amountSats} sats`,
    });

    return NextResponse.json({
      invoice: invoice.invoice,
      paymentId: invoice.paymentId,
      amountSats,
      amountUsd,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Verify payment (called after WebLN or polling)
export async function PUT(req: NextRequest) {
  try {
    const { paymentId } = await req.json();

    const paid = await verifyLightningPayment(paymentId);
    if (!paid) {
      return NextResponse.json({ paid: false });
    }

    const supabase = await createServiceClient();

    // Find the transaction
    const { data: txn } = await supabase
      .from('credit_transactions')
      .select('*')
      .eq('payment_id', paymentId)
      .eq('payment_status', 'pending')
      .single();

    if (txn) {
      await supabase.from('credit_transactions')
        .update({ payment_status: 'completed' })
        .eq('id', txn.id);

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('credit_balance_usd')
        .eq('id', txn.user_id)
        .single();

      await supabase.from('user_profiles').update({
        credit_balance_usd: Number(profile?.credit_balance_usd || 0) + Number(txn.amount_usd),
      }).eq('id', txn.user_id);
    }

    return NextResponse.json({ paid: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
