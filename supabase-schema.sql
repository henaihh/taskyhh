-- TaskBot Database Schema for Supabase

-- Users extended profile
create table user_profiles (
  id uuid primary key references auth.users(id),
  display_name text,
  avatar_url text,
  credit_balance_usd numeric(12,6) default 0,
  total_spent_usd numeric(12,6) default 0,
  total_tasks_completed int default 0,
  created_at timestamptz default now()
);

-- Tasks
create table tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id),
  title text not null,
  description text,
  desired_result text,
  target_url text,
  priority text check (priority in ('urgent','high','medium','low')) default 'medium',
  status text check (status in ('backlog','queued','in_progress','done','failed')) default 'backlog',
  tags text[] default '{}',
  token_input int,
  token_output int,
  ai_cost_usd numeric(10,6),
  client_cost_usd numeric(10,6),
  margin_usd numeric(10,6),
  agent_response text,
  created_at timestamptz default now(),
  completed_at timestamptz
);

-- Credit transactions
create table credit_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id),
  type text check (type in ('topup','spend','refund')),
  amount_usd numeric(12,6) not null,
  currency_original text,
  amount_original numeric(18,8),
  payment_method text,
  payment_id text,
  payment_status text default 'pending',
  task_id uuid references tasks(id),
  description text,
  created_at timestamptz default now()
);

-- Checklist items
create table checklist_items (
  id uuid primary key default gen_random_uuid(),
  task_id uuid references tasks(id) on delete cascade,
  text text not null,
  done boolean default false,
  position int default 0
);

-- Task images
create table task_images (
  id uuid primary key default gen_random_uuid(),
  task_id uuid references tasks(id) on delete cascade,
  url text not null,
  alt_text text,
  created_at timestamptz default now()
);

-- Admin questions (robot → human)
create table admin_questions (
  id uuid primary key default gen_random_uuid(),
  task_id uuid references tasks(id) on delete cascade,
  question text not null,
  answer text,
  answered boolean default false,
  created_at timestamptz default now()
);

-- RLS policies
alter table user_profiles enable row level security;
alter table credit_transactions enable row level security;
alter table tasks enable row level security;
alter table checklist_items enable row level security;
alter table task_images enable row level security;
alter table admin_questions enable row level security;

create policy "Own profile" on user_profiles for all using (auth.uid() = id);
create policy "Own transactions" on credit_transactions for all using (auth.uid() = user_id);
create policy "Own tasks" on tasks for all using (auth.uid() = user_id);
create policy "Own checklist" on checklist_items for all using (
  task_id in (select id from tasks where user_id = auth.uid())
);
create policy "Own images" on task_images for all using (
  task_id in (select id from tasks where user_id = auth.uid())
);
create policy "Own questions" on admin_questions for all using (
  task_id in (select id from tasks where user_id = auth.uid())
);

-- Realtime
alter publication supabase_realtime add table tasks;
alter publication supabase_realtime add table admin_questions;
alter publication supabase_realtime add table user_profiles;

-- Function to auto-create user profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.user_profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', 'User'),
    coalesce(new.raw_user_meta_data->>'avatar_url', new.raw_user_meta_data->>'picture')
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Agent sessions (OpenClaw integration)
create table agent_sessions (
  id uuid primary key default gen_random_uuid(),
  task_id uuid references tasks(id) on delete cascade,
  user_id uuid references auth.users(id),
  openclaw_session_key text not null,
  status text default 'active' check (status in ('active','completed','failed')),
  created_at timestamptz default now(),
  completed_at timestamptz
);

-- Telegram user mapping
create table telegram_users (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  telegram_user_id bigint unique not null,
  chat_id bigint not null,
  username text,
  created_at timestamptz default now()
);

alter table agent_sessions enable row level security;
alter table telegram_users enable row level security;

create policy "Own agent sessions" on agent_sessions for all using (auth.uid() = user_id);
create policy "Own telegram mapping" on telegram_users for all using (auth.uid() = user_id);
