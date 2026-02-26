import { NextRequest, NextResponse } from 'next/server';
import { getStripe } from '@/lib/payments/stripe';
import { createServiceClient } from '@/lib/supabase/server';

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

export async function POST(req: NextRequest) {
  try {
    const { amount, userId } = await req.json();

    const session = await getStripe().checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: { name: 'TaskBot Credits' },
          unit_amount: Math.round(amount * 100),
        },
        quantity: 1,
      }],
      mode: 'payment',
      success_url: `${BASE_URL}/?credits=success`,
      cancel_url: `${BASE_URL}/?credits=cancelled`,
      metadata: { user_id: userId, amount_usd: amount.toString() },
    });

    // Create pending transaction
    const supabase = await createServiceClient();
    await supabase.from('credit_transactions').insert({
      user_id: userId,
      type: 'topup',
      amount_usd: amount,
      currency_original: 'USD',
      amount_original: amount,
      payment_method: 'stripe',
      payment_id: session.id,
      payment_status: 'pending',
      description: `Stripe top-up: $${amount}`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Webhook handler
export async function PUT(req: NextRequest) {
  try {
    const body = await req.text();
    const sig = req.headers.get('stripe-signature')!;

    let event;
    try {
      event = getStripe().webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
    } catch {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as any;
      const userId = session.metadata.user_id;
      const amountUsd = parseFloat(session.metadata.amount_usd);

      const supabase = await createServiceClient();

      // Update transaction
      await supabase.from('credit_transactions')
        .update({ payment_status: 'completed' })
        .eq('payment_id', session.id);

      // Add credits
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('credit_balance_usd')
        .eq('id', userId)
        .single();

      await supabase.from('user_profiles').update({
        credit_balance_usd: Number(profile?.credit_balance_usd || 0) + amountUsd,
      }).eq('id', userId);
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
