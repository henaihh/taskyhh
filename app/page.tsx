import { createServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Board from '@/components/Board';
import { runOnboarding } from '@/lib/onboarding';

export default async function Home() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  // Run onboarding if needed (creates setup tasks for new users)
  await runOnboarding(supabase, user.id);

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  const { data: tasks } = await supabase
    .from('tasks')
    .select('*, checklist_items(*), task_images(*), admin_questions(*)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  return (
    <Board
      user={user}
      profile={profile}
      initialTasks={tasks || []}
    />
  );
}
