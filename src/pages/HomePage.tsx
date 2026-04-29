import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Activity, ShieldAlert, Zap, Layers, BarChart, FileText } from 'lucide-react';

const HomePage: React.FC = () => {
  const navigate = useNavigate();

  const features = [
    {
      title: 'Automated Risk Detection',
      description: 'Instantly identify cost spikes, timeline delays, and budget overruns.',
      icon: <Activity className="w-8 h-8 text-brand-light" />
    },
    {
      title: 'AI Insight Engine',
      description: 'Understand the root cause of risks with context-aware reasoning.',
      icon: <Zap className="w-8 h-8 text-brand-light" />
    },
    {
      title: 'Conversational Interface',
      description: 'Chat directly with your project data to get actionable insights.',
      icon: <FileText className="w-8 h-8 text-brand-light" />
    },
    {
      title: 'Autonomous Workflows',
      description: 'Trigger n8n workflows automatically when anomalies are detected.',
      icon: <Layers className="w-8 h-8 text-brand-light" />
    },
    {
      title: 'Real-time Dashboard',
      description: 'Live updates from Supabase so you never miss a critical change.',
      icon: <BarChart className="w-8 h-8 text-brand-light" />
    },
    {
      title: 'Actionable Recommendations',
      description: 'Not just alerts. Get AI-driven suggestions on what to do next.',
      icon: <ShieldAlert className="w-8 h-8 text-brand-light" />
    }
  ];

  return (
    <div className="min-h-screen bg-slate-900 text-slate-50 font-sans relative overflow-hidden">
      {/* Background Image Overlay */}
      <div 
        className="absolute inset-0 z-0 opacity-20 bg-cover bg-center"
        style={{ backgroundImage: 'url("https://images.unsplash.com/photo-1497366216548-37526070297c?q=80&w=2069&auto=format&fit=crop")' }}
      />
      
      {/* Animated Gradient Background */}
      <div className="absolute inset-0 z-0 opacity-40 bg-gradient-to-br from-brand-dark via-brand-violetDark to-brand mix-blend-multiply" />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-16">
        <header className="flex justify-between items-center py-6 mb-16 border-b border-white/10">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            className="text-3xl font-bold tracking-tight"
          >
            <span className="text-white">Insight</span>
            <span className="text-brand-light">Forge</span>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            className="flex items-center space-x-4"
          >
            <button 
              onClick={() => navigate('/main')}
              className="text-sm font-bold text-slate-300 hover:text-white transition-colors"
            >
              Project Panel
            </button>
            <button 
              onClick={() => navigate('/register')}
              className="px-6 py-2 bg-brand-violet hover:bg-brand-violetDark transition-colors rounded-full font-semibold shadow-[0_0_15px_rgba(109,40,217,0.5)]"
            >
              Register Project
            </button>
          </motion.div>
        </header>

        <main>
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center max-w-3xl mx-auto mb-20"
          >
            <h1 className="text-5xl md:text-7xl font-extrabold mb-6 leading-tight">
              AI-Powered Project <br/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-light to-brand-violet">Risk Intelligence</span>
            </h1>
            <p className="text-xl text-slate-300 mb-10 leading-relaxed">
              Not just a dashboard. A decision-support system that detects risks automatically, explains why they happen, and suggests what to do next.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-6">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => navigate('/main')}
                className="px-10 py-4 bg-gradient-to-r from-brand to-brand-violet rounded-full text-xl font-bold shadow-[0_0_30px_rgba(59,130,246,0.6)] hover:shadow-[0_0_40px_rgba(109,40,217,0.8)] transition-all"
              >
                Get Started
              </motion.button>
              
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => navigate('/register')}
                className="px-10 py-4 bg-white/10 hover:bg-white/20 border border-white/20 rounded-full text-xl font-bold backdrop-blur-sm transition-all"
              >
                Register Project
              </motion.button>
            </div>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-24">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="bg-white/5 backdrop-blur-md border border-white/10 p-8 rounded-2xl hover:bg-white/10 transition-colors"
              >
                <div className="mb-4">{feature.icon}</div>
                <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
                <p className="text-slate-400">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </main>
      </div>

      <footer className="relative z-10 border-t border-white/10 py-8 bg-black/20 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center">
          <p className="text-slate-400 text-sm">© 2026 InsightForge. All rights reserved.</p>
          <div className="mt-4 md:mt-0 flex items-center space-x-4">
            <span className="text-sm text-slate-400">Developed by <strong className="text-brand-light">Codex</strong></span>
            <a href="mailto:contact@codex.dev" className="text-sm hover:text-brand-light transition-colors">Contact Developers</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default HomePage;
