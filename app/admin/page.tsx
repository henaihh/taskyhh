import { createServerClient } from '@/lib/supabase/server';
import { Button } from '@/components/ui/button';
import { Bot, Plus, Users, CreditCard, CheckSquare } from 'lucide-react';
import Link from 'next/link';

export default async function AdminDashboard() {
  const supabase = await createServerClient();

  // Get all clients with their stats
  const { data: clients } = await supabase
    .from('user_profiles')
    .select(`
      id,
      display_name,
      avatar_url,
      credit_balance_usd,
      total_spent_usd,
      total_tasks_completed,
      created_at,
      repo_url,
      role
    `)
    .eq('role', 'client')
    .order('created_at', { ascending: false });

  // Get client repos for each client
  const { data: clientRepos } = await supabase
    .from('client_repos')
    .select('*')
    .order('created_at', { ascending: false });

  // Get task counts for each client
  const { data: taskCounts } = await supabase
    .from('tasks')
    .select('user_id, status')
    .in('user_id', (clients || []).map(c => c.id));

  // Group repos by email
  const reposByEmail: Record<string, Array<{ id: string; email: string; repo_url: string; display_name: string }>> = {};
  if (clientRepos) {
    for (const repo of clientRepos) {
      if (!reposByEmail[repo.email]) reposByEmail[repo.email] = [];
      reposByEmail[repo.email].push(repo);
    }
  }

  // Calculate task stats
  const taskStatsByUser = taskCounts?.reduce((acc, task) => {
    if (!acc[task.user_id]) {
      acc[task.user_id] = { total: 0, done: 0, in_progress: 0 };
    }
    acc[task.user_id].total++;
    if (task.status === 'done') acc[task.user_id].done++;
    if (task.status === 'in_progress') acc[task.user_id].in_progress++;
    return acc;
  }, {} as Record<string, { total: number; done: number; in_progress: number }>) || {};

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#6366F1] to-[#818CF8] flex items-center justify-center">
            <Bot className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Admin Dashboard</h1>
            <p className="text-gray-400 text-sm">Manage clients and invitations</p>
          </div>
        </div>
        
        <Link href="/admin/invite">
          <Button className="bg-[#6366F1] hover:bg-[#5855EB] text-white">
            <Plus className="w-4 h-4" />
            Create Invitation
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-[#1F2937] rounded-xl p-6">
          <div className="flex items-center gap-3">
            <Users className="w-8 h-8 text-[#6366F1]" />
            <div>
              <p className="text-2xl font-bold text-white">{clients?.length || 0}</p>
              <p className="text-gray-400 text-sm">Total Clients</p>
            </div>
          </div>
        </div>
        
        <div className="bg-[#1F2937] rounded-xl p-6">
          <div className="flex items-center gap-3">
            <CreditCard className="w-8 h-8 text-[#10B981]" />
            <div>
              <p className="text-2xl font-bold text-white">
                ${clients?.reduce((sum, c) => sum + (c.credit_balance_usd || 0), 0).toFixed(2)}
              </p>
              <p className="text-gray-400 text-sm">Total Credits</p>
            </div>
          </div>
        </div>
        
        <div className="bg-[#1F2937] rounded-xl p-6">
          <div className="flex items-center gap-3">
            <CheckSquare className="w-8 h-8 text-[#F59E0B]" />
            <div>
              <p className="text-2xl font-bold text-white">
                {Object.values(taskStatsByUser).reduce((sum, stats) => sum + stats.total, 0)}
              </p>
              <p className="text-gray-400 text-sm">Total Tasks</p>
            </div>
          </div>
        </div>
      </div>

      {/* Clients List */}
      <div className="bg-[#1F2937] rounded-xl p-6">
        <h2 className="text-xl font-bold text-white mb-6">Clients</h2>
        
        {!clients || clients.length === 0 ? (
          <div className="text-center py-12">
            <Users className="w-12 h-12 text-gray-500 mx-auto mb-4" />
            <p className="text-gray-400 text-lg mb-2">No clients yet</p>
            <p className="text-gray-500 text-sm mb-6">Create an invitation to get started</p>
            <Link href="/admin/invite">
              <Button className="bg-[#6366F1] hover:bg-[#5855EB] text-white">
                <Plus className="w-4 h-4" />
                Create First Invitation
              </Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {clients.map((client) => {
              const stats = taskStatsByUser[client.id] || { total: 0, done: 0, in_progress: 0 };
              const repos = reposByEmail[client.id] || [];
              
              // Find user's email (we need to get this differently since we don't have it in user_profiles)
              const userEmail = repos.length > 0 ? repos[0].email : 'No email found';
              
              return (
                <div key={client.id} className="bg-[#374151] rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-4">
                      {client.avatar_url ? (
                        <img 
                          src={client.avatar_url} 
                          alt={client.display_name || 'User'} 
                          className="w-12 h-12 rounded-lg"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-[#6366F1] flex items-center justify-center">
                          <span className="text-white font-bold">
                            {(client.display_name || userEmail || 'U')[0].toUpperCase()}
                          </span>
                        </div>
                      )}
                      
                      <div>
                        <h3 className="font-semibold text-white">{client.display_name || 'Unnamed Client'}</h3>
                        <p className="text-gray-400 text-sm">{userEmail}</p>
                        <p className="text-gray-500 text-xs">
                          Joined {new Date(client.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <p className="text-white font-medium">${client.credit_balance_usd.toFixed(2)}</p>
                        <p className="text-gray-400 text-sm">Credits</p>
                      </div>
                      
                      <div className="text-right">
                        <p className="text-white font-medium">{stats.total}</p>
                        <p className="text-gray-400 text-sm">Tasks</p>
                      </div>
                      
                      <Link href={`/admin/clients/${client.id}`}>
                        <Button variant="outline" size="sm">
                          View Details
                        </Button>
                      </Link>
                    </div>
                  </div>
                  
                  {repos.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-gray-600">
                      <p className="text-gray-400 text-sm mb-2">Repositories ({repos.length})</p>
                      <div className="flex flex-wrap gap-2">
                        {repos.map((repo, idx) => (
                          <span key={idx} className="px-3 py-1 bg-[#1F2937] rounded-full text-gray-300 text-sm">
                            {repo.display_name || repo.repo_url}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}