import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { getClient, AGENT_TOOLS, SYSTEM_PROMPT } from '@/lib/claude';
import { calculateTaskCost, canExecuteTask, chargeForTask } from '@/lib/credits';
import type Anthropic from '@anthropic-ai/sdk';

export async function POST(req: NextRequest) {
  try {
    const { taskId } = await req.json();
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

    // Update status to in_progress
    await supabase.from('tasks').update({ status: 'in_progress' }).eq('id', taskId);

    // Build user message
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

    const messages: Anthropic.MessageParam[] = [
      { role: 'user', content: parts.join('\n\n') },
    ];

    let totalInputTokens = 0;
    let totalOutputTokens = 0;
    let taskCompleted = false;
    let iterations = 0;
    const MAX_ITERATIONS = 10;

    while (!taskCompleted && iterations < MAX_ITERATIONS) {
      iterations++;

      const response = await getClient().messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4096,
        system: SYSTEM_PROMPT,
        tools: AGENT_TOOLS,
        messages,
      });

      totalInputTokens += response.usage.input_tokens;
      totalOutputTokens += response.usage.output_tokens;

      // Process response
      const assistantContent = response.content;
      messages.push({ role: 'assistant', content: assistantContent });

      if (response.stop_reason === 'end_turn') {
        // Agent finished without using tools - complete with text
        const textBlock = assistantContent.find(b => b.type === 'text');
        await supabase.from('tasks').update({
          status: 'done',
          agent_response: textBlock?.text || 'Task completed.',
          completed_at: new Date().toISOString(),
        }).eq('id', taskId);
        taskCompleted = true;
        break;
      }

      if (response.stop_reason === 'tool_use') {
        const toolResults: Anthropic.ToolResultBlockParam[] = [];

        for (const block of assistantContent) {
          if (block.type !== 'tool_use') continue;

          const input = block.input as Record<string, string>;

          switch (block.name) {
            case 'ask_question': {
              await supabase.from('admin_questions').insert({
                task_id: taskId,
                question: input.question,
              });
              toolResults.push({
                type: 'tool_result',
                tool_use_id: block.id,
                content: 'Question sent to human. Waiting for answer. For now, continue with what you can.',
              });
              break;
            }
            case 'mark_step_done': {
              await supabase.from('checklist_items')
                .update({ done: true })
                .eq('id', input.checklist_item_id);
              toolResults.push({
                type: 'tool_result',
                tool_use_id: block.id,
                content: 'Checklist item marked as done.',
              });
              break;
            }
            case 'complete_task': {
              await supabase.from('tasks').update({
                status: 'done',
                agent_response: input.summary,
                completed_at: new Date().toISOString(),
              }).eq('id', taskId);
              toolResults.push({
                type: 'tool_result',
                tool_use_id: block.id,
                content: 'Task marked as completed.',
              });
              taskCompleted = true;
              break;
            }
            case 'fail_task': {
              await supabase.from('tasks').update({
                status: 'failed',
                agent_response: input.reason,
                completed_at: new Date().toISOString(),
              }).eq('id', taskId);
              toolResults.push({
                type: 'tool_result',
                tool_use_id: block.id,
                content: 'Task marked as failed.',
              });
              taskCompleted = true;
              break;
            }
          }
        }

        if (!taskCompleted) {
          messages.push({ role: 'user', content: toolResults });
        }
      }
    }

    // Calculate and charge cost
    const cost = calculateTaskCost(totalInputTokens, totalOutputTokens);
    await chargeForTask(task.user_id, taskId, cost);

    return NextResponse.json({
      success: true,
      cost: {
        inputTokens: totalInputTokens,
        outputTokens: totalOutputTokens,
        clientCost: cost.clientCost,
      },
    });
  } catch (error: any) {
    console.error('Agent error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
