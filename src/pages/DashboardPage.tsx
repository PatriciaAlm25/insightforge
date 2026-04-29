import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Upload, 
  BarChart3, 
  TrendingUp, 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  ArrowLeft,
  FileSpreadsheet,
  Loader2,
  Info,
  Zap,
  ShieldAlert,
  FileText
} from 'lucide-react';
import { supabase } from '../lib/supabase';

const DashboardPage: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [metrics, setMetrics] = useState<any[]>([]);
  const [loadingMetrics, setLoadingMetrics] = useState(true);
  const [message, setMessage] = useState({ text: '', type: '' });

  // AI Chat State
  const [chatOpen, setChatOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'assistant', content: "Hello! I'm your InsightForge AI. I've analyzed your project data. Ask me anything about your costs, delays, or risk factors." }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  useEffect(() => {
    fetchMetrics();
  }, [projectId]);

  const fetchMetrics = async () => {
    if (!projectId) return;
    setLoadingMetrics(true);
    try {
      const { data, error } = await supabase
        .from('Project_Metrics')
        .select('*')
        .eq('project_id', projectId)
        .order('date', { ascending: false });

      if (error) throw error;
      setMetrics(data || []);
    } catch (err) {
      console.error('Error fetching metrics:', err);
    } finally {
      setLoadingMetrics(false);
    }
  };

  const uploadFile = async (file: File) => {
    setUploading(true);
    setMessage({ text: '', type: '' });
    const formData = new FormData();
    formData.append('file', file);
    formData.append('projectId', projectId || '');

    try {
      const response = await fetch('http://localhost:3001/upload-csv', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();
      if (response.ok) {
        setMessage({ text: `Success: ${result.message}`, type: 'success' });
        fetchMetrics(); 
      } else {
        throw new Error(result.error || 'Upload failed');
      }
    } catch (err: any) {
      setMessage({ text: `Error: ${err.message}`, type: 'error' });
    } finally {
      setUploading(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    const userMsg = { role: 'user', content: inputValue };
    setMessages(prev => [...prev, userMsg]);
    setInputValue('');
    setIsTyping(true);

    try {
      const response = await fetch('http://localhost:3001/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: inputValue,
          projectId: projectId,
          context: metrics
        })
      });

      const data = await response.json();
      setMessages(prev => [...prev, { role: 'assistant', content: data.reply || "I'm having trouble connecting to my brain." }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', content: "Network error. Make sure your server is running." }]);
    } finally {
      setIsTyping(false);
    }
  };

  // --- ANOMALY DETECTION LOGIC ---
  const detectAnomalies = () => {
    if (metrics.length < 2) return [];
    const anomalies: any[] = [];
    const sorted = [...metrics].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    for (let i = 1; i < sorted.length; i++) {
      const current = sorted[i];
      const prev = sorted[i-1];
      if (current.cost_metric > prev.cost_metric * 1.25) {
        anomalies.push({ type: 'Cost Spike', severity: '🔴 High', date: current.date, description: `Budget surge of $${(current.cost_metric - prev.cost_metric).toLocaleString()} detected.` });
      }
      if (current.delay_days > prev.delay_days) {
        anomalies.push({ type: 'Timeline Delay', severity: '🟡 Warning', date: current.date, description: `Schedule slipped by ${current.delay_days - prev.delay_days} additional days.` });
      }
      if (current.billing_health === 'High Risk') {
        anomalies.push({ type: 'Billing Health', severity: '🔴 Critical', date: current.date, description: `Financial anomaly flagged in billing systems.` });
      }
    }
    return anomalies;
  };

  const activeAnomalies = detectAnomalies();
  const totalCost = metrics.reduce((sum, m) => sum + m.cost_metric, 0);
  const totalDelay = metrics.reduce((sum, m) => sum + m.delay_days, 0);
  const highRiskCount = metrics.filter(m => m.billing_health === 'High Risk').length;

  const getRiskColor = (health: string) => {
    switch (health) {
      case 'Safe': return 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20';
      case 'Warning': return 'text-amber-500 bg-amber-500/10 border-amber-200';
      case 'High Risk': return 'text-rose-500 bg-rose-500/10 border-rose-500/20';
      default: return 'text-slate-500 bg-slate-500/10 border-slate-500/20';
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans pb-20">
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center space-x-4">
              <button onClick={() => navigate('/main')} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><ArrowLeft className="w-5 h-5 text-slate-600" /></button>
              <div className="flex items-center space-x-2"><BarChart3 className="w-6 h-6 text-brand" /><span className="text-xl font-bold">InsightForge Dashboard</span></div>
            </div>
            <div className="hidden sm:flex items-center space-x-6">
               <div className="flex flex-col items-end">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-tighter">Project Status</span>
                  <span className="text-sm font-bold text-emerald-500 flex items-center"><div className="w-2 h-2 bg-emerald-500 rounded-full mr-2 animate-pulse" />Live Analysis</span>
               </div>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid md:grid-cols-4 gap-6 mb-10">
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-4"><div className="p-2.5 bg-blue-50 text-brand rounded-xl"><TrendingUp className="w-6 h-6" /></div><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Cost</span></div>
            <div className="text-2xl font-black text-slate-900">${totalCost.toLocaleString()}</div>
            <p className="text-xs text-slate-500 mt-1">Aggregated Budget</p>
          </div>
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-4"><div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl"><Clock className="w-6 h-6" /></div><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Delay</span></div>
            <div className="text-2xl font-black text-slate-900">{totalDelay} Days</div>
            <p className="text-xs text-slate-500 mt-1">Schedule Variance</p>
          </div>
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm border-l-4 border-l-rose-500">
            <div className="flex items-center justify-between mb-4"><div className="p-2.5 bg-rose-50 text-rose-600 rounded-xl"><AlertTriangle className="w-6 h-6" /></div><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">High Risks</span></div>
            <div className="text-2xl font-black text-slate-900">{highRiskCount}</div>
            <p className="text-xs text-slate-500 mt-1">Critical Flags</p>
          </div>
          <div className="bg-slate-900 p-6 rounded-3xl text-white shadow-xl">
            <div className="flex items-center justify-between mb-4"><div className="p-2.5 bg-white/10 text-brand-light rounded-xl"><Zap className="w-6 h-6" /></div><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Anomalies</span></div>
            <div className="text-2xl font-black text-brand-light">{activeAnomalies.length}</div>
            <p className="text-xs text-slate-400 mt-1">Detected by AI</p>
          </div>
        </div>

        <div className="grid lg:grid-cols-12 gap-8">
          <div className="lg:col-span-8 space-y-8">
            <section>
               <div className="flex items-center justify-between mb-4 px-2">
                  <h2 className="text-xl font-black text-slate-900 flex items-center"><Zap className="w-5 h-5 mr-2 text-brand-violet" />AI Insight Engine</h2>
                  <span className="text-xs font-bold text-brand-violet bg-brand-violet/10 px-3 py-1 rounded-full">Powered by GPT-4</span>
               </div>
               <div className="grid md:grid-cols-2 gap-4">
                  <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                    <h4 className="font-bold text-sm text-slate-400 mb-3 uppercase">Root Cause Analysis</h4>
                    {metrics.length > 0 ? (
                      <p className="text-sm text-slate-700 leading-relaxed"><strong className="text-rose-600">Observation:</strong> Cost spike on {metrics[0].date} correlates with schedule delays. <br/><br/><strong className="text-slate-900">AI Hypothesis:</strong> Likely resource over-allocation.</p>
                    ) : ( <p className="text-sm text-slate-400 italic">Awaiting data...</p> )}
                  </div>
                  <div className="bg-gradient-to-br from-brand to-brand-violet p-6 rounded-3xl text-white shadow-lg">
                    <h4 className="font-bold text-sm text-white/60 mb-3 uppercase">Recommendation</h4>
                    <ul className="text-sm space-y-3">
                      <li className="flex items-start"><CheckCircle2 className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />Audit latest entries.</li>
                      <li className="flex items-start"><CheckCircle2 className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />Re-baseline timeline.</li>
                    </ul>
                  </div>
               </div>
            </section>

            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center"><h3 className="font-black text-lg text-slate-900">Metric History</h3></div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead><tr className="bg-slate-50/50 text-slate-400 text-[10px] font-black uppercase tracking-widest"><th className="px-6 py-4">Date</th><th className="px-6 py-4">Cost (USD)</th><th className="px-6 py-4">Delay Impact</th><th className="px-6 py-4">Status</th></tr></thead>
                  <tbody className="divide-y divide-slate-100">
                    {loadingMetrics ? ( <tr><td colSpan={4} className="px-6 py-10 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-brand-violet" /></td></tr>
                    ) : metrics.length === 0 ? ( <tr><td colSpan={4} className="px-6 py-20 text-center"><p className="text-slate-400 text-sm">No data available.</p></td></tr>
                    ) : ( metrics.map((metric, idx) => (
                        <tr key={idx} className="group hover:bg-slate-50/80 transition-all">
                          <td className="px-6 py-5 text-sm font-bold text-slate-600">{metric.date}</td>
                          <td className="px-6 py-5 text-sm font-black text-slate-900">${metric.cost_metric.toLocaleString()}</td>
                          <td className="px-6 py-5 text-sm"><span className={`font-bold ${metric.delay_days > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>{metric.delay_days} Days</span></td>
                          <td className="px-6 py-5"><span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase border ${getRiskColor(metric.billing_health)}`}>{metric.billing_health}</span></td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="lg:col-span-4 space-y-8">
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 overflow-hidden">
               <h3 className="font-black text-lg mb-6 flex items-center"><ShieldAlert className="w-5 h-5 mr-2 text-rose-500" />Anomaly Center</h3>
               <div className="space-y-4">
                {activeAnomalies.length > 0 ? activeAnomalies.map((anomaly, idx) => (
                    <div key={idx} className="p-4 rounded-2xl bg-slate-50 border border-slate-100"><div className="flex justify-between mb-2"><span className="text-xs font-black uppercase">{anomaly.type}</span><span className="text-[10px] font-black text-rose-500">{anomaly.severity}</span></div><p className="text-xs text-slate-500">{anomaly.description}</p></div>
                  )) : ( <div className="py-10 text-center text-xs font-bold text-slate-400">All systems clear.</div> )}
               </div>
            </div>

            <div className="bg-slate-900 rounded-3xl p-6 text-white shadow-2xl">
              <h3 className="font-black text-lg mb-6 flex items-center text-brand-light"><Upload className="w-5 h-5 mr-2" />Data Ingestion</h3>
              <div onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }} onDragLeave={() => setIsDragging(false)} onDrop={(e) => { e.preventDefault(); setIsDragging(false); uploadFile(e.dataTransfer.files[0]); }} className={`relative border-2 border-dashed rounded-2xl p-8 text-center transition-all ${isDragging ? 'border-brand-light bg-white/5' : 'border-white/10'} ${uploading ? 'opacity-50' : ''}`}>
                <input type="file" accept=".csv" className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e) => e.target.files && uploadFile(e.target.files[0])} />
                <div className="flex flex-col items-center">
                  <div className="w-12 h-12 bg-white/5 text-brand-light rounded-2xl flex items-center justify-center mb-4 border border-white/10">{uploading ? <Loader2 className="w-6 h-6 animate-spin" /> : <FileSpreadsheet className="w-6 h-6" />}</div>
                  <p className="text-sm font-bold">{uploading ? 'Parsing...' : 'Drop CSV'}</p>
                </div>
              </div>
              {message.text && ( <div className={`mt-6 p-4 rounded-2xl text-xs ${message.type === 'success' ? 'text-emerald-400' : 'text-rose-400'}`}>{message.text}</div> )}
            </div>
          </div>
        </div>
      </main>

      {/* --- AI ASSISTANT --- */}
      <div className="fixed bottom-6 right-6 z-50">
        <button onClick={() => setChatOpen(!chatOpen)} className={`w-16 h-16 rounded-3xl shadow-2xl flex items-center justify-center transition-all ${chatOpen ? 'bg-slate-900' : 'bg-brand text-white'}`}>{chatOpen ? <ArrowLeft className="w-6 h-6" /> : <Zap className="w-6 h-6" />}</button>
        {chatOpen && (
          <div className="absolute bottom-20 right-0 w-[350px] h-[500px] bg-white rounded-[32px] shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
            <div className="bg-slate-900 p-6 text-white"><h3 className="font-black text-lg flex items-center"><Zap className="w-5 h-5 mr-2 text-brand-light" />AI Assistant</h3></div>
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {messages.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] p-4 rounded-2xl text-sm ${msg.role === 'user' ? 'bg-brand text-white' : 'bg-slate-100 text-slate-700'}`}>{msg.content}</div>
                </div>
              ))}
            </div>
            <form onSubmit={handleSendMessage} className="p-4 border-t"><input type="text" value={inputValue} onChange={(e) => setInputValue(e.target.value)} placeholder="Ask anything..." className="w-full p-4 bg-slate-100 rounded-2xl outline-none" /></form>
          </div>
        )}
      </div>
    </div>
  );
};

export default DashboardPage;
