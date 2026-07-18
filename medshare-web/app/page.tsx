'use client';

import { motion } from 'framer-motion';
import { Shield, FileText, Share2, AlertCircle } from 'lucide-react';
import MainLayout from '@/components/layout/MainLayout';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { usePatientDashboard } from '@/services/patientService';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';

function StatCard({ title, value, icon: Icon, trend }: any) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-panel p-6 flex flex-col hover:bg-white/10 transition-colors cursor-default"
    >
      <div className="flex justify-between items-start mb-4">
        <div className="p-3 bg-primary/20 rounded-xl text-primary">
          <Icon className="w-5 h-5" />
        </div>
        {trend && <span className="text-xs font-medium text-success bg-success/20 px-2 py-1 rounded-full">{trend}</span>}
      </div>
      <h3 className="text-3xl font-bold text-white mb-1">{value}</h3>
      <p className="text-sm text-muted-foreground">{title}</p>
    </motion.div>
  );
}

export default function Dashboard() {
  const { data, isLoading } = usePatientDashboard();

  if (isLoading) {
    return (
      <ProtectedRoute>
        <MainLayout>
          <div className="animate-pulse space-y-6">
            <div className="h-24 bg-white/5 rounded-2xl w-full" />
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {[1, 2, 3, 4].map(i => <div key={i} className="h-32 bg-white/5 rounded-2xl" />)}
            </div>
          </div>
        </MainLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <MainLayout>
        <div className="flex flex-col space-y-8">
          
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="flex flex-col md:flex-row md:items-center justify-between gap-4 glass-panel p-8 bg-gradient-to-r from-primary/10 to-transparent"
          >
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Welcome to MedShare</h1>
              <p className="text-muted-foreground">Your blockchain-secured medical records overview.</p>
            </div>
            <button className="bg-primary hover:bg-primary/90 text-white px-6 py-2.5 rounded-lg font-medium shadow-lg shadow-primary/25 transition-all active:scale-95">
              Upload New Record
            </button>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard title="Total Records" value={data?.stats.totalRecords} icon={FileText} trend="+2 this month" />
            <StatCard title="Shared Records" value={data?.stats.sharedRecords} icon={Share2} />
            <StatCard title="Pending Requests" value={data?.stats.pendingRequests} icon={AlertCircle} trend="Requires Action" />
            <StatCard title="Protected Entities" value="100%" icon={Shield} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 glass-panel p-6">
              <h3 className="text-lg font-semibold text-white mb-6">Uploads & Storage Trends</h3>
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data?.chartData.uploads}>
                    <defs>
                      <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#2563EB" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#2563EB" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false} />
                    <XAxis dataKey="name" stroke="rgba(255,255,255,0.5)" tick={{fill: 'rgba(255,255,255,0.5)'}} />
                    <YAxis stroke="rgba(255,255,255,0.5)" tick={{fill: 'rgba(255,255,255,0.5)'}} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#050816', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '12px' }}
                      itemStyle={{ color: '#fff' }}
                    />
                    <Area type="monotone" dataKey="value" stroke="#2563EB" strokeWidth={3} fillOpacity={1} fill="url(#colorValue)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="glass-panel p-6 flex flex-col">
              <h3 className="text-lg font-semibold text-white mb-6">Recent Blockchain Activity</h3>
              <div className="flex-1 overflow-y-auto space-y-6 relative before:absolute before:inset-0 before:ml-2 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-white/10 before:to-transparent">
                {data?.recentActivity.map((act: any, i: number) => (
                  <motion.div 
                    initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.1 }}
                    key={act.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active"
                  >
                    <div className="flex items-center justify-center w-5 h-5 rounded-full border border-primary bg-[#050816] text-primary shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow" />
                    <div className="w-[calc(100%-2rem)] md:w-[calc(50%-1.5rem)] glass-panel p-3 rounded-lg text-sm">
                      <p className="font-medium text-white">{act.action} - {act.resource}</p>
                      <p className="text-muted-foreground text-xs mt-1">Confirmed on Ledger</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </MainLayout>
    </ProtectedRoute>
  );
}
