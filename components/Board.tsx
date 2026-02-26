'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, Wallet, Plus, LogOut } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Task, UserProfile } from '@/lib/types';
import TaskCard from './TaskCard';
import TaskDetail from './TaskDetail';
import NewTaskModal from './NewTaskModal';
import CreditPanel from './CreditPanel';
import type { User } from '@supabase/supabase-js';

const tabs = ['Backlog', 'Done'] as const;

export default function Board({
  user,
  profile: initialProfile,
  initialTasks,
}: {
  user: User;
  profile: UserProfile | null;
  initialTasks: Task[];
}) {
  const [activeTab, setActiveTab] = useState<typeof tabs[number]>('Backlog');
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [profile, setProfile] = useState<UserProfile | null>(initialProfile);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [showNewTask, setShowNewTask] = useState(false);
  const [showCredits, setShowCredits] = useState(false);

  const supabase = createClient();

  // Realtime subscriptions
  useEffect(() => {
    const taskChannel = supabase
      .channel('tasks-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks', filter: `user_id=eq.${user.id}` },
        async () => {
          const { data } = await supabase
            .from('tasks')
            .select('*, checklist_items(*), task_images(*), admin_questions(*)')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });
          if (data) setTasks(data);
        }
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_profiles', filter: `id=eq.${user.id}` },
        (payload) => {
          setProfile(payload.new as UserProfile);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(taskChannel); };
  }, [user.id]);

  const backlogTasks = tasks.filter(t => ['backlog', 'queued', 'in_progress'].includes(t.status));
  const doneTasks = tasks.filter(t => ['done', 'failed'].includes(t.status));
  const filteredTasks = activeTab === 'Backlog' ? backlogTasks : doneTasks;

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  const balance = Number(profile?.credit_balance_usd || 0);

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-[#0B0F1A]/80 backdrop-blur-xl border-b border-white/[0.07] px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#6366F1] to-[#818CF8] flex items-center justify-center">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-base font-bold leading-tight">TaskBot</h1>
              <p className="text-[10px] text-[#6B7280] font-medium tracking-wide">Human → Robot</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowCredits(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/[0.07] hover:bg-white/[0.08] transition-colors"
            >
              <Wallet className="w-3.5 h-3.5 text-[#818CF8]" />
              <span className="text-xs font-mono font-bold">${balance.toFixed(2)}</span>
            </button>
            {profile?.avatar_url && (
              <img
                src={profile.avatar_url}
                alt=""
                className="w-8 h-8 rounded-full border border-white/[0.07]"
              />
            )}
            <button onClick={handleSignOut} className="p-1.5 text-[#6B7280] hover:text-white transition-colors">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="px-4 pt-4 pb-2">
        <div className="relative flex bg-white/[0.04] rounded-xl p-1">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`relative z-10 flex-1 py-2 text-sm font-medium transition-colors ${
                activeTab === tab ? 'text-white' : 'text-[#6B7280]'
              }`}
            >
              {tab}
              {tab === 'Backlog' && backlogTasks.length > 0 && (
                <span className="ml-1.5 text-xs text-[#9CA3AF]">{backlogTasks.length}</span>
              )}
              {tab === 'Done' && doneTasks.length > 0 && (
                <span className="ml-1.5 text-xs text-[#9CA3AF]">{doneTasks.length}</span>
              )}
            </button>
          ))}
          <motion.div
            className="absolute top-1 bottom-1 rounded-lg bg-white/[0.08]"
            layout
            transition={{ type: 'spring', bounce: 0.2, duration: 0.4 }}
            style={{
              width: `${100 / tabs.length}%`,
              left: `${(tabs.indexOf(activeTab) / tabs.length) * 100}%`,
            }}
          />
        </div>
      </div>

      {/* Task List */}
      <div className="flex-1 px-4 pb-24 space-y-3">
        <AnimatePresence mode="popLayout">
          {filteredTasks.map((task, i) => (
            <motion.div
              key={task.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ delay: i * 0.06 }}
            >
              <TaskCard
                task={task}
                onClick={() => setSelectedTask(task)}
                needsCredits={balance < 0.01}
              />
            </motion.div>
          ))}
        </AnimatePresence>

        {filteredTasks.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-[#6B7280]">
            <Bot className="w-12 h-12 mb-3 opacity-30" />
            <p className="text-sm">
              {activeTab === 'Backlog' ? 'No tasks yet. Tap + to create one.' : 'No completed tasks yet.'}
            </p>
          </div>
        )}
      </div>

      {/* FAB */}
      {activeTab === 'Backlog' && (
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => setShowNewTask(true)}
          className="fixed bottom-6 right-6 max-w-[480px] w-14 h-14 rounded-2xl bg-gradient-to-br from-[#6366F1] to-[#818CF8] text-white shadow-lg shadow-indigo-500/25 flex items-center justify-center z-50"
        >
          <Plus className="w-6 h-6" />
        </motion.button>
      )}

      {/* Task Detail Sheet */}
      <AnimatePresence>
        {selectedTask && (
          <TaskDetail
            task={selectedTask}
            onClose={() => setSelectedTask(null)}
            userId={user.id}
          />
        )}
      </AnimatePresence>

      {/* New Task Modal */}
      <AnimatePresence>
        {showNewTask && (
          <NewTaskModal
            onClose={() => setShowNewTask(false)}
            userId={user.id}
            hasCredits={balance >= 0.01}
          />
        )}
      </AnimatePresence>

      {/* Credit Panel */}
      <AnimatePresence>
        {showCredits && (
          <CreditPanel
            onClose={() => setShowCredits(false)}
            profile={profile}
            userId={user.id}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
