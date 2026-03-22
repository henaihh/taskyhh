import { createServerClient } from '@/lib/supabase/server';
import { Button } from '@/components/ui/button';
import { Bot, Plus, Users, CreditCard, CheckSquare, AlertCircle, DollarSign, ExternalLink } from 'lucide-react';
import Link from 'next/link';

export default async function AdminDashboard() {
  const supabase = await createServerClient();

  // Get all non-admin users
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
      website_url,
      role
    `)
    .neq('role', 'admin')
    .order('created_at', { ascending: false });

  // Get all tasks (admin can see all via RLS)
  const { data: allTasks } = await supabase
    .from('tasks')
    .select('id, user_id, title, status, priority, client_cost_usd, ai_cost_usd, margin_usd, created_at, completed_at, task_type')
    .order('created_at', { ascending: false });

  // Get client repos
  const { data: clientRepos } = await supabase
    .from('client_repos')
    .select('*')
    .order('created_at', { ascending: false });

  // Get pending invitations
  const { data: pendingInvites } = await supabase
    .from('invitations')
    .select('*')
    .eq('accepted', false)
    .order('created_at', { ascending: false });

  // Get admin questions that need answers
  const { data: pendingQuestions } = await supabase
    .from('admin_questions')
    .select('*, tasks(title, user_id)')
    .eq('answered', false)
    .order('created_at', { ascending: false });

  // Group tasks by user
  const tasksByUser: Record<string, typeof allTasks> = {};
  if (allTasks) {
    for (const task of allTasks) {
      if (!tasksByUser[task.user_id]) tasksByUser[task.user_id] = [];
      tasksByUser[task.user_id]!.push(task);
    }
  }

  // Group repos by user (match via display_name or fallback)
  const reposList = clientRepos || [];

  // Revenue stats
  const totalRevenue = allTasks?.reduce((sum, t) => sum + (t.client_cost_usd || 0), 0) || 0;
  const totalAiCost = allTasks?.reduce((sum, t) => sum + (t.ai_cost_usd || 0), 0) || 0;
  const totalMargin = allTasks?.reduce((sum, t) => sum + (t.margin_usd || 0), 0) || 0;
  const activeTasks = allTasks?.filter(t => t.status === 'in_progress' || t.status === 'queued') || [];
  const recentTasks = allTasks?.slice(0, 10) || [];

  // Notifications
  const notifications: Array<{ type: 'warning' | 'info' | 'error'; message: string; link?: string }> = [];
  
  // Low credit clients
  if (clients) {
    for (const c of clients) {
      if (c.credit_balance_usd <= 0.5 && c.total_tasks_completed > 0) {
        notifications.push({
          type: 'warning',
          message: `${c.display_name || 'Client'} has low credits ($${c.credit_balance_usd.toFixed(2)})`,
          link: `/admin/clients/${c.id}`,
        });
      }
    }
  }

  // Pending questions from bot
  if (pendingQuestions && pendingQuestions.length > 0) {
    notifications.push({
      type: 'error',
      message: `${pendingQuestions.length} unanswered question(s) from the bot`,
    });
  }

  // Active tasks
  if (activeTasks.length > 0) {
    notifications.push({
      type: 'info',
      message: `${activeTasks.length} task(s) currently active`,
    });
  }

  // Pending invitations
  if (pendingInvites && pendingInvites.length > 0) {
    notifications.push({
      type: 'info',
      message: `${pendingInvites.length} pending invitation(s)`,
    });
  }

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#6366F1] to-[#818CF8] flex items-center justify-center">
            <Bot className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Admin Dashboard</h1>
            <p className="text-gray-400 text-sm">Manage clients, tasks & revenue</p>
          </div>
        </div>
        
        <div className="flex gap-2">
          <Link href="/">
            <Button variant="outline" size="sm">
              <ExternalLink className="w-4 h-4" />
              My Board
            </Button>
          </Link>
          <Link href="/admin/invite">
            <Button className="bg-[#6366F1] hover:bg-[#5855EB] text-white">
              <Plus className="w-4 h-4" />
              Invite Client
            </Button>
          </Link>
        </div>
      </div>

      {/* Notifications */}
      {notifications.length > 0 && (
        <div className="space-y-2 mb-6">
          {notifications.map((n, i) => (
            <div
              key={i}
              className={`flex items-center gap-3 p-3 rounded-lg ${
                n.type === 'error' ? 'bg-red-900/30 border border-red-800' :
                n.type === 'warning' ? 'bg-yellow-900/30 border border-yellow-800' :
                'bg-blue-900/30 border border-blue-800'
              }`}
            >
              <AlertCircle className={`w-4 h-4 flex-shrink-0 ${
                n.type === 'error' ? 'text-red-400' :
                n.type === 'warning' ? 'text-yellow-400' :
                'text-blue-400'
              }`} />
              <p className="text-sm text-gray-200 flex-1">{n.message}</p>
              {n.link && (
                <Link href={n.link}>
                  <Button variant="ghost" size="xs">View</Button>
                </Link>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-[#1F2937] rounded-xl p-4">
          <div className="flex items-center gap-3">
            <Users className="w-6 h-6 text-[#6366F1]" />
            <div>
              <p className="text-xl font-bold text-white">{clients?.length || 0}</p>
              <p className="text-gray-400 text-xs">Clients</p>
            </div>
          </div>
        </div>
        
        <div className="bg-[#1F2937] rounded-xl p-4">
          <div className="flex items-center gap-3">
            <CheckSquare className="w-6 h-6 text-[#F59E0B]" />
            <div>
              <p className="text-xl font-bold text-white">{allTasks?.length || 0}</p>
              <p className="text-gray-400 text-xs">Total Tasks</p>
            </div>
          </div>
        </div>
        
        <div className="bg-[#1F2937] rounded-xl p-4">
          <div className="flex items-center gap-3">
            <DollarSign className="w-6 h-6 text-[#10B981]" />
            <div>
              <p className="text-xl font-bold text-white">${totalRevenue.toFixed(2)}</p>
              <p className="text-gray-400 text-xs">Revenue</p>
            </div>
          </div>
        </div>
        
        <div className="bg-[#1F2937] rounded-xl p-4">
          <div className="flex items-center gap-3">
            <CreditCard className="w-6 h-6 text-[#8B5CF6]" />
            <div>
              <p className="text-xl font-bold text-white">${totalMargin.toFixed(2)}</p>
              <p className="text-gray-400 text-xs">Margin</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Clients List */}
        <div className="lg:col-span-2">
          <div className="bg-[#1F2937] rounded-xl p-4 md:p-6">
            <h2 className="text-lg font-bold text-white mb-4">Clients</h2>
            
            {!clients || clients.length === 0 ? (
              <div className="text-center py-8">
                <Users className="w-10 h-10 text-gray-500 mx-auto mb-3" />
                <p className="text-gray-400 mb-1">No clients yet</p>
                <p className="text-gray-500 text-sm mb-4">Create an invitation to get started</p>
                <Link href="/admin/invite">
                  <Button className="bg-[#6366F1] hover:bg-[#5855EB] text-white">
                    <Plus className="w-4 h-4" />
                    Create First Invitation
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {clients.map((client) => {
                  const userTasks = tasksByUser[client.id] || [];
                  const tasksDone = userTasks.filter((t: { status: string }) => t.status === 'done').length;
                  const tasksActive = userTasks.filter((t: { status: string }) => t.status === 'in_progress' || t.status === 'queued').length;
                  const clientRevenue = userTasks.reduce((sum: number, t: { client_cost_usd: number | null }) => sum + (t.client_cost_usd || 0), 0);
                  
                  return (
                    <Link key={client.id} href={`/admin/clients/${client.id}`} className="block">
                      <div className="bg-[#374151] rounded-lg p-4 hover:bg-[#3f4a5e] transition-colors">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            {client.avatar_url ? (
                              <img 
                                src={client.avatar_url} 
                                alt={client.display_name || 'User'} 
                                className="w-10 h-10 rounded-lg"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-lg bg-[#6366F1] flex items-center justify-center">
                                <span className="text-white font-bold">
                                  {(client.display_name || 'U')[0].toUpperCase()}
                                </span>
                              </div>
                            )}
                            
                            <div>
                              <h3 className="font-semibold text-white">{client.display_name || 'Unnamed Client'}</h3>
                              <div className="flex items-center gap-3 text-xs text-gray-400">
                                <span>{userTasks.length} tasks</span>
                                {tasksActive > 0 && <span className="text-yellow-400">{tasksActive} active</span>}
                                <span>{tasksDone} done</span>
                              </div>
                            </div>
                          </div>
                          
                          <div className="text-right">
                            <p className={`font-medium ${client.credit_balance_usd <= 0.5 ? 'text-red-400' : 'text-[#10B981]'}`}>
                              ${client.credit_balance_usd.toFixed(2)}
                            </p>
                            {clientRevenue > 0 && (
                              <p className="text-gray-400 text-xs">${clientRevenue.toFixed(2)} spent</p>
                            )}
                          </div>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right sidebar: Recent tasks + Pending invites */}
        <div className="space-y-6">
          {/* Recent Tasks */}
          <div className="bg-[#1F2937] rounded-xl p-4 md:p-6">
            <h2 className="text-lg font-bold text-white mb-4">Recent Tasks</h2>
            
            {recentTasks.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-4">No tasks yet</p>
            ) : (
              <div className="space-y-2">
                {recentTasks.map((task) => {
                  const client = clients?.find(c => c.id === task.user_id);
                  return (
                    <div key={task.id} className="flex items-center gap-2 p-2 rounded-lg bg-[#374151]">
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                        task.status === 'done' ? 'bg-[#10B981]' :
                        task.status === 'in_progress' ? 'bg-[#F59E0B]' :
                        task.status === 'failed' ? 'bg-[#EF4444]' :
                        'bg-gray-500'
                      }`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm truncate">{task.title}</p>
                        <p className="text-gray-400 text-xs">{client?.display_name || 'Unknown'}</p>
                      </div>
                      {task.client_cost_usd != null && task.client_cost_usd > 0 && (
                        <span className="text-xs text-gray-300">${task.client_cost_usd.toFixed(2)}</span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Pending Invitations */}
          <div className="bg-[#1F2937] rounded-xl p-4 md:p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-white">Pending Invites</h2>
              <Link href="/admin/invite">
                <Button variant="ghost" size="xs">
                  <Plus className="w-3 h-3" />
                  New
                </Button>
              </Link>
            </div>
            
            {!pendingInvites || pendingInvites.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-4">No pending invitations</p>
            ) : (
              <div className="space-y-2">
                {pendingInvites.map((invite) => (
                  <div key={invite.id} className="p-2 rounded-lg bg-[#374151]">
                    <p className="text-white text-sm">{invite.email}</p>
                    <p className="text-gray-400 text-xs">
                      Sent {new Date(invite.created_at).toLocaleDateString()}
                    </p>
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
