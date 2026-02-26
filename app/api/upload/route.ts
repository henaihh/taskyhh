import { createServerClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get('file') as File;
  const taskId = formData.get('taskId') as string;

  if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 });

  const fileName = `${user.id}/${taskId}/${Date.now()}-${file.name}`;
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from('task-images')
    .upload(fileName, file);

  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 });

  const { data: { publicUrl } } = supabase.storage
    .from('task-images')
    .getPublicUrl(uploadData.path);

  // Save to task_images table
  const { data: imageRecord, error: dbError } = await supabase
    .from('task_images')
    .insert({
      task_id: taskId,
      url: publicUrl,
      alt_text: file.name,
    })
    .select()
    .single();

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });
  return NextResponse.json(imageRecord);
}
