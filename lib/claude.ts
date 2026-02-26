import Anthropic from '@anthropic-ai/sdk';

let _client: Anthropic | null = null;

export function getClient(): Anthropic {
  if (!_client) {
    _client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return _client;
}

export const AGENT_TOOLS: Anthropic.Tool[] = [
  {
    name: 'ask_question',
    description: 'Ask the human a clarifying question about the task. Use when you need more information.',
    input_schema: {
      type: 'object' as const,
      properties: {
        question: { type: 'string', description: 'The question to ask the human' },
      },
      required: ['question'],
    },
  },
  {
    name: 'mark_step_done',
    description: 'Mark a checklist item as completed.',
    input_schema: {
      type: 'object' as const,
      properties: {
        checklist_item_id: { type: 'string', description: 'The ID of the checklist item to mark done' },
      },
      required: ['checklist_item_id'],
    },
  },
  {
    name: 'complete_task',
    description: 'Mark the task as completed with a summary of what was done.',
    input_schema: {
      type: 'object' as const,
      properties: {
        summary: { type: 'string', description: 'Summary of what was accomplished' },
      },
      required: ['summary'],
    },
  },
  {
    name: 'fail_task',
    description: 'Mark the task as failed with a reason.',
    input_schema: {
      type: 'object' as const,
      properties: {
        reason: { type: 'string', description: 'Why the task failed' },
      },
      required: ['reason'],
    },
  },
];

export const SYSTEM_PROMPT = `You are TaskBot, an AI agent. You receive tasks with title, description, desired result, target URL, and images. Plan and execute step by step.
If you need clarification from the human, use ask_question.
Report what you did and mark checklist items as you complete them.
When done, use complete_task with a detailed summary.
If you cannot complete the task, use fail_task with a clear reason.`;
