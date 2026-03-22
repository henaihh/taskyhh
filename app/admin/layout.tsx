import { createServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Check if user is authenticated and is admin
  if (!user || user.email !== 'hlace.henry@gmail.com') {
    redirect('/');
  }

  return (
    <div className="min-h-screen bg-[#0B0F1A]">
      {children}
    </div>
  );
}