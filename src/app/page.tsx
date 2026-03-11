"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import LoadingModal from '@/components/LoadingModal';

export default function Home() {
  const router = useRouter();
  const [topic, setTopic] = useState('JAVA');
  const [difficulty, setDifficulty] = useState('MEDIUM');
  const [loading, setLoading] = useState(false);

  const isComprehensive = topic === 'COMPREHENSIVE';
  const isGlassdoor = topic === 'GLASSDOOR';
  const isSql = topic === 'SQL';
  const hideDifficulty = isComprehensive || isSql || isGlassdoor;

  const handleStart = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/tests/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic,
          difficulty: hideDifficulty ? 'MEDIUM' : difficulty
        }),
      });
      const data = await res.json();

      if (data.id) {
        router.push(`/exam/${data.id}`);
      } else {
        alert('Hiba történt a teszt generálása közben.');
        console.error(data);
        setLoading(false);
      }
    } catch (err) {
      console.error(err);
      alert('Hálózati hiba.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col items-center justify-center p-6">
      <LoadingModal isOpen={loading} text={isComprehensive ? "Komplex vizsga generálása... (ez ~1 percet vehet igénybe)" : isGlassdoor ? "Boss Fight generálása... (ez ~1 percet vehet igénybe)" : "Teszt generálása..."} />
      <div className="max-w-md w-full bg-white border border-slate-200 rounded-2xl p-8 shadow-xl">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-indigo-500 bg-clip-text text-transparent mb-2 inline-block">DevExam AI</h1>
        <p className="text-slate-500 mb-8">Küldj be AI-értékelt programozási teszteket.</p>

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Téma</label>
            <div className="grid grid-cols-1 gap-2">
              {[
                { id: 'JAVA', label: 'Java' },
                { id: 'SQL', label: 'SQL' },
                { id: 'FRONTEND', label: 'Frontend (HTML/CSS/JS)' },
                { id: 'COMPREHENSIVE', label: 'Komplex Vizsga (Java + SQL + Frontend)' },
                { id: 'GLASSDOOR', label: '💀 Boss Fight (25 kérdés)' }
              ].map(t => (
                <button
                  key={t.id}
                  onClick={() => setTopic(t.id)}
                  className={`w-full text-left py-3 px-4 rounded-lg border text-sm font-medium transition-all cursor-pointer ${topic === t.id
                    ? (t.id === 'COMPREHENSIVE' ? 'bg-gradient-to-r from-indigo-50 to-purple-50 border-indigo-500 text-indigo-700 ring-1 ring-indigo-500 shadow-sm' : t.id === 'GLASSDOOR' ? 'bg-gradient-to-r from-amber-50 to-yellow-50 border-amber-500 text-amber-700 ring-1 ring-amber-500 shadow-sm' : 'bg-indigo-50 border-indigo-500 text-indigo-700 ring-1 ring-indigo-500 shadow-sm')
                    : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'}`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {!hideDifficulty && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Nehézség</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'EASY', label: 'Könnyű' },
                  { id: 'MEDIUM', label: 'Közepes' },
                  { id: 'HARD', label: 'Nehéz' }
                ].map(d => (
                  <button
                    key={d.id}
                    onClick={() => setDifficulty(d.id)}
                    className={`py-2 px-3 rounded-lg border text-sm font-medium transition-all text-center cursor-pointer ${difficulty === d.id ? 'bg-indigo-50 border-indigo-500 text-indigo-700 ring-1 ring-indigo-500 shadow-sm' : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'}`}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {isComprehensive && (
            <div className="bg-indigo-50/50 border border-indigo-100 rounded-lg p-4 text-sm text-indigo-700">
              <p className="font-semibold mb-1">📋 Komplex Vizsga (150 perc)</p>
              <p className="text-indigo-600/80 text-xs">24 kérdés: 8 Java + 8 SQL + 8 Frontend. Témánként 4 elméleti és 4 gyakorlati feladat.</p>
            </div>
          )}

          {isSql && (
            <div className="bg-indigo-50/50 border border-indigo-100 rounded-lg p-4 text-sm text-indigo-700">
              <p className="font-semibold mb-1">📊 SQL Teszt (Junior szint)</p>
              <p className="text-indigo-600/80 text-xs">SELECT, JOIN, GROUP BY, aggregáció (COUNT, AVG, MAX), subquery. Véletlenszerű adatbázis séma.</p>
            </div>
          )}

          {isGlassdoor && (
            <div className="bg-amber-50/50 border border-amber-100 rounded-lg p-4 text-sm text-amber-700">
              <p className="font-semibold mb-1">💀 Boss Fight (120 perc)</p>
              <p className="text-amber-600/80 text-xs">25 kérdés: 15 Java + 5 SQL + 5 Frontend. Valós interjú kérdések alapján. Sok sikert! 💪</p>
            </div>
          )}

          <button
            onClick={handleStart}
            disabled={loading}
            className={`w-full font-semibold py-3 px-4 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center pt-4 ${isComprehensive
              ? 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-lg'
              : isGlassdoor
                ? 'bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-500 hover:to-yellow-500 text-white shadow-lg'
                : 'bg-indigo-600 hover:bg-indigo-500 text-white'}`}
          >
            {isComprehensive ? 'Komplex vizsga indítása' : isGlassdoor ? 'Boss Fight indítása 💀' : 'Teszt indítása'}
          </button>
        </div>
      </div>
    </div>
  );
}
