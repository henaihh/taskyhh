import { createServerClient } from '@/lib/supabase/server';
import { Button } from '@/components/ui/button';
import { Bot, CheckCircle, GitBranch, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';

export default async function InvitePage({
  params,
}: {
  params: { token: string };
}) {
  const supabase = await createServerClient();
  const { token } = params;

  // Get invitation details
  const { data: invitation, error } = await supabase
    .from('invitations')
    .select('*')
    .eq('token', token)
    .single();

  if (error || !invitation) {
    notFound();
  }

  // Check if already accepted
  const isAccepted = invitation.accepted;
  const repos = (invitation.repos as any[]) || [];

  return (
    <div className="min-h-screen bg-[#0B0F1A] flex items-center justify-center px-6">
      <div className="max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#6366F1] to-[#818CF8] flex items-center justify-center mx-auto mb-4">
            <Bot className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-[#6366F1] to-[#818CF8] bg-clip-text text-transparent mb-2">
            You're Invited!
          </h1>
          <p className="text-[#9CA3AF] text-sm">
            Welcome to TaskBot - Human → Robot task execution
          </p>
        </div>

        {/* Invitation Card */}
        <div className="bg-[#1F2937] rounded-2xl p-6 mb-6">
          {isAccepted ? (
            <div className="text-center">
              <CheckCircle className="w-12 h-12 text-[#10B981] mx-auto mb-4" />
              <h2 className="text-xl font-bold text-white mb-2">Already Accepted</h2>
              <p className="text-gray-400 text-sm mb-4">
                This invitation has already been accepted on {new Date(invitation.accepted_at!).toLocaleDateString()}
              </p>
              <Link href="/login">
                <Button className="w-full bg-[#6366F1] hover:bg-[#5855EB] text-white">
                  Sign In to Continue
                </Button>
              </Link>
            </div>
          ) : (
            <>
              <div className="text-center mb-6">
                <h2 className="text-xl font-bold text-white mb-2">
                  Invitation for {invitation.email}
                </h2>
                <p className="text-gray-400 text-sm">
                  You've been invited to join TaskBot with access to the following repositories:
                </p>
              </div>

              {/* Repository List */}
              {repos.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-white font-medium mb-3 flex items-center gap-2">
                    <GitBranch className="w-4 h-4" />
                    Repositories ({repos.length})
                  </h3>
                  
                  <div className="space-y-2">
                    {repos.map((repo, index) => (
                      <div key={index} className="bg-[#374151] rounded-lg p-3">
                        <p className="text-white font-medium text-sm">{repo.display_name}</p>
                        <p className="text-gray-400 text-xs">{repo.repo_url}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Features */}
              <div className="mb-6">
                <h3 className="text-white font-medium mb-3">What you'll get:</h3>
                <ul className="space-y-2 text-sm text-gray-300">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-[#10B981]" />
                    AI-powered task execution
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-[#10B981]" />
                    Repository management
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-[#10B981]" />
                    Credit-based billing
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-[#10B981]" />
                    Priority support
                  </li>
                </ul>
              </div>

              {/* CTA Button */}
              <Link href={`/login?invite=${token}`}>
                <Button className="w-full bg-gradient-to-r from-[#6366F1] to-[#818CF8] hover:from-[#5855EB] hover:to-[#6366F1] text-white h-12 text-base font-medium">
                  Get Started
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>

              <p className="text-gray-500 text-xs text-center mt-4">
                By signing up, you agree to our Terms of Service and Privacy Policy
              </p>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="text-center">
          <p className="text-gray-500 text-xs">
            Invitation created {new Date(invitation.created_at).toLocaleDateString()}
          </p>
        </div>
      </div>
    </div>
  );
}