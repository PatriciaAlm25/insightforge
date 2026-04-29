import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Users, Loader2 } from 'lucide-react';

interface Props { projectId: string; refreshKey?: number; }

export const EmployeeAnalytics: React.FC<Props> = ({ projectId, refreshKey }) => {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!projectId) return;
    (async () => {
      setLoading(true);
      try {
        const r = await fetch(`http://localhost:3002/employee-performance/${projectId}`);
        const d = await r.json();
        setData(Array.isArray(d) ? d.map(e => ({
          name: e.employee_name,
          Assigned: e.tasks_assigned,
          Completed: e.tasks_completed,
          Efficiency: parseFloat(e.efficiency_score),
        })) : []);
      } catch { setData([]); }
      setLoading(false);
    })();
  }, [projectId, refreshKey]);

  const getColor = (eff: number) => eff >= 90 ? '#10b981' : eff >= 70 ? '#f59e0b' : '#ef4444';

  return (
    <section className="bg-white rounded-[2rem] border border-slate-200 shadow-sm p-10">
      <h2 className="text-2xl font-black text-slate-900 mb-2 flex items-center">
        <span className="bg-blue-100 text-blue-600 p-3 rounded-2xl mr-4"><Users className="w-6 h-6" /></span>
        H. Employee Resource Allocation
      </h2>
      <p className="text-slate-500 mb-8 ml-[3.5rem] text-sm">Monitor individual performance and identify who has bandwidth for more work.</p>

      {loading ? (
        <div className="flex items-center justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-blue-500" /></div>
      ) : data.length === 0 ? (
        <div className="py-20 text-center border-2 border-dashed border-slate-100 rounded-3xl">
          <Users className="w-12 h-12 text-slate-200 mx-auto mb-4" />
          <p className="font-bold text-slate-900">No Employee Data Found</p>
          <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto">Upload a CSV containing employee names and task statuses to automatically generate this performance graph.</p>
        </div>
      ) : (
        <>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="name" tick={{ fontSize: 12, fontWeight: 700, fill: '#64748b' }} />
              <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} />
              <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }} />
              <Legend />
              <Bar dataKey="Assigned" fill="#cbd5e1" radius={[6, 6, 0, 0]} />
              <Bar dataKey="Completed" fill="#6366f1" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>

          <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4">
            {data.map((emp, i) => (
              <div key={i} className="bg-slate-50 rounded-2xl p-5 border border-slate-100">
                <div className="text-xs font-black uppercase tracking-wide text-slate-400 mb-2">{emp.name}</div>
                <div className="text-3xl font-black mb-1" style={{ color: getColor(emp.Efficiency) }}>{emp.Efficiency.toFixed(0)}%</div>
                <div className="text-xs text-slate-500">{emp.Completed}/{emp.Assigned} tasks</div>
                <div className="mt-3 w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${emp.Efficiency}%`, backgroundColor: getColor(emp.Efficiency) }} />
                </div>
                <div className="text-xs font-bold mt-2" style={{ color: getColor(emp.Efficiency) }}>
                  {emp.Efficiency >= 90 ? '✅ High Capacity' : emp.Efficiency >= 70 ? '⚠️ Moderate' : '🔴 Overloaded'}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </section>
  );
};
