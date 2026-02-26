export interface UserProfile {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  credit_balance_usd: number;
  total_spent_usd: number;
  total_tasks_completed: number;
  created_at: string;
  website_url: string | null;
  repo_url: string | null;
  onboarded: boolean;
}

export interface Task {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  desired_result: string | null;
  target_url: string | null;
  priority: 'urgent' | 'high' | 'medium' | 'low';
  status: 'backlog' | 'queued' | 'in_progress' | 'done' | 'failed';
  tags: string[];
  token_input: number | null;
  token_output: number | null;
  ai_cost_usd: number | null;
  client_cost_usd: number | null;
  margin_usd: number | null;
  agent_response: string | null;
  created_at: string;
  completed_at: string | null;
  checklist_items?: ChecklistItem[];
  task_images?: TaskImage[];
  admin_questions?: AdminQuestion[];
}

export interface ChecklistItem {
  id: string;
  task_id: string;
  text: string;
  done: boolean;
  position: number;
}

export interface TaskImage {
  id: string;
  task_id: string;
  url: string;
  alt_text: string | null;
  created_at: string;
}

export interface AdminQuestion {
  id: string;
  task_id: string;
  question: string;
  answer: string | null;
  answered: boolean;
  created_at: string;
}

export interface CreditTransaction {
  id: string;
  user_id: string;
  type: 'topup' | 'spend' | 'refund';
  amount_usd: number;
  currency_original: string | null;
  amount_original: number | null;
  payment_method: string | null;
  payment_id: string | null;
  payment_status: string;
  task_id: string | null;
  description: string | null;
  created_at: string;
}

export interface TaskCost {
  aiCost: number;
  clientCost: number;
  margin: number;
  inputTokens: number;
  outputTokens: number;
}

export type Currency = 'USD' | 'ARS' | 'BTC';
export type PaymentMethod = 'stripe' | 'mercadopago' | 'galiopay' | 'lightning';
