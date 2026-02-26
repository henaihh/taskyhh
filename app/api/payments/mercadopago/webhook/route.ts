import { NextRequest, NextResponse } from 'next/server';
import { getPayment } from '@/lib/payments/mercadopago';
import { createServiceClient } from '@/lib/supabase/server';

// MercadoPago webhook handler — separate endpoint for IPN/webhook notifications
export async function POST(req: NextRequest) {
  return handleWebhook(req);
}

export async function GET(req: NextRequest) {
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
        // Also check action field
        if (body.action && !topic) topic = body.action;
      } catch {}
    }

    if ((topic === 'payment' || topic === 'payment.updated' || topic === 'payment.created') && paymentIdParam) {
      let paymentData;
      try {
        paymentData = await getPayment().get({ id: paymentIdParam });
      } catch {
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
    console.error('MP webhook error:', error);
    return NextResponse.json({ received: true, error: error.message });
  }
}
