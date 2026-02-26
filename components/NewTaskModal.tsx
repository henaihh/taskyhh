'use client';

import { useState } from 'react';
import { X, Plus, ImagePlus, Loader2, AlertCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { PRIORITY_COLORS } from '@/lib/constants';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';

const priorities = ['urgent', 'high', 'medium', 'low'] as const;

export default function NewTaskModal({
  onClose,
  userId,
  hasCredits,
}: {
  onClose: () => void;
  userId: string;
  hasCredits: boolean;
}) {
  const [taskType, setTaskType] = useState<'human' | 'bot'>('bot');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [desiredResult, setDesiredResult] = useState('');
  const [targetUrl, setTargetUrl] = useState('');
  const [priority, setPriority] = useState<typeof priorities[number]>('medium');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [checklistInput, setChecklistInput] = useState('');
  const [checklistItems, setChecklistItems] = useState<string[]>([]);
  const [images, setImages] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const supabase = createClient();

  const addTag = () => {
    const newTags = tagInput.split(',').map(t => t.trim()).filter(t => t && !tags.includes(t));
    setTags([...tags, ...newTags]);
    setTagInput('');
  };

  const addChecklistItem = () => {
    if (checklistInput.trim()) {
      setChecklistItems([...checklistItems, checklistInput.trim()]);
      setChecklistInput('');
    }
  };

  const handleSubmit = async () => {
    if (!title.trim()) return;
    setSubmitting(true);

    try {
      // Create task
      const { data: task, error } = await supabase
        .from('tasks')
        .insert({
          user_id: userId,
          title: title.trim(),
          description: description.trim() || null,
          desired_result: desiredResult.trim() || null,
          target_url: targetUrl.trim() || null,
          priority,
          tags,
          status: 'backlog',
          task_type: taskType,
        })
        .select()
        .single();

      if (error || !task) throw error;

      // Create checklist items
      if (checklistItems.length > 0) {
        await supabase.from('checklist_items').insert(
          checklistItems.map((text, i) => ({
            task_id: task.id,
            text,
            position: i,
          }))
        );
      }

      // Upload images
      if (images.length > 0) {
        for (const file of images) {
          const fileName = `${userId}/${task.id}/${Date.now()}-${file.name}`;
          const { data: uploadData } = await supabase.storage
            .from('task-images')
            .upload(fileName, file);

          if (uploadData) {
            const { data: { publicUrl } } = supabase.storage
              .from('task-images')
              .getPublicUrl(uploadData.path);

            await supabase.from('task_images').insert({
              task_id: task.id,
              url: publicUrl,
              alt_text: file.name,
            });
          }
        }
      }

      // If user has credits and it's a bot task, queue and execute
      if (hasCredits && taskType === 'bot') {
        await supabase.from('tasks').update({ status: 'queued' }).eq('id', task.id);

        // Trigger agent execution
        fetch('/api/agent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ taskId: task.id }),
        });
      }

      onClose();
    } catch (err) {
      console.error('Failed to create task:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const formContent = (
        <div className="p-5 space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold">New Task</h2>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/[0.06]">
              <X className="w-5 h-5" />
            </button>
          </div>

          {!hasCredits && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-500/[0.08] border border-amber-500/20">
              <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0" />
              <p className="text-xs text-amber-200">Task will be created but not executed until you add credits.</p>
            </div>
          )}

          {/* Task Type */}
          <div>
            <label className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider mb-1.5 block">Task Type</label>
            <div className="flex gap-2">
              <button
                onClick={() => setTaskType('human')}
                className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all border ${
                  taskType === 'human'
                    ? 'bg-white/[0.08] border-white/20 text-[#E5E7EB]'
                    : 'bg-transparent border-white/[0.07] text-[#6B7280] opacity-50'
                }`}
              >
                🧑 Human
              </button>
              <button
                onClick={() => setTaskType('bot')}
                className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all border ${
                  taskType === 'bot'
                    ? 'bg-indigo-500/20 border-indigo-500/30 text-indigo-300'
                    : 'bg-transparent border-white/[0.07] text-[#6B7280] opacity-50'
                }`}
              >
                🤖 Bot
              </button>
            </div>
            {taskType === 'human' && (
              <p className="text-[11px] text-[#6B7280] mt-1.5">Human tasks don&apos;t cost credits — they&apos;re for you to complete.</p>
            )}
          </div>

          {/* Title */}
          <div>
            <label className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider mb-1.5 block">Title *</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What needs to be done?"
              className="bg-white/[0.04] border-white/[0.07] h-11"
            />
          </div>

          {/* Description */}
          <div>
            <label className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider mb-1.5 block">Description</label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detailed instructions..."
              className="bg-white/[0.04] border-white/[0.07] min-h-[80px]"
            />
          </div>

          {/* Desired Result */}
          <div>
            <label className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider mb-1.5 block">Desired Result</label>
            <Textarea
              value={desiredResult}
              onChange={(e) => setDesiredResult(e.target.value)}
              placeholder="What does success look like?"
              className="bg-white/[0.04] border-white/[0.07] min-h-[60px]"
            />
          </div>

          {/* Target URL */}
          <div>
            <label className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider mb-1.5 block">Target URL</label>
            <Input
              value={targetUrl}
              onChange={(e) => setTargetUrl(e.target.value)}
              placeholder="https://..."
              className="bg-white/[0.04] border-white/[0.07] h-11 font-mono text-sm"
            />
          </div>

          {/* Priority */}
          <div>
            <label className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider mb-1.5 block">Priority</label>
            <div className="flex gap-2">
              {priorities.map(p => (
                <button
                  key={p}
                  onClick={() => setPriority(p)}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold uppercase transition-all ${
                    priority === p
                      ? 'ring-2 ring-offset-1 ring-offset-[#0B0F1A]'
                      : 'opacity-50'
                  }`}
                  style={{
                    backgroundColor: `${PRIORITY_COLORS[p]}20`,
                    color: PRIORITY_COLORS[p],
                    ...(priority === p ? { '--tw-ring-color': PRIORITY_COLORS[p] } as React.CSSProperties : {}),
                  }}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider mb-1.5 block">Tags</label>
            <div className="flex gap-2">
              <Input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                placeholder="tag1, tag2..."
                className="bg-white/[0.04] border-white/[0.07] h-9 text-sm"
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
              />
              <Button size="sm" variant="outline" onClick={addTag} className="border-white/[0.07] h-9">
                Add
              </Button>
            </div>
            {tags.length > 0 && (
              <div className="flex gap-1.5 mt-2 flex-wrap">
                {tags.map(tag => (
                  <span
                    key={tag}
                    onClick={() => setTags(tags.filter(t => t !== tag))}
                    className="text-[10px] px-2.5 py-1 rounded-full bg-indigo-500/20 text-indigo-300 cursor-pointer hover:bg-red-500/20 hover:text-red-300 transition-colors"
                  >
                    {tag} ×
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Image Upload */}
          <div>
            <label className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider mb-1.5 block">Images</label>
            <label className="flex items-center justify-center gap-2 p-3 rounded-xl border-2 border-dashed border-white/[0.07] cursor-pointer hover:border-white/[0.15] transition-colors">
              <ImagePlus className="w-4 h-4 text-[#6B7280]" />
              <span className="text-xs text-[#6B7280]">Add images</span>
              <input
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => {
                  if (e.target.files) setImages([...images, ...Array.from(e.target.files)]);
                }}
              />
            </label>
            {images.length > 0 && (
              <div className="flex gap-2 mt-2 flex-wrap">
                {images.map((f, i) => (
                  <span key={i} className="text-[10px] px-2 py-1 rounded-lg bg-white/[0.04] text-[#9CA3AF]">
                    {f.name}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Checklist Builder */}
          <div>
            <label className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider mb-1.5 block">Checklist</label>
            <div className="flex gap-2">
              <Input
                value={checklistInput}
                onChange={(e) => setChecklistInput(e.target.value)}
                placeholder="Add a step..."
                className="bg-white/[0.04] border-white/[0.07] h-9 text-sm"
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addChecklistItem())}
              />
              <Button size="sm" variant="outline" onClick={addChecklistItem} className="border-white/[0.07] h-9">
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            {checklistItems.length > 0 && (
              <div className="space-y-1 mt-2">
                {checklistItems.map((item, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm text-[#9CA3AF]">
                    <div className="w-4 h-4 rounded-full border border-white/20 flex-shrink-0" />
                    <span className="flex-1">{item}</span>
                    <button
                      onClick={() => setChecklistItems(checklistItems.filter((_, j) => j !== i))}
                      className="text-[#6B7280] hover:text-red-400"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Submit */}
          <Button
            onClick={handleSubmit}
            disabled={!title.trim() || submitting}
            className="w-full h-12 bg-gradient-to-r from-[#6366F1] to-[#818CF8] hover:opacity-90 text-white font-semibold rounded-xl"
          >
            {submitting ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              'Create Task'
            )}
          </Button>

          <div className="h-4" />
        </div>
  );

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 animate-in fade-in duration-200"
      />

      {/* Modal container — bottom sheet on mobile, centered on desktop */}
      <div
        className="fixed inset-0 z-50 flex items-end md:items-center justify-center"
        onClick={onClose}
      >
        <style>{`
          @keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
          @keyframes scaleIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
          .modal-mobile { animation: slideUp 0.3s ease-out; }
          .modal-desktop { animation: scaleIn 0.2s ease-out; }
        `}</style>
        <div
          onClick={(e) => e.stopPropagation()}
          className="
            w-full max-h-[90vh] overflow-y-auto
            bg-[#111827] border border-white/[0.08]
            max-w-[480px] rounded-t-3xl border-b-0
            md:max-w-[560px] md:rounded-2xl md:border-b md:max-h-[85vh]
            shadow-2xl modal-mobile md:modal-desktop
          "
        >
          {formContent}
        </div>
      </div>
    </>
  );
}
