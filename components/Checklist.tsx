'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { ChecklistItem } from '@/lib/types';
import { createClient } from '@/lib/supabase/client';
import { Check } from 'lucide-react';

export default function Checklist({
  items,
  taskId,
}: {
  items: ChecklistItem[];
  taskId: string;
}) {
  const [checklist, setChecklist] = useState(items.sort((a, b) => a.position - b.position));
  const supabase = createClient();

  const toggleItem = async (item: ChecklistItem) => {
    const newDone = !item.done;
    setChecklist(prev => prev.map(c => c.id === item.id ? { ...c, done: newDone } : c));

    await supabase
      .from('checklist_items')
      .update({ done: newDone })
      .eq('id', item.id);
  };

  return (
    <div className="space-y-2">
      {checklist.map(item => (
        <motion.button
          key={item.id}
          onClick={() => toggleItem(item)}
          className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-white/[0.04] transition-colors text-left"
          whileTap={{ scale: 0.98 }}
        >
          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
            item.done
              ? 'bg-gradient-to-br from-[#6366F1] to-[#818CF8] border-transparent'
              : 'border-white/20'
          }`}>
            {item.done && <Check className="w-3 h-3 text-white" />}
          </div>
          <span className={`text-sm flex-1 transition-all ${
            item.done ? 'text-[#6B7280] line-through' : 'text-[#F9FAFB]'
          }`}>
            {item.text}
          </span>
        </motion.button>
      ))}
    </div>
  );
}
