import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  try {
    const { userId } = await req.json();
    if (!userId) return NextResponse.json({ error: 'Missing userId' }, { status: 400 });

    const supabase = await createServiceClient();
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('vercel_deploy_hook')
      .eq('id', userId)
      .single();

    if (!profile?.vercel_deploy_hook) {
      return NextResponse.json({ error: 'No deploy hook configured' }, { status: 404 });
    }

    const res = await fetch(profile.vercel_deploy_hook, { method: 'POST' });
    const data = await res.json();

    return NextResponse.json({ success: true, job: data.job });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
