import { SupabaseClient } from '@supabase/supabase-js';

export async function runOnboarding(supabase: SupabaseClient, userId: string) {
  // Check if already onboarded
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('onboarded')
    .eq('id', userId)
    .single();

  if (!profile || profile.onboarded) return;

  // Task 1: Set website URL
  const { data: task1 } = await supabase
    .from('tasks')
    .insert({
      user_id: userId,
      title: 'Set your website URL',
      task_type: 'human',
      priority: 'high',
      status: 'backlog',
      description:
        "Enter the URL of the website you want TaskBot to work on. This helps our AI understand your project and deliver better results.\n\nDon't worry if you're not sure — you can skip this and come back later. Need help? Contact Henry on Telegram.",
      desired_result: 'Your website URL saved in your profile.',
      tags: ['setup', 'onboarding'],
    })
    .select()
    .single();

  if (task1) {
    await supabase.from('checklist_items').insert({
      task_id: task1.id,
      text: 'Enter your website URL',
      position: 0,
    });
  }

  // Task 2: Connect GitHub repository
  const { data: task2 } = await supabase
    .from('tasks')
    .insert({
      user_id: userId,
      title: 'Connect your GitHub repository',
      task_type: 'human',
      priority: 'high',
      status: 'backlog',
      description:
        "Paste your repository URL and invite @henaihh as a collaborator on GitHub so our bot can create PRs and push code to your project.\n\nDon't worry if you're not sure — you can skip this and come back later. Need help? Contact Henry on Telegram.",
      desired_result: 'Repository connected and henaihh has collaborator access.',
      tags: ['setup', 'onboarding'],
    })
    .select()
    .single();

  if (task2) {
    await supabase.from('checklist_items').insert([
      { task_id: task2.id, text: 'Paste your repository URL', position: 0 },
      { task_id: task2.id, text: 'Add henaihh as a collaborator on GitHub', position: 1 },
    ]);
  }

  // Task 3: Set up auto-deploy (optional)
  const { data: task3 } = await supabase
    .from('tasks')
    .insert({
      user_id: userId,
      title: 'Set up auto-deploy (optional)',
      task_type: 'human',
      priority: 'low',
      status: 'backlog',
      description:
        "If your project is on Vercel, you can set up automatic deploys after TaskBot merges code changes.\n\n**How to create a deploy hook:**\n1. Go to your Vercel project → Settings → Git → Deploy Hooks\n2. Create a hook: name it 'TaskBot', branch 'main'\n3. Copy the URL and paste it below\n\nIf you don't use Vercel, skip this step.",
      desired_result: 'Deploy hook URL saved for automatic deployments.',
      tags: ['setup', 'onboarding'],
    })
    .select()
    .single();

  if (task3) {
    await supabase.from('checklist_items').insert([
      { task_id: task3.id, text: 'Create deploy hook in Vercel', position: 0 },
      { task_id: task3.id, text: 'Paste deploy hook URL below', position: 1 },
    ]);
  }

  // Mark onboarded
  await supabase
    .from('user_profiles')
    .update({ onboarded: true })
    .eq('id', userId);
}
