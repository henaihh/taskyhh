import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { calculateTaskCost, chargeForTask } from '@/lib/credits';
import { forwardToTelegram } from '@/lib/telegram-bridge';

/**
 * Webhook receiver for OpenClaw session callbacks.
 * Called when a sub-agent produces output, completes, or fails.
 */
export async function POST(req: NextRequest) {
  try {
    const payload = await req.json();
    const {
      sessionKey,
      event, // 'message' | 'complete' | 'failed'
      message,
      metadata,
      tokenUsage,
    } = payload;

    if (!sessionKey) {
      return NextResponse.json({ error: 'Missing sessionKey' }, { status: 400 });
    }

    const supabase = await createServiceClient();

    // Look up session
    const { data: session } = await supabase
      .from('agent_sessions')
      .select('*, tasks(*)')
      .eq('openclaw_session_key', sessionKey)
      .single();

    if (!session) {
      console.error('Unknown session key:', sessionKey);
      return NextResponse.json({ error: 'Unknown session' }, { status: 404 });
    }

    const taskId = session.task_id;
    const userId = session.user_id;

    // Parse message for markers
    if (message) {
      // Handle [QUESTION]: markers
      const questionMatches = message.matchAll(/\[QUESTION\]:\s*(.+?)(?=\[|$)/gs);
      for (const match of questionMatches) {
        await supabase.from('admin_questions').insert({
          task_id: taskId,
          question: match[1].trim(),
        });
      }

      // Handle [DONE:id] markers
      const doneMatches = message.matchAll(/\[DONE:([^\]]+)\]/g);
      for (const match of doneMatches) {
        await supabase.from('checklist_items')
          .update({ done: true })
          .eq('id', match[1].trim());
      }

      // Forward to Telegram
      const cleanMessage = message
        .replace(/\[QUESTION\]:\s*.+?(?=\[|$)/gs, '')
        .replace(/\[DONE:[^\]]+\]/g, '')
        .replace(/\[COMPLETE\]:\s*/g, '✅ ')
        .replace(/\[FAILED\]:\s*/g, '❌ ')
        .trim();

      if (cleanMessage) {
        await forwardToTelegram(userId, cleanMessage);
      }
    }

    // Handle completion
    if (event === 'complete' || message?.includes('[COMPLETE]:')) {
      const summary = message?.match(/\[COMPLETE\]:\s*(.+?)(?=\[|$)/s)?.[1]?.trim() || message || 'Task completed.';

      await supabase.from('tasks').update({
        status: 'done',
        agent_response: summary,
        completed_at: new Date().toISOString(),
      }).eq('id', taskId);

      await supabase.from('agent_sessions').update({
        status: 'completed',
        completed_at: new Date().toISOString(),
      }).eq('id', session.id);

      // Charge for usage
      if (tokenUsage) {
        const cost = calculateTaskCost(tokenUsage.inputTokens || 0, tokenUsage.outputTokens || 0);
        await chargeForTask(userId, taskId, cost);
      }
    }

    // Handle failure
    if (event === 'failed' || message?.includes('[FAILED]:')) {
      const reason = message?.match(/\[FAILED\]:\s*(.+?)(?=\[|$)/s)?.[1]?.trim() || message || 'Task failed.';

      await supabase.from('tasks').update({
        status: 'failed',
        agent_response: reason,
        completed_at: new Date().toISOString(),
      }).eq('id', taskId);

      await supabase.from('agent_sessions').update({
        status: 'failed',
        completed_at: new Date().toISOString(),
      }).eq('id', session.id);

      if (tokenUsage) {
        const cost = calculateTaskCost(tokenUsage.inputTokens || 0, tokenUsage.outputTokens || 0);
        await chargeForTask(userId, taskId, cost);
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error('OpenClaw webhook error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
