import { MARGIN, MODEL_PRICING, MIN_BALANCE_FOR_EXECUTION } from './constants';
import { TaskCost } from './types';
import { createServerClient } from './supabase/server';

export function calculateTaskCost(
  inputTokens: number,
  outputTokens: number,
  model: string = 'claude-sonnet-4-20250514'
): TaskCost {
  const pricing = MODEL_PRICING[model as keyof typeof MODEL_PRICING] ||
    MODEL_PRICING['claude-sonnet-4-20250514'];
  const aiCost = (inputTokens * pricing.input) + (outputTokens * pricing.output);
  const clientCost = aiCost * (1 + MARGIN);
  const margin = clientCost - aiCost;
  return { aiCost, clientCost, margin, inputTokens, outputTokens };
}

export function canExecuteTask(userBalance: number): boolean {
  return userBalance >= MIN_BALANCE_FOR_EXECUTION;
}

export async function chargeForTask(
  userId: string,
  taskId: string,
  cost: TaskCost
) {
  const supabase = await createServerClient();

  // Deduct from balance
  const { error: balanceError } = await supabase.rpc('deduct_credits', {
    p_user_id: userId,
    p_amount: cost.clientCost,
  });

  // Fallback if RPC not set up - direct update
  if (balanceError) {
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('credit_balance_usd, total_spent_usd, total_tasks_completed')
      .eq('id', userId)
      .single();

    if (profile) {
      await supabase
        .from('user_profiles')
        .update({
          credit_balance_usd: Math.max(0, Number(profile.credit_balance_usd) - cost.clientCost),
          total_spent_usd: Number(profile.total_spent_usd) + cost.clientCost,
          total_tasks_completed: profile.total_tasks_completed + 1,
        })
        .eq('id', userId);
    }
  }

  // Update task with cost breakdown
  await supabase
    .from('tasks')
    .update({
      token_input: cost.inputTokens,
      token_output: cost.outputTokens,
      ai_cost_usd: cost.aiCost,
      client_cost_usd: cost.clientCost,
      margin_usd: cost.margin,
    })
    .eq('id', taskId);

  // Create spend transaction
  await supabase.from('credit_transactions').insert({
    user_id: userId,
    type: 'spend',
    amount_usd: cost.clientCost,
    task_id: taskId,
    payment_status: 'completed',
    description: `Task execution: ${cost.inputTokens} in / ${cost.outputTokens} out tokens`,
  });
}
