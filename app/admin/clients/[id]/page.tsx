import { createServerClient } from '@/lib/supabase/server';
import { Badge } from '@/components/ui/badge';
import { notFound } from 'next/navigation';
import AssignRepoForm from './AssignRepoForm';

export default async function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createServerClient();

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', id)
    .single();

  if (!profile) notFound();

  // Get email from auth
  const { data: authUser } = await supabase.auth.admin.getUserById(id).catch(() => ({ data: null })) as any;
  const email = authUser?.user?.email || '';

  const { data: repos } = await supabase
    .from('client_repos')
    .select('*')
    .eq('email', email);

  const { data: tasks } = await supabase
    .from('tasks')
    .select('id, title, status, created_at')
    .eq('user_id', id)
    .order('created_at', { ascending: false });

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="p-4 rounded-xl bg-[#111827] border border-[#1F2937]">
        <h2 className="text-lg font-semibold text-white">{profile.display_name || 'Unnamed'}</h2>
        <p className="text-sm text-[#6B7280]">{email}</p>
        <div className="flex gap-4 mt-3">
          <Badge variant="outline">${(profile.credit_balance_usd || 0).toFixed(2)} credits</Badge>
          <Badge variant="outline">{tasks?.length || 0} tasks</Badge>
          <Badge variant="outline">{profile.repo_url || 'No repo'}</Badge>
        </div>
      </div>

      {/* Repos */}
      <section>
        <h3 className="text-sm font-medium text-[#9CA3AF] mb-2">Assigned Repos</h3>
        {repos?.length ? (
          <div className="space-y-2">
            {repos.map((r) => (
              <div key={r.id} className="p-3 rounded-lg bg-[#111827] border border-[#1F2937]">
                <span className="text-white text-sm">{r.display_name || r.repo_url}</span>
                <span className="text-[#6B7280] text-xs ml-2">{r.repo_url}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-[#6B7280] text-sm">No repos assigned.</p>
        )}
        <AssignRepoForm email={email} />
      </section>

      {/* Tasks */}
      <section>
        <h3 className="text-sm font-medium text-[#9CA3AF] mb-2">Tasks</h3>
        {tasks?.length ? (
          <div className="space-y-2">
            {tasks.map((t) => (
              <div key={t.id} className="flex items-center justify-between p-3 rounded-lg bg-[#111827] border border-[#1F2937]">
                <span className="text-white text-sm truncate">{t.title}</span>
                <Badge variant="outline" className="text-xs">{t.status}</Badge>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-[#6B7280] text-sm">No tasks yet.</p>
        )}
      </section>
    </div>
  );
}
