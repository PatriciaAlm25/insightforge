import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BarChart3, TrendingUp, Clock, CheckCircle2, ArrowLeft, Loader2, Zap, ShieldAlert } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { DataIngestion } from '../components/DataIngestion';
import { ProjectContextForm } from '../components/ProjectContextForm';
import { FutureRisks } from '../components/FutureRisks';
import { EmployeeAnalytics } from '../components/EmployeeAnalytics';
import { AiChat } from '../components/AiChat';

const DashboardPage: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState<any[]>([]);
  const [loadingMetrics, setLoadingMetrics] = useState(true);
  const [aiInsight, setAiInsight] = useState<any>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => { fetchMetrics(); }, [projectId, refreshKey]);

  const fetchMetrics = async () => {
    if (!projectId) return;
    setLoadingMetrics(true);
    try {
      const { data } = await supabase
        .from('Project_Data')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });
      
      if (data && data.length > 0) {
        const latest = data[0];
        setMetrics(latest.rows || []);
        setAiInsight(latest.ai_analysis || null);
      } else {
        setMetrics([]);
        setAiInsight(null);
      }
    } finally { setLoadingMetrics(false); }
  };

  // Helper to find value from flexible keys
  const getVal = (row: any, keys: string[]) => {
    const found = Object.keys(row).find(k => keys.includes(k.toLowerCase()));
    return found ? row[found] : 0;
  };

  const totalCost = metrics.reduce((sum, r) => sum + (parseFloat(getVal(r, ['cost', 'cost_spent', 'budget_used', 'spent'])) || 0), 0);
  const totalDelay = metrics.reduce((sum, r) => sum + (parseInt(getVal(r, ['delay', 'delay_days', 'days_late', 'lateness'])) || 0), 0);
  const latestHealth = metrics.length > 0 ? getVal(metrics[0], ['billing_health', 'health', 'status', 'condition']) : 'N/A';
  
  const anomalies = metrics.filter(r => (parseFloat(getVal(r, ['cost', 'cost_spent'])) > 100000) || (parseInt(getVal(r, ['delay', 'delay_days'])) > 10));

  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-32">
      <nav className="bg-white/80 backdrop-blur-xl border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 h-18 flex items-center gap-4 py-4">
          <button onClick={() => navigate('/projects')} className="p-2.5 hover:bg-slate-100 rounded-full transition-colors"><ArrowLeft className="w-5 h-5 text-slate-600" /></button>
          <BarChart3 className="w-7 h-7 text-indigo-600" />
          <span className="text-xl font-black bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-violet-600">InsightForge</span>
          <div className="ml-auto flex items-center gap-2 bg-emerald-50 text-emerald-600 px-4 py-2 rounded-full border border-emerald-100">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
            <span className="text-xs font-black uppercase tracking-wider">Live Analysis</span>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-10 space-y-12">
        {projectId && <DataIngestion projectId={projectId} onUploadComplete={() => setRefreshKey(prev => prev + 1)} />}

        <section>
          <h2 className="text-2xl font-black text-slate-900 mb-6 flex items-center"><span className="bg-blue-100 text-blue-600 p-3 rounded-2xl mr-4"><BarChart3 className="w-6 h-6" /></span>B. Intelligent Dashboard</h2>
          <div className="grid md:grid-cols-4 gap-5 mb-8">
            {[
              { icon: <TrendingUp className="w-6 h-6" />, bg: 'bg-blue-50', color: 'text-blue-600', label: 'Total Cost', value: `$${totalCost.toLocaleString()}`, sub: 'Aggregated Budget' },
              { icon: <Clock className="w-6 h-6" />, bg: 'bg-amber-50', color: 'text-amber-600', label: 'Total Delay', value: `${totalDelay} Days`, sub: 'Schedule Variance' },
              { icon: <ShieldAlert className="w-6 h-6" />, bg: 'bg-rose-50', color: 'text-rose-600', label: 'Status', value: latestHealth, sub: 'Billing Health' },
              { icon: <Zap className="w-6 h-6" />, bg: 'bg-violet-50', color: 'text-violet-600', label: 'Anomalies', value: anomalies.length, sub: 'AI Detected' },
            ].map((c, i) => (
              <div key={i} className="bg-white p-7 rounded-[1.75rem] border border-slate-200 shadow-sm hover:shadow-md transition-all group">
                <div className="flex items-center justify-between mb-5"><div className={`p-3 rounded-2xl ${c.bg} ${c.color} group-hover:scale-110 transition-transform`}>{c.icon}</div><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{c.label}</span></div>
                <div className="text-3xl font-black text-slate-900">{c.value}</div>
                <p className="text-sm text-slate-500 mt-1 font-medium">{c.sub}</p>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-[2rem] border border-slate-200 overflow-hidden shadow-sm">
            <div className="px-8 py-5 border-b border-slate-100 bg-slate-50/50"><h3 className="font-black text-lg">Project Data History (Latest Upload)</h3></div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead><tr className="text-xs font-black uppercase tracking-widest text-slate-400 border-b border-slate-100">{['Date/ID','Cost','Delay','Health'].map(h => <th key={h} className="px-8 py-4">{h}</th>)}</tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {loadingMetrics ? <tr><td colSpan={4} className="py-16 text-center"><Loader2 className="w-7 h-7 animate-spin mx-auto text-indigo-500" /></td></tr>
                  : metrics.length === 0 ? <tr><td colSpan={4} className="py-20 text-center text-slate-400">Upload a CSV to see data.</td></tr>
                  : metrics.map((m, i) => <tr key={i} className="hover:bg-slate-50 transition-colors">
                      <td className="px-8 py-5 text-sm font-bold text-slate-600">{getVal(m, ['date', 'day', 'id']) || `Row ${i+1}`}</td>
                      <td className="px-8 py-5 text-sm font-black">${(parseFloat(getVal(m, ['cost', 'cost_spent'])) || 0).toLocaleString()}</td>
                      <td className="px-8 py-5"><span className={`px-3 py-1.5 rounded-xl text-xs font-bold ${getVal(m, ['delay', 'delay_days']) > 0 ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600'}`}>{getVal(m, ['delay', 'delay_days'])} Days</span></td>
                      <td className="px-8 py-5"><span className="px-3 py-1.5 rounded-xl text-xs font-black border border-slate-200">{getVal(m, ['billing_health', 'health', 'status'])}</span></td>
                    </tr>)}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <div className="grid lg:grid-cols-2 gap-8">
          <section className="bg-white rounded-[2rem] border border-slate-200 shadow-sm p-10">
            <h2 className="text-2xl font-black mb-2 flex items-center"><span className="bg-rose-100 text-rose-600 p-3 rounded-2xl mr-4"><ShieldAlert className="w-6 h-6" /></span>C. Anomaly Detection</h2>
            <p className="text-slate-500 mb-6 text-sm ml-[3.5rem]">AI-detected outliers and critical deviations.</p>
            <div className="space-y-3">
              {anomalies.length === 0 ? <div className="py-10 text-center"><CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-3" /><p className="font-bold text-slate-700">All Systems Clear</p></div>
              : anomalies.map((a, i) => (
                <motion.div key={i} initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} transition={{delay:i*0.05}} className="p-4 rounded-2xl bg-rose-50 border border-rose-100">
                  <div className="flex justify-between mb-1"><span className="text-xs font-black uppercase text-rose-700">Critical Alert</span><span className="text-xs font-black text-rose-500">🔴 High</span></div>
                  <p className="text-sm text-rose-600">Found outlier with <strong className="font-black">{getVal(a, ['cost', 'cost_spent'])}</strong> value. This deviates significantly from baseline.</p>
                </motion.div>
              ))}
            </div>
          </section>

          <section className="bg-gradient-to-br from-indigo-600 to-violet-700 rounded-[2rem] p-10 text-white shadow-xl relative overflow-hidden">
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-2xl" />
            <h2 className="text-2xl font-black mb-2 flex items-center relative z-10"><span className="bg-white/20 p-3 rounded-2xl mr-4"><Zap className="w-6 h-6" /></span>D. AI Insight Engine</h2>
            <p className="text-white/70 mb-6 text-sm ml-[3.5rem] relative z-10">Real-time analysis of latest upload.</p>
            <div className="space-y-4 relative z-10">
              <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-5">
                <div className="text-xs font-black text-indigo-200 uppercase tracking-widest mb-3">AI Synthesis</div>
                {aiInsight ? <p className="text-sm leading-relaxed text-white/90">{aiInsight.summary || aiInsight.observation}</p>
                : <p className="text-sm text-white/50 italic">Upload CSV to generate AI insights.</p>}
              </div>
              <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-5">
                <div className="text-xs font-black text-emerald-300 uppercase tracking-widest mb-3">Key Observations</div>
                {aiInsight ? <p className="text-sm text-white/90 font-medium">{aiInsight.observation}</p>
                : <p className="text-sm text-white/50 italic">Awaiting analysis...</p>}
              </div>
            </div>
          </section>
        </div>

        {projectId && <ProjectContextForm projectId={projectId} />}
        {projectId && <FutureRisks projectId={projectId} refreshKey={refreshKey} />}
        {projectId && <EmployeeAnalytics projectId={projectId} refreshKey={refreshKey} />}
      </main>

      {projectId && <AiChat projectId={projectId} metrics={metrics} />}
    </div>
  );
};

export default DashboardPage;
