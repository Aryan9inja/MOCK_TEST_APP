import React, { useState, useEffect } from 'react';
import { Play, Send, Clock, ChevronRight, CheckCircle2, XCircle, Code2, Database } from 'lucide-react';
import Editor from '@monaco-editor/react';

interface TestCase {
  input: string;
  expected_output: string;
}

interface Question {
  id: string;
  title: string;
  difficulty: string;
  statement: string;
  constraints: string;
  examples: { input: string; output: string }[];
  starter_code: string;
  func_signature: string | null;
  tables_schema: string | null;
  q_type: string;
  test_cases: TestCase[];
  hidden_test_cases: TestCase[];
}

function App() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQIdx, setCurrentQIdx] = useState(0);
  const [language, setLanguage] = useState('cpp');
  const [code, setCode] = useState('');
  const [testResults, setTestResults] = useState<{ passed: boolean, message: string } | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  useEffect(() => {
    // Fetch questions from backend
    fetch('http://localhost:8080/api/questions')
      .then(res => res.json())
      .then((data: Question[]) => {
        setQuestions(data);
        if (data.length > 0) {
          loadQuestion(data[0]);
        }
      })
      .catch(err => {
        console.error("Failed to fetch questions. Ensure backend is running.", err);
      });
  }, []);

  const loadQuestion = (q: Question) => {
    if (q.q_type === 'DSA') {
      setLanguage('cpp');
    } else if (q.q_type === 'Python') {
      setLanguage('python');
    } else if (q.q_type === 'SQL') {
      setLanguage('sql');
    }
    setCode(q.starter_code || '');
    setTestResults(null);
  };

  const handleNext = () => {
    if (currentQIdx < questions.length - 1) {
      setCurrentQIdx(currentQIdx + 1);
      loadQuestion(questions[currentQIdx + 1]);
    }
  };

  const handlePrev = () => {
    if (currentQIdx > 0) {
      setCurrentQIdx(currentQIdx - 1);
      loadQuestion(questions[currentQIdx - 1]);
    }
  };

  const handleRunTests = async () => {
    const q = questions[currentQIdx];
    if (!q) return;

    setIsRunning(true);
    setTestResults(null);
    try {
      const res = await fetch('http://localhost:8080/api/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question_id: q.id,
          language,
          code
        })
      });
      const data = await res.json();
      setTestResults(data);
    } catch (err) {
      setTestResults({ passed: false, message: "Error connecting to execution server." });
    }
    setIsRunning(false);
  };

  if (questions.length === 0) {
    return <div className="flex h-screen w-full bg-[#09090b] text-white items-center justify-center">Loading questions... Ensure Go backend is running.</div>;
  }

  const q = questions[currentQIdx];

  // Determine allowed languages based on question type
  let allowedLanguages = ['cpp'];
  if (q.q_type === 'Python') allowedLanguages = ['python'];
  if (q.q_type === 'SQL') allowedLanguages = ['sql'];

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
          <div className="flex justify-between items-center">
             <button onClick={handlePrev} disabled={currentQIdx === 0} className="text-xs bg-[#27272a] px-2 py-1 rounded disabled:opacity-50 text-white">Prev</button>
             <span className="text-xs text-gray-400">Question {currentQIdx + 1} of {questions.length}</span>
             <button onClick={handleNext} disabled={currentQIdx === questions.length - 1} className="text-xs bg-[#27272a] px-2 py-1 rounded disabled:opacity-50 text-white">Next</button>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-2xl font-bold">{q.title}</h2>
              <span className={`text-xs font-semibold px-2 py-1 rounded-full border ${q.difficulty === 'Easy' ? 'bg-green-400/10 text-green-400 border-green-400/20' : 'bg-yellow-400/10 text-yellow-400 border-yellow-400/20'}`}>{q.difficulty}</span>
            </div>
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

      {/* Main Content - Editor & Terminal */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Toolbar */}
        <div className="h-14 border-b border-border bg-[#0c0c0e] flex items-center justify-between px-4">
          <div className="flex gap-2 bg-[#18181b] p-1 rounded-lg border border-border">
            {allowedLanguages.map(lang => (
              <button
                key={lang}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all bg-[#27272a] text-white shadow-sm cursor-default`}
              >
                {lang === 'cpp' ? 'C++' : lang === 'python' ? 'Python' : 'SQL'}
              </button>
            ))}
          </div>

          <div className="flex gap-3">
            <button 
              onClick={handleRunTests}
              disabled={isRunning}
              className="flex items-center gap-2 bg-[#27272a] hover:bg-[#3f3f46] disabled:opacity-50 text-white px-4 py-1.5 rounded-lg text-sm font-medium transition-colors border border-border">
              <Play size={16} className="text-green-400" />
              {isRunning ? 'Running...' : 'Run Tests'}
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
            {!testResults && !isRunning && (
              <div className="text-sm text-gray-500">Run tests to see results here.</div>
            )}
            {isRunning && (
              <div className="text-sm text-yellow-500">Executing code...</div>
            )}
            {testResults && (
              <div className="space-y-4">
                <div className={`flex items-center gap-3 ${testResults.passed ? 'text-green-400 bg-green-400/10 border-green-400/20' : 'text-red-400 bg-red-400/10 border-red-400/20'} border p-3 rounded-lg w-fit`}>
                  {testResults.passed ? <CheckCircle2 size={18} /> : <XCircle size={18} />}
                  <span className="text-sm font-medium">{testResults.passed ? 'All test cases passed!' : 'Tests failed.'}</span>
                </div>
                <div className="font-mono text-sm text-gray-400 whitespace-pre-wrap">
                  <p>{testResults.message}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
