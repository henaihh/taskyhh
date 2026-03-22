'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Copy, Check, Trash2 } from 'lucide-react';

export default function InvitePage() {
  const [email, setEmail] = useState('');
  const [repos, setRepos] = useState<{ repo_url: string; display_name: string }[]>([]);
  const [inviteLink, setInviteLink] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const addRepo = () => setRepos([...repos, { repo_url: '', display_name: '' }]);
  const removeRepo = (i: number) => setRepos(repos.filter((_, idx) => idx !== i));
  const updateRepo = (i: number, field: string, value: string) => {
    const updated = [...repos];
    (updated[i] as any)[field] = value;
    setRepos(updated);
  };

  const handleSubmit = async () => {
    if (!email) return;
    setLoading(true);
    const supabase = createClient();
    const token = crypto.randomUUID().replace(/-/g, '');
    const { error } = await supabase.from('invitations').insert({
      token,
      email,
      repos: repos.filter(r => r.repo_url),
    });
    setLoading(false);
    if (!error) {
      const link = `${window.location.origin}/invite/${token}`;
      setInviteLink(link);
    }
  };

  const copyLink = () => {
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-lg space-y-6">
      <h2 className="text-lg font-semibold text-white">Create Invitation</h2>

      <div>
        <label className="text-sm text-[#9CA3AF] mb-1 block">Client Email</label>
        <Input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="client@example.com"
          className="bg-[#111827] border-[#1F2937]"
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm text-[#9CA3AF]">Repos</label>
          <Button variant="ghost" size="sm" onClick={addRepo} className="text-xs">
            <Plus className="w-3 h-3 mr-1" /> Add repo
          </Button>
        </div>
        {repos.map((r, i) => (
          <div key={i} className="flex gap-2 mb-2">
            <Input
              value={r.repo_url}
              onChange={(e) => updateRepo(i, 'repo_url', e.target.value)}
              placeholder="https://github.com/..."
              className="bg-[#111827] border-[#1F2937] flex-1"
            />
            <Input
              value={r.display_name}
              onChange={(e) => updateRepo(i, 'display_name', e.target.value)}
              placeholder="Display name"
              className="bg-[#111827] border-[#1F2937] w-40"
            />
            <Button variant="ghost" size="sm" onClick={() => removeRepo(i)}>
              <Trash2 className="w-3 h-3 text-red-400" />
            </Button>
          </div>
        ))}
      </div>

      <Button onClick={handleSubmit} disabled={loading || !email} className="bg-[#6366F1] hover:bg-[#5558E6]">
        {loading ? 'Creating...' : 'Create Invitation'}
      </Button>

      {inviteLink && (
        <div className="p-4 rounded-xl bg-[#111827] border border-[#1F2937]">
          <p className="text-sm text-[#9CA3AF] mb-2">Invite link created!</p>
          <div className="flex items-center gap-2">
            <code className="text-xs text-[#6366F1] flex-1 truncate">{inviteLink}</code>
            <Button variant="ghost" size="sm" onClick={copyLink}>
              {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
