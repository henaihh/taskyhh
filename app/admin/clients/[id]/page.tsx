import { createServerClient } from '@/lib/supabase/server';
import { Button } from '@/components/ui/button';
import { ArrowLeft, CreditCard, CheckSquare, GitBranch, User, DollarSign } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import AssignRepoForm from './AssignRepoForm';

export default async function ClientDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const supabase = await createServerClient();
  const { id } = await params;

  // Get client details (admin can see all via RLS)
  const { data: client, error: clientError } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', id)
    .single();

  if (clientError || !client) {
    notFound();
  }

  // Get client's repositories using their display_name/email from client_repos
  const { data: repos } = await supabase
    .from('client_repos')
    .select('*')
    .order('created_at', { ascending: false });

  // Get client's tasks with costs
  const { data: tasks } = await supabase
    .from('tasks')
    .select('*, admin_questions(*)')
    .eq('user_id', id)
    .order('created_at', { ascending: false });

  // Get credit transactions
  const { data: transactions } = await supabase
    .from('credit_transactions')
    .select('*')
    .eq('user_id', id)
    .order('created_at', { ascending: false })
    .limit(10);

  // Task stats
  const taskStats = {
    total: tasks?.length || 0,
    done: tasks?.filter((t: { status: string }) => t.status === 'done').length || 0,
    in_progress: tasks?.filter((t: { status: string }) => t.status === 'in_progress').length || 0,
    failed: tasks?.filter((t: { status: string }) => t.status === 'failed').length || 0,
    totalRevenue: tasks?.reduce((sum: number, t: { client_cost_usd: number | null }) => sum + (t.client_cost_usd || 0), 0) || 0,
    totalCost: tasks?.reduce((sum: number, t: { ai_cost_usd: number | null }) => sum + (t.ai_cost_usd || 0), 0) || 0,
  };

  // Filter repos for this client (by matching any available identifier)
  const clientRepos = repos || [];

  // Pending questions
  const pendingQuestions = tasks?.flatMap((t: { admin_questions?: Array<{ answered: boolean }> }) => 
    (t.admin_questions || []).filter((q: { answered: boolean }) => !q.answered)
  ) || [];

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/admin">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        
        {client.avatar_url ? (
          <img 
            src={client.avatar_url} 
            alt={client.display_name || 'User'} 
            className="w-12 h-12 rounded-xl"
          />
        ) : (
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#6366F1] to-[#818CF8] flex items-center justify-center">
            <User className="w-7 h-7 text-white" />
          </div>
        )}
        
        <div>
          <h1 className="text-2xl font-bold text-white">{client.display_name || 'Unnamed Client'}</h1>
          <p className="text-gray-400 text-sm">Joined {new Date(client.created_at).toLocaleDateString()}</p>
        </div>
      </div>

      {/* Pending questions alert */}
      {pendingQuestions.length > 0 && (
        <div className="bg-red-900/30 border border-red-800 rounded-lg p-3 mb-6">
          <p className="text-red-300 text-sm font-medium">⚠️ {pendingQuestions.length} unanswered question(s) from the bot for this client</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Profile + Stats */}
        <div className="space-y-4">
          {/* Stats */}
          <div className="bg-[#1F2937] rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-[#10B981]" />
                <span className="text-gray-400 text-sm">Balance</span>
              </div>
              <span className={`font-bold ${client.credit_balance_usd <= 0.5 ? 'text-red-400' : 'text-white'}`}>
                ${client.credit_balance_usd.toFixed(2)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-[#F59E0B]" />
                <span className="text-gray-400 text-sm">Total Spent</span>
              </div>
              <span className="text-white font-bold">${client.total_spent_usd.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-[#10B981]" />
                <span className="text-gray-400 text-sm">Revenue</span>
              </div>
              <span className="text-white font-bold">${taskStats.totalRevenue.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckSquare className="w-5 h-5 text-[#6366F1]" />
                <span className="text-gray-400 text-sm">Tasks</span>
              </div>
              <span className="text-white font-bold">{taskStats.total}</span>
            </div>
          </div>

          {/* Task breakdown */}
          <div className="bg-[#1F2937] rounded-xl p-4">
            <h3 className="text-white font-medium mb-3">Task Breakdown</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="text-center p-2 bg-[#374151] rounded-lg">
                <p className="text-lg font-bold text-[#10B981]">{taskStats.done}</p>
                <p className="text-gray-400 text-xs">Done</p>
              </div>
              <div className="text-center p-2 bg-[#374151] rounded-lg">
                <p className="text-lg font-bold text-[#F59E0B]">{taskStats.in_progress}</p>
                <p className="text-gray-400 text-xs">Active</p>
              </div>
              <div className="text-center p-2 bg-[#374151] rounded-lg">
                <p className="text-lg font-bold text-[#EF4444]">{taskStats.failed}</p>
                <p className="text-gray-400 text-xs">Failed</p>
              </div>
              <div className="text-center p-2 bg-[#374151] rounded-lg">
                <p className="text-lg font-bold text-gray-300">{taskStats.total - taskStats.done - taskStats.in_progress - taskStats.failed}</p>
                <p className="text-gray-400 text-xs">Backlog</p>
              </div>
            </div>
          </div>

          {/* Profile info */}
          <div className="bg-[#1F2937] rounded-xl p-4">
            <h3 className="text-white font-medium mb-3">Profile</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Website</span>
                <span className="text-white">{client.website_url || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Repo</span>
                <span className="text-white truncate ml-4">{client.repo_url || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Onboarded</span>
                <span className="text-white">{client.onboarded ? 'Yes' : 'No'}</span>
              </div>
            </div>
          </div>

          {/* Repositories */}
          <div className="bg-[#1F2937] rounded-xl p-4">
            <h3 className="text-white font-medium mb-3">Repositories</h3>
            {clientRepos.length === 0 ? (
              <p className="text-gray-400 text-sm">No extra repos assigned</p>
            ) : (
              <div className="space-y-2 mb-3">
                {clientRepos.map((repo: { id: string; display_name: string; repo_url: string }) => (
                  <div key={repo.id} className="flex items-center gap-2 p-2 bg-[#374151] rounded-lg">
                    <GitBranch className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-white text-sm truncate">{repo.display_name || repo.repo_url}</p>
                      {repo.display_name && <p className="text-gray-400 text-xs truncate">{repo.repo_url}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="border-t border-gray-600 pt-3">
              <p className="text-gray-400 text-xs mb-2">Assign New Repo</p>
              <AssignRepoForm email={client.display_name || ''} />
            </div>
          </div>
        </div>

        {/* Right: Tasks + Transactions */}
        <div className="lg:col-span-2 space-y-6">
          {/* Tasks */}
          <div className="bg-[#1F2937] rounded-xl p-4 md:p-6">
            <h2 className="text-lg font-bold text-white mb-4">Tasks</h2>
            
            {!tasks || tasks.length === 0 ? (
              <p className="text-gray-400 text-center py-6">No tasks yet</p>
            ) : (
              <div className="space-y-2">
                {tasks.map((task: { id: string; title: string; status: string; priority: string; task_type: string; client_cost_usd: number | null; ai_cost_usd: number | null; created_at: string; completed_at: string | null }) => (
                  <div key={task.id} className="flex items-center justify-between p-3 bg-[#374151] rounded-lg">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                        task.status === 'done' ? 'bg-[#10B981]' :
                        task.status === 'in_progress' ? 'bg-[#F59E0B]' :
                        task.status === 'failed' ? 'bg-[#EF4444]' :
                        'bg-gray-500'
                      }`} />
                      <div className="min-w-0">
                        <p className="text-white text-sm truncate">{task.title}</p>
                        <div className="flex items-center gap-2 text-xs text-gray-400">
                          <span>{task.status.replace('_', ' ')}</span>
                          <span>•</span>
                          <span>{task.priority}</span>
                          <span>•</span>
                          <span className={task.task_type === 'bot' ? 'text-[#6366F1]' : 'text-gray-400'}>
                            {task.task_type === 'bot' ? '🤖 Bot' : '👤 Human'}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0 ml-3">
                      {task.client_cost_usd != null && task.client_cost_usd > 0 ? (
                        <>
                          <p className="text-white text-sm font-medium">${task.client_cost_usd.toFixed(4)}</p>
                          {task.ai_cost_usd != null && (
                            <p className="text-gray-500 text-xs">cost: ${task.ai_cost_usd.toFixed(4)}</p>
                          )}
                        </>
                      ) : (
                        <p className="text-gray-500 text-xs">{new Date(task.created_at).toLocaleDateString()}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent Transactions */}
          <div className="bg-[#1F2937] rounded-xl p-4 md:p-6">
            <h2 className="text-lg font-bold text-white mb-4">Recent Transactions</h2>
            
            {!transactions || transactions.length === 0 ? (
              <p className="text-gray-400 text-center py-6">No transactions yet</p>
            ) : (
              <div className="space-y-2">
                {transactions.map((tx: { id: string; type: string; description: string | null; amount_usd: number; created_at: string }) => (
                  <div key={tx.id} className="flex items-center justify-between p-3 bg-[#374151] rounded-lg">
                    <div className="flex items-center gap-2">
                      <div className={`w-2.5 h-2.5 rounded-full ${
                        tx.type === 'topup' ? 'bg-[#10B981]' :
                        tx.type === 'spend' ? 'bg-[#F59E0B]' :
                        'bg-[#6366F1]'
                      }`} />
                      <div>
                        <p className="text-white text-sm capitalize">{tx.type}</p>
                        <p className="text-gray-400 text-xs">{tx.description || '—'}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-medium ${tx.type === 'topup' ? 'text-[#10B981]' : 'text-white'}`}>
                        {tx.type === 'topup' ? '+' : '-'}${tx.amount_usd.toFixed(2)}
                      </p>
                      <p className="text-gray-500 text-xs">{new Date(tx.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
