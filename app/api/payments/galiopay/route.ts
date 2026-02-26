import { NextRequest, NextResponse } from 'next/server';
import { createGalioPayment, verifyGalioWebhook } from '@/lib/payments/galiopay';
import { createServiceClient } from '@/lib/supabase/server';

// ARS to USD rough rate
const ARS_USD_RATE = 0.00085;

export async function POST(req: NextRequest) {
  try {
    const { amount, userId } = await req.json();
    const amountUsd = amount * ARS_USD_RATE;

    // TODO: Replace with actual GalioPay integration
    const result = await createGalioPayment(amount, userId);

    const supabase = await createServiceClient();
    await supabase.from('credit_transactions').insert({
      user_id: userId,
      type: 'topup',
      amount_usd: amountUsd,
      currency_original: 'ARS',
      amount_original: amount,
      payment_method: 'galiopay',
      payment_id: result.id || 'galiopay-pending',
      payment_status: 'pending',
      description: `GalioPay top-up: ARS ${amount}`,
    });

    return NextResponse.json({ url: result.payment_url || result.url });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Webhook handler
export async function PUT(req: NextRequest) {
  try {
    const body = await req.text();
    const signature = req.headers.get('x-galiopay-signature') || '';

    if (!verifyGalioWebhook(body, signature)) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    const data = JSON.parse(body);

    // TODO: Adapt to actual GalioPay webhook payload
    if (data.status === 'approved' || data.status === 'completed') {
      const userId = data.metadata?.user_id;
      const amountUsd = parseFloat(data.metadata?.amount_usd || '0');

      if (userId && amountUsd > 0) {
        const supabase = await createServiceClient();

        await supabase.from('credit_transactions')
          .update({ payment_status: 'completed' })
          .eq('payment_method', 'galiopay')
          .eq('user_id', userId)
          .eq('payment_status', 'pending')
          .order('created_at', { ascending: false })
          .limit(1);

        const { data: profile } = await supabase
          .from('user_profiles')
          .select('credit_balance_usd')
          .eq('id', userId)
          .single();

        await supabase.from('user_profiles').update({
          credit_balance_usd: Number(profile?.credit_balance_usd || 0) + amountUsd,
        }).eq('id', userId);
      }
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
