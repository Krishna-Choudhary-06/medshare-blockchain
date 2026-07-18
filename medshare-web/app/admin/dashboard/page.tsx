'use client';

import { motion } from 'framer-motion';
import MainLayout from '@/components/layout/MainLayout';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { useAdminDashboard } from '@/services/adminService';
import { Users, Building2, Package, FileCode2, Database, ShieldAlert, Activity, Network } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import Link from 'next/link';

function StatCard({ title, value, icon: Icon, delay, isDanger = false }: any) {
  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay }}
      className={`glass-panel p-5 flex items-center gap-4 hover:bg-white/10 transition-colors ${isDanger ? 'border-destructive/30 bg-destructive/5' : ''}`}
    >
      <div className={`p-3 rounded-lg ${isDanger ? 'bg-destructive/20 text-destructive' : 'bg-primary/20 text-primary'}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="text-xs text-muted-foreground uppercase tracking-wider mb-0.5">{title}</p>
        <h3 className={`text-2xl font-bold ${isDanger ? 'text-destructive' : 'text-white'}`}>{value}</h3>
      </div>
    </motion.div>
  );
}

export default function AdminDashboard() {
  const { data, isLoading } = useAdminDashboard();

  if (isLoading) {
    return (
      <ProtectedRoute allowedRoles={['ADMIN']}>
        <MainLayout>
          <div className="animate-pulse space-y-6">
            <div className="h-24 bg-white/5 rounded-2xl w-full" />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[...Array(8)].map((_, i) => <div key={i} className="h-24 bg-white/5 rounded-xl" />)}
            </div>
          </div>
        </MainLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute allowedRoles={['ADMIN']}>
      <MainLayout>
        <div className="flex flex-col space-y-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Operations Center</h1>
              <p className="text-sm text-muted-foreground">Global overview of MedShare runtime, blockchain nodes, and cryptographic loads.</p>
            </div>
            <div className="flex gap-2">
              <Link href="/admin/system-health" className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors">
                System Health
              </Link>
              <Link href="/admin/audit" className="bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-md text-sm font-medium shadow shadow-primary/20 transition-colors">
                Audit Explorer
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard title="Total Patients" value={data?.stats.totalPatients} icon={Users} delay={0.1} />
            <StatCard title="Total Doctors" value={data?.stats.totalDoctors} icon={Activity} delay={0.15} />
            <StatCard title="Connected Hospitals" value={data?.stats.hospitalsConnected} icon={Building2} delay={0.2} />
            <StatCard title="Fabric TXs" value={data?.stats.fabricTransactions} icon={Network} delay={0.25} />
            <StatCard title="IPFS Objects" value={data?.stats.ipfsObjects} icon={Database} delay={0.3} />
            <StatCard title="Active Contracts" value={data?.stats.activeContracts} icon={FileCode2} delay={0.35} />
            <StatCard title="Active Packages" value={data?.stats.activePackages} icon={Package} delay={0.4} />
            <StatCard title="Failed Requests" value={data?.stats.failedRequests} icon={ShieldAlert} delay={0.45} isDanger={data?.stats.failedRequests > 0} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 glass-panel p-6">
              <h3 className="text-lg font-semibold text-white mb-6">Network Throughput (Tx/Day)</h3>
              <div className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data?.chartData.activity}>
                    <defs>
                      <linearGradient id="colorRequests" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#22D3EE" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#22D3EE" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorPackages" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#2563EB" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#2563EB" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                    <XAxis dataKey="name" stroke="rgba(255,255,255,0.4)" tick={{fill: 'rgba(255,255,255,0.4)', fontSize: 12}} />
                    <YAxis stroke="rgba(255,255,255,0.4)" tick={{fill: 'rgba(255,255,255,0.4)', fontSize: 12}} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#050816', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '8px' }}
                      itemStyle={{ color: '#fff' }}
                    />
                    <Area type="monotone" dataKey="requests" name="Total Requests" stroke="#22D3EE" strokeWidth={2} fillOpacity={1} fill="url(#colorRequests)" />
                    <Area type="monotone" dataKey="packages" name="Packages Generated" stroke="#2563EB" strokeWidth={2} fillOpacity={1} fill="url(#colorPackages)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="glass-panel p-6 flex flex-col">
              <h3 className="text-lg font-semibold text-white mb-4">System Alerts</h3>
              <div className="flex-1 space-y-4">
                {data?.systemAlerts.map((alert: any) => (
                  <motion.div 
                    initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
                    key={alert.id} 
                    className={`p-4 rounded-xl border flex items-start gap-3 ${
                      alert.severity === 'error' ? 'bg-destructive/10 border-destructive/20 text-destructive' : 
                      'bg-warning/10 border-warning/20 text-warning'
                    }`}
                  >
                    <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">{alert.message}</p>
                      <p className="text-xs opacity-80 mt-1">{alert.time}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
              
              <div className="mt-6 p-4 rounded-xl bg-success/10 border border-success/20">
                <div className="flex items-center gap-2 text-success font-medium mb-1">
                  <div className="w-2 h-2 rounded-full bg-success animate-pulse" /> Coordinator Active
                </div>
                <p className="text-xs text-success/80">Unified runtime is routing all traffic properly.</p>
              </div>
            </div>
          </div>
        </div>
      </MainLayout>
    </ProtectedRoute>
  );
}
