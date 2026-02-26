'use client';

import { useState } from 'react';
import { Task, UserProfile } from '@/lib/types';
import { createClient } from '@/lib/supabase/client';

export default function OnboardingTaskDetail({
  task,
  profile,
  onTaskUpdate,
  onProfileUpdate,
}: {
  task: Task;
  profile: UserProfile | null;
  onTaskUpdate: (updater: (t: Task) => Task) => void;
  onProfileUpdate: (p: Partial<UserProfile>) => void;
}) {
  const supabase = createClient();
  const isWebsite = task.title.toLowerCase().includes('website');
  const isGithub = task.title.toLowerCase().includes('github');

  const currentUrl = isWebsite ? (profile?.website_url || '') : (profile?.repo_url || '');
  const [url, setUrl] = useState(currentUrl);
  const [editing, setEditing] = useState(!currentUrl);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState('');
  const [verifySuccess, setVerifySuccess] = useState(false);

  const checklist = (task.checklist_items || []).sort((a, b) => a.position - b.position);
  const firstItem = checklist[0];
  const secondItem = checklist[1];
  const taskDone = task.status === 'done';

  const saveUrl = async () => {
    if (!url.trim()) return;
    setSaving(true);
    setError('');
    try {
      const field = isWebsite ? 'website_url' : 'repo_url';
      const { error: err } = await supabase
        .from('user_profiles')
        .update({ [field]: url.trim() })
        .eq('id', task.user_id);
      if (err) throw err;

      onProfileUpdate({ [field]: url.trim() });

      // Mark first checklist item done
      if (firstItem && !firstItem.done) {
        await supabase.from('checklist_items').update({ done: true }).eq('id', firstItem.id);
        onTaskUpdate(t => ({
          ...t,
          checklist_items: (t.checklist_items || []).map(c => c.id === firstItem.id ? { ...c, done: true } : c),
        }));
      }

      // For website task, mark as done
      if (isWebsite) {
        await supabase.from('tasks').update({ status: 'done' }).eq('id', task.id);
        onTaskUpdate(t => ({ ...t, status: 'done' }));
      }

      setEditing(false);
    } catch (e: any) {
      setError(e.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const verifyRepo = async () => {
    setVerifying(true);
    setVerifyError('');
    setVerifySuccess(false);
    try {
      const res = await fetch('/api/verify-repo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repoUrl: url.trim(), userId: task.user_id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Verification failed');

      setVerifySuccess(true);

      // Mark second checklist item done
      if (secondItem && !secondItem.done) {
        await supabase.from('checklist_items').update({ done: true }).eq('id', secondItem.id);
        onTaskUpdate(t => ({
          ...t,
          checklist_items: (t.checklist_items || []).map(c => c.id === secondItem.id ? { ...c, done: true } : c),
        }));
      }

      // Mark task done
      await supabase.from('tasks').update({ status: 'done' }).eq('id', task.id);
      onTaskUpdate(t => ({ ...t, status: 'done' }));
    } catch (e: any) {
      setVerifyError(e.message || "We don't have access yet. Please add henaihh as a collaborator in your repo settings.");
    } finally {
      setVerifying(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '14px 16px',
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.07)',
    borderRadius: 12,
    color: '#E5E7EB',
    fontSize: 15,
    fontFamily: "'Space Mono', monospace",
    outline: 'none',
    boxSizing: 'border-box',
  };

  const saveButtonStyle: React.CSSProperties = {
    width: '100%',
    padding: '14px',
    background: 'linear-gradient(135deg, #6366F1, #7C3AED)',
    border: 'none',
    borderRadius: 12,
    color: '#fff',
    fontSize: 15,
    fontWeight: 700,
    fontFamily: "'DM Sans', sans-serif",
    cursor: saving ? 'not-allowed' : 'pointer',
    opacity: saving ? 0.7 : 1,
    boxShadow: '0 4px 16px rgba(99,102,241,0.3)',
    marginTop: 12,
  };

  const editButtonStyle: React.CSSProperties = {
    padding: '8px 16px',
    background: 'transparent',
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: 10,
    color: '#818CF8',
    fontSize: 13,
    fontWeight: 600,
    fontFamily: "'DM Sans', sans-serif",
    cursor: 'pointer',
  };

  const savedUrl = currentUrl || url;
  const showSaved = !editing && savedUrl;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* URL Section */}
      <div>
        <h3 style={{ fontSize: 13, fontWeight: 700, color: '#818CF8', textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: "'Space Mono', monospace", marginBottom: 12 }}>
          {isWebsite ? '🌐 Website URL' : '📦 Repository URL'}
        </h3>

        {showSaved ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.15)', borderRadius: 12 }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9 12l2 2 4-4"/></svg>
            <span style={{ flex: 1, fontSize: 14, fontFamily: "'Space Mono', monospace", color: '#D1D5DB', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{savedUrl}</span>
            <button onClick={() => { setEditing(true); setUrl(savedUrl); }} style={editButtonStyle}>Edit</button>
          </div>
        ) : (
          <div>
            <input
              type="url"
              placeholder={isWebsite ? 'https://yourwebsite.com' : 'https://github.com/user/repo'}
              value={url}
              onChange={e => setUrl(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') saveUrl(); }}
              style={inputStyle}
              autoFocus
            />
            <button onClick={saveUrl} disabled={saving || !url.trim()} style={{ ...saveButtonStyle, opacity: (saving || !url.trim()) ? 0.5 : 1 }}>
              {saving ? 'Saving...' : 'Save'}
            </button>
            {error && <p style={{ color: '#EF4444', fontSize: 13, marginTop: 8 }}>{error}</p>}
          </div>
        )}
      </div>

      {/* GitHub: Step 2 - Verify Access */}
      {isGithub && !editing && savedUrl && (
        <div>
          <h3 style={{ fontSize: 13, fontWeight: 700, color: '#818CF8', textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: "'Space Mono', monospace", marginBottom: 12 }}>
            🔗 Step 2: Add collaborator
          </h3>
          <div style={{ padding: 16, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14 }}>
            <p style={{ fontSize: 14, color: '#D1D5DB', lineHeight: 1.6, marginBottom: 4 }}>
              Go to your repository settings and add <span style={{ fontFamily: "'Space Mono', monospace", color: '#818CF8', fontWeight: 700 }}>henaihh</span> as a collaborator.
            </p>
            <p style={{ fontSize: 12, color: '#6B7280', lineHeight: 1.5, marginBottom: 16 }}>
              Settings → Collaborators → Add people → henaihh
            </p>

            {verifySuccess || (secondItem?.done && taskDone) ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 12 }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9 12l2 2 4-4"/></svg>
                <span style={{ fontSize: 14, color: '#10B981', fontWeight: 600 }}>Access verified! Repository connected.</span>
              </div>
            ) : (
              <>
                <button
                  onClick={verifyRepo}
                  disabled={verifying}
                  style={{
                    width: '100%', padding: '12px', background: 'linear-gradient(135deg, #6366F1, #7C3AED)',
                    border: 'none', borderRadius: 12, color: '#fff', fontSize: 14, fontWeight: 700,
                    fontFamily: "'DM Sans', sans-serif", cursor: verifying ? 'not-allowed' : 'pointer',
                    opacity: verifying ? 0.7 : 1, boxShadow: '0 4px 16px rgba(99,102,241,0.3)',
                  }}
                >
                  {verifying ? 'Verifying...' : 'Verify Access'}
                </button>
                {verifyError && (
                  <p style={{ color: '#EF4444', fontSize: 13, marginTop: 10, lineHeight: 1.5 }}>
                    {verifyError}
                  </p>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* Need help */}
      <a
        href="https://t.me/hnry_h"
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          padding: '12px 16px', borderRadius: 12,
          background: 'transparent', border: '1px solid rgba(255,255,255,0.08)',
          color: '#6B7280', fontWeight: 600, fontSize: 13,
          textDecoration: 'none', fontFamily: "'DM Sans', sans-serif",
          transition: 'all 0.2s',
        }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
        Need help? Contact Henry
      </a>
    </div>
  );
}
