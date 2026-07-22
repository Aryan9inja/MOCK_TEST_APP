import React, { useState } from 'react';
import { Play, Send, Clock, ChevronRight, CheckCircle2, Code2, Database } from 'lucide-react';
import Editor from '@monaco-editor/react';

function App() {
  const [language, setLanguage] = useState('cpp');
  const [code, setCode] = useState('// Write your C++ code here\n\nint main() {\n  return 0;\n}');

  const handleLanguageChange = (lang: string) => {
    setLanguage(lang);
    if (lang === 'cpp') setCode('// Write your C++ code here\n\nint main() {\n  return 0;\n}');
    if (lang === 'python') setCode('# Write your Python code here\n\ndef solve():\n    pass');
    if (lang === 'sql') setCode('-- Write your SQL query here\n\nSELECT * FROM table;');
  };

  return (
    <div className="flex h-screen w-full bg-[#09090b] text-foreground font-sans overflow-hidden">
      {/* Sidebar - Question Info */}
      <div className="w-1/3 flex flex-col border-r border-border bg-[#0c0c0e]">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-primary/20 p-2 rounded-lg text-primary">
              <Code2 size={20} />
            </div>
            <h1 className="font-semibold tracking-tight">Practice OA</h1>
          </div>
          <div className="flex items-center gap-2 text-red-400 font-mono text-sm bg-red-400/10 px-3 py-1.5 rounded-full border border-red-400/20">
            <Clock size={14} />
            <span>01:30:00</span>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-2xl font-bold">1. Two Sum</h2>
              <span className="text-green-400 text-xs font-semibold px-2 py-1 bg-green-400/10 rounded-full border border-green-400/20">Easy</span>
            </div>
            <p className="text-sm text-gray-400 leading-relaxed">
              Given an array of integers <code>nums</code> and an integer <code>target</code>, return indices of the two numbers such that they add up to <code>target</code>.
            </p>
          </div>

          <div className="space-y-4">
            <div className="bg-[#18181b] border border-border rounded-xl p-4">
              <p className="text-sm font-semibold mb-2 text-gray-300">Example 1:</p>
              <div className="font-mono text-sm text-gray-400 space-y-1">
                <p><span className="text-gray-500">Input:</span> nums = [2,7,11,15], target = 9</p>
                <p><span className="text-gray-500">Output:</span> [0,1]</p>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-gray-300">Constraints:</h3>
            <ul className="list-disc list-inside text-sm text-gray-400 space-y-1">
              <li><code>2 {"<="} nums.length {"<="} 10^4</code></li>
              <li><code>-10^9 {"<="} nums[i] {"<="} 10^9</code></li>
            </ul>
          </div>
        </div>
      </div>

      {/* Main Content - Editor & Terminal */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Toolbar */}
        <div className="h-14 border-b border-border bg-[#0c0c0e] flex items-center justify-between px-4">
          <div className="flex gap-2 bg-[#18181b] p-1 rounded-lg border border-border">
            {['cpp', 'python', 'sql'].map(lang => (
              <button
                key={lang}
                onClick={() => handleLanguageChange(lang)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${language === lang ? 'bg-[#27272a] text-white shadow-sm' : 'text-gray-400 hover:text-white hover:bg-[#27272a]/50'}`}
              >
                {lang === 'cpp' ? 'C++' : lang === 'python' ? 'Python' : 'SQL'}
              </button>
            ))}
          </div>

          <div className="flex gap-3">
            <button className="flex items-center gap-2 bg-[#27272a] hover:bg-[#3f3f46] text-white px-4 py-1.5 rounded-lg text-sm font-medium transition-colors border border-border">
              <Play size={16} className="text-green-400" />
              Run Tests
            </button>
            <button className="flex items-center gap-2 bg-primary hover:bg-blue-600 text-white px-4 py-1.5 rounded-lg text-sm font-medium transition-colors shadow-[0_0_15px_rgba(59,130,246,0.3)]">
              <Send size={16} />
              Submit
            </button>
          </div>
        </div>

        {/* Editor */}
        <div className="flex-1 bg-[#1e1e1e] relative">
          <Editor
            height="100%"
            language={language}
            theme="vs-dark"
            value={code}
            onChange={(value) => setCode(value || '')}
            options={{
              minimap: { enabled: false },
              fontSize: 14,
              fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
              padding: { top: 16 },
              scrollBeyondLastLine: false,
              smoothScrolling: true,
            }}
          />
        </div>

        {/* Terminal/Output */}
        <div className="h-64 border-t border-border bg-[#0c0c0e] flex flex-col">
          <div className="flex items-center px-4 h-10 border-b border-border">
            <span className="text-sm font-medium text-gray-300 flex items-center gap-2">
              Test Results
            </span>
          </div>
          <div className="flex-1 p-4 overflow-y-auto">
            <div className="flex items-center gap-3 text-green-400 bg-green-400/10 border border-green-400/20 p-3 rounded-lg w-fit mb-4">
              <CheckCircle2 size={18} />
              <span className="text-sm font-medium">All test cases passed!</span>
            </div>
            <div className="space-y-1 font-mono text-sm text-gray-400">
              <p>Execution Time: 4ms</p>
              <p>Memory: 12.4 MB</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
