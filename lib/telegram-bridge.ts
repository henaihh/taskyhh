/**
 * Telegram Bridge
 *
 * Maps Telegram users to TaskBot accounts and routes messages
 * to/from OpenClaw sub-agent sessions.
 */

import { createServiceClient } from '@/lib/supabase/server';
import { sendMessage } from '@/lib/openclaw';

const TELEGRAM_BOT_TOKEN = process.env.TASKBOT_TELEGRAM_BOT_TOKEN || '';
const TELEGRAM_API = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;

/**
 * Send a message to a Telegram chat.
 */
export async function sendTelegramMessage(chatId: string | number, text: string): Promise<void> {
  await fetch(`${TELEGRAM_API}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: 'Markdown',
    }),
  });
}

/**
 * Look up a TaskBot user by their Telegram user ID.
 * Returns null if no mapping exists.
 */
export async function getUserByTelegramId(telegramUserId: number): Promise<{ userId: string; chatId: number } | null> {
  const supabase = await createServiceClient();

  const { data } = await supabase
    .from('telegram_users')
    .select('user_id, chat_id')
    .eq('telegram_user_id', telegramUserId)
    .single();

  return data || null;
}

/**
 * Find the active agent session for a user's current task.
 */
export async function getActiveSessionForUser(userId: string): Promise<{
  sessionKey: string;
  taskId: string;
} | null> {
  const supabase = await createServiceClient();

  const { data } = await supabase
    .from('agent_sessions')
    .select('openclaw_session_key, task_id')
    .eq('user_id', userId)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (!data) return null;

  return {
    sessionKey: data.openclaw_session_key,
    taskId: data.task_id,
  };
}

/**
 * Route an incoming Telegram message to the appropriate OpenClaw session.
 */
export async function routeTelegramMessage(
  telegramUserId: number,
  chatId: number,
  text: string
): Promise<void> {
  // Look up user
  const mapping = await getUserByTelegramId(telegramUserId);

  if (!mapping) {
    await sendTelegramMessage(
      chatId,
      '👋 Welcome! You need to link your Telegram account first.\n\nVisit the TaskBot web app to connect your account.'
    );
    return;
  }

  // Find active session
  const session = await getActiveSessionForUser(mapping.userId);

  if (!session) {
    await sendTelegramMessage(
      chatId,
      '📋 No active task right now. Create a new task in the TaskBot web app and I\'ll start working on it!'
    );
    return;
  }

  // Forward message to OpenClaw session
  const result = await sendMessage({
    sessionKey: session.sessionKey,
    message: text,
  });

  if (!result.ok) {
    await sendTelegramMessage(chatId, '⚠️ Failed to deliver your message. Please try again.');
  }
}

/**
 * Forward an agent response to the client's Telegram chat.
 */
export async function forwardToTelegram(userId: string, message: string): Promise<void> {
  const supabase = await createServiceClient();

  const { data } = await supabase
    .from('telegram_users')
    .select('chat_id')
    .eq('user_id', userId)
    .single();

  if (data?.chat_id) {
    await sendTelegramMessage(data.chat_id, message);
  }
}
