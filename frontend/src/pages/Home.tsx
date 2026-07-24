import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Code2, Clock, CalendarDays, History, ArrowRight } from 'lucide-react';

interface TestSummary {
    id: string;
    title: string;
    time: number;
    created_at: string;
    last_attempt_date: string | null;
}

export default function Home() {
    const navigate = useNavigate();
    const [tests, setTests] = useState<TestSummary[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [jsonPayload, setJsonPayload] = useState('');
    const [error, setError] = useState('');
    const [historyModalTestId, setHistoryModalTestId] = useState<string | null>(null);
    const [testHistories, setTestHistories] = useState<any[]>([]);

    useEffect(() => {
        fetchTests();
    }, []);

    const fetchTests = () => {
        fetch('http://localhost:8080/api/tests')
            .then(res => res.json())
            .then(data => setTests(data || []))
            .catch(err => console.error(err));
    };

    const openHistoryModal = async (testId: string) => {
        setHistoryModalTestId(testId);
        try {
            const res = await fetch(`http://localhost:8080/api/tests/${testId}/history`);
            const data = await res.json();
            setTestHistories(data || []);
        } catch (e) {
            console.error(e);
        }
    };

    const handleAddTest = async () => {
        setError('');
        try {
            const res = await fetch('http://localhost:8080/api/tests', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: jsonPayload
            });
            if (!res.ok) {
                const text = await res.text();
                throw new Error(text);
            }
            setIsModalOpen(false);
            setJsonPayload('');
            fetchTests();
        } catch (err: any) {
            setError(err.message || 'Invalid JSON format');
        }
    };

    const formatDuration = (seconds: number) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        if (h > 0) return `${h}h ${m}m`;
        return `${m}m`;
    };

    return (
        <div className="min-h-screen bg-[#09090b] text-foreground p-8">
            <div className="max-w-6xl mx-auto">
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-white tracking-tight">Mock Assessments</h1>
                        <p className="text-gray-400 mt-2">Practice tests to hone your engineering skills.</p>
                    </div>
                    <button 
                        onClick={() => setIsModalOpen(true)}
                        className="flex items-center gap-2 bg-primary hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-[0_0_15px_rgba(59,130,246,0.3)]">
                        <Plus size={18} />
                        Create Test
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {tests.map(t => (
                        <div key={t.id} className="bg-[#0c0c0e] border border-border hover:border-gray-700 transition-colors rounded-xl p-6 flex flex-col">
                            <div className="bg-primary/10 w-12 h-12 rounded-xl flex items-center justify-center text-primary mb-4">
                                <Code2 size={24} />
                            </div>
                            <h2 className="text-xl font-bold text-white mb-2 line-clamp-1">{t.title || 'Untitled Assessment'}</h2>
                            <div className="flex items-center gap-4 text-sm text-gray-400 mb-6">
                                <div className="flex items-center gap-1">
                                    <Clock size={14} />
                                    <span>{formatDuration(t.time)}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                    <CalendarDays size={14} />
                                    <span>{new Date(t.created_at).toLocaleDateString()}</span>
                                </div>
                            </div>
                            <div className="mt-auto flex gap-3">
                                {t.last_attempt_date && (new Date().getTime() - new Date(t.last_attempt_date).getTime() < 5 * 24 * 60 * 60 * 1000) ? (
                                    <button 
                                        onClick={() => navigate(`/test/${t.id}?review=true`)}
                                        className="flex-1 bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 hover:bg-yellow-500/20 px-4 py-2 rounded-lg text-sm font-semibold transition-colors">
                                        Review Test
                                    </button>
                                ) : (
                                    <button 
                                        onClick={() => navigate(`/test/${t.id}`)}
                                        className="flex-1 bg-white text-black hover:bg-gray-200 px-4 py-2 rounded-lg text-sm font-semibold transition-colors">
                                        Take Test
                                    </button>
                                )}
                                <button 
                                    onClick={() => openHistoryModal(t.id)}
                                    className="p-2 bg-[#27272a] hover:bg-[#3f3f46] text-white rounded-lg transition-colors border border-border" title="View History">
                                    <History size={18} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>

                {tests.length === 0 && (
                    <div className="text-center text-gray-500 mt-20">
                        No mock tests available. Create one to get started!
                    </div>
                )}
            </div>

            {/* Admin Modal for Adding JSON */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-[#0c0c0e] border border-border rounded-xl w-full max-w-2xl flex flex-col max-h-[90vh]">
                        <div className="p-6 border-b border-border flex justify-between items-center">
                            <h2 className="text-xl font-bold text-white">Import Mock Test</h2>
                            <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-white">✕</button>
                        </div>
                        <div className="p-6 flex-1 overflow-y-auto">
                            <p className="text-sm text-gray-400 mb-4">Paste the raw JSON format for the assessment payload here.</p>
                            <textarea 
                                value={jsonPayload}
                                onChange={e => setJsonPayload(e.target.value)}
                                className="w-full h-64 bg-[#18181b] border border-border rounded-lg p-4 font-mono text-sm text-gray-300 focus:outline-none focus:border-primary resize-none"
                                placeholder='{"title": "Sample", "time": 3600, "questions": []}'
                            />
                            {error && <div className="mt-4 p-3 bg-red-400/10 border border-red-400/20 rounded-lg text-red-400 text-sm whitespace-pre-wrap">{error}</div>}
                        </div>
                        <div className="p-6 border-t border-border flex justify-end gap-3">
                            <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#27272a] transition-colors">Cancel</button>
                            <button onClick={handleAddTest} className="px-4 py-2 bg-primary hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition-colors shadow-[0_0_15px_rgba(59,130,246,0.3)]">Save Assessment</button>
                        </div>
                    </div>
                </div>
            )}

            {/* History Modal */}
            {historyModalTestId && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-[#0c0c0e] border border-border rounded-xl w-full max-w-lg flex flex-col max-h-[80vh]">
                        <div className="p-6 border-b border-border flex justify-between items-center">
                            <h2 className="text-xl font-bold text-white">Test History</h2>
                            <button onClick={() => setHistoryModalTestId(null)} className="text-gray-400 hover:text-white">✕</button>
                        </div>
                        <div className="p-6 overflow-y-auto flex-1 space-y-3">
                            {testHistories.length === 0 ? (
                                <p className="text-gray-400 text-center py-4">No historical attempts found for this test.</p>
                            ) : (
                                testHistories.map(h => (
                                    <div key={h.id} 
                                         onClick={() => navigate(`/test/${historyModalTestId}?review=true&historyId=${h.id}`)}
                                         className="bg-[#18181b] border border-border p-4 rounded-xl cursor-pointer hover:border-primary/50 transition-colors flex justify-between items-center group">
                                        <div>
                                            <div className="font-semibold text-white mb-1">{new Date(h.created_at).toLocaleString()}</div>
                                            <div className="text-sm text-gray-400">Questions Solved: <span className="text-gray-200">{h.questions_solved} / {h.total_questions}</span></div>
                                        </div>
                                        <div className="p-2 bg-[#27272a] rounded-lg group-hover:bg-primary/20 group-hover:text-primary transition-colors">
                                            <ArrowRight size={18} />
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
