'use client';

import { motion } from 'framer-motion';
import { Task } from '@/lib/types';
import { PRIORITY_COLORS } from '@/lib/constants';
import { ArrowLeft, ExternalLink, Target } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import Checklist from './Checklist';
import AdminQuestions from './AdminQuestions';

export default function TaskDetail({
  task,
  onClose,
  userId,
}: {
  task: Task;
  onClose: () => void;
  userId: string;
}) {
  const isDone = task.status === 'done' || task.status === 'failed';
  const questions = task.admin_questions || [];
  const unanswered = questions.filter(q => !q.answered);
  const images = task.task_images || [];
  const checklist = task.checklist_items || [];

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
      />

      {/* Sheet */}
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        className="fixed inset-x-0 bottom-0 z-50 max-h-[90vh] overflow-y-auto bg-[#0B0F1A] border-t border-white/[0.07] rounded-t-3xl mx-auto max-w-[480px]"
      >
        <div className="p-5 space-y-5">
          {/* Header */}
          <div className="flex items-center gap-3">
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/[0.06]">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <Badge
              className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md border-0"
              style={{ backgroundColor: `${PRIORITY_COLORS[task.priority]}20`, color: PRIORITY_COLORS[task.priority] }}
            >
              {task.priority.toUpperCase()}
            </Badge>
            {task.status === 'in_progress' && (
              <Badge className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-400 border-0 animate-pulse">
                Running...
              </Badge>
            )}
          </div>

          {/* Title & Description */}
          <div>
            <h2 className="text-xl font-bold mb-2">{task.title}</h2>
            {task.description && (
              <p className="text-sm text-[#9CA3AF] leading-relaxed">{task.description}</p>
            )}
          </div>

          {/* Desired Result */}
          {task.desired_result && (
            <div className="p-3 rounded-xl bg-indigo-500/[0.08] border border-indigo-500/20">
              <div className="flex items-center gap-2 mb-1.5">
                <Target className="w-4 h-4 text-indigo-400" />
                <span className="text-xs font-semibold text-indigo-300">Desired Result</span>
              </div>
              <p className="text-sm text-[#9CA3AF]">{task.desired_result}</p>
            </div>
          )}

          {/* Target URL */}
          {task.target_url && (
            <a
              href={task.target_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 p-3 rounded-xl bg-white/[0.04] border border-white/[0.07] hover:bg-white/[0.06] transition-colors"
            >
              <ExternalLink className="w-4 h-4 text-[#818CF8] flex-shrink-0" />
              <span className="text-xs font-mono text-[#9CA3AF] truncate">{task.target_url}</span>
            </a>
          )}

          {/* Images */}
          {images.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider">Attachments</h3>
              <div className="grid grid-cols-2 gap-2">
                {images.map(img => (
                  <img
                    key={img.id}
                    src={img.url}
                    alt={img.alt_text || ''}
                    className="rounded-xl w-full h-32 object-cover border border-white/[0.07]"
                  />
                ))}
              </div>
            </div>
          )}

          {/* Tags */}
          {task.tags && task.tags.length > 0 && (
            <div className="flex gap-1.5 flex-wrap">
              {task.tags.map(tag => (
                <span key={tag} className="text-[10px] px-2.5 py-1 rounded-full bg-white/[0.06] text-[#9CA3AF]">
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Checklist */}
          {checklist.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider">Checklist</h3>
              <Checklist items={checklist} taskId={task.id} />
            </div>
          )}

          {/* Cost Breakdown (done tasks only) */}
          {isDone && task.client_cost_usd && (
            <div className="p-3 rounded-xl bg-white/[0.04] border border-white/[0.07] space-y-2">
              <h3 className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider">Cost Breakdown</h3>
              <div className="grid grid-cols-2 gap-2 font-mono text-xs">
                <div className="flex justify-between">
                  <span className="text-[#6B7280]">Input tokens</span>
                  <span className="text-[#9CA3AF]">{task.token_input?.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#6B7280]">Output tokens</span>
                  <span className="text-[#9CA3AF]">{task.token_output?.toLocaleString()}</span>
                </div>
                <div className="col-span-2 flex justify-between pt-2 border-t border-white/[0.07]">
                  <span className="text-[#9CA3AF] font-semibold">You Paid</span>
                  <span className="text-emerald-400 font-bold">${Number(task.client_cost_usd).toFixed(4)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Agent Response */}
          {task.agent_response && (
            <div className="p-3 rounded-xl bg-white/[0.04] border border-white/[0.07]">
              <h3 className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider mb-2">Agent Response</h3>
              <p className="text-sm text-[#9CA3AF] whitespace-pre-wrap">{task.agent_response}</p>
            </div>
          )}

          {/* Admin Questions */}
          {questions.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider flex items-center gap-2">
                Robot Questions
                {unanswered.length > 0 && (
                  <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 text-[10px] font-mono flex items-center justify-center">
                    {unanswered.length}
                  </span>
                )}
              </h3>
              <AdminQuestions questions={questions} taskId={task.id} />
            </div>
          )}

          {/* Bottom padding */}
          <div className="h-6" />
        </div>
      </motion.div>
    </>
  );
}
