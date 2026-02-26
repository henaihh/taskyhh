'use client';

import { useState } from 'react';
import { AdminQuestion } from '@/lib/types';
import { createClient } from '@/lib/supabase/client';
import { Send } from 'lucide-react';
import { Input } from '@/components/ui/input';

export default function AdminQuestions({
  questions,
  taskId,
}: {
  questions: AdminQuestion[];
  taskId: string;
}) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState<string | null>(null);
  const supabase = createClient();

  const submitAnswer = async (questionId: string) => {
    const answer = answers[questionId];
    if (!answer?.trim()) return;

    setSubmitting(questionId);
    await supabase
      .from('admin_questions')
      .update({ answer, answered: true })
      .eq('id', questionId);

    setSubmitting(null);
    setAnswers(prev => ({ ...prev, [questionId]: '' }));
  };

  return (
    <div className="space-y-3">
      {questions.map(q => (
        <div key={q.id} className="p-3 rounded-xl bg-amber-500/[0.08] border border-amber-500/20">
          <div className="flex items-start gap-2 mb-2">
            <div className="w-2 h-2 rounded-full bg-amber-400 mt-1.5 animate-pulse flex-shrink-0" />
            <p className="text-sm text-amber-200">{q.question}</p>
          </div>
          {q.answered ? (
            <p className="text-xs text-[#9CA3AF] ml-4">✓ {q.answer}</p>
          ) : (
            <div className="flex gap-2 ml-4">
              <Input
                value={answers[q.id] || ''}
                onChange={(e) => setAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
                placeholder="Type your answer..."
                className="h-8 text-xs bg-white/[0.04] border-white/[0.07]"
                onKeyDown={(e) => e.key === 'Enter' && submitAnswer(q.id)}
              />
              <button
                onClick={() => submitAnswer(q.id)}
                disabled={submitting === q.id}
                className="p-2 rounded-lg bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 transition-colors disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
