/**
 * OpenClaw Gateway Integration
 *
 * Replaces direct Claude API calls with OpenClaw sub-agent sessions.
 * Each task gets its own isolated session that can use tools, browse, etc.
 */

const GATEWAY_URL = process.env.OPENCLAW_GATEWAY_URL || 'http://localhost:3033';
const GATEWAY_TOKEN = process.env.OPENCLAW_GATEWAY_TOKEN || '';

interface SpawnSessionOptions {
  taskId: string;
  userId: string;
  prompt: string;
  callbackUrl?: string;
}

interface SessionStatus {
  sessionKey: string;
  status: 'active' | 'completed' | 'failed';
  lastMessage?: string;
  tokenUsage?: {
    inputTokens: number;
    outputTokens: number;
  };
}

interface SendMessageOptions {
  sessionKey: string;
  message: string;
}

interface OpenClawResponse {
  ok: boolean;
  sessionKey?: string;
  error?: string;
  data?: any;
}

async function gatewayFetch(path: string, body: Record<string, any>): Promise<any> {
  const res = await fetch(`${GATEWAY_URL}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(GATEWAY_TOKEN ? { Authorization: `Bearer ${GATEWAY_TOKEN}` } : {}),
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`OpenClaw Gateway error ${res.status}: ${text}`);
  }

  return res.json();
}

/**
 * Spawn a new sub-agent session for a task.
 * The session runs independently and reports back via callback webhook.
 */
export async function spawnSession(opts: SpawnSessionOptions): Promise<OpenClawResponse> {
  try {
    const data = await gatewayFetch('/api/sessions/spawn', {
      label: `taskbot:${opts.taskId}`,
      systemPrompt: TASKBOT_AGENT_SYSTEM_PROMPT,
      message: opts.prompt,
      callbackUrl: opts.callbackUrl || `${process.env.NEXT_PUBLIC_APP_URL}/api/webhook/openclaw`,
      metadata: {
        taskId: opts.taskId,
        userId: opts.userId,
      },
    });

    return { ok: true, sessionKey: data.sessionKey, data };
  } catch (error: any) {
    console.error('Failed to spawn OpenClaw session:', error.message);
    return { ok: false, error: error.message };
  }
}

/**
 * Send a message to an existing sub-agent session.
 */
export async function sendMessage(opts: SendMessageOptions): Promise<OpenClawResponse> {
  try {
    const data = await gatewayFetch('/api/sessions/message', {
      sessionKey: opts.sessionKey,
      message: opts.message,
    });

    return { ok: true, data };
  } catch (error: any) {
    console.error('Failed to send message to OpenClaw session:', error.message);
    return { ok: false, error: error.message };
  }
}

/**
 * Check the status of a sub-agent session.
 */
export async function getSessionStatus(sessionKey: string): Promise<SessionStatus | null> {
  try {
    const data = await gatewayFetch('/api/sessions/status', { sessionKey });
    return {
      sessionKey,
      status: data.status || 'active',
      lastMessage: data.lastMessage,
      tokenUsage: data.tokenUsage,
    };
  } catch (error: any) {
    console.error('Failed to get OpenClaw session status:', error.message);
    return null;
  }
}

/**
 * Terminate a sub-agent session.
 */
export async function terminateSession(sessionKey: string): Promise<void> {
  try {
    await gatewayFetch('/api/sessions/terminate', { sessionKey });
  } catch (error: any) {
    console.error('Failed to terminate OpenClaw session:', error.message);
  }
}

/**
 * System prompt for TaskBot sub-agents running inside OpenClaw.
 */
const TASKBOT_AGENT_SYSTEM_PROMPT = `You are a TaskBot agent handling a specific task for a client.

You will receive a task with title, description, desired result, target URL, and possibly images.

You have access to tools (browser, file system, web search, etc.) through OpenClaw.

## Your workflow:
1. Analyze the task requirements
2. Execute the task step by step
3. If you need clarification, include it in your response with [QUESTION]: prefix
4. Mark checklist items as you complete them with [DONE:item_id]: prefix
5. When finished, include [COMPLETE]: followed by a summary
6. If you cannot complete it, include [FAILED]: followed by the reason

## Response format:
Your response will be parsed for these markers:
- [QUESTION]: <text> — asks the client a question
- [DONE:<checklist_item_id>] — marks a checklist item complete
- [COMPLETE]: <summary> — task completed successfully
- [FAILED]: <reason> — task cannot be completed

You may include multiple markers in one response. Always be thorough and professional.`;

export type { SpawnSessionOptions, SessionStatus, SendMessageOptions, OpenClawResponse };
