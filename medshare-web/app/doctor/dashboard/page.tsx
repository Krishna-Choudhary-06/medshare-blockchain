'use client';

import { motion } from 'framer-motion';
import { FileCheck2, Clock, Users, ShieldCheck, Activity } from 'lucide-react';
import MainLayout from '@/components/layout/MainLayout';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { useDoctorDashboard } from '@/services/doctorService';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import Link from 'next/link';

function StatCard({ title, value, icon: Icon, colorClass }: any) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-panel p-6 flex flex-col hover:bg-white/10 transition-colors"
    >
      <div className="flex justify-between items-start mb-4">
        <div className={`p-3 rounded-xl ${colorClass}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      <h3 className="text-3xl font-bold text-white mb-1">{value}</h3>
      <p className="text-sm text-muted-foreground">{title}</p>
    </motion.div>
  );
}

export default function DoctorDashboard() {
  const { data, isLoading } = useDoctorDashboard();

  if (isLoading) {
    return (
      <ProtectedRoute allowedRoles={['DOCTOR', 'ADMIN']}>
        <MainLayout>
          <div className="animate-pulse space-y-6">
            <div className="h-24 bg-white/5 rounded-2xl w-full" />
            <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
              {[1, 2, 3, 4, 5].map(i => <div key={i} className="h-32 bg-white/5 rounded-2xl" />)}
            </div>
          </div>
        </MainLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute allowedRoles={['DOCTOR', 'ADMIN']}>
      <MainLayout>
        <div className="flex flex-col space-y-8">
          
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="flex flex-col md:flex-row md:items-center justify-between gap-4 glass-panel p-8 bg-gradient-to-r from-accent/10 to-transparent border-accent/20"
          >
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Doctor Workspace</h1>
              <p className="text-muted-foreground">Manage your patients, pending access requests, and encrypted packages.</p>
            </div>
            <div className="flex gap-3">
              <Link href="/doctor/requests" className="bg-white/10 hover:bg-white/20 text-white px-5 py-2.5 rounded-lg font-medium transition-colors">
                View Requests
              </Link>
              <Link href="/doctor/approved" className="bg-accent hover:bg-accent/90 text-[#050816] px-5 py-2.5 rounded-lg font-medium shadow-lg shadow-accent/25 transition-all">
                Access Records
              </Link>
            </div>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
            <StatCard title="Pending Requests" value={data?.stats.pendingRequests} icon={Clock} colorClass="bg-warning/20 text-warning" />
            <StatCard title="Approved Records" value={data?.stats.approvedRecords} icon={FileCheck2} colorClass="bg-success/20 text-success" />
            <StatCard title="Today's Patients" value={data?.stats.todaysPatients} icon={Users} colorClass="bg-primary/20 text-primary" />
            <StatCard title="Successful Decrypts" value={data?.stats.successfulDecryptions} icon={ShieldCheck} colorClass="bg-accent/20 text-accent" />
            <StatCard title="Active Packages" value={data?.stats.activePackages} icon={Activity} colorClass="bg-destructive/20 text-destructive" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 glass-panel p-6">
              <h3 className="text-lg font-semibold text-white mb-6">Patient Requests Volume</h3>
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data?.chartData.requests}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false} />
                    <XAxis dataKey="name" stroke="rgba(255,255,255,0.5)" tick={{fill: 'rgba(255,255,255,0.5)'}} />
                    <YAxis stroke="rgba(255,255,255,0.5)" tick={{fill: 'rgba(255,255,255,0.5)'}} />
                    <Tooltip 
                      cursor={{fill: 'rgba(255,255,255,0.05)'}}
                      contentStyle={{ backgroundColor: '#050816', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '12px' }}
                      itemStyle={{ color: '#fff' }}
                    />
                    <Bar dataKey="value" fill="#22D3EE" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="glass-panel p-6 flex flex-col">
              <h3 className="text-lg font-semibold text-white mb-6">Recent Authorizations</h3>
              <div className="space-y-4 flex-1 overflow-y-auto">
                {data?.recentRequests.map((req: any, i: number) => (
                  <motion.div 
                    initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.1 }}
                    key={req.id} className="p-4 rounded-xl bg-white/5 border border-white/10 flex justify-between items-center"
                  >
                    <div>
                      <p className="font-medium text-white text-sm">{req.patient}</p>
                      <p className="text-xs text-muted-foreground mt-1">{req.id}</p>
                    </div>
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider ${
                      req.status === 'APPROVED' ? 'bg-success/20 text-success' : 'bg-warning/20 text-warning'
                    }`}>
                      {req.status}
                    </span>
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
