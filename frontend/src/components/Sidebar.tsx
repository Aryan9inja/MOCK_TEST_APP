import React from 'react';
import { ArrowLeft, Code2, Clock } from 'lucide-react';
import type { Question } from '@/types/test';

interface SidebarProps {
  title: string;
  isReview: boolean;
  timeLeft: number | null;
  q: Question;
  questionsCount: number;
  currentQIdx: number;
  onNavigateHome: () => void;
  onNext: () => void;
  onPrev: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  title,
  isReview,
  timeLeft,
  q,
  questionsCount,
  currentQIdx,
  onNavigateHome,
  onNext,
  onPrev
}) => {
  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="w-1/3 flex flex-col border-r border-border bg-[#0c0c0e]">
      <div className="p-4 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button onClick={onNavigateHome} className="p-1 hover:bg-[#27272a] rounded-lg transition-colors mr-1">
            <ArrowLeft size={18} className="text-gray-400" />
          </button>
          <div className="bg-primary/20 p-2 rounded-lg text-primary">
            <Code2 size={20} />
          </div>
          <h1 className="font-semibold tracking-tight truncate max-w-[180px]" title={title}>
            {title}
          </h1>
        </div>
        <div className={`flex items-center gap-2 font-mono text-sm px-3 py-1.5 rounded-full border ${isReview ? 'text-blue-400 bg-blue-400/10 border-blue-400/20' : (timeLeft !== null && timeLeft < 300 ? 'text-red-400 bg-red-400/10 border-red-400/20' : 'text-gray-300 bg-gray-800 border-gray-700')}`}>
          <Clock size={14} />
          <span>{isReview ? 'Review Mode' : (timeLeft !== null ? formatTime(timeLeft) : '00:00:00')}</span>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        <div className="flex justify-between items-center">
           <button onClick={onPrev} disabled={currentQIdx === 0} className="text-xs bg-[#27272a] hover:bg-[#3f3f46] px-3 py-1.5 rounded disabled:opacity-50 text-white transition-colors">Prev</button>
           <span className="text-xs text-gray-400">Question {currentQIdx + 1} of {questionsCount}</span>
           <button onClick={onNext} disabled={currentQIdx === questionsCount - 1} className="text-xs bg-[#27272a] hover:bg-[#3f3f46] px-3 py-1.5 rounded disabled:opacity-50 text-white transition-colors">Next</button>
        </div>

        <div>
          <h2 className="text-2xl font-bold mb-4">{q.title}</h2>
          <p className="text-sm text-gray-400 leading-relaxed whitespace-pre-wrap">
            {q.statement}
          </p>
        </div>

        <div className="space-y-4">
          {q.examples.map((ex, i) => (
            <div key={i} className="bg-[#18181b] border border-border rounded-xl p-4">
              <p className="text-sm font-semibold mb-2 text-gray-300">Example {i + 1}:</p>
              <div className="font-mono text-sm text-gray-400 space-y-1">
                <p className="whitespace-pre-wrap"><span className="text-gray-500">Input:</span> {ex.input}</p>
                <p className="whitespace-pre-wrap"><span className="text-gray-500">Output:</span> {ex.output}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-gray-300">Constraints:</h3>
          <ul className="list-disc list-inside text-sm text-gray-400 space-y-1 whitespace-pre-wrap">
            {q.constraints.split('\n').map((c, i) => <li key={i}><code>{c}</code></li>)}
          </ul>
        </div>
      </div>
    </div>
  );
};
