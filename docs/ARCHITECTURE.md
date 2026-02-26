# TaskBot Architecture

## Overview

TaskBot is a task management platform where clients submit tasks and AI agents execute them. The AI execution layer uses **OpenClaw** as the backend, running isolated sub-agent sessions per task.

## Flow

```
Client (Telegram/WhatsApp) → TaskBot Telegram Bot → Webhook → Route to OpenClaw Session
                                                                        ↓
Client (Web App) → TaskBot Dashboard ← ← ← ← ← ← ← ← ← OpenClaw Sub-Agent
                                                                        ↓
                                                              Henry (Main Session) monitors/guides
```

## Components

### Web App (Next.js)
- `/app/page.tsx` — Kanban board dashboard
- `/app/api/agent/route.ts` — Spawns/manages OpenClaw sessions per task
- `/app/api/webhook/telegram/route.ts` — Receives Telegram updates
- `/app/api/webhook/openclaw/route.ts` — Receives OpenClaw session callbacks
- `/app/api/payments/*` — Stripe, MercadoPago, GalioPay, Lightning payment handlers

### Libraries
- `lib/openclaw.ts` — OpenClaw Gateway API client (spawn, message, status, terminate)
- `lib/telegram-bridge.ts` — Telegram ↔ TaskBot user mapping and message routing
- `lib/credits.ts` — Cost calculation with 35% margin, supports both token-based and OpenClaw session metadata
- `lib/claude.ts` — Deprecated, kept for reference

### Database (Supabase)
- `tasks` — Task definitions with status, priority, cost tracking
- `agent_sessions` — Maps tasks to OpenClaw session keys
- `telegram_users` — Maps Telegram user IDs to TaskBot accounts
- `checklist_items`, `admin_questions`, `task_images` — Task detail tables
- `user_profiles`, `credit_transactions` — User accounts and billing

## How a Task Executes

1. Client creates task via web app or Telegram
2. `POST /api/agent` checks credits, spawns OpenClaw sub-agent session
3. Session key stored in `agent_sessions` table
4. OpenClaw runs the agent with full tool access (browser, search, etc.)
5. Agent reports back via webhook (`/api/webhook/openclaw`)
6. Webhook parses markers (`[COMPLETE]:`, `[QUESTION]:`, `[DONE:id]`, `[FAILED]:`)
7. Updates task status, charges credits, forwards messages to Telegram

## Environment Variables

| Variable | Purpose |
|---|---|
| `OPENCLAW_GATEWAY_URL` | OpenClaw Gateway API base URL |
| `OPENCLAW_GATEWAY_TOKEN` | Auth token for Gateway API |
| `TASKBOT_TELEGRAM_BOT_TOKEN` | Telegram Bot API token |
| `TASKBOT_TELEGRAM_WEBHOOK_URL` | Public URL for Telegram webhook |
| `NEXT_PUBLIC_APP_URL` | App base URL (for callback URLs) |
