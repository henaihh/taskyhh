'use client';

import { useState, useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import { createClient } from '@/lib/supabase/client';
import { Task, UserProfile } from '@/lib/types';
import { useIsDesktop } from '@/lib/useIsDesktop';
import TaskCard from './TaskCard';
import TaskDetail from './TaskDetail';
import NewTaskModal from './NewTaskModal';
import CreditPanel from './CreditPanel';
import type { User } from '@supabase/supabase-js';
import { MARGIN } from '@/lib/constants';

export default function Board({
  user,
  profile: initialProfile,
  initialTasks,
}: {
  user: User;
  profile: UserProfile | null;
  initialTasks: Task[];
}) {
  const [tab, setTab] = useState<'backlog' | 'done'>('backlog');
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [profile, setProfile] = useState<UserProfile | null>(initialProfile);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [detailAnim, setDetailAnim] = useState(false);
  const [showNewTask, setShowNewTask] = useState(false);
  const [showCredits, setShowCredits] = useState(false);
  const [credAnim, setCredAnim] = useState(false);
  const isDesktop = useIsDesktop();

  const supabase = createClient();

  useEffect(() => {
    const channel = supabase
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
        (payload) => setProfile(payload.new as UserProfile)
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user.id]);

  const backlog = tasks.filter(t => ['backlog', 'queued', 'in_progress'].includes(t.status));
  const done = tasks.filter(t => ['done', 'failed'].includes(t.status));
  const list = tab === 'backlog' ? backlog : done;
  const balance = Number(profile?.credit_balance_usd || 0);
  const spent = tasks.filter(t => t.client_cost_usd).reduce((s, t) => s + Number(t.client_cost_usd), 0);

  const openDetail = (t: Task) => { setSelectedTask(t); setTimeout(() => setDetailAnim(true), 20); };
  const closeDetail = () => { setDetailAnim(false); setTimeout(() => setSelectedTask(null), 300); };
  const openCredits = () => { setShowCredits(true); setTimeout(() => setCredAnim(true), 20); };
  const closeCredits = () => { setCredAnim(false); setTimeout(() => setShowCredits(false), 300); };

  const EmptyState = ({ type }: { type: 'backlog' | 'done' }) => (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 20px' }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>{type === 'done' ? '🎉' : '📋'}</div>
      <p style={{ fontSize: 14, color: '#6B7280' }}>{type === 'done' ? 'No completed tasks yet' : 'All caught up!'}</p>
    </div>
  );

  return (
    <div style={{ fontFamily: "'DM Sans', -apple-system, sans-serif", background: '#0B0F1A', minHeight: '100vh', maxWidth: isDesktop ? 1200 : 480, margin: '0 auto', position: 'relative', color: '#E5E7EB', overflow: 'hidden' }}>

      {/* Header */}
      <div style={{ background: 'linear-gradient(180deg, rgba(99,102,241,0.12) 0%, transparent 100%)', borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '16px 20px 12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: 'linear-gradient(135deg, #6366F1, #8B5CF6)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', boxShadow: '0 4px 16px rgba(99,102,241,0.3)' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="8" width="18" height="12" rx="2"/><path d="M12 2v6"/><circle cx="12" cy="2" r="1"/><circle cx="9" cy="14" r="1" fill="currentColor"/><circle cx="15" cy="14" r="1" fill="currentColor"/><path d="M9 18h6"/></svg>
            </div>
            <div>
              <h1 style={{ fontSize: 20, fontWeight: 700, color: '#F9FAFB', letterSpacing: '-0.02em', lineHeight: 1.1, margin: 0 }}>TaskBot</h1>
              <p style={{ fontSize: 11, color: '#6B7280', fontFamily: "'Space Mono', monospace", letterSpacing: '0.02em', marginTop: 2 }}>Human → Robot</p>
            </div>
          </div>
          <button onClick={openCredits} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'linear-gradient(135deg, rgba(99,102,241,0.15), rgba(139,92,246,0.1))', borderRadius: 14, padding: '8px 14px', border: '1px solid rgba(99,102,241,0.2)', cursor: 'pointer', color: '#818CF8', fontFamily: "'DM Sans', sans-serif", transition: 'all 0.2s' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="6" width="20" height="14" rx="2"/><path d="M2 10h20"/><circle cx="17" cy="15" r="1.5" fill="currentColor"/></svg>
            <span style={{ fontSize: 15, fontWeight: 700, color: '#F9FAFB', fontFamily: "'Space Mono', monospace" }}>${balance.toFixed(2)}</span>
            <span style={{ fontSize: 10, color: '#818CF8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>credits</span>
          </button>
        </div>
      </div>

      {/* Desktop: Kanban columns side by side */}
      {isDesktop ? (
        <div style={{ display: 'flex', gap: 24, padding: '16px 20px 24px', height: 'calc(100vh - 76px)' }}>
          {/* Backlog Column */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, padding: '0 2px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: '#F9FAFB' }}>Backlog</span>
                <span style={{ fontSize: 11, fontWeight: 700, background: 'rgba(99,102,241,0.2)', color: '#818CF8', borderRadius: 10, padding: '2px 7px' }}>{backlog.length}</span>
              </div>
              <button
                onClick={() => setShowNewTask(true)}
                style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg, #6366F1, #7C3AED)', border: 'none', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 4px 16px rgba(99,102,241,0.3)', transition: 'all 0.2s' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'scale(1.1)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'scale(1)'; }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
              </button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10, paddingRight: 4 }}>
              {backlog.map((t, i) => (
                <TaskCard key={t.id} task={t} index={i} onClick={() => openDetail(t)} needsCredits={balance < 0.01} />
              ))}
              {backlog.length === 0 && <EmptyState type="backlog" />}
            </div>
          </div>

          {/* Divider */}
          <div style={{ width: 1, background: 'rgba(255,255,255,0.06)', flexShrink: 0 }} />

          {/* Done Column */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, padding: '0 2px' }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: '#F9FAFB' }}>Done</span>
              <span style={{ fontSize: 11, fontWeight: 700, background: 'rgba(255,255,255,0.08)', color: '#6B7280', borderRadius: 10, padding: '2px 7px' }}>{done.length}</span>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10, paddingRight: 4 }}>
              {done.map((t, i) => (
                <TaskCard key={t.id} task={t} index={i} onClick={() => openDetail(t)} needsCredits={balance < 0.01} />
              ))}
              {done.length === 0 && <EmptyState type="done" />}
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Mobile: Tabs */}
          <div style={{ display: 'flex', position: 'relative', padding: '0 20px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            {(['backlog', 'done'] as const).map(t => (
              <button key={t} onClick={() => setTab(t)} style={{ flex: 1, background: 'none', border: 'none', color: tab === t ? '#F9FAFB' : '#6B7280', fontSize: 14, fontWeight: 600, fontFamily: "'DM Sans', sans-serif", padding: '14px 0', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'color 0.2s', position: 'relative', zIndex: 1 }}>
                <span style={{ textTransform: 'capitalize' }}>{t}</span>
                <span style={{ fontSize: 11, fontWeight: 700, background: tab === t ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.08)', color: tab === t ? '#818CF8' : '#6B7280', borderRadius: 10, padding: '2px 7px', transition: 'all 0.2s' }}>
                  {t === 'backlog' ? backlog.length : done.length}
                </span>
              </button>
            ))}
            <div style={{ position: 'absolute', bottom: 0, left: 20, width: 'calc(50% - 20px)', height: 2, background: 'linear-gradient(90deg, #6366F1, #818CF8)', borderRadius: '2px 2px 0 0', transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)', transform: tab === 'done' ? 'translateX(100%)' : 'translateX(0)' }} />
          </div>

          {/* Mobile: Task List */}
          <div style={{ padding: '12px 16px 100px', display: 'flex', flexDirection: 'column', gap: 10, overflowY: 'auto', maxHeight: 'calc(100vh - 140px)' }}>
            {list.map((t, i) => (
              <TaskCard key={t.id} task={t} index={i} onClick={() => openDetail(t)} needsCredits={balance < 0.01} />
            ))}
            {list.length === 0 && <EmptyState type={tab} />}
          </div>

          {/* Mobile: FAB */}
          {tab === 'backlog' && (
            <button
              onClick={() => setShowNewTask(true)}
              style={{ position: 'fixed', bottom: 28, right: 'calc(50% - 220px)', width: 56, height: 56, borderRadius: 16, background: 'linear-gradient(135deg, #6366F1, #7C3AED)', border: 'none', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 4px 20px rgba(99,102,241,0.35)', transition: 'all 0.2s', zIndex: 10 }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'scale(1.1)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'scale(1)'; }}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
            </button>
          )}
        </>
      )}

      {/* Task Detail */}
      {selectedTask && (
        <TaskDetail
          task={selectedTask}
          anim={detailAnim}
          onClose={closeDetail}
          userId={user.id}
          tasks={tasks}
          setTasks={setTasks}
          setSelectedTask={setSelectedTask}
        />
      )}

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
      {showCredits && (
        <CreditPanel
          anim={credAnim}
          onClose={closeCredits}
          profile={profile}
          userId={user.id}
          spent={spent}
          doneCount={done.length}
        />
      )}
    </div>
  );
}
