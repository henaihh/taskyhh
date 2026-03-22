import { createServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || user.email !== 'hlace.henry@gmail.com') {
    redirect('/');
  }

  return (
    <div className="min-h-screen p-6">
      <div className="flex items-center gap-4 mb-8">
        <Link href="/admin" className="text-2xl font-bold text-white">Admin</Link>
        <Link href="/admin/invite" className="text-sm text-[#9CA3AF] hover:text-white transition-colors">+ Invite</Link>
        <Link href="/" className="text-sm text-[#9CA3AF] hover:text-white transition-colors ml-auto">← Back to app</Link>
      </div>
      {children}
    </div>
  );
}
