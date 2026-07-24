import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Play, Send } from 'lucide-react';
import Editor from '@monaco-editor/react';
import type { MockTest, Question, RunResponse } from '../types/test';
import { Sidebar } from '../components/Sidebar';
import { TerminalOutput } from '../components/TerminalOutput';

export default function TestRunner() {
  const { testId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const isReview = searchParams.get('review') === 'true';
  const historyId = searchParams.get('historyId');

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
  const [isFetchingHistory, setIsFetchingHistory] = useState(isReview);

  useEffect(() => {
    fetch(`http://localhost:8080/api/tests/${testId}`)
      .then(res => res.json())
      .then(async (json: any) => {
        if (!json.success) throw new Error(json.error);
        const data = json.data as MockTest;
        setTestData(data);
        setTimeLeft(data.time);
        
        let historyAnswers: Record<string, { code: string; language: string }> = {};
        if (isReview) {
            try {
                const hRes = await fetch(`http://localhost:8080/api/tests/${testId}/history`);
                const hJson = await hRes.json();
                if (hJson.success && hJson.data && hJson.data.length > 0) {
                    const hData = hJson.data;
                    let targetHistory = hData[0]; // Ordered by created_at DESC
                    if (historyId) {
                        const found = hData.find((h: any) => h.id === historyId);
                        if (found) targetHistory = found;
                    }
                    if (targetHistory.answers) {
                        targetHistory.answers.forEach((ans: any) => {
                            historyAnswers[ans.question_id] = { code: ans.code, language: ans.language };
                        });
                        setAnswers(historyAnswers);
                    }
                }
            } catch (err) {
                console.error("Failed to load history", err);
            } finally {
                setIsFetchingHistory(false);
            }
        }
        
        if (data.questions && data.questions.length > 0) {
            // Initial load is now handled by the currentQIdx useEffect
        }
      })
      .catch(err => {
        console.error("Failed to fetch test.", err);
        setIsFetchingHistory(false);
      });
  }, [testId, isReview]);

  // Reactive question loader
  useEffect(() => {
    if (testData && testData.questions.length > 0 && !isFetchingHistory) {
        loadQuestion(testData.questions[currentQIdx], answers);
    }
  }, [currentQIdx, testData, isFetchingHistory]);

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

  const loadQuestion = (q: Question, historyMap: Record<string, { code: string; language: string }> = answers) => {
    const saved = historyMap[q.id];
    if (saved) {
        setLanguage(saved.language);
        setCode(saved.code);
    } else {
        const qType = (q.q_type || '').toLowerCase();
        if (qType === 'dsa') {
          setLanguage('cpp');
        } else if (qType === 'python') {
          setLanguage('python');
        } else if (qType === 'sql') {
          setLanguage('sql');
        } else {
          setLanguage('cpp');
        }
        setCode(q.starter_code || '');
    }
    setTestResults(null);
  };

  const handleNext = () => {
    setCurrentQIdx(prev => {
        if (testData && prev < testData.questions.length - 1) {
            return prev + 1;
        }
        return prev;
    });
  };

  const handlePrev = () => {
    setCurrentQIdx(prev => {
        if (prev > 0) {
            return prev - 1;
        }
        return prev;
    });
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
      const json = await res.json();
      if (json.success) {
          setTestResults(json.data);
          
          if (json.data.passed) {
            setSolvedQuestions(prev => new Set(prev).add(q.id));
          }
          
          const passedCount = json.data.results ? json.data.results.filter((r: any) => r.passed).length : 0;
          setTestCasesPassed(prev => prev + passedCount);
      } else {
          setTestResults({ passed: false, message: json.error || 'Execution failed', results: [] });
      }
    } catch (err: any) {
      setTestResults({ passed: false, message: err.message || 'Error connecting to execution server.', results: [] });
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
        const res = await fetch(`http://localhost:8080/api/tests/${testId}/history`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const json = await res.json();
        if (!json.success) {
            throw new Error(json.error || 'Submission failed');
        }
        alert("Test Submitted Successfully!");
        navigate('/');
    } catch (err) {
        alert("Failed to submit test history.");
    }
  };

  if (!testData || testData.questions.length === 0 || isFetchingHistory) {
    return <div className="flex h-screen w-full bg-[#09090b] text-white items-center justify-center">Loading assessment...</div>;
  }

  const q = testData.questions[currentQIdx];
  const questions = testData.questions;

  let allowedLanguages = ['cpp'];
  const qTypeLow = (q.q_type || '').toLowerCase();
  if (qTypeLow === 'python') allowedLanguages = ['python'];
  if (qTypeLow === 'sql') allowedLanguages = ['sql'];

  return (
    <div className="flex h-screen w-full bg-[#09090b] text-foreground font-sans overflow-hidden">
      <Sidebar 
        title={testData.title}
        isReview={isReview}
        timeLeft={timeLeft}
        q={q}
        questionsCount={questions.length}
        currentQIdx={currentQIdx}
        onNavigateHome={() => {
            if (isReview) {
                navigate('/');
            } else if (window.confirm("Do you want to submit the test and return home? Click OK to submit or Cancel to continue.")) {
                handleSubmitTest();
            }
        }}
        onNext={handleNext}
        onPrev={handlePrev}
      />

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

        <TerminalOutput 
          testResults={testResults}
          isRunning={isRunning}
          isReview={isReview}
        />
      </div>
    </div>
  );
}
