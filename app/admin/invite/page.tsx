'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Bot, Plus, Trash2, Copy, Check, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface Repo {
  repo_url: string;
  display_name: string;
}

export default function CreateInvitePage() {
  const [email, setEmail] = useState('');
  const [repos, setRepos] = useState<Repo[]>([{ repo_url: '', display_name: '' }]);
  const [isLoading, setIsLoading] = useState(false);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const router = useRouter();

  const addRepo = () => {
    setRepos([...repos, { repo_url: '', display_name: '' }]);
  };

  const removeRepo = (index: number) => {
    setRepos(repos.filter((_, i) => i !== index));
  };

  const updateRepo = (index: number, field: keyof Repo, value: string) => {
    const updated = [...repos];
    updated[index][field] = value;
    setRepos(updated);
  };

  const generateToken = () => {
    return Array.from(crypto.getRandomValues(new Uint8Array(32)), 
      byte => byte.toString(16).padStart(2, '0')).join('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email.trim()) return;
    
    const validRepos = repos.filter(r => r.repo_url.trim() && r.display_name.trim());
    
    setIsLoading(true);
    
    try {
      const supabase = createClient();
      const token = generateToken();
      
      const { error } = await supabase
        .from('invitations')
        .insert({
          token,
          email: email.trim(),
          repos: validRepos,
        });

      if (error) throw error;

      const link = `${window.location.origin}/invite/${token}`;
      setInviteLink(link);
      
    } catch (error) {
      console.error('Error creating invitation:', error);
      alert('Failed to create invitation. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = async () => {
    if (inviteLink) {
      try {
        await navigator.clipboard.writeText(inviteLink);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (error) {
        console.error('Failed to copy:', error);
      }
    }
  };

  const resetForm = () => {
    setEmail('');
    setRepos([{ repo_url: '', display_name: '' }]);
    setInviteLink(null);
    setCopied(false);
  };

  if (inviteLink) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <Link href="/admin">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#10B981] to-[#059669] flex items-center justify-center">
            <Check className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Invitation Created!</h1>
            <p className="text-gray-400 text-sm">Send this link to {email}</p>
          </div>
        </div>

        <div className="bg-[#1F2937] rounded-xl p-6 mb-6">
          <p className="text-gray-400 text-sm mb-4">Invitation Link:</p>
          
          <div className="flex items-center gap-3 p-4 bg-[#374151] rounded-lg">
            <code className="flex-1 text-[#10B981] text-sm break-all">
              {inviteLink}
            </code>
            <Button 
              onClick={copyToClipboard}
              variant="outline" 
              size="sm"
              className={copied ? 'text-green-400' : ''}
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Copied!' : 'Copy'}
            </Button>
          </div>
          
          <p className="text-gray-500 text-sm mt-4">
            This link will allow {email} to sign up and automatically get access to the specified repositories.
          </p>
        </div>

        <div className="flex gap-3">
          <Button onClick={resetForm} className="bg-[#6366F1] hover:bg-[#5855EB] text-white">
            Create Another
          </Button>
          <Link href="/admin">
            <Button variant="outline">
              Back to Dashboard
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <Link href="/admin">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#6366F1] to-[#818CF8] flex items-center justify-center">
          <Bot className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Create Invitation</h1>
          <p className="text-gray-400 text-sm">Invite a new client to TaskyHH</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Email */}
        <div className="bg-[#1F2937] rounded-xl p-6">
          <label className="block text-white font-medium mb-3">Client Email</label>
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="client@example.com"
            required
            className="bg-[#374151] border-gray-600 text-white"
          />
          <p className="text-gray-500 text-sm mt-2">
            The client will receive an invitation to this email address
          </p>
        </div>

        {/* Repositories */}
        <div className="bg-[#1F2937] rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <label className="text-white font-medium">Repositories</label>
            <Button
              type="button"
              onClick={addRepo}
              variant="outline"
              size="sm"
            >
              <Plus className="w-4 h-4" />
              Add Repo
            </Button>
          </div>

          <div className="space-y-4">
            {repos.map((repo, index) => (
              <div key={index} className="flex items-center gap-3">
                <div className="flex-1 grid grid-cols-2 gap-3">
                  <Input
                    placeholder="Repository URL"
                    value={repo.repo_url}
                    onChange={(e) => updateRepo(index, 'repo_url', e.target.value)}
                    className="bg-[#374151] border-gray-600 text-white"
                  />
                  <Input
                    placeholder="Display Name"
                    value={repo.display_name}
                    onChange={(e) => updateRepo(index, 'display_name', e.target.value)}
                    className="bg-[#374151] border-gray-600 text-white"
                  />
                </div>
                
                {repos.length > 1 && (
                  <Button
                    type="button"
                    onClick={() => removeRepo(index)}
                    variant="ghost"
                    size="icon"
                    className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>

          <p className="text-gray-500 text-sm mt-4">
            The client will get access to these repositories when they sign up
          </p>
        </div>

        {/* Submit */}
        <div className="flex gap-3">
          <Button
            type="submit"
            disabled={isLoading || !email.trim()}
            className="bg-[#6366F1] hover:bg-[#5855EB] text-white"
          >
            {isLoading ? 'Creating...' : 'Create Invitation'}
          </Button>
          
          <Link href="/admin">
            <Button variant="outline" type="button">
              Cancel
            </Button>
          </Link>
        </div>
      </form>
    </div>
  );
}