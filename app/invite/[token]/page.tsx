import { createServiceClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { Bot } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const supabase = await createServiceClient();

  const { data: invitation } = await supabase
    .from('invitations')
    .select('*')
    .eq('token', token)
    .single();

  if (!invitation) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-6">
        <h1 className="text-2xl font-bold text-white mb-2">Invalid Invitation</h1>
        <p className="text-[#6B7280]">This invite link is invalid or has expired.</p>
      </div>
    );
  }

  if (invitation.accepted) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-6">
        <h1 className="text-2xl font-bold text-white mb-2">Already Accepted</h1>
        <p className="text-[#6B7280] mb-4">This invitation has already been used.</p>
        <Link href="/login">
          <Button className="bg-[#6366F1] hover:bg-[#5558E6]">Go to Login</Button>
        </Link>
      </div>
    );
  }

  const repos = (invitation.repos as any[]) || [];

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-6">
      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#6366F1] to-[#818CF8] flex items-center justify-center mb-4">
        <Bot className="w-7 h-7 text-white" />
      </div>
      <h1 className="text-2xl font-bold text-white mb-2">You&apos;ve been invited by HH Dev</h1>
      <p className="text-[#9CA3AF] mb-6 text-center">
        You&apos;re invited to collaborate on {repos.length ? `${repos.length} project${repos.length > 1 ? 's' : ''}` : 'TaskBot'}.
      </p>

      {repos.length > 0 && (
        <div className="w-full max-w-sm space-y-2 mb-6">
          {repos.map((r, i) => (
            <div key={i} className="p-3 rounded-lg bg-[#111827] border border-[#1F2937]">
              <p className="text-white text-sm font-medium">{r.display_name || 'Project'}</p>
              <p className="text-[#6B7280] text-xs truncate">{r.repo_url}</p>
            </div>
          ))}
        </div>
      )}

      <Link href={`/login?invite=${token}`}>
        <Button className="bg-[#6366F1] hover:bg-[#5558E6] h-12 px-8 text-base rounded-xl">
          Get Started
        </Button>
      </Link>
    </div>
  );
}
