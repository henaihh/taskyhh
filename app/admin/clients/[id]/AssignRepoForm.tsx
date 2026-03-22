'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function AssignRepoForm({ email }: { email: string }) {
  const [repoUrl, setRepoUrl] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleAssign = async () => {
    if (!repoUrl || !email) return;
    setLoading(true);
    const supabase = createClient();
    await supabase.from('client_repos').insert({
      email,
      repo_url: repoUrl,
      display_name: displayName || null,
    });
    setLoading(false);
    setRepoUrl('');
    setDisplayName('');
    router.refresh();
  };

  return (
    <div className="flex gap-2 mt-3">
      <Input
        value={repoUrl}
        onChange={(e) => setRepoUrl(e.target.value)}
        placeholder="Repo URL"
        className="bg-[#111827] border-[#1F2937] flex-1"
      />
      <Input
        value={displayName}
        onChange={(e) => setDisplayName(e.target.value)}
        placeholder="Name"
        className="bg-[#111827] border-[#1F2937] w-32"
      />
      <Button variant="ghost" size="sm" onClick={handleAssign} disabled={loading}>
        <Plus className="w-4 h-4" />
      </Button>
    </div>
  );
}
