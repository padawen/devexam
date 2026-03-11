"use client";

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import ReactMarkdown from 'react-markdown';

interface Question {
    index: number;
    questionText: string;
    answerText: string;
    aiFeedback: string;
}

function parseQuestions(dotmdContent: string, dotmdFilled: string, evalMd: string): Question[] {
    // Strip section headers from comprehensive tests before parsing
    const cleanContent = dotmdContent.replace(/^##\s+═+.*═+\s*$/gm, '');
    const cleanFilled = dotmdFilled.replace(/^##\s+═+.*═+\s*$/gm, '');

    const qBlocks = cleanContent.split(/\n---\n/).filter(b => /^##\s+\d+\.\s+KÉRDÉS/m.test(b));
    const aBlocks = cleanFilled.split(/\n---\n/).filter(b => /^##\s+\d+\.\s+KÉRDÉS/m.test(b));

    // Split eval by per-question sections (## N. Kérdés Értékelése)
    // First strip any section headers (═══ ... ═══) that appear in comprehensive evals
    const cleanedEvalMd = evalMd.replace(/^##\s+═+.*═+\s*$/gm, '');
    const evalBlocks = cleanedEvalMd.split(/^##\s+\d+\.?\s*(?:Kérdés Értékelése|Kérdés értékelése)/m).slice(1);

    return qBlocks.map((qBlock, i) => {
        // Extract FELADAT section
        const feladatMatch = qBlock.split(/^###\s+FELADAT/m);
        const feladatRaw = feladatMatch[1] || '';
        const questionText = feladatRaw
            .split(/^###\s+VÁLASZ/m)[0]
            .replace(/^(type|points|tags):.*$/gm, '')
            .trim();

        // Extract VÁLASZ from the filled block
        const aBlock = aBlocks[i] || '';
        const valaszMatch = aBlock.split(/^###\s+VÁLASZ/m);
        const answerText = (valaszMatch[1] || '')
            .replace(/<!--\s*USER_WRITES_HERE\s*-->/g, '')
            .trim();

        // Per-question AI feedback
        const aiFeedback = (evalBlocks[i] || '').trim();

        return { index: i + 1, questionText, answerText, aiFeedback };
    }).filter(q => q.questionText.length > 0);
}



interface EvaluationData {
    total_score: number;
    max_score: number;
    eval_md: string;
    submission: {
        dotmd_filled: string;
        testTemplate: {
            topic: string;
            difficulty: string;
            dotmd_content: string;
        };
    };
}

export default function ResultsPage({ params }: { params: Promise<{ id: string }> }) {
    const router = useRouter();
    const { id } = use(params);

    const [evaluation, setEvaluation] = useState<EvaluationData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch(`/api/evaluations/${id}`)
            .then(res => res.json())
            .then(data => {
                if (data.error) {
                    alert('Hiba történt az értékelés betöltésekor.');
                    router.push('/');
                    return;
                }
                setEvaluation(data);
                setLoading(false);
            });
    }, [id, router]);

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <div className="animate-pulse font-medium text-slate-700">Értékelés betöltése...</div>
            </div>
        );
    }

    if (!evaluation) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <div className="text-red-500 font-medium">Hiba: Értékelés nem található.</div>
            </div>
        );
    }

    const scorePercentage = Math.round((evaluation.total_score / evaluation.max_score) * 100) || 0;
    let scoreColor = 'text-red-500';
    if (scorePercentage >= 80) scoreColor = 'text-emerald-500';
    else if (scorePercentage >= 50) scoreColor = 'text-yellow-500';

    const topic = evaluation?.submission?.testTemplate?.topic ?? '';
    const difficulty = evaluation?.submission?.testTemplate?.difficulty;
    const isComprehensiveResult = topic.toUpperCase() === 'COMPREHENSIVE' || topic.toUpperCase() === 'GLASSDOOR';
    const diffLabel = difficulty === 'EASY' ? 'Könnyű' : difficulty === 'MEDIUM' ? 'Közepes' : difficulty === 'GLASSDOOR' ? '25 kérdés' : 'Nehéz';
    const topicLabel = topic.toUpperCase() === 'GLASSDOOR' ? '💀 Boss Fight' : isComprehensiveResult ? 'Komplex Vizsga' : topic;

    const questions = parseQuestions(
        evaluation?.submission?.testTemplate?.dotmd_content || '',
        evaluation?.submission?.dotmd_filled || '',
        evaluation?.eval_md || ''
    );

    const isCodeTopic = ['JAVA', 'SQL', 'FRONTEND', 'COMPREHENSIVE', 'GLASSDOOR'].includes(topic.toUpperCase());

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 p-6 flex justify-center">
            <div className="max-w-4xl w-full space-y-6">

                {/* Header */}
                <div className="flex items-start justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900">Értékelési jelentés</h1>
                        <p className="text-slate-500 mt-1 font-medium">{topicLabel} · {diffLabel}</p>
                    </div>
                    <div className="text-right">
                        <div className={`text-5xl font-black ${scoreColor}`}>
                            {evaluation.total_score}
                            <span className="text-2xl text-slate-400"> / {evaluation.max_score}</span>
                        </div>
                        <p className="text-slate-500 mt-1 uppercase text-xs font-bold tracking-wider">Összpontszám</p>
                    </div>
                </div>

                {/* Per-question cards */}
                {questions.length === 0 && (
                    <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center text-slate-400">
                        Nem sikerült a kérdéseket betölteni.
                    </div>
                )}

                {questions.map((q) => {
                    const statusMatch = q.aiFeedback.match(/\*?\*?Státusz:?\*?\*?\s*(\w+)/i);
                    const status = statusMatch ? statusMatch[1].toUpperCase() : '';
                    const scoreMatch = q.aiFeedback.match(/\*?\*?Pontszám:?\*?\*?\s*(\d+\/\d+)/i);
                    const score = scoreMatch ? scoreMatch[1] : '';

                    let statusClass = 'bg-slate-100 text-slate-500';
                    if (status.includes('PASS')) statusClass = 'bg-emerald-100 text-emerald-700';
                    if (status.includes('FAIL')) statusClass = 'bg-rose-100 text-rose-700';
                    if (status.includes('PARTIAL')) statusClass = 'bg-amber-100 text-amber-700';

                    return (
                        <div key={q.index} className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden mb-8">
                            {/* Header: Question Number and Score */}
                            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                                <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">
                                    {q.index}. Kérdés
                                </h3>
                                <div className="flex gap-2 items-center">
                                    {score && <span className="text-sm font-bold text-slate-500 bg-slate-200/50 px-2 py-1 rounded-md">{score}</span>}
                                    {status && <span className={`text-[10px] font-black px-2 py-1 rounded-md uppercase tracking-tighter ${statusClass}`}>{status}</span>}
                                </div>
                            </div>

                            <div className="p-6 space-y-6">
                                {/* Question Text */}
                                <div>
                                    <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Feladat</h4>
                                    <div className="prose prose-slate prose-sm max-w-none text-slate-600">
                                        <ReactMarkdown>{q.questionText}</ReactMarkdown>
                                    </div>
                                </div>

                                {/* User Answer */}
                                <div>
                                    <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Válaszod</h4>
                                    {q.answerText ? (
                                        isCodeTopic ? (
                                            <div className="space-y-4">
                                                <div className="relative group">
                                                    <div className="absolute -top-3 right-4 px-2 py-1 bg-slate-800 text-[10px] text-slate-400 rounded-md font-mono z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        {topic.toLowerCase()}
                                                    </div>
                                                    <pre className="bg-slate-900 text-slate-300 rounded-xl p-5 text-xs font-mono overflow-x-auto whitespace-pre border border-slate-800 shadow-inner max-h-[400px]">
                                                        {q.answerText}
                                                    </pre>
                                                </div>

                                                {/* Frontend Preview in Results */}
                                                {topic.toUpperCase() === 'FRONTEND' && (
                                                    <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm">
                                                        <div className="bg-slate-100 px-4 py-2 border-b border-slate-200 flex items-center justify-between">
                                                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Megoldásod Előnézete</span>
                                                            <div className="flex gap-1.5">
                                                                <div className="w-2.5 h-2.5 rounded-full bg-slate-300"></div>
                                                                <div className="w-2.5 h-2.5 rounded-full bg-slate-300"></div>
                                                                <div className="w-2.5 h-2.5 rounded-full bg-slate-300"></div>
                                                            </div>
                                                        </div>
                                                        <iframe
                                                            srcDoc={q.answerText}
                                                            title={`preview-${q.index}`}
                                                            className="w-full h-[300px] border-none"
                                                            sandbox="allow-scripts"
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="prose prose-slate prose-sm max-w-none p-4 bg-slate-50 rounded-xl border border-slate-100 text-slate-700">
                                                <ReactMarkdown>{q.answerText}</ReactMarkdown>
                                            </div>
                                        )
                                    ) : (
                                        <p className="text-slate-400 italic text-xs bg-slate-50 p-4 rounded-xl border border-dashed border-slate-200">Nincs megadott válasz.</p>
                                    )}
                                </div>

                                {/* AI Feedback */}
                                {q.aiFeedback && (
                                    <div className="pt-6 border-t border-slate-100">
                                        <h4 className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest mb-3">Értékelés & Visszajelzés</h4>
                                        <div className="prose prose-emerald prose-sm max-w-none italic text-slate-600 bg-emerald-50/30 p-4 rounded-xl border border-emerald-100/50">
                                            <ReactMarkdown>
                                                {q.aiFeedback
                                                    .replace(/Pontszám:.*?\n/i, '')
                                                    .replace(/Státusz:.*?\n/i, '')
                                                    .replace(/^[\s*]*Visszajelzés:[\s*]*/i, '**Visszajelzés:** ')
                                                    .trim()}
                                            </ReactMarkdown>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
                <div className="flex justify-center pb-16">
                    <button
                        onClick={() => router.push('/')}
                        className="px-8 py-4 bg-slate-900 hover:bg-slate-800 text-white shadow-lg shadow-slate-200 rounded-2xl transition-all font-bold cursor-pointer hover:-translate-y-1 active:scale-95"
                    >
                        Új vizsga kezdése
                    </button>
                </div>

            </div>
        </div>
    );
}
