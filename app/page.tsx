import { createServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Board from '@/components/Board';

export default async function Home() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

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
