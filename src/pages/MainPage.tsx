import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FolderKanban, Lock, X, Activity, ArrowRight, ShieldAlert } from 'lucide-react';
import { supabase } from '../lib/supabase';

const MainPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchCompany, setSearchCompany] = useState(location.state?.companyName || '');
  const [activeWorkspace, setActiveWorkspace] = useState<string | null>(location.state?.companyName || null);
  const [selectedProject, setSelectedProject] = useState<any | null>(null);
  const [credentials, setCredentials] = useState({ email: '', password: '' });
  const [error, setError] = useState('');

  const companyName = activeWorkspace || 'Global Workspace';

  React.useEffect(() => {
    fetchProjects();
  }, [activeWorkspace]);

  const fetchProjects = async () => {
    setLoading(true);
    setError('');
    try {
      let query = supabase.from('Projects').select('*');
      if (activeWorkspace) {
        query = query.ilike('company_name', activeWorkspace.trim());
      }
      
      const { data, error: fetchError } = await query.order('created_at', { ascending: false });
      
      if (fetchError) {
        // Fallback for case-sensitivity issues with table names
        if (fetchError.code === '42P01') {
           const retry = await supabase.from('projects').select('*').order('created_at', { ascending: false });
           if (retry.data) {
             setProjects(retry.data);
             return;
           }
        }
        throw fetchError;
      }
      setProjects(data || []);
    } catch (err: any) {
      console.error('Fetch Failed:', err);
      setError(`Database Error: ${err.message || 'Check Connection'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchCompany.trim()) {
      setActiveWorkspace(searchCompany.trim());
    } else {
      setActiveWorkspace(null);
    }
  };

  const handleOpenProject = (project: any) => {
    setSelectedProject(project);
    setError('');
    setCredentials({ email: '', password: '' });
  };

  const handleAccessSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (credentials.email === selectedProject.access_email && 
        credentials.password === selectedProject.access_password) {
      navigate(`/dashboard/${selectedProject.id}`);
      setSelectedProject(null);
    } else {
      setError('Invalid credentials for this project.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center space-x-2">
              <Activity className="w-8 h-8 text-brand" />
              <span className="text-xl font-bold tracking-tight">InsightForge</span>
            </div>
            <div className="flex items-center space-x-4 text-sm font-medium text-slate-600">
              <span className="bg-slate-100 px-3 py-1 rounded-full text-xs font-bold text-slate-500 uppercase">
                {companyName}
              </span>
              <div className="w-8 h-8 bg-brand text-white rounded-full flex items-center justify-center font-bold">
                {companyName.charAt(0)}
              </div>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-10 space-y-6 md:space-y-0">
          <div className="flex-1 max-w-xl">
            <h1 className="text-4xl font-black text-slate-900 mb-2">Workspace</h1>
            <p className="text-slate-500 mb-6 font-medium">Access and monitor all company-wide project risk profiles.</p>
            <form onSubmit={handleSearch} className="flex space-x-2">
              <input 
                type="text"
                placeholder="Enter Company Name to view workspace..."
                value={searchCompany}
                onChange={(e) => setSearchCompany(e.target.value)}
                className="flex-1 px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand outline-none transition-all shadow-sm"
              />
              <button type="submit" className="px-6 py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-colors shadow-lg">
                Search
              </button>
            </form>
          </div>
          <button onClick={() => navigate('/register')} className="px-6 py-3 bg-brand text-white rounded-xl hover:bg-brand-light transition-all font-bold shadow-lg flex items-center">
            <span className="mr-2">+</span> Register Project
          </button>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {loading ? (
            <div className="col-span-full py-20 text-center">
              <Activity className="w-10 h-10 animate-spin mx-auto text-slate-300 mb-4" />
              <p className="text-slate-500 font-medium">Loading workspace projects...</p>
            </div>
          ) : projects.length === 0 ? (
            <div className="col-span-full py-20 text-center bg-white border border-dashed border-slate-300 rounded-3xl">
              <FolderKanban className="w-12 h-12 mx-auto text-slate-300 mb-4" />
              <h3 className="text-lg font-bold text-slate-900">No projects found {activeWorkspace && `for "${activeWorkspace}"`}</h3>
              <p className="text-slate-500 mb-6">Try clearing the filter to see all projects.</p>
              <div className="flex justify-center space-x-4">
                <button onClick={() => { setActiveWorkspace(null); setSearchCompany(''); }} className="px-6 py-2 bg-slate-900 text-white rounded-xl font-bold shadow-sm">
                  Show All Projects
                </button>
                <button onClick={() => navigate('/register')} className="px-6 py-2 bg-white border border-slate-200 text-slate-600 rounded-xl font-bold">
                  + Create New
                </button>
              </div>
            </div>
          ) : (
            projects.map((project: any, index: number) => (
              <motion.div key={index} whileHover={{ y: -5 }} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all cursor-pointer group" onClick={() => handleOpenProject(project)}>
                <div className="flex justify-between items-start mb-4">
                  <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-brand">
                    <FolderKanban className="w-6 h-6" />
                  </div>
                  <span className="px-2.5 py-1 text-xs font-semibold bg-emerald-100 text-emerald-700 rounded-full flex items-center">
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full mr-1.5"></span>
                    Active
                  </span>
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-1">{project.name}</h3>
                <p className="text-sm text-slate-500 mb-4">Owner: {project.owner}</p>
                <div className="border-t border-slate-100 pt-4 flex justify-between items-center text-sm font-medium text-brand group-hover:text-brand-dark transition-colors">
                  <span className="flex items-center"><Lock className="w-4 h-4 mr-1"/> Requires Access</span>
                  <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </motion.div>
            ))
          )}
        </div>
      </main>

      <AnimatePresence>
        {selectedProject && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setSelectedProject(null)} />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative bg-white rounded-3xl w-full max-w-md p-8 shadow-2xl">
              <button onClick={() => setSelectedProject(null)} className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"><X className="w-5 h-5" /></button>
              <div className="mb-6 text-center">
                <div className="w-16 h-16 bg-brand/10 text-brand rounded-2xl flex items-center justify-center mx-auto mb-4"><ShieldAlert className="w-8 h-8" /></div>
                <h2 className="text-2xl font-bold text-slate-900">Access Restricted</h2>
                <p className="text-sm text-slate-500 mt-1">Enter credentials to access <strong className="text-slate-700">{selectedProject.name}</strong></p>
              </div>
              <form onSubmit={handleAccessSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Access Email</label>
                  <input type="email" required value={credentials.email} onChange={(e) => setCredentials({...credentials, email: e.target.value})} className="block w-full px-4 py-3 border border-slate-300 rounded-xl bg-slate-50 text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand outline-none transition-all" placeholder="access@company.com" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Access Password</label>
                  <input type="password" required value={credentials.password} onChange={(e) => setCredentials({...credentials, password: e.target.value})} className="block w-full px-4 py-3 border border-slate-300 rounded-xl bg-slate-50 text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand outline-none transition-all" placeholder="••••••••" />
                </div>
                {error && <p className="text-red-500 text-sm font-medium text-center">{error}</p>}
                <button type="submit" className="w-full py-3 px-4 mt-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-medium shadow-sm transition-colors">Unlock Dashboard</button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default MainPage;
