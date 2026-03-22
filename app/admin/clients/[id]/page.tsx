import { createServerClient } from '@/lib/supabase/server';
import { Button } from '@/components/ui/button';
import { Bot, ArrowLeft, CreditCard, CheckSquare, Clock, GitBranch, User } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import AssignRepoForm from './AssignRepoForm';

export default async function ClientDetailsPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = await createServerClient();
  const { id } = params;

  // Get client details
  const { data: client, error: clientError } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', id)
    .eq('role', 'client')
    .single();

  if (clientError || !client) {
    notFound();
  }

  // Get client's email by finding their auth user
  const { data: authUser } = await supabase.auth.admin.getUserById(id);
  const userEmail = authUser.user?.email || 'No email found';

  // Get client's repositories
  const { data: repos } = await supabase
    .from('client_repos')
    .select('*')
    .eq('email', userEmail)
    .order('created_at', { ascending: false });

  // Get client's tasks
  const { data: tasks } = await supabase
    .from('tasks')
    .select('*')
    .eq('user_id', id)
    .order('created_at', { ascending: false });

  // Get credit transactions
  const { data: transactions } = await supabase
    .from('credit_transactions')
    .select('*')
    .eq('user_id', id)
    .order('created_at', { ascending: false })
    .limit(10);

  // Calculate task stats
  const taskStats = {
    total: tasks?.length || 0,
    done: tasks?.filter(t => t.status === 'done').length || 0,
    in_progress: tasks?.filter(t => t.status === 'in_progress').length || 0,
    failed: tasks?.filter(t => t.status === 'failed').length || 0,
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
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
          <p className="text-gray-400 text-sm">{userEmail}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Client Info */}
        <div className="lg:col-span-1 space-y-6">
          {/* Profile Card */}
          <div className="bg-[#1F2937] rounded-xl p-6">
            <h2 className="text-lg font-bold text-white mb-4">Profile</h2>
            
            <div className="space-y-4">
              <div>
                <p className="text-gray-400 text-sm">Email</p>
                <p className="text-white">{userEmail}</p>
              </div>
              
              <div>
                <p className="text-gray-400 text-sm">Display Name</p>
                <p className="text-white">{client.display_name || 'Not set'}</p>
              </div>
              
              <div>
                <p className="text-gray-400 text-sm">Website</p>
                <p className="text-white">{client.website_url || 'Not set'}</p>
              </div>
              
              <div>
                <p className="text-gray-400 text-sm">Main Repository</p>
                <p className="text-white">{client.repo_url || 'Not set'}</p>
              </div>
              
              <div>
                <p className="text-gray-400 text-sm">Joined</p>
                <p className="text-white">{new Date(client.created_at).toLocaleDateString()}</p>
              </div>
              
              <div>
                <p className="text-gray-400 text-sm">Onboarded</p>
                <p className="text-white">{client.onboarded ? 'Yes' : 'No'}</p>
              </div>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="space-y-4">
            <div className="bg-[#1F2937] rounded-xl p-4">
              <div className="flex items-center gap-3">
                <CreditCard className="w-8 h-8 text-[#10B981]" />
                <div>
                  <p className="text-2xl font-bold text-white">${client.credit_balance_usd.toFixed(2)}</p>
                  <p className="text-gray-400 text-sm">Credit Balance</p>
                </div>
              </div>
            </div>
            
            <div className="bg-[#1F2937] rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#F59E0B] flex items-center justify-center">
                  <span className="text-white font-bold text-sm">$</span>
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">${client.total_spent_usd.toFixed(2)}</p>
                  <p className="text-gray-400 text-sm">Total Spent</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tasks and Activity */}
        <div className="lg:col-span-2 space-y-6">
          {/* Task Stats */}
          <div className="bg-[#1F2937] rounded-xl p-6">
            <h2 className="text-lg font-bold text-white mb-4">Task Overview</h2>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-white">{taskStats.total}</p>
                <p className="text-gray-400 text-sm">Total</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-[#10B981]">{taskStats.done}</p>
                <p className="text-gray-400 text-sm">Completed</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-[#F59E0B]">{taskStats.in_progress}</p>
                <p className="text-gray-400 text-sm">In Progress</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-[#EF4444]">{taskStats.failed}</p>
                <p className="text-gray-400 text-sm">Failed</p>
              </div>
            </div>
          </div>

          {/* Repositories */}
          <div className="bg-[#1F2937] rounded-xl p-6">
            <h2 className="text-lg font-bold text-white mb-4">Repositories</h2>
            
            {!repos || repos.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-gray-400 mb-4">No repositories assigned</p>
              </div>
            ) : (
              <div className="space-y-3 mb-4">
                {repos.map((repo) => (
                  <div key={repo.id} className="flex items-center justify-between p-4 bg-[#374151] rounded-lg">
                    <div className="flex items-center gap-3">
                      <GitBranch className="w-5 h-5 text-gray-400" />
                      <div>
                        <p className="text-white font-medium">{repo.display_name}</p>
                        <p className="text-gray-400 text-sm">{repo.repo_url}</p>
                      </div>
                    </div>
                    <p className="text-gray-500 text-xs">
                      Added {new Date(repo.created_at).toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </div>
            )}
            
            {/* Add Repository Form */}
            <div className="border-t border-gray-600 pt-4">
              <p className="text-gray-400 text-sm mb-3">Assign New Repository</p>
              <AssignRepoForm email={userEmail} />
            </div>
          </div>

          {/* Recent Tasks */}
          <div className="bg-[#1F2937] rounded-xl p-6">
            <h2 className="text-lg font-bold text-white mb-4">Recent Tasks</h2>
            
            {!tasks || tasks.length === 0 ? (
              <p className="text-gray-400 text-center py-6">No tasks yet</p>
            ) : (
              <div className="space-y-3">
                {tasks.slice(0, 5).map((task) => (
                  <div key={task.id} className="flex items-center justify-between p-4 bg-[#374151] rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${
                        task.status === 'done' ? 'bg-[#10B981]' :
                        task.status === 'in_progress' ? 'bg-[#F59E0B]' :
                        task.status === 'failed' ? 'bg-[#EF4444]' :
                        'bg-gray-500'
                      }`} />
                      <div>
                        <p className="text-white font-medium">{task.title}</p>
                        <p className="text-gray-400 text-sm">
                          {task.status.replace('_', ' ')} • {task.priority} priority
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-gray-400 text-sm">
                        {new Date(task.created_at).toLocaleDateString()}
                      </p>
                      {task.client_cost_usd && (
                        <p className="text-white text-sm">${task.client_cost_usd.toFixed(2)}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent Transactions */}
          <div className="bg-[#1F2937] rounded-xl p-6">
            <h2 className="text-lg font-bold text-white mb-4">Recent Transactions</h2>
            
            {!transactions || transactions.length === 0 ? (
              <p className="text-gray-400 text-center py-6">No transactions yet</p>
            ) : (
              <div className="space-y-3">
                {transactions.map((tx) => (
                  <div key={tx.id} className="flex items-center justify-between p-4 bg-[#374151] rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${
                        tx.type === 'topup' ? 'bg-[#10B981]' :
                        tx.type === 'spend' ? 'bg-[#F59E0B]' :
                        'bg-[#6366F1]'
                      }`} />
                      <div>
                        <p className="text-white font-medium capitalize">{tx.type}</p>
                        <p className="text-gray-400 text-sm">{tx.description || 'No description'}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`font-medium ${
                        tx.type === 'topup' ? 'text-[#10B981]' : 'text-white'
                      }`}>
                        {tx.type === 'topup' ? '+' : ''}${tx.amount_usd.toFixed(2)}
                      </p>
                      <p className="text-gray-400 text-sm">
                        {new Date(tx.created_at).toLocaleDateString()}
                      </p>
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