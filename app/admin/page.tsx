import { createServerClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';

export default async function AdminDashboard() {
  const supabase = await createServerClient();

  const { data: profiles } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('role', 'client')
    .order('created_at', { ascending: false });

  const { data: repos } = await supabase
    .from('client_repos')
    .select('*');

  const { data: tasks } = await supabase
    .from('tasks')
    .select('id, user_id, status');

  const { data: invitations } = await supabase
    .from('invitations')
    .select('*')
    .order('created_at', { ascending: false });

  const reposByEmail = (repos || []).reduce((acc: Record<string, typeof repos>, r) => {
    if (!r) return acc;
    (acc[r.email] ??= []).push(r);
    return acc;
  }, {});

  const tasksByUser = (tasks || []).reduce((acc: Record<string, number>, t) => {
    if (!t) return acc;
    acc[t.user_id] = (acc[t.user_id] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-8">
      {/* Clients */}
      <section>
        <h2 className="text-lg font-semibold mb-4 text-white">Clients</h2>
        {!profiles?.length ? (
          <p className="text-[#6B7280] text-sm">No clients yet.</p>
        ) : (
          <div className="space-y-3">
            {profiles.map((p) => (
              <Link key={p.id} href={`/admin/clients/${p.id}`}
                className="block p-4 rounded-xl bg-[#111827] border border-[#1F2937] hover:border-[#6366F1]/50 transition-colors">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-medium text-white">{p.display_name || 'Unnamed'}</span>
                    <span className="text-[#6B7280] text-sm ml-2">{p.repo_url || 'No repo'}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="text-xs">${(p.credit_balance_usd || 0).toFixed(2)}</Badge>
                    <span className="text-[#6B7280] text-xs">{tasksByUser[p.id] || 0} tasks</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Pending Invitations */}
      <section>
        <h2 className="text-lg font-semibold mb-4 text-white">Invitations</h2>
        {!invitations?.length ? (
          <p className="text-[#6B7280] text-sm">No invitations yet.</p>
        ) : (
          <div className="space-y-2">
            {invitations.map((inv) => (
              <div key={inv.id} className="flex items-center justify-between p-3 rounded-lg bg-[#111827] border border-[#1F2937]">
                <div>
                  <span className="text-white text-sm">{inv.email}</span>
                  <span className="text-[#6B7280] text-xs ml-2">
                    {(inv.repos as any[])?.length || 0} repos
                  </span>
                </div>
                <Badge variant={inv.accepted ? 'default' : 'outline'} className="text-xs">
                  {inv.accepted ? 'Accepted' : 'Pending'}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
