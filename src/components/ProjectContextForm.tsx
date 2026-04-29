import React, { useState } from 'react';
import { Settings, Save, Loader2 } from 'lucide-react';

interface Props { projectId: string; }

export const ProjectContextForm: React.FC<Props> = ({ projectId }) => {
  const [form, setForm] = useState({ description: '', outcomes: '', deadlines: '', employeeCount: 5 });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const save = async () => {
    setSaving(true);
    await fetch('http://localhost:3002/project-context', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId, ...form })
    });
    setSaving(false); setSaved(true); setTimeout(() => setSaved(false), 2000);
  };

  return (
    <section className="bg-white rounded-[2rem] border border-slate-200 shadow-sm p-10">
      <h2 className="text-2xl font-black text-slate-900 mb-2 flex items-center">
        <span className="bg-violet-100 text-violet-600 p-3 rounded-2xl mr-4"><Settings className="w-6 h-6" /></span>
        F. Project Setup & Context
      </h2>
      <p className="text-slate-500 mb-8 ml-[3.5rem]">Provide project details to give the AI agent full context for smarter, project-specific answers.</p>
      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Project Description</label>
          <textarea rows={4} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm outline-none focus:ring-2 focus:ring-violet-400 resize-none" placeholder="Describe what this project aims to achieve..." value={form.description} onChange={e => setForm({...form, description: e.target.value})} />
        </div>
        <div>
          <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Expected Outcomes</label>
          <textarea rows={4} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm outline-none focus:ring-2 focus:ring-violet-400 resize-none" placeholder="What are the deliverables and KPIs..." value={form.outcomes} onChange={e => setForm({...form, outcomes: e.target.value})} />
        </div>
        <div>
          <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Key Deadlines</label>
          <input type="text" className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm outline-none focus:ring-2 focus:ring-violet-400" placeholder="e.g. Phase 1: June 30, Launch: Sept 1" value={form.deadlines} onChange={e => setForm({...form, deadlines: e.target.value})} />
        </div>
        <div>
          <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Number of Employees</label>
          <input type="number" min={1} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm outline-none focus:ring-2 focus:ring-violet-400" value={form.employeeCount} onChange={e => setForm({...form, employeeCount: parseInt(e.target.value)||1})} />
        </div>
      </div>
      <button onClick={save} disabled={saving} className="mt-6 bg-violet-600 hover:bg-violet-700 text-white font-bold px-8 py-3 rounded-xl flex items-center gap-2 transition-colors disabled:opacity-50">
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
        {saved ? 'Saved!' : saving ? 'Saving...' : 'Save Context'}
      </button>
    </section>
  );
};
