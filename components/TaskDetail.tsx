'use client';

import { useState } from 'react';
import { Task } from '@/lib/types';
import { MARGIN } from '@/lib/constants';
import { createClient } from '@/lib/supabase/client';
import { useIsDesktop } from '@/lib/useIsDesktop';

const PRI: Record<string, { color: string; bg: string; label: string }> = {
  urgent: { color: '#EF4444', bg: 'rgba(239,68,68,0.12)', label: 'Urgent' },
  high: { color: '#F59E0B', bg: 'rgba(245,158,11,0.12)', label: 'High' },
  medium: { color: '#3B82F6', bg: 'rgba(59,130,246,0.12)', label: 'Medium' },
  low: { color: '#6B7280', bg: 'rgba(107,114,128,0.12)', label: 'Low' },
};

export default function TaskDetail({
  task: initialTask,
  anim,
  onClose,
  userId,
  tasks,
  setTasks,
  setSelectedTask,
}: {
  task: Task;
  anim: boolean;
  onClose: () => void;
  userId: string;
  tasks: Task[];
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
  setSelectedTask: React.Dispatch<React.SetStateAction<Task | null>>;
}) {
  const [sel, setSel] = useState(initialTask);
  const [ans, setAns] = useState<Record<string, string>>({});
  const supabase = createClient();
  const isDesktop = useIsDesktop();
  const pri = PRI[sel.priority] || PRI.medium;
  const checklist = sel.checklist_items || [];
  const images = sel.task_images || [];
  const questions = sel.admin_questions || [];
  const pct = checklist.length ? Math.round((checklist.filter(c => c.done).length / checklist.length) * 100) : 0;

  const toggle = async (checklistItemId: string) => {
    const item = checklist.find(c => c.id === checklistItemId);
    if (!item) return;
    const newDone = !item.done;
    const updater = (t: Task) => ({
      ...t,
      checklist_items: (t.checklist_items || []).map(c => c.id === checklistItemId ? { ...c, done: newDone } : c),
    });
    setSel(updater);
    setTasks(prev => prev.map(t => t.id === sel.id ? updater(t) : t));
    await supabase.from('checklist_items').update({ done: newDone }).eq('id', checklistItemId);
  };

  const answerQuestion = async (qId: string) => {
    const key = `${sel.id}-${qId}`;
    const value = ans[key];
    if (!value?.trim()) return;
    const updater = (t: Task) => ({
      ...t,
      admin_questions: (t.admin_questions || []).map(q => q.id === qId ? { ...q, answered: true, answer: value } : q),
    });
    setSel(updater);
    setTasks(prev => prev.map(t => t.id === sel.id ? updater(t) : t));
    setAns(prev => ({ ...prev, [key]: '' }));
    await supabase.from('admin_questions').update({ answer: value, answered: true }).eq('id', qId);
  };

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', zIndex: 100, transition: 'opacity 0.3s', display: 'flex', alignItems: isDesktop ? 'center' : 'flex-end', justifyContent: 'center', opacity: anim ? 1 : 0 }}
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={isDesktop ? {
          background: '#111827', borderRadius: 20, maxWidth: 560, width: '100%', maxHeight: '85vh', display: 'flex', flexDirection: 'column', transition: 'transform 0.3s cubic-bezier(0.4,0,0.2,1), opacity 0.3s', border: '1px solid rgba(255,255,255,0.08)', transform: anim ? 'scale(1)' : 'scale(0.95)', opacity: anim ? 1 : 0,
        } : {
          background: '#111827', borderRadius: '24px 24px 0 0', maxWidth: 480, width: '100%', maxHeight: '92vh', display: 'flex', flexDirection: 'column', transition: 'transform 0.35s cubic-bezier(0.4,0,0.2,1)', border: '1px solid rgba(255,255,255,0.08)', borderBottom: 'none', transform: anim ? 'translateY(0)' : 'translateY(100%)',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)', flexShrink: 0 }}>
          <button onClick={onClose} style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', color: '#818CF8', fontSize: 14, fontWeight: 600, fontFamily: "'DM Sans', sans-serif", cursor: 'pointer', padding: '4px 0' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
            <span>Back</span>
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {sel.task_type === 'human' ? (
              <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 6, color: '#9CA3AF', background: 'rgba(255,255,255,0.06)' }}>🧑 Human</span>
            ) : (
              <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 6, color: '#818CF8', background: 'rgba(99,102,241,0.12)' }}>🤖 Bot</span>
            )}
            <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 6, fontFamily: "'Space Mono', monospace", letterSpacing: '0.03em', textTransform: 'uppercase', color: pri.color, background: pri.bg }}>{pri.label}</span>
          </div>
        </div>

        {/* Scrollable content */}
        <div style={{ overflowY: 'auto', padding: '20px 20px 0', flex: 1 }}>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: '#F9FAFB', letterSpacing: '-0.02em', lineHeight: 1.2, marginBottom: 8 }}>{sel.title}</h2>
          <p style={{ fontSize: 14, color: '#9CA3AF', lineHeight: 1.6, marginBottom: 20 }}>{sel.description}</p>

          {/* Desired Result */}
          {sel.desired_result && (
            <div style={{ display: 'flex', gap: 12, padding: 16, background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.15)', borderRadius: 14, marginBottom: 14 }}>
              <span style={{ fontSize: 20, flexShrink: 0, marginTop: 1 }}>🎯</span>
              <div>
                <span style={{ fontSize: 10, fontWeight: 700, color: '#818CF8', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: "'Space Mono', monospace" }}>Desired Result</span>
                <p style={{ fontSize: 13, color: '#D1D5DB', lineHeight: 1.5, marginTop: 4 }}>{sel.desired_result}</p>
              </div>
            </div>
          )}

          {/* Target URL */}
          {sel.target_url && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, marginBottom: 16, color: '#6B7280' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></svg>
              <span style={{ fontSize: 12, fontFamily: "'Space Mono', monospace", color: '#818CF8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sel.target_url}</span>
            </div>
          )}

          {/* Images */}
          {images.length > 0 && (
            <div style={{ marginBottom: 22 }}>
              <h4 style={{ fontSize: 14, fontWeight: 700, color: '#E5E7EB', letterSpacing: '-0.01em' }}>Attached Images</h4>
              <div style={{ marginTop: 8 }}>
                {images.map(img => (
                  <div key={img.id} style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <img src={img.url} alt={img.alt_text || ''} style={{ width: '100%', height: 180, objectFit: 'cover', display: 'block' }} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tags */}
          {sel.tags && sel.tags.length > 0 && (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 20 }}>
              {sel.tags.map(tag => (
                <span key={tag} style={{ fontSize: 11, fontWeight: 600, color: '#818CF8', background: 'rgba(99,102,241,0.1)', padding: '4px 10px', borderRadius: 6, fontFamily: "'Space Mono', monospace", textTransform: 'uppercase', letterSpacing: '0.04em' }}>{tag}</span>
              ))}
            </div>
          )}

          {/* Checklist */}
          {checklist.length > 0 && (
            <div style={{ marginBottom: 22 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <h4 style={{ fontSize: 14, fontWeight: 700, color: '#E5E7EB', letterSpacing: '-0.01em' }}>Checklist</h4>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#818CF8', fontFamily: "'Space Mono', monospace" }}>{checklist.filter(c => c.done).length}/{checklist.length}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ flex: 1, height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{ height: '100%', borderRadius: 4, transition: 'width 0.5s cubic-bezier(0.4,0,0.2,1)', width: `${pct}%`, background: pct === 100 ? 'linear-gradient(90deg, #10B981, #34D399)' : 'linear-gradient(90deg, #6366F1, #818CF8)' }} />
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginTop: 10 }}>
                {checklist.sort((a, b) => a.position - b.position).map(it => (
                  <div key={it.id} onClick={() => toggle(it.id)} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '11px 14px', borderRadius: 10, cursor: 'pointer', background: 'rgba(255,255,255,0.02)', opacity: it.done ? 0.55 : 1 }}>
                    <span style={{ color: it.done ? '#10B981' : '#4B5563', flexShrink: 0, display: 'flex' }}>
                      <svg width="22" height="22" viewBox="0 0 24 24" fill={it.done ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10" opacity={it.done ? 1 : 0.3} />
                        {it.done && <path d="M9 12l2 2 4-4" stroke="#fff" strokeWidth="2.5" />}
                      </svg>
                    </span>
                    <span style={{ fontSize: 14, color: '#D1D5DB', lineHeight: 1.45, paddingTop: 1, textDecoration: it.done ? 'line-through' : 'none' }}>{it.text}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Cost Breakdown (bot tasks only) */}
          {sel.task_type !== 'human' && sel.client_cost_usd && (
            <div style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.15)', borderRadius: 14, padding: 16, marginBottom: 22 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#10B981', marginBottom: 12 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v12M8 10h8M8 14h8"/></svg>
                <span style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: "'Space Mono', monospace" }}>Execution Cost</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                <div style={{ textAlign: 'center', padding: 10, background: 'rgba(0,0,0,0.2)', borderRadius: 10 }}>
                  <span style={{ fontSize: 10, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: "'Space Mono', monospace", display: 'block', marginBottom: 4 }}>Input</span>
                  <span style={{ fontSize: 15, fontWeight: 700, color: '#E5E7EB', fontFamily: "'Space Mono', monospace" }}>{sel.token_input?.toLocaleString()}</span>
                </div>
                <div style={{ textAlign: 'center', padding: 10, background: 'rgba(0,0,0,0.2)', borderRadius: 10 }}>
                  <span style={{ fontSize: 10, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: "'Space Mono', monospace", display: 'block', marginBottom: 4 }}>Output</span>
                  <span style={{ fontSize: 15, fontWeight: 700, color: '#E5E7EB', fontFamily: "'Space Mono', monospace" }}>{sel.token_output?.toLocaleString()}</span>
                </div>
                <div style={{ textAlign: 'center', padding: 10, background: 'rgba(0,0,0,0.2)', borderRadius: 10 }}>
                  <span style={{ fontSize: 10, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: "'Space Mono', monospace", display: 'block', marginBottom: 4 }}>AI Cost</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#6B7280', fontFamily: "'Space Mono', monospace" }}>${sel.ai_cost_usd ? Number(sel.ai_cost_usd).toFixed(3) : '0.000'}</span>
                </div>
              </div>
              <div style={{ marginTop: 8, textAlign: 'center', padding: 12, background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.15)', borderRadius: 10 }}>
                <span style={{ fontSize: 10, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: "'Space Mono', monospace", display: 'block', marginBottom: 4 }}>You Paid (incl. 35% fee)</span>
                <span style={{ fontSize: 20, fontWeight: 700, color: '#818CF8', fontFamily: "'Space Mono', monospace" }}>${Number(sel.client_cost_usd).toFixed(3)}</span>
              </div>
            </div>
          )}

          {/* Agent Response */}
          {sel.agent_response && (
            <div style={{ padding: 16, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, marginBottom: 22 }}>
              <h4 style={{ fontSize: 14, fontWeight: 700, color: '#E5E7EB', marginBottom: 8 }}>Agent Response</h4>
              <p style={{ fontSize: 13, color: '#9CA3AF', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{sel.agent_response}</p>
            </div>
          )}

          {/* Admin Questions */}
          {questions.length > 0 && (
            <div style={{ marginBottom: 22 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                <div style={{ width: 40, height: 40, borderRadius: 12, background: 'linear-gradient(135deg, #F59E0B, #D97706)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', flexShrink: 0, boxShadow: '0 4px 12px rgba(245,158,11,0.25)' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="8" width="18" height="12" rx="2"/><path d="M12 2v6"/><circle cx="12" cy="2" r="1"/><circle cx="9" cy="14" r="1" fill="currentColor"/><circle cx="15" cy="14" r="1" fill="currentColor"/><path d="M9 18h6"/></svg>
                </div>
                <div>
                  <h4 style={{ fontSize: 14, fontWeight: 700, color: '#E5E7EB', letterSpacing: '-0.01em' }}>Robot needs your input</h4>
                  <p style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>Answer these to proceed</p>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {questions.map(q => (
                  <div key={q.id} style={{ background: 'rgba(245,158,11,0.04)', border: '1px solid rgba(245,158,11,0.12)', borderRadius: 14, padding: 14 }}>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                      <div className="animate-pulse-dot" style={{ width: 8, height: 8, borderRadius: '50%', background: '#F59E0B', marginTop: 5, flexShrink: 0 }} />
                      <p style={{ fontSize: 14, color: '#E5E7EB', lineHeight: 1.5, fontWeight: 500 }}>{q.question}</p>
                    </div>
                    {q.answered ? (
                      <div style={{ marginTop: 12, marginLeft: 18, padding: '10px 14px', background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: '4px 12px 12px 12px' }}>
                        <span style={{ fontSize: 10, fontWeight: 700, color: '#818CF8', textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: "'Space Mono', monospace", display: 'block', marginBottom: 4 }}>You</span>
                        <p style={{ fontSize: 13, color: '#D1D5DB', lineHeight: 1.5 }}>{q.answer}</p>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', gap: 8, marginTop: 12, marginLeft: 18 }}>
                        <input
                          type="text"
                          placeholder="Type your answer..."
                          value={ans[`${sel.id}-${q.id}`] || ''}
                          onChange={e => setAns(prev => ({ ...prev, [`${sel.id}-${q.id}`]: e.target.value }))}
                          onKeyDown={e => { if (e.key === 'Enter') answerQuestion(q.id); }}
                          style={{ flex: 1, background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '10px 14px', color: '#E5E7EB', fontSize: 14, fontFamily: "'DM Sans', sans-serif", outline: 'none' }}
                        />
                        <button onClick={() => answerQuestion(q.id)} style={{ width: 42, height: 42, borderRadius: 10, background: 'linear-gradient(135deg, #6366F1, #7C3AED)', border: 'none', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 2L11 13"/><path d="M22 2l-7 20-4-9-9-4z"/></svg>
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Human task help footer */}
          {sel.task_type === 'human' && (
            <div style={{ marginBottom: 22 }}>
              <a
                href="https://t.me/hnry_h"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                  padding: '14px 20px', borderRadius: 14,
                  background: 'linear-gradient(135deg, #6366F1, #7C3AED)',
                  color: '#fff', fontWeight: 700, fontSize: 14,
                  textDecoration: 'none', fontFamily: "'DM Sans', sans-serif",
                  boxShadow: '0 4px 20px rgba(99,102,241,0.35)',
                  transition: 'opacity 0.2s',
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
                Need help? Contact Henry on Telegram
              </a>
            </div>
          )}

          <div style={{ height: 40 }} />
        </div>
      </div>
    </div>
  );
}
