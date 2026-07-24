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

interface MockTest {
  title: string;
  time: number;
  questions: Question[];
}

interface TestCaseResult {
  passed: boolean;
  is_hidden: boolean;
  input?: string;
  expected_output?: string;
  actual_output?: string;
  error?: string;
}

interface RunResponse {
  passed: boolean;
  message: string;
  results: TestCaseResult[];
}

function App() {
  const [testData, setTestData] = useState<MockTest | null>(null);
  const [currentQIdx, setCurrentQIdx] = useState(0);
  const [language, setLanguage] = useState('cpp');
  const [code, setCode] = useState('');
  const [testResults, setTestResults] = useState<RunResponse | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  useEffect(() => {
    // Fetch questions from backend
    fetch('http://localhost:8080/api/questions')
      .then(res => res.json())
      .then((data: MockTest) => {
        setTestData(data);
        setTimeLeft(data.time);
        if (data.questions.length > 0) {
          loadQuestion(data.questions[0]);
        }
      })
      .catch(err => {
        console.error("Failed to fetch questions. Ensure backend is running.", err);
      });
  }, []);

  useEffect(() => {
    if (timeLeft === null || timeLeft <= 0) return;
    const timer = setInterval(() => {
      setTimeLeft(prev => (prev && prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [timeLeft]);

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

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
    if (testData && currentQIdx < testData.questions.length - 1) {
      setCurrentQIdx(currentQIdx + 1);
      loadQuestion(testData.questions[currentQIdx + 1]);
    }
  };

  const handlePrev = () => {
    if (testData && currentQIdx > 0) {
      setCurrentQIdx(currentQIdx - 1);
      loadQuestion(testData.questions[currentQIdx - 1]);
    }
  };

  const handleRunTests = async () => {
    if (!testData) return;
    const q = testData.questions[currentQIdx];
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
      setTestResults({ passed: false, message: "Error connecting to execution server.", results: [] });
    }
    setIsRunning(false);
  };

  if (!testData || testData.questions.length === 0) {
    return <div className="flex h-screen w-full bg-[#09090b] text-white items-center justify-center">Loading assessment... Ensure Go backend is running.</div>;
  }

  const q = testData.questions[currentQIdx];
  const questions = testData.questions;

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
            <h1 className="font-semibold tracking-tight truncate max-w-[200px]" title={testData.title}>
              {testData.title}
            </h1>
          </div>
          <div className={`flex items-center gap-2 font-mono text-sm px-3 py-1.5 rounded-full border ${timeLeft !== null && timeLeft < 300 ? 'text-red-400 bg-red-400/10 border-red-400/20' : 'text-gray-300 bg-gray-800 border-gray-700'}`}>
            <Clock size={14} />
            <span>{timeLeft !== null ? formatTime(timeLeft) : '00:00:00'}</span>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="flex justify-between items-center">
             <button onClick={handlePrev} disabled={currentQIdx === 0} className="text-xs bg-[#27272a] hover:bg-[#3f3f46] px-3 py-1.5 rounded disabled:opacity-50 text-white transition-colors">Prev</button>
             <span className="text-xs text-gray-400">Question {currentQIdx + 1} of {questions.length}</span>
             <button onClick={handleNext} disabled={currentQIdx === questions.length - 1} className="text-xs bg-[#27272a] hover:bg-[#3f3f46] px-3 py-1.5 rounded disabled:opacity-50 text-white transition-colors">Next</button>
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
        <div className="h-72 border-t border-border bg-[#0c0c0e] flex flex-col">
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
      </div>
    </div>
  );
}

export default App;
