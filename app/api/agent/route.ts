import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { spawnSession, sendMessage, getSessionStatus } from '@/lib/openclaw';
import { canExecuteTask } from '@/lib/credits';

export async function POST(req: NextRequest) {
  try {
    const { taskId, message } = await req.json();
    if (!taskId) return NextResponse.json({ error: 'Missing taskId' }, { status: 400 });

    const supabase = await createServiceClient();

    // Get task with related data
    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .select('*, checklist_items(*), task_images(*), admin_questions(*)')
      .eq('id', taskId)
      .single();

    if (taskError || !task) return NextResponse.json({ error: 'Task not found' }, { status: 404 });

    // Check user credits
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('credit_balance_usd')
      .eq('id', task.user_id)
      .single();

    if (!profile || !canExecuteTask(Number(profile.credit_balance_usd))) {
      return NextResponse.json({ error: 'Insufficient credits' }, { status: 402 });
    }

    // Check for existing active session
    const { data: existingSession } = await supabase
      .from('agent_sessions')
      .select('*')
      .eq('task_id', taskId)
      .eq('status', 'active')
      .single();

    // If there's an active session and we have a follow-up message, send it
    if (existingSession && message) {
      const result = await sendMessage({
        sessionKey: existingSession.openclaw_session_key,
        message,
      });

      if (!result.ok) {
        return NextResponse.json({ error: result.error }, { status: 500 });
      }

      return NextResponse.json({ success: true, sessionKey: existingSession.openclaw_session_key });
    }

    // If session already exists, return its status
    if (existingSession) {
      const status = await getSessionStatus(existingSession.openclaw_session_key);
      return NextResponse.json({ success: true, session: status });
    }

    // Build prompt for new session
    const parts: string[] = [
      `**Task:** ${task.title}`,
    ];
    if (task.description) parts.push(`**Description:** ${task.description}`);
    if (task.desired_result) parts.push(`**Desired Result:** ${task.desired_result}`);
    if (task.target_url) parts.push(`**Target URL:** ${task.target_url}`);
    if (task.checklist_items?.length > 0) {
      parts.push(`**Checklist:**\n${task.checklist_items.map((c: any) => `- [${c.done ? 'x' : ' '}] ${c.text} (id: ${c.id})`).join('\n')}`);
    }
    if (task.tags?.length > 0) parts.push(`**Tags:** ${task.tags.join(', ')}`);

    const prompt = parts.join('\n\n');

    // Update status to in_progress
    await supabase.from('tasks').update({ status: 'in_progress' }).eq('id', taskId);

    // Spawn OpenClaw sub-agent session
    const result = await spawnSession({
      taskId,
      userId: task.user_id,
      prompt,
      callbackUrl: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhook/openclaw`,
    });

    if (!result.ok || !result.sessionKey) {
      await supabase.from('tasks').update({ status: 'queued' }).eq('id', taskId);
      return NextResponse.json({ error: result.error || 'Failed to spawn session' }, { status: 500 });
    }

    // Track session in DB
    await supabase.from('agent_sessions').insert({
      task_id: taskId,
      user_id: task.user_id,
      openclaw_session_key: result.sessionKey,
      status: 'active',
    });

    return NextResponse.json({
      success: true,
      sessionKey: result.sessionKey,
    });
  } catch (error: any) {
    console.error('Agent error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
