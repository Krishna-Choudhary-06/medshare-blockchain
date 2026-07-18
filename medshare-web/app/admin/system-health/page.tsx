'use client';

import { motion } from 'framer-motion';
import MainLayout from '@/components/layout/MainLayout';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { useSystemHealth } from '@/services/adminService';
import { Cpu, MemoryStick, Activity, Network, ShieldCheck, Server } from 'lucide-react';

function HealthGauge({ title, percentage, icon: Icon, color }: any) {
  const radius = 30;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="glass-panel p-6 flex flex-col items-center justify-center relative">
      <div className="absolute top-4 left-4 text-muted-foreground"><Icon className="w-4 h-4" /></div>
      <div className="relative w-24 h-24 flex items-center justify-center">
        <svg className="w-full h-full transform -rotate-90">
          <circle cx="48" cy="48" r={radius} stroke="currentColor" strokeWidth="6" fill="transparent" className="text-white/10" />
          <motion.circle 
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset }}
            transition={{ duration: 1, ease: "easeOut" }}
            cx="48" cy="48" r={radius} stroke="currentColor" strokeWidth="6" fill="transparent"
            strokeDasharray={circumference}
            className={color}
            strokeLinecap="round"
          />
        </svg>
        <span className="absolute text-xl font-bold text-white">{percentage}%</span>
      </div>
      <p className="text-sm font-medium text-white mt-4">{title}</p>
    </div>
  );
}

export default function SystemHealth() {
  const { data, isLoading } = useSystemHealth();

  if (isLoading) return null; // Simplified loading for brevity

  return (
    <ProtectedRoute allowedRoles={['ADMIN']}>
      <MainLayout>
        <div className="flex flex-col space-y-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-white mb-2">System Health</h1>
            <p className="text-sm text-muted-foreground">Real-time telemetry from MedShare infrastructure.</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <HealthGauge title="System Overall" percentage={data?.overallScore} icon={ShieldCheck} color="text-success" />
            <HealthGauge title="CPU Load" percentage={data?.metrics.cpu} icon={Cpu} color="text-warning" />
            <HealthGauge title="Memory Usage" percentage={data?.metrics.memory} icon={MemoryStick} color="text-primary" />
            <div className="glass-panel p-6 flex flex-col items-center justify-center">
              <Activity className="w-8 h-8 text-accent mb-3" />
              <h3 className="text-3xl font-bold text-white">{data?.metrics.runtimeLatency}<span className="text-sm font-normal text-muted-foreground ml-1">ms</span></h3>
              <p className="text-sm font-medium text-white mt-1">Runtime Latency</p>
            </div>
          </div>

          <div className="glass-panel overflow-hidden">
            <div className="p-6 border-b border-white/10">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2"><Server className="w-5 h-5 text-primary" /> Core Service Status</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-muted-foreground uppercase bg-white/5 border-b border-white/10">
                  <tr>
                    <th className="px-6 py-4 font-medium">Service</th>
                    <th className="px-6 py-4 font-medium">Status</th>
                    <th className="px-6 py-4 font-medium">Latency</th>
                    <th className="px-6 py-4 font-medium">Uptime</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.services.map((svc: any, i: number) => (
                    <motion.tr 
                      initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.1 }}
                      key={svc.name} className="border-b border-white/5 hover:bg-white/5"
                    >
                      <td className="px-6 py-4 font-medium text-white">{svc.name}</td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-1 text-xs font-bold rounded-full bg-success/20 text-success border border-success/30">
                          {svc.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-muted-foreground">{svc.latency} ms</td>
                      <td className="px-6 py-4 text-muted-foreground">{svc.uptime}</td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </MainLayout>
    </ProtectedRoute>
  );
}
