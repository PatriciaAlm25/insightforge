import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, ArrowLeft, Zap, Loader2, Trash2 } from 'lucide-react';

interface Props { projectId: string; metrics: any[]; }

export const AiChat: React.FC<Props> = ({ projectId, metrics }) => {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<{role:string;content:string}[]>([]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open && !loaded && projectId) {
      (async () => {
        try {
          const r = await fetch(`http://localhost:3002/chat-history/${projectId}`);
          const data = await r.json();
          if (Array.isArray(data) && data.length > 0) {
            setMessages(data.map((d:any) => ({ role: d.role, content: d.content })));
          } else {
            setMessages([{ role: 'assistant', content: "Hi! I'm InsightForge AI. I've been briefed on your project data. Ask me anything — about costs, delays, employee performance, or what might go wrong next." }]);
          }
        } catch {
          setMessages([{ role: 'assistant', content: "Hi! I'm InsightForge AI. Ask me anything about your project." }]);
        }
        setLoaded(true);
      })();
    }
  }, [open, projectId]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, typing]);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || typing) return;
    const msg = input.trim();
    setMessages(prev => [...prev, { role: 'user', content: msg }]);
    setInput('');
    setTyping(true);
    try {
      const r = await fetch('http://localhost:3002/chat', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg, projectId, context: metrics })
      });
      const data = await r.json();
      setMessages(prev => [...prev, { role: 'assistant', content: data.reply || 'Sorry, I had trouble responding.' }]);
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Network error. Is the server running?' }]);
    }
    setTyping(false);
  };

  const clear = () => { setMessages([{ role: 'assistant', content: "Chat cleared! How can I help you?" }]); setLoaded(false); };

  return (
    <div className="fixed bottom-8 right-8 z-50 flex flex-col items-end">
      {open && (
        <div className="mb-4 w-[400px] h-[580px] bg-white rounded-[2rem] shadow-2xl border border-slate-200 flex flex-col overflow-hidden">
          <div className="bg-gradient-to-r from-indigo-600 to-violet-600 p-5 shrink-0">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-black tracking-widest text-white/60 uppercase block mb-0.5">E. Conversational AI Interface</span>
                <h3 className="font-black text-white text-lg flex items-center gap-2"><MessageSquare className="w-5 h-5" />InsightForge AI</h3>
              </div>
              <button onClick={clear} className="bg-white/10 hover:bg-white/20 text-white p-2 rounded-lg transition-colors" title="Clear chat"><Trash2 className="w-4 h-4" /></button>
            </div>
            <p className="text-white/60 text-xs mt-1">Context-aware answers · Chat memory · Project insights</p>
          </div>
          <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-slate-50">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} items-end gap-2`}>
                {m.role === 'assistant' && <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center shrink-0"><Zap className="w-4 h-4 text-white" /></div>}
                <div className={`max-w-[78%] px-4 py-3 rounded-2xl text-sm leading-relaxed shadow-sm ${m.role === 'user' ? 'bg-indigo-600 text-white rounded-br-none' : 'bg-white border border-slate-200 text-slate-700 rounded-bl-none'}`}>
                  {m.content}
                </div>
              </div>
            ))}
            {typing && (
              <div className="flex items-end gap-2">
                <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center shrink-0"><Zap className="w-4 h-4 text-white" /></div>
                <div className="bg-white border border-slate-200 px-5 py-4 rounded-2xl rounded-bl-none flex gap-1.5">
                  <div className="w-2 h-2 bg-slate-300 rounded-full animate-bounce" />
                  <div className="w-2 h-2 bg-slate-300 rounded-full animate-bounce [animation-delay:0.1s]" />
                  <div className="w-2 h-2 bg-slate-300 rounded-full animate-bounce [animation-delay:0.2s]" />
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>
          <form onSubmit={send} className="p-4 bg-white border-t border-slate-200 shrink-0">
            <div className="flex gap-2">
              <input type="text" value={input} onChange={e => setInput(e.target.value)} placeholder="Ask about delays, risks, performance..." className="flex-1 bg-slate-100 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-400" />
              <button type="submit" disabled={typing} className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white p-3 rounded-xl transition-colors">
                {typing ? <Loader2 className="w-5 h-5 animate-spin" /> : <svg className="w-5 h-5 rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>}
              </button>
            </div>
          </form>
        </div>
      )}
      <button onClick={() => setOpen(!open)} className={`relative w-16 h-16 rounded-full shadow-2xl flex items-center justify-center transition-all duration-300 hover:scale-110 ${open ? 'bg-slate-800' : 'bg-indigo-600 hover:bg-indigo-700'}`}>
        {open ? <ArrowLeft className="w-6 h-6 text-white" /> : <MessageSquare className="w-6 h-6 text-white" />}
        {!open && <span className="absolute -top-1 -right-1 w-5 h-5 bg-emerald-400 rounded-full border-2 border-white animate-pulse" />}
      </button>
    </div>
  );
};
