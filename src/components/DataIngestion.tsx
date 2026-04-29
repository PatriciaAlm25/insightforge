import React, { useState } from 'react';
import { Upload, FileSpreadsheet, Loader2, CheckCircle, XCircle, ChevronDown, ChevronUp } from 'lucide-react';

interface Props { projectId: string; onUploadComplete: () => void; }

export const DataIngestion: React.FC<Props> = ({ projectId, onUploadComplete }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [expanded, setExpanded] = useState<number | null>(null);

  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  const handleFileChange = (files: FileList | null) => {
    if (!files) return;
    setSelectedFiles(Array.from(files));
  };

  const upload = async () => {
    if (selectedFiles.length === 0) return;
    setUploading(true);
    setResults([]);
    const fd = new FormData();
    selectedFiles.forEach(f => fd.append('files', f));
    fd.append('projectId', projectId);
    try {
      const res = await fetch('http://localhost:3002/upload-csv', { method: 'POST', body: fd });
      const data = await res.json();
      setResults(data.results || []);
      setSelectedFiles([]);
      onUploadComplete();
    } catch (e: any) {
      setResults([{ error: e.message }]);
    }
    setUploading(false);
  };

  return (
    <section className="relative overflow-hidden bg-slate-900 rounded-[2.5rem] p-10 text-white shadow-2xl">
      <div className="absolute -top-20 -right-20 w-80 h-80 bg-indigo-500/20 rounded-full blur-[100px]" />
      <div className="absolute -bottom-10 -left-10 w-56 h-56 bg-violet-500/10 rounded-full blur-[80px]" />
      <div className="relative z-10">
        <h2 className="text-2xl font-black mb-1 flex items-center">
          <span className="bg-white/10 p-3 rounded-2xl mr-4 border border-white/10"><Upload className="w-6 h-6" /></span>
          A. Data Ingestion Layer
        </h2>
        <p className="text-slate-400 mb-8 ml-[3.5rem] text-sm">
          Select or drag <strong className="text-white">one or more CSV files</strong>. Any structure is accepted.
        </p>

        <div
          onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={e => { e.preventDefault(); setIsDragging(false); handleFileChange(e.dataTransfer.files); }}
          className={`relative border-2 border-dashed rounded-2xl p-10 text-center transition-all duration-300 ${isDragging ? 'border-indigo-400 bg-white/10 scale-[1.01]' : 'border-white/20 hover:border-indigo-400/50'} ${uploading ? 'opacity-60 pointer-events-none' : ''}`}
        >
          <input type="file" accept=".csv" multiple className="absolute inset-0 opacity-0 cursor-pointer" onChange={e => handleFileChange(e.target.files)} />
          <div className="w-14 h-14 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-xl">
            <FileSpreadsheet className="w-7 h-7" />
          </div>
          <p className="text-lg font-bold mb-1">Click or Drag Files Here</p>
          <p className="text-slate-400 text-xs">Supports multiple .csv files</p>
        </div>

        {selectedFiles.length > 0 && (
          <div className="mt-6 p-6 bg-white/5 border border-white/10 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-500/20 rounded-lg"><FileSpreadsheet className="w-5 h-5 text-indigo-400" /></div>
              <div>
                <p className="font-bold text-sm">{selectedFiles.length} file(s) selected</p>
                <p className="text-xs text-slate-400">{selectedFiles.map(f => f.name).join(', ')}</p>
              </div>
            </div>
            <button
              onClick={upload}
              disabled={uploading}
              className="w-full md:w-auto bg-indigo-600 hover:bg-indigo-700 text-white font-black px-8 py-3 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-600/20 disabled:opacity-50"
            >
              {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
              {uploading ? 'AI Analyzing...' : 'Upload & Analyze Data'}
            </button>
          </div>
        )}

        {results.length > 0 && (
          <div className="mt-6 space-y-3">
            {results.map((r, i) => (
              <div key={i} className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
                <button
                  className="w-full flex items-center justify-between p-5 text-left hover:bg-white/5 transition-colors"
                  onClick={() => setExpanded(expanded === i ? null : i)}
                >
                  <div className="flex items-center gap-3">
                    {r.error ? <XCircle className="w-5 h-5 text-rose-400" /> : <CheckCircle className="w-5 h-5 text-emerald-400" />}
                    <span className="font-bold">{r.file}</span>
                    {r.analysis && <span className="text-xs text-indigo-300 bg-indigo-400/10 px-3 py-1 rounded-full border border-indigo-400/20">{r.analysis.data_type}</span>}
                  </div>
                  {expanded === i ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                </button>

                {expanded === i && r.analysis && (
                  <div className="px-5 pb-5 space-y-4 border-t border-white/10 pt-4">
                    <p className="text-sm text-slate-300 leading-relaxed">{r.analysis.summary}</p>
                    {r.analysis.risks?.length > 0 && (
                      <div>
                        <p className="text-xs font-black text-rose-400 uppercase tracking-wider mb-2">Detected Risks</p>
                        <ul className="space-y-1">{r.analysis.risks.map((risk: string, ri: number) => (
                          <li key={ri} className="text-sm text-slate-300 flex items-start gap-2"><span className="text-rose-400 mt-0.5">⚠</span>{risk}</li>
                        ))}</ul>
                      </div>
                    )}
                    {r.analysis.recommendations?.length > 0 && (
                      <div>
                        <p className="text-xs font-black text-emerald-400 uppercase tracking-wider mb-2">Recommendations</p>
                        <ul className="space-y-1">{r.analysis.recommendations.map((rec: string, ri: number) => (
                          <li key={ri} className="text-sm text-slate-300 flex items-start gap-2"><span className="text-emerald-400 mt-0.5">✓</span>{rec}</li>
                        ))}</ul>
                      </div>
                    )}
                  </div>
                )}
                {expanded === i && r.error && <p className="px-5 pb-4 text-rose-400 text-sm">{r.error}</p>}
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};
