"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';

type DashboardTest = {
    id: string;
    topic: string;
    difficulty: string;
    createdAt: string;
    status: 'PASSED' | 'FAILED' | 'NOT_STARTED';
    score: string | null;
    evaluationId: string | null;
};

import { Trash2 } from 'lucide-react';

export default function DashboardPage() {
    const [tests, setTests] = useState<DashboardTest[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch('/api/dashboard')
            .then(res => res.json())
            .then(data => {
                setTests(data);
                setLoading(false);
            })
            .catch(err => {
                console.error(err);
                setLoading(false);
            });
    }, []);

    const handleDelete = async (id: string, e: React.MouseEvent) => {
        e.preventDefault();
        if (!confirm('Biztosan törölni szeretnéd ezt a tesztet és minden hozzá tartozó eredményt?')) return;

        try {
            const res = await fetch(`/api/tests/${id}`, { method: 'DELETE' });
            if (res.ok) {
                setTests(tests.filter(t => t.id !== id));
            } else {
                alert('Hiba történt a törlés során.');
            }
        } catch (err) {
            console.error(err);
            alert('Hálózati hiba történt.');
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-slate-900">
                <div className="animate-pulse font-medium">Tesztek betöltése...</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 p-8">
            <div className="max-w-4xl mx-auto">
                <div className="flex items-center justify-between mb-8">
                    <h1 className="text-3xl font-bold text-slate-900">Korábbi tesztek</h1>
                    <Link
                        href="/"
                        className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg font-medium transition-colors cursor-pointer"
                    >
                        Új teszt
                    </Link>
                </div>

                {tests.length === 0 ? (
                    <div className="bg-white rounded-xl p-8 border border-slate-200 text-center shadow-sm">
                        <p className="text-slate-500 mb-4">Még nem töltöttél ki egyetlen tesztet sem.</p>
                        <Link href="/" className="text-indigo-600 font-medium hover:underline">
                            Generálj egyet most!
                        </Link>
                    </div>
                ) : (
                    <div className="grid gap-4">
                        {tests.map(test => (
                            <div key={test.id} className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
                                <div>
                                    <div className="flex items-center gap-3 mb-1">
                                        <h3 className="font-bold text-lg">{test.topic === 'COMPREHENSIVE' ? 'Komplex Vizsga' : test.topic}</h3>
                                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold tracking-wider ${test.difficulty === 'EASY' ? 'bg-green-100 text-green-700' :
                                            test.difficulty === 'MEDIUM' ? 'bg-yellow-100 text-yellow-700' :
                                                'bg-red-100 text-red-700'
                                            }`}>
                                            {test.difficulty === 'EASY' ? 'KÖNNYŰ' : test.difficulty === 'MEDIUM' ? 'KÖZEPES' : 'NEHÉZ'}
                                        </span>
                                        {test.status !== 'NOT_STARTED' && (
                                            <span className={`px-2 py-0.5 rounded-full text-xs font-bold tracking-wider ${test.status === 'PASSED' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                                                }`}>
                                                {test.status === 'PASSED' ? 'SIKERES' : 'SIKERTELEN'}
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-sm text-slate-500">
                                        Generálva: {new Date(test.createdAt).toLocaleDateString('hu-HU')}
                                        {test.score && ` • Pontszám: ${test.score}`}
                                    </p>
                                </div>
                                <div className="flex gap-3">
                                    <button
                                        onClick={(e) => handleDelete(test.id, e)}
                                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all cursor-pointer group"
                                        title="Teszt törlése"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                    {test.evaluationId && (
                                        <Link
                                            href={`/results/${test.evaluationId}`}
                                            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-lg transition-colors text-sm cursor-pointer"
                                        >
                                            Eredmény
                                        </Link>
                                    )}
                                    <Link
                                        href={`/exam/${test.id}`}
                                        className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-medium rounded-lg transition-colors text-sm border border-indigo-200 cursor-pointer"
                                    >
                                        Újra kitöltés
                                    </Link>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
