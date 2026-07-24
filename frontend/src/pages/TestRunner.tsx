import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Play, Send, Clock, CheckCircle2, XCircle, Code2, ArrowLeft } from 'lucide-react';
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
  id: string;
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

export default function TestRunner() {
  const { testId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const isReview = searchParams.get('review') === 'true';

  const [testData, setTestData] = useState<MockTest | null>(null);
  const [currentQIdx, setCurrentQIdx] = useState(0);
  const [language, setLanguage] = useState('cpp');
  const [code, setCode] = useState('');
  const [testResults, setTestResults] = useState<RunResponse | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  
  // Track metrics and answers across questions
  const [solvedQuestions, setSolvedQuestions] = useState<Set<string>>(new Set());
  const [testCasesPassed, setTestCasesPassed] = useState(0);
  const [answers, setAnswers] = useState<Record<string, { code: string; language: string }>>({});

  useEffect(() => {
    fetch(`http://localhost:8080/api/tests/${testId}`)
      .then(res => {
        if (!res.ok) throw new Error("Test not found");
        return res.json();
      })
      .then(async (data: MockTest) => {
        setTestData(data);
        setTimeLeft(data.time);
        
        let historyAnswers: Record<string, { code: string; language: string }> = {};
        if (isReview) {
            try {
                const hRes = await fetch(`http://localhost:8080/api/tests/${testId}/history`);
                const hData = await hRes.json();
                if (hData && hData.length > 0) {
                    const latest = hData[0]; // Ordered by created_at DESC
                    if (latest.answers) {
                        latest.answers.forEach((ans: any) => {
                            historyAnswers[ans.question_id] = { code: ans.code, language: ans.language };
                        });
                        setAnswers(historyAnswers);
                    }
                }
            } catch (err) {
                console.error("Failed to load history", err);
            }
        }
        
        if (data.questions && data.questions.length > 0) {
          loadQuestion(data.questions[0], historyAnswers);
        }
      })
      .catch(err => {
        console.error("Failed to fetch test.", err);
      });
  }, [testId, isReview]);

  // Handle timer
  useEffect(() => {
    if (timeLeft === null || timeLeft <= 0 || isReview) return;
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev && prev > 1) {
            return prev - 1;
        } else {
            // Auto submit when time runs out
            clearInterval(timer);
            handleSubmitTest();
            return 0;
        }
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [timeLeft, isReview]);

  // Handle browser refresh and tab close
  useEffect(() => {
    if (isReview) return;
    
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = 'Are you sure you want to leave? Your progress will be submitted.';
    };

    const handleUnload = () => {
      if (!testData) return;
      
      let totalTC = 0;
      testData.questions.forEach(q => {
          totalTC += (q.test_cases?.length || 0) + (q.hidden_test_cases?.length || 0);
      });
      const timeTaken = testData.time - (timeLeft || 0);
      
      const payloadAnswers = Object.entries(answers).map(([qId, data]) => ({
          question_id: qId,
          code: data.code,
          language: data.language
      }));

      const payload = {
          questions_solved: solvedQuestions.size,
          total_questions: testData.questions.length,
          time_taken_seconds: timeTaken,
          test_cases_passed: testCasesPassed,
          total_test_cases: totalTC,
          answers: payloadAnswers
      };
      
      const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
      navigator.sendBeacon(`http://localhost:8080/api/tests/${testId}/history`, blob);
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('unload', handleUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('unload', handleUnload);
    };
  }, [testData, solvedQuestions, testCasesPassed, timeLeft, testId, isReview, answers]);

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const loadQuestion = (q: Question, historyMap: Record<string, { code: string; language: string }> = answers) => {
    const saved = historyMap[q.id];
    if (saved) {
        setLanguage(saved.language);
        setCode(saved.code);
    } else {
        if (q.q_type === 'DSA') {
          setLanguage('cpp');
        } else if (q.q_type === 'Python') {
          setLanguage('python');
        } else if (q.q_type === 'SQL') {
          setLanguage('sql');
        }
        setCode(q.starter_code || '');
    }
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
  
  const handleCodeChange = (value: string | undefined) => {
      const newCode = value || '';
      setCode(newCode);
      if (testData && testData.questions[currentQIdx]) {
          const qId = testData.questions[currentQIdx].id;
          setAnswers(prev => ({
              ...prev,
              [qId]: { code: newCode, language }
          }));
      }
  };

  const handleRunTests = async () => {
    if (!testData) return;
    const q = testData.questions[currentQIdx];
    if (!q) return;

    setIsRunning(true);
    setTestResults(null);
    try {
      const res = await fetch(`http://localhost:8080/api/tests/${testId}/run`, {
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

      if (data.passed) {
        setSolvedQuestions(prev => new Set(prev).add(q.id));
      }
      
      const passedCount = data.results ? data.results.filter((r: any) => r.passed).length : 0;
      setTestCasesPassed(prev => prev + passedCount);

    } catch (err) {
      setTestResults({ passed: false, message: "Error connecting to execution server.", results: [] });
    }
    setIsRunning(false);
  };

  const handleSubmitTest = async () => {
    if (!testData) return;
    
    // Calculate total possible test cases roughly (each test has TestCases + HiddenTestCases)
    let totalTC = 0;
    testData.questions.forEach(q => {
        totalTC += (q.test_cases?.length || 0) + (q.hidden_test_cases?.length || 0);
    });

    const timeTaken = testData.time - (timeLeft || 0);

    const payloadAnswers = Object.entries(answers).map(([qId, data]) => ({
        question_id: qId,
        code: data.code,
        language: data.language
    }));

    const payload = {
        questions_solved: solvedQuestions.size,
        total_questions: testData.questions.length,
        time_taken_seconds: timeTaken,
        test_cases_passed: testCasesPassed,
        total_test_cases: totalTC,
        answers: payloadAnswers
    };

    try {
        await fetch(`http://localhost:8080/api/tests/${testId}/history`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        alert("Test Submitted Successfully!");
        navigate('/');
    } catch (err) {
        alert("Failed to submit test history.");
    }
  };

  if (!testData || testData.questions.length === 0) {
    return <div className="flex h-screen w-full bg-[#09090b] text-white items-center justify-center">Loading assessment...</div>;
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
            <button onClick={() => {
                if (isReview) {
                    navigate('/');
                } else if (window.confirm("Do you want to submit the test and return home? Click OK to submit or Cancel to continue.")) {
                    handleSubmitTest();
                }
            }} className="p-1 hover:bg-[#27272a] rounded-lg transition-colors mr-1">
                <ArrowLeft size={18} className="text-gray-400" />
            </button>
            <div className="bg-primary/20 p-2 rounded-lg text-primary">
              <Code2 size={20} />
            </div>
            <h1 className="font-semibold tracking-tight truncate max-w-[180px]" title={testData.title}>
              {testData.title}
            </h1>
          </div>
          <div className={`flex items-center gap-2 font-mono text-sm px-3 py-1.5 rounded-full border ${isReview ? 'text-blue-400 bg-blue-400/10 border-blue-400/20' : (timeLeft !== null && timeLeft < 300 ? 'text-red-400 bg-red-400/10 border-red-400/20' : 'text-gray-300 bg-gray-800 border-gray-700')}`}>
            <Clock size={14} />
            <span>{isReview ? 'Review Mode' : (timeLeft !== null ? formatTime(timeLeft) : '00:00:00')}</span>
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
            {!isReview && (
              <>
                <button 
                  onClick={handleRunTests}
                  disabled={isRunning}
                  className="flex items-center gap-2 bg-[#27272a] hover:bg-[#3f3f46] disabled:opacity-50 text-white px-4 py-1.5 rounded-lg text-sm font-medium transition-colors border border-border">
                  <Play size={16} className="text-green-400" />
                  {isRunning ? 'Running...' : 'Run Tests'}
                </button>
                <button onClick={handleSubmitTest} className="flex items-center gap-2 bg-primary hover:bg-blue-600 text-white px-4 py-1.5 rounded-lg text-sm font-medium transition-colors shadow-[0_0_15px_rgba(59,130,246,0.3)]">
                  <Send size={16} />
                  Submit Test
                </button>
              </>
            )}
          </div>
        </div>

        {/* Editor */}
        <div className="flex-1 bg-[#1e1e1e] relative">
          <Editor
            height="100%"
            language={language}
            theme="vs-dark"
            value={code}
            onChange={handleCodeChange}
            options={{
              readOnly: isReview,
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
      </div>
    </div>
  );
}
