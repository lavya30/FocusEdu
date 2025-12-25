'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import Navbar from '@/app/components/Navbar';

export default function AnalysisDetailPage() {
  const { id } = useParams();
  const router = useRouter();

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;

    const fetchAnalysis = async () => {
      const ref = doc(db, 'resumeAnalysis', id as string);
      const snap = await getDoc(ref);

      if (snap.exists()) {
        setData(snap.data());
      }

      setLoading(false);
    };

    fetchAnalysis();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white">
        Loading analysis...
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center text-red-400">
        Analysis not found
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <Navbar />

      <main className="max-w-5xl mx-auto px-6 py-10">
        <button
          onClick={() => router.back()}
          className="mb-6 text-violet-400 hover:underline"
        >
          ← Back
        </button>

        <h1 className="text-4xl font-bold mb-4">
          Resume Analysis
        </h1>

        <p className="text-slate-400 mb-6">
          {data.createdAt?.toDate().toLocaleString()}
        </p>

        {/* OVERALL SCORE */}
        <div className="p-6 bg-slate-900 rounded-xl mb-8 border border-slate-700">
          <p className="text-2xl font-bold">
            Overall Score: {data.overallScore}
          </p>
          <p className="text-slate-300 mt-2">
            {data.analysis.summary}
          </p>
        </div>

        {/* SECTION BREAKDOWN */}
        <div className="grid md:grid-cols-2 gap-4">
          {data.analysis.sections.map((s: any) => (
            <div
              key={s.title}
              className="p-5 bg-slate-900 border border-slate-700 rounded-xl"
            >
              <h3 className="text-lg font-semibold mb-1">
                {s.title}
              </h3>
              <p className="text-slate-400 mb-2">
                Score: {s.score}
              </p>
              <p className="text-sm text-slate-300">
                {s.feedback}
              </p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
