import React, { useState, useEffect } from 'react';
import { TrendingUp, Loader2, RefreshCw } from 'lucide-react';

interface Props { projectId: string; refreshKey?: number; }

export const FutureRisks: React.FC<Props> = ({ projectId, refreshKey }) => {
  const [risks, setRisks] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const r = await fetch(`http://localhost:3002/future-risks/${projectId}`);
      const data = await r.json();
      setRisks(Array.isArray(data) ? data : []);
    } catch { setRisks([]); }
    setLoading(false);
  };

  useEffect(() => { if (projectId) load(); }, [projectId, refreshKey]);

  return (
    <section className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-[2rem] p-10 text-white shadow-xl relative overflow-hidden">
      <div className="absolute -top-20 -right-20 w-64 h-64 bg-amber-500/20 rounded-full blur-[80px]" />
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-black flex items-center">
              <span className="bg-amber-400/20 text-amber-400 p-3 rounded-2xl mr-4"><TrendingUp className="w-6 h-6" /></span>
              G. Future Risk Prediction
            </h2>
            <p className="text-slate-400 mt-2 ml-[3.5rem] text-sm">AI-predicted risks based on your project context and current trajectory.</p>
          </div>
          <button onClick={load} disabled={loading} className="bg-white/10 hover:bg-white/20 text-white p-3 rounded-xl transition-colors border border-white/10">
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-amber-400" /></div>
        ) : risks.length === 0 ? (
          <div className="text-center py-12 text-slate-500">
            <p className="font-medium">No predictions yet.</p>
            <p className="text-sm mt-1">Add project context and upload CSV data first.</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {risks.map((r, i) => (
              <div key={i} className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-sm">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-2 h-2 bg-amber-400 rounded-full animate-pulse" />
                  <span className="text-xs font-black text-amber-400 uppercase tracking-widest">Risk #{i + 1}</span>
                </div>
                <p className="text-white font-bold mb-3 leading-relaxed">{r.risk}</p>
                <div className="border-t border-white/10 pt-3">
                  <span className="text-xs font-black text-emerald-400 uppercase tracking-widest block mb-1">Mitigation</span>
                  <p className="text-sm text-slate-300 leading-relaxed">{r.mitigation}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};
