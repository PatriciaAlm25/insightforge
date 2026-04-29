import os

content = """import React, { useState, useEffect } from 'react';
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
  Zap,
  ShieldAlert,
  MessageSquare
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
  const [aiInsight, setAiInsight] = useState<any>(null);

  // AI Chat State
  const [chatOpen, setChatOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'assistant', content: "Hello! I'm your InsightForge AI. I've analyzed your project data. Ask me anything about your costs, delays, or risk factors." }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  useEffect(() => {
    fetchMetrics();
    fetchInsight();
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

  const fetchInsight = async () => {
    if (!projectId) return;
    try {
      const { data, error } = await supabase
        .from('Project_Insights')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })
        .limit(1);
      
      if (data && data.length > 0) {
        setAiInsight(data[0]);
      }
    } catch (err) {
      console.error('Error fetching insight:', err);
    }
  };

  const uploadFile = async (file: File) => {
    setUploading(true);
    setMessage({ text: '', type: '' });
    const formData = new FormData();
    formData.append('file', file);
    formData.append('projectId', projectId || '');

    try {
      const response = await fetch('http://localhost:3002/upload-csv', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();
      if (response.ok) {
        setMessage({ text: `Success: ${result.message}`, type: 'success' });
        fetchMetrics(); 
        if (result.insight) setAiInsight(result.insight);
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
      const response = await fetch('http://localhost:3002/chat', {
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
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans pb-32">
      <nav className="bg-white/80 backdrop-blur-xl border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-20 items-center">
            <div className="flex items-center space-x-4">
              <button onClick={() => navigate('/main')} className="p-3 hover:bg-slate-100 rounded-full transition-colors"><ArrowLeft className="w-5 h-5 text-slate-600" /></button>
              <div className="flex items-center space-x-3"><BarChart3 className="w-8 h-8 text-brand" /><span className="text-2xl font-black bg-clip-text text-transparent bg-gradient-to-r from-brand to-brand-violet">InsightForge</span></div>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-16">
        
        {/* A. DATA INGESTION LAYER */}
        <section className="relative overflow-hidden bg-slate-900 rounded-[2.5rem] p-10 text-white shadow-2xl border border-white/10">
          <div className="absolute top-0 right-0 w-96 h-96 bg-brand/30 rounded-full blur-[100px] -mr-20 -mt-20"></div>
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-brand-violet/20 rounded-full blur-[80px] -ml-20 -mb-20"></div>
          
          <div className="relative z-10">
            <h2 className="text-3xl font-black mb-4 flex items-center">
              <span className="bg-white/10 text-brand-light p-3 rounded-2xl mr-4 backdrop-blur-sm border border-white/10"><Upload className="w-7 h-7" /></span>
              A. Data Ingestion Layer
            </h2>
            <p className="text-slate-400 mb-10 max-w-2xl text-lg">Drag and drop your CSV file below. The system automatically handles parsing, validation, and instant database ingestion.</p>
            
            <div 
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }} 
              onDragLeave={() => setIsDragging(false)} 
              onDrop={(e) => { e.preventDefault(); setIsDragging(false); uploadFile(e.dataTransfer.files[0]); }} 
              className={`relative border-2 border-dashed rounded-[2rem] p-12 text-center transition-all duration-300 ${isDragging ? 'border-brand-light bg-white/10 scale-[1.02]' : 'border-white/20 hover:border-brand-light/50 hover:bg-white/5'} ${uploading ? 'opacity-50 pointer-events-none' : ''}`}
            >
              <input type="file" accept=".csv" className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e) => e.target.files && uploadFile(e.target.files[0])} />
              <div className="flex flex-col items-center">
                <div className="w-16 h-16 bg-gradient-to-br from-brand to-brand-violet text-white rounded-2xl flex items-center justify-center mb-6 shadow-xl">{uploading ? <Loader2 className="w-8 h-8 animate-spin" /> : <FileSpreadsheet className="w-8 h-8" />}</div>
                <p className="text-xl font-bold mb-2">{uploading ? 'Ingesting Data...' : 'Drag & Drop CSV File'}</p>
                <p className="text-slate-400 text-sm">or click to browse from your computer</p>
              </div>
            </div>
            {message.text && ( <div className={`mt-6 p-4 rounded-xl text-sm font-bold flex items-center ${message.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'}`}><Info className="w-5 h-5 mr-2" />{message.text}</div> )}
          </div>
        </section>

        {/* B. INTELLIGENT DASHBOARD */}
        <section>
          <h2 className="text-3xl font-black text-slate-900 mb-8 flex items-center">
            <span className="bg-brand/10 text-brand p-3 rounded-2xl mr-4"><BarChart3 className="w-7 h-7" /></span>
            B. Intelligent Dashboard
          </h2>
          
          <div className="grid md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm hover:shadow-md transition-shadow group">
              <div className="flex items-center justify-between mb-6"><div className="p-3 bg-blue-50 text-brand rounded-2xl group-hover:scale-110 transition-transform"><TrendingUp className="w-6 h-6" /></div><span className="text-xs font-black text-slate-400 uppercase tracking-widest">Total Cost</span></div>
              <div className="text-3xl font-black text-slate-900">${totalCost.toLocaleString()}</div>
              <p className="text-sm font-medium text-slate-500 mt-2">Aggregated Project Budget</p>
            </div>
            <div className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm hover:shadow-md transition-shadow group">
              <div className="flex items-center justify-between mb-6"><div className="p-3 bg-amber-50 text-amber-600 rounded-2xl group-hover:scale-110 transition-transform"><Clock className="w-6 h-6" /></div><span className="text-xs font-black text-slate-400 uppercase tracking-widest">Total Delay</span></div>
              <div className="text-3xl font-black text-slate-900">{totalDelay} Days</div>
              <p className="text-sm font-medium text-slate-500 mt-2">Overall Schedule Variance</p>
            </div>
            <div className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm border-b-4 border-b-rose-500 hover:shadow-md transition-shadow group">
              <div className="flex items-center justify-between mb-6"><div className="p-3 bg-rose-50 text-rose-600 rounded-2xl group-hover:scale-110 transition-transform"><AlertTriangle className="w-6 h-6" /></div><span className="text-xs font-black text-slate-400 uppercase tracking-widest">High Risks</span></div>
              <div className="text-3xl font-black text-slate-900">{highRiskCount}</div>
              <p className="text-sm font-medium text-slate-500 mt-2">Critical Billing Flags</p>
            </div>
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 p-8 rounded-[2rem] text-white shadow-xl hover:shadow-2xl transition-shadow group relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-2xl -mr-10 -mt-10"></div>
              <div className="flex items-center justify-between mb-6 relative z-10"><div className="p-3 bg-white/10 text-brand-light rounded-2xl group-hover:scale-110 transition-transform"><Zap className="w-6 h-6" /></div><span className="text-xs font-black text-slate-400 uppercase tracking-widest">Anomalies</span></div>
              <div className="text-3xl font-black text-white relative z-10">{activeAnomalies.length}</div>
              <p className="text-sm font-medium text-slate-400 mt-2 relative z-10">Active Anomalies</p>
            </div>
          </div>

          <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-8 py-6 border-b border-slate-100 bg-slate-50/50"><h3 className="font-black text-xl text-slate-900">Project Metrics History</h3></div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead><tr className="bg-white text-slate-400 text-xs font-black uppercase tracking-widest border-b border-slate-100"><th className="px-8 py-5">Date</th><th className="px-8 py-5">Cost (USD)</th><th className="px-8 py-5">Delay Impact</th><th className="px-8 py-5">Billing Health</th></tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {loadingMetrics ? ( <tr><td colSpan={4} className="px-8 py-16 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-brand" /></td></tr>
                  ) : metrics.length === 0 ? ( <tr><td colSpan={4} className="px-8 py-24 text-center"><div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4"><FileSpreadsheet className="w-6 h-6 text-slate-400" /></div><p className="text-slate-500 font-medium">No metrics data available yet.</p></td></tr>
                  ) : ( metrics.map((metric, idx) => (
                      <tr key={idx} className="group hover:bg-slate-50 transition-colors">
                        <td className="px-8 py-6 text-sm font-bold text-slate-600">{metric.date}</td>
                        <td className="px-8 py-6 text-sm font-black text-slate-900">${metric.cost_metric.toLocaleString()}</td>
                        <td className="px-8 py-6 text-sm"><span className={`font-bold px-3 py-1.5 rounded-xl ${metric.delay_days > 0 ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600'}`}>{metric.delay_days} Days</span></td>
                        <td className="px-8 py-6"><span className={`px-4 py-1.5 rounded-xl text-xs font-black uppercase border ${getRiskColor(metric.billing_health)}`}>{metric.billing_health}</span></td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* C. ANOMALY DETECTION SYSTEM */}
          <section className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm p-10 flex flex-col h-full">
            <h2 className="text-3xl font-black text-slate-900 mb-4 flex items-center">
              <span className="bg-rose-500/10 text-rose-500 p-3 rounded-2xl mr-4"><ShieldAlert className="w-7 h-7" /></span>
              C. Anomaly Detection System
            </h2>
            <p className="text-slate-500 mb-8 font-medium">Automatically identifies cost spikes, timeline delays, budget overruns, and billing inconsistencies.</p>
            
            <div className="space-y-4 flex-1">
              {activeAnomalies.length > 0 ? activeAnomalies.map((anomaly, idx) => (
                  <motion.div initial={{opacity:0, y:20}} animate={{opacity:1, y:0}} transition={{delay: idx*0.1}} key={idx} className="p-5 rounded-2xl bg-slate-50 border border-slate-100 hover:border-slate-300 transition-colors">
                    <div className="flex justify-between mb-3 items-center">
                      <span className="text-sm font-black uppercase tracking-wide text-slate-700 flex items-center"><div className="w-2 h-2 bg-rose-500 rounded-full mr-2"></div>{anomaly.type}</span>
                      <span className="text-xs font-black px-3 py-1 rounded-full bg-rose-100 text-rose-600">{anomaly.severity}</span>
                    </div>
                    <p className="text-sm text-slate-600 font-medium">{anomaly.description}</p>
                  </motion.div>
                )) : ( 
                  <div className="h-full flex flex-col items-center justify-center py-12 text-center">
                    <div className="w-16 h-16 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mb-4"><CheckCircle2 className="w-8 h-8" /></div>
                    <p className="font-bold text-slate-900">All Systems Clear</p>
                    <p className="text-sm text-slate-500 mt-1">No active anomalies detected.</p>
                  </div> 
                )}
            </div>
          </section>

          {/* D. AI INSIGHT ENGINE */}
          <section className="bg-gradient-to-br from-brand to-brand-violet rounded-[2.5rem] shadow-xl p-10 text-white flex flex-col h-full relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>
            
            <h2 className="text-3xl font-black mb-4 flex items-center relative z-10">
              <span className="bg-white/20 text-white p-3 rounded-2xl mr-4 backdrop-blur-md"><Zap className="w-7 h-7" /></span>
              D. AI Insight Engine
            </h2>
            <p className="text-white/80 mb-8 font-medium relative z-10">Delivers root cause analysis, context-aware reasoning, and actionable recommendations using OpenRouter AI.</p>
            
            <div className="space-y-6 flex-1 relative z-10">
              <div className="bg-white/10 backdrop-blur-md border border-white/20 p-6 rounded-2xl">
                <h4 className="font-black text-sm text-brand-light mb-4 uppercase tracking-widest flex items-center"><AlertTriangle className="w-4 h-4 mr-2" /> Root Cause Analysis</h4>
                {aiInsight ? (
                  <div className="space-y-4">
                    <p className="text-sm leading-relaxed text-white/90"><strong className="text-white font-black bg-white/20 px-2 py-0.5 rounded mr-2">Observation:</strong> {aiInsight.observation}</p>
                    <p className="text-sm leading-relaxed text-white/90"><strong className="text-white font-black bg-white/20 px-2 py-0.5 rounded mr-2">Hypothesis:</strong> {aiInsight.hypothesis}</p>
                  </div>
                ) : metrics.length > 0 ? (
                  <p className="text-sm text-white/70 italic">Processing latest metrics...</p>
                ) : ( <p className="text-sm text-white/50 italic">Upload a CSV to generate insights.</p> )}
              </div>

              <div className="bg-white/10 backdrop-blur-md border border-white/20 p-6 rounded-2xl">
                <h4 className="font-black text-sm text-emerald-300 mb-4 uppercase tracking-widest flex items-center"><CheckCircle2 className="w-4 h-4 mr-2" /> Recommendations</h4>
                <ul className="text-sm space-y-4">
                  {aiInsight && aiInsight.recommendations && aiInsight.recommendations.length > 0 ? (
                    aiInsight.recommendations.map((rec: string, idx: number) => (
                      <li key={idx} className="flex items-start bg-white/5 p-3 rounded-xl border border-white/5"><div className="bg-emerald-400/20 text-emerald-300 p-1 rounded-md mr-3 mt-0.5"><CheckCircle2 className="w-3 h-3" /></div> <span className="text-white/90 leading-relaxed">{rec}</span></li>
                    ))
                  ) : (
                    <p className="text-sm text-white/50 italic">Awaiting AI analysis...</p>
                  )}
                </ul>
              </div>
            </div>
          </section>
        </div>
      </main>

      {/* E. CONVERSATIONAL AI INTERFACE */}
      <div className="fixed bottom-8 right-8 z-50 flex flex-col items-end pointer-events-none">
        
        {chatOpen && (
          <motion.div initial={{opacity:0, y:20, scale:0.95}} animate={{opacity:1, y:0, scale:1}} className="pointer-events-auto mb-6 w-[400px] h-[600px] bg-white rounded-[2rem] shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
            <div className="bg-slate-900 p-6 text-white shrink-0">
              <span className="text-[10px] font-black tracking-widest text-brand-light uppercase mb-1 block">E. Conversational AI Interface</span>
              <h3 className="font-black text-xl flex items-center"><MessageSquare className="w-6 h-6 mr-3 text-brand-light" />AI Assistant</h3>
              <p className="text-xs text-slate-400 mt-2">Chat-based querying for context-aware answers.</p>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50">
              {messages.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {msg.role === 'assistant' && <div className="w-8 h-8 rounded-full bg-brand text-white flex items-center justify-center mr-3 shrink-0"><Zap className="w-4 h-4" /></div>}
                  <div className={`max-w-[80%] p-4 rounded-2xl text-sm leading-relaxed shadow-sm ${msg.role === 'user' ? 'bg-brand text-white rounded-tr-none' : 'bg-white border border-slate-200 text-slate-700 rounded-tl-none'}`}>{msg.content}</div>
                </div>
              ))}
              {isTyping && (
                <div className="flex justify-start">
                   <div className="w-8 h-8 rounded-full bg-brand text-white flex items-center justify-center mr-3 shrink-0"><Zap className="w-4 h-4" /></div>
                   <div className="bg-white border border-slate-200 p-4 rounded-2xl rounded-tl-none flex space-x-2 items-center">
                     <div className="w-2 h-2 bg-slate-300 rounded-full animate-bounce"></div>
                     <div className="w-2 h-2 bg-slate-300 rounded-full animate-bounce delay-75"></div>
                     <div className="w-2 h-2 bg-slate-300 rounded-full animate-bounce delay-150"></div>
                   </div>
                </div>
              )}
            </div>
            <form onSubmit={handleSendMessage} className="p-4 border-t border-slate-200 bg-white shrink-0">
              <div className="relative">
                <input type="text" value={inputValue} onChange={(e) => setInputValue(e.target.value)} placeholder="Ask about project delays or cost..." className="w-full p-4 pr-12 bg-slate-100 rounded-xl outline-none font-medium focus:ring-2 focus:ring-brand/50 transition-all" />
                <button type="submit" disabled={isTyping} className="absolute right-2 top-2 p-2 bg-brand text-white rounded-lg hover:bg-brand-violet transition-colors"><ArrowLeft className="w-5 h-5 rotate-135" /></button>
              </div>
            </form>
          </motion.div>
        )}
        
        <button onClick={() => setChatOpen(!chatOpen)} className={`pointer-events-auto relative group flex items-center`}>
          {!chatOpen && <div className="mr-4 bg-white px-4 py-2 rounded-xl shadow-lg border border-slate-100 text-sm font-bold text-slate-700 hidden md:block">E. Conversational AI Interface</div>}
          <div className={`w-16 h-16 rounded-full shadow-2xl flex items-center justify-center transition-all duration-300 hover:scale-110 ${chatOpen ? 'bg-slate-900 text-white' : 'bg-brand text-white'}`}>
            {chatOpen ? <ArrowLeft className="w-6 h-6 -rotate-90" /> : <MessageSquare className="w-6 h-6" />}
          </div>
        </button>
      </div>
    </div>
  );
};

export default DashboardPage;
"""

with open('c:/Users/patri/OneDrive/Desktop/backup/backup/src/pages/DashboardPage.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
