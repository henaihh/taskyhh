'use client';

import { Task } from '@/lib/types';
import { MARGIN } from '@/lib/constants';

const PRI: Record<string, { color: string; bg: string; label: string }> = {
  urgent: { color: '#EF4444', bg: 'rgba(239,68,68,0.12)', label: 'Urgent' },
  high: { color: '#F59E0B', bg: 'rgba(245,158,11,0.12)', label: 'High' },
  medium: { color: '#3B82F6', bg: 'rgba(59,130,246,0.12)', label: 'Medium' },
  low: { color: '#6B7280', bg: 'rgba(107,114,128,0.12)', label: 'Low' },
};

export default function TaskCard({
  task,
  index,
  onClick,
  needsCredits,
}: {
  task: Task;
  index: number;
  onClick: () => void;
  needsCredits: boolean;
}) {
  const checklist = task.checklist_items || [];
  const doneCount = checklist.filter(c => c.done).length;
  const pct = checklist.length ? Math.round((doneCount / checklist.length) * 100) : 0;
  const unanswered = (task.admin_questions || []).filter(q => !q.answered).length;
  const images = task.task_images || [];
  const isDone = task.status === 'done' || task.status === 'failed';
  const pri = PRI[task.priority] || PRI.medium;
  const clientCost = task.client_cost_usd ? Number(task.client_cost_usd) : null;

  return (
    <div
      onClick={onClick}
      className="animate-slide-up"
      style={{
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: 16,
        padding: '16px 18px',
        cursor: 'pointer',
        transition: 'all 0.25s cubic-bezier(0.4,0,0.2,1)',
        boxShadow: '0 2px 12px rgba(0,0,0,0.15)',
        animationDelay: `${index * 60}ms`,
      }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 32px rgba(0,0,0,0.3)'; }}
      onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,0,0,0.15)'; }}
    >
      {/* Top badges */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 6, fontFamily: "'Space Mono', monospace", letterSpacing: '0.03em', textTransform: 'uppercase', color: pri.color, background: pri.bg }}>
          {pri.label}
        </span>

        {unanswered > 0 && (
          <span style={{ display: 'flex', alignItems: 'center', fontSize: 11, fontWeight: 600, color: '#F59E0B', background: 'rgba(245,158,11,0.1)', padding: '3px 9px', borderRadius: 6 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
            <span style={{ marginLeft: 4 }}>{unanswered}</span>
          </span>
        )}

        {clientCost !== null && (
          <span style={{ display: 'flex', alignItems: 'center', fontSize: 11, fontWeight: 600, color: '#10B981', background: 'rgba(16,185,129,0.1)', padding: '3px 8px', borderRadius: 6, marginLeft: 'auto' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v12M8 10h8M8 14h8"/></svg>
            <span style={{ marginLeft: 3 }}>${clientCost.toFixed(3)}</span>
          </span>
        )}

        {!isDone && needsCredits && (
          <span style={{ display: 'flex', alignItems: 'center', fontSize: 11, fontWeight: 600, color: '#F59E0B', background: 'rgba(245,158,11,0.08)', padding: '3px 9px', borderRadius: 6, gap: 4 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
            Needs credits
          </span>
        )}
      </div>

      {/* Title */}
      <h3 style={{ fontSize: 16, fontWeight: 700, color: '#F3F4F6', marginBottom: 6, letterSpacing: '-0.01em', lineHeight: 1.3 }}>{task.title}</h3>

      {/* Description */}
      {task.description && (
        <p style={{ fontSize: 13, color: '#9CA3AF', lineHeight: 1.5, marginBottom: 12, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' } as React.CSSProperties}>
          {task.description}
        </p>
      )}

      {/* Tags + Meta */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {(task.tags || []).map(tag => (
            <span key={tag} style={{ fontSize: 10, fontWeight: 600, color: '#818CF8', background: 'rgba(99,102,241,0.1)', padding: '3px 8px', borderRadius: 5, fontFamily: "'Space Mono', monospace", textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              {tag}
            </span>
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {images.length > 0 && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#6B7280' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>
              <span style={{ fontSize: 12, fontWeight: 600 }}>{images.length}</span>
            </span>
          )}
          <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#6B7280' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" opacity={0.3}/></svg>
            <span style={{ fontSize: 12, fontWeight: 600 }}>{doneCount}/{checklist.length}</span>
          </span>
        </div>
      </div>

      {/* Progress bar */}
      {checklist.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ flex: 1, height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 4, overflow: 'hidden' }}>
            <div style={{ height: '100%', borderRadius: 4, transition: 'width 0.5s cubic-bezier(0.4,0,0.2,1)', width: `${pct}%`, background: pct === 100 ? 'linear-gradient(90deg, #10B981, #34D399)' : 'linear-gradient(90deg, #6366F1, #818CF8)' }} />
          </div>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#818CF8', fontFamily: "'Space Mono', monospace", minWidth: 32, textAlign: 'right' }}>{pct}%</span>
        </div>
      )}
    </div>
  );
}
