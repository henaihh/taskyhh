import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/';
  const inviteToken = searchParams.get('invite');

  if (code) {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          },
        },
      }
    );

    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // Handle invitation acceptance
      if (inviteToken) {
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (user?.email) {
            // Use service client for admin operations
            const { createClient } = await import('@supabase/supabase-js');
            const serviceClient = createClient(
              process.env.NEXT_PUBLIC_SUPABASE_URL!,
              process.env.SUPABASE_SERVICE_ROLE_KEY!
            );

            // Get invitation
            const { data: invitation } = await serviceClient
              .from('invitations')
              .select('*')
              .eq('token', inviteToken)
              .eq('accepted', false)
              .single();

            if (invitation) {
              // Mark as accepted
              await serviceClient
                .from('invitations')
                .update({ accepted: true, accepted_at: new Date().toISOString() })
                .eq('id', invitation.id);

              // Create client_repos entries
              const repos = (invitation.repos as any[]) || [];
              if (repos.length > 0) {
                await serviceClient.from('client_repos').insert(
                  repos.map((r: any) => ({
                    email: user.email,
                    repo_url: r.repo_url,
                    display_name: r.display_name,
                  }))
                );

                // Set first repo as user's repo_url
                await serviceClient
                  .from('user_profiles')
                  .update({ repo_url: repos[0].repo_url })
                  .eq('id', user.id);
              }
            }
          }
        } catch (e) {
          console.error('Error processing invitation:', e);
        }
      }

      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login`);
}
