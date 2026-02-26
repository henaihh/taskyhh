'use client';

import { Task } from '@/lib/types';
import { PRIORITY_COLORS } from '@/lib/constants';
import { Badge } from '@/components/ui/badge';
import { MessageCircleQuestion, Zap } from 'lucide-react';

export default function TaskCard({
  task,
  onClick,
  needsCredits,
}: {
  task: Task;
  onClick: () => void;
  needsCredits: boolean;
}) {
  const checklist = task.checklist_items || [];
  const doneCount = checklist.filter(c => c.done).length;
  const hasQuestions = (task.admin_questions || []).some(q => !q.answered);
  const isDone = task.status === 'done' || task.status === 'failed';

  return (
    <button
      onClick={onClick}
      className="w-full text-left p-4 rounded-2xl bg-white/[0.04] border border-white/[0.07] hover:bg-white/[0.06] transition-all active:scale-[0.98]"
    >
      {/* Badges Row */}
      <div className="flex items-center gap-2 mb-2 flex-wrap">
        <Badge
          className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md border-0"
          style={{ backgroundColor: `${PRIORITY_COLORS[task.priority]}20`, color: PRIORITY_COLORS[task.priority] }}
        >
          {task.priority.toUpperCase()}
        </Badge>

        {hasQuestions && (
          <Badge className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-400 border-0 flex items-center gap-1">
            <MessageCircleQuestion className="w-3 h-3" />
            Question
          </Badge>
        )}

        {isDone && task.client_cost_usd && (
          <Badge className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-400 border-0">
            ${Number(task.client_cost_usd).toFixed(4)}
          </Badge>
        )}

        {!isDone && needsCredits && (
          <Badge className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-500 border-0 flex items-center gap-1">
            <Zap className="w-3 h-3" />
            Needs credits
          </Badge>
        )}

        {task.status === 'in_progress' && (
          <Badge className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-400 border-0 animate-pulse">
            Running...
          </Badge>
        )}

        {task.status === 'failed' && (
          <Badge className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-red-500/20 text-red-400 border-0">
            Failed
          </Badge>
        )}
      </div>

      {/* Title & Description */}
      <h3 className="font-semibold text-sm text-[#F9FAFB] mb-1 line-clamp-1">{task.title}</h3>
      {task.description && (
        <p className="text-xs text-[#9CA3AF] line-clamp-2 mb-2">{task.description}</p>
      )}

      {/* Tags */}
      {task.tags && task.tags.length > 0 && (
        <div className="flex gap-1.5 mb-2 flex-wrap">
          {task.tags.map(tag => (
            <span key={tag} className="text-[10px] px-2 py-0.5 rounded-full bg-white/[0.06] text-[#9CA3AF]">
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Checklist Progress */}
      {checklist.length > 0 && (
        <div className="flex items-center gap-2">
          <div className="flex-1 h-1 rounded-full bg-white/[0.06] overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#6366F1] to-[#818CF8] transition-all duration-500"
              style={{ width: `${(doneCount / checklist.length) * 100}%` }}
            />
          </div>
          <span className="text-[10px] font-mono text-[#6B7280]">
            {doneCount}/{checklist.length}
          </span>
        </div>
      )}
    </button>
  );
}
