import { NextRequest, NextResponse } from 'next/server';
import { routeTelegramMessage } from '@/lib/telegram-bridge';

/**
 * GET /api/webhook/telegram?register=true
 * Registers this URL as the Telegram webhook. Call once after deploy.
 */
export async function GET(req: NextRequest) {
  const register = req.nextUrl.searchParams.get('register');

  if (register === 'true') {
    const token = process.env.TASKBOT_TELEGRAM_BOT_TOKEN;
    const webhookUrl = process.env.TASKBOT_TELEGRAM_WEBHOOK_URL
      || `${process.env.NEXT_PUBLIC_APP_URL}/api/webhook/telegram`;

    if (!token) return NextResponse.json({ error: 'Missing TASKBOT_TELEGRAM_BOT_TOKEN' }, { status: 500 });

    const res = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: webhookUrl,
        allowed_updates: ['message'],
      }),
    });

    const data = await res.json();
    return NextResponse.json({ webhook: webhookUrl, telegram: data });
  }

  // Check current webhook info
  const token = process.env.TASKBOT_TELEGRAM_BOT_TOKEN;
  if (!token) return NextResponse.json({ error: 'No bot token configured' }, { status: 500 });

  const res = await fetch(`https://api.telegram.org/bot${token}/getWebhookInfo`);
  const data = await res.json();
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  try {
    const update = await req.json();

    // Handle text messages
    const message = update.message;
    if (!message?.text || !message?.from?.id) {
      return NextResponse.json({ ok: true });
    }

    const telegramUserId = message.from.id;
    const chatId = message.chat.id;
    const text = message.text;

    // Skip bot commands for now (can expand later)
    if (text === '/start') {
      const { sendTelegramMessage } = await import('@/lib/telegram-bridge');
      await sendTelegramMessage(
        chatId,
        '🤖 *TaskBot* — Your AI task assistant!\n\n' +
        'Link your account in the web app to start chatting with your task agent here.\n\n' +
        'Once linked, just send messages here and they\'ll go straight to your active task agent.'
      );
      return NextResponse.json({ ok: true });
    }

    await routeTelegramMessage(telegramUserId, chatId, text);

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error('Telegram webhook error:', error);
    return NextResponse.json({ ok: true }); // Always 200 to Telegram
  }
}
