import { NextRequest, NextResponse } from 'next/server';
import { getPreference, getPayment } from '@/lib/payments/mercadopago';
import { createServiceClient } from '@/lib/supabase/server';

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

// Fetch live ARS→USD rate from CoinGecko (free, no key needed)
async function getArsToUsdRate(): Promise<number> {
  try {
    const res = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=usd&vs_currencies=ars', { next: { revalidate: 3600 } });
    const data = await res.json();
    const arsPerUsd = data?.usd?.ars;
    if (arsPerUsd && arsPerUsd > 0) return 1 / arsPerUsd;
  } catch {}
  // Fallback rate if API fails
  return 1 / 1385;
}

export async function POST(req: NextRequest) {
  try {
    const { amount, userId } = await req.json();
    const arsToUsd = await getArsToUsdRate();
    const amountUsd = amount * arsToUsd;

    const result = await getPreference().create({
      body: {
        items: [{
          id: 'taskbot-credits',
          title: 'TaskBot Credits',
          quantity: 1,
          unit_price: amount,
          currency_id: 'ARS',
        }],
        back_urls: {
          success: `${BASE_URL}/?credits=success`,
          failure: `${BASE_URL}/?credits=error`,
          pending: `${BASE_URL}/?credits=pending`,
        },
        notification_url: `${BASE_URL}/api/payments/mercadopago?source_news=webhooks`,
        metadata: {
          user_id: userId,
          amount_usd_equivalent: amountUsd,
        },
        auto_return: 'approved' as any,
      },
    });

    // Create pending transaction
    const supabase = await createServiceClient();
    await supabase.from('credit_transactions').insert({
      user_id: userId,
      type: 'topup',
      amount_usd: amountUsd,
      currency_original: 'ARS',
      amount_original: amount,
      payment_method: 'mercadopago',
      payment_id: result.id,
      payment_status: 'pending',
      description: `MercadoPago top-up: ARS ${amount}`,
    });

    return NextResponse.json({ url: result.init_point });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Webhook / IPN handler — MercadoPago sends both GET (IPN) and POST (webhooks v2)
export async function GET(req: NextRequest) {
  return handleWebhook(req);
}

export async function PUT(req: NextRequest) {
  return handleWebhook(req);
}

async function handleWebhook(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    let topic = searchParams.get('topic') || searchParams.get('type');
    let paymentIdParam = searchParams.get('data.id') || searchParams.get('id');

    // MercadoPago v2 webhooks send POST with JSON body
    if (req.method === 'POST') {
      try {
        const body = await req.json();
        if (body.type) topic = body.type;
        if (body.data?.id) paymentIdParam = String(body.data.id);
      } catch {}
    }

    if ((topic === 'payment' || topic === 'payment.updated' || topic === 'payment.created') && paymentIdParam) {
      let paymentData;
      try {
        paymentData = await getPayment().get({ id: paymentIdParam });
      } catch {
        // Test webhook or invalid payment ID — acknowledge without processing
        return NextResponse.json({ received: true, note: 'payment not found' });
      }

      if (paymentData.status === 'approved') {
        const userId = (paymentData.metadata as any)?.user_id;
        const amountUsd = parseFloat((paymentData.metadata as any)?.amount_usd_equivalent || '0');

        if (userId && amountUsd > 0) {
          const supabase = await createServiceClient();

          // Update transaction
          await supabase.from('credit_transactions')
            .update({ payment_status: 'completed' })
            .eq('payment_method', 'mercadopago')
            .eq('user_id', userId)
            .eq('payment_status', 'pending')
            .order('created_at', { ascending: false })
            .limit(1);

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
      }
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
