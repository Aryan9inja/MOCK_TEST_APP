import React from 'react';
import { CheckCircle2, XCircle } from 'lucide-react';
import type { RunResponse } from '@/types/test';

interface TerminalOutputProps {
  testResults: RunResponse | null;
  isRunning: boolean;
  isReview: boolean;
}

export const TerminalOutput: React.FC<TerminalOutputProps> = ({ testResults, isRunning, isReview }) => {
  return (
    <div className="h-full border-t border-border bg-[#0c0c0e] flex flex-col">
      <div className="flex items-center px-4 min-h-[40px] border-b border-border">
        <span className="text-sm font-medium text-gray-300 flex items-center gap-2">
          Test Results
        </span>
      </div>
      <div className="flex-1 p-4 overflow-y-auto">
        {!testResults && !isRunning && (
          <div className="text-sm text-gray-500">
            {isReview ? 'Reviewing previous submission.' : 'Run tests to see results here.'}
          </div>
        )}
        {isRunning && (
          <div className="text-sm text-yellow-500">Executing code...</div>
        )}
        {testResults && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 text-gray-300 bg-[#27272a] border border-border p-3 rounded-lg w-fit">
              <span className="text-sm font-medium">
                Test Cases Passed: {testResults.results.filter(r => r.passed).length} / {testResults.results.length}
              </span>
            </div>
            
            {testResults.message && (
               <div className="font-mono text-sm text-red-400 whitespace-pre-wrap bg-red-400/10 p-3 rounded-lg border border-red-400/20">
                 <p>{testResults.message}</p>
               </div>
            )}

            <div className="grid grid-cols-1 gap-3">
              {testResults.results.map((res, i) => (
                <div key={i} className={`flex flex-col gap-2 p-3 rounded-xl border ${res.passed ? 'bg-green-400/5 border-green-400/10' : 'bg-red-400/5 border-red-400/10'}`}>
                  <div className="flex items-center gap-2">
                    {res.passed ? <CheckCircle2 size={16} className="text-green-400" /> : <XCircle size={16} className="text-red-400" />}
                    <span className={`text-sm font-semibold ${res.passed ? 'text-green-400' : 'text-red-400'}`}>
                      Test Case {i + 1} {res.is_hidden ? '(Hidden)' : ''}
                    </span>
                  </div>
                  
                  {!res.is_hidden && (
                    <div className="mt-2 space-y-2 text-xs font-mono text-gray-400">
                      <div><span className="text-gray-500">Input:</span> <span className="text-gray-300">{res.input}</span></div>
                      <div><span className="text-gray-500">Expected:</span> <span className="text-gray-300">{res.expected_output}</span></div>
                      <div className={res.passed ? "text-gray-300" : "text-red-400"}><span className="text-gray-500">Got:</span> {res.actual_output}</div>
                      {res.error && <div className="text-red-400 mt-1"><span className="text-gray-500">Error:</span> {res.error}</div>}
                    </div>
                  )}

                  {res.is_hidden && !res.passed && (
                     <div className="mt-2 text-xs text-red-400 font-mono">
                       This hidden test case failed.
                     </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
