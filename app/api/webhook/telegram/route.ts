import { NextRequest, NextResponse } from 'next/server';
import { routeTelegramMessage } from '@/lib/telegram-bridge';

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
