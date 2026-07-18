'use client';

import { motion } from 'framer-motion';
import MainLayout from '@/components/layout/MainLayout';
import { useResearchDashboard } from '@/services/researchService';
import { Network, Database, Shield, Lock, FileCode2, Package, Activity, SearchCheck, History, Users } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

// Animated counter component for the research dashboard
function AnimatedCounter({ value }: { value: number }) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    const duration = 1500; // ms
    const steps = 60;
    const stepTime = duration / steps;
    let currentStep = 0;

    const timer = setInterval(() => {
      currentStep++;
      setDisplayValue(Math.floor((value / steps) * currentStep));
      if (currentStep >= steps) {
        clearInterval(timer);
        setDisplayValue(value);
      }
    }, stepTime);

    return () => clearInterval(timer);
  }, [value]);

  return <span>{displayValue.toLocaleString()}</span>;
}

function StatCard({ title, value, icon: Icon, delay, color }: any) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className={`glass-panel p-6 flex flex-col items-start gap-4 hover:bg-white/10 transition-colors border-l-4 ${color}`}
    >
      <div className={`p-3 rounded-xl bg-white/5`}>
        <Icon className="w-6 h-6 text-white" />
      </div>
      <div>
        <h3 className="text-3xl font-bold text-white mb-1 font-mono tracking-tight">
          <AnimatedCounter value={value} />
        </h3>
        <p className="text-xs text-muted-foreground uppercase tracking-widest">{title}</p>
      </div>
    </motion.div>
  );
}

const MODULES = [
  { name: 'Runtime Pipeline', path: '/research/runtime', desc: 'Animated end-to-end execution flow' },
  { name: 'BGW Visualizer', path: '/research/bgw', desc: 'Broadcast Encryption cryptographic rendering' },
  { name: 'Fabric Explorer', path: '/research/fabric', desc: 'Hyperledger Fabric ledger & blocks' },
  { name: 'IPFS Explorer', path: '/research/ipfs', desc: 'Decentralized storage visualizer' },
];

export default function ResearchDashboard() {
  const { data, isLoading } = useResearchDashboard();

  if (isLoading) return null; // Simplified

  return (
    <MainLayout>
      <div className="flex flex-col space-y-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 glass-panel p-8 bg-gradient-to-r from-primary/10 via-transparent to-accent/10 border-none">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-3 h-3 rounded-full bg-success animate-pulse shadow-[0_0_10px_#10b981]" />
              <span className="text-success text-sm font-medium tracking-widest uppercase">Live Research Telemetry</span>
            </div>
            <h1 className="text-4xl font-bold tracking-tight text-white mb-2">MeDShare Architecture</h1>
            <p className="text-muted-foreground max-w-2xl">
              An interactive visualization platform demonstrating the blockchain-secured medical record workflow, cryptographic BGW pipeline, and system provenance.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
          <StatCard title="Active Packages" value={data?.stats.activePackages} icon={Package} delay={0.1} color="border-primary" />
          <StatCard title="Fabric Transactions" value={data?.stats.fabricTransactions} icon={Network} delay={0.15} color="border-accent" />
          <StatCard title="IPFS Objects" value={data?.stats.ipfsObjects} icon={Database} delay={0.2} color="border-success" />
          <StatCard title="BGW Groups" value={data?.stats.bgwBroadcastGroups} icon={Shield} delay={0.25} color="border-warning" />
          <StatCard title="Smart Contracts" value={data?.stats.smartContracts} icon={FileCode2} delay={0.3} color="border-destructive" />
          
          <StatCard title="Active Requests" value={data?.stats.activeRequests} icon={Activity} delay={0.35} color="border-white/50" />
          <StatCard title="Coordinator Executions" value={data?.stats.coordinatorExecutions} icon={Users} delay={0.4} color="border-primary" />
          <StatCard title="Audit Events" value={data?.stats.auditEvents} icon={SearchCheck} delay={0.45} color="border-accent" />
          <StatCard title="Provenance Events" value={data?.stats.provenanceEvents} icon={History} delay={0.5} color="border-success" />
          <StatCard title="Permission Checks" value={data?.stats.permissionChecks} icon={Lock} delay={0.55} color="border-warning" />
        </div>

        <div>
          <h2 className="text-xl font-bold text-white mb-4 mt-8">Deep-Dive Modules</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {MODULES.map((mod, i) => (
              <Link key={mod.path} href={mod.path}>
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.6 + (i * 0.1) }}
                  className="glass-panel p-6 hover:bg-white/10 hover:border-primary/50 transition-all cursor-pointer h-full flex flex-col group"
                >
                  <h3 className="text-lg font-bold text-white group-hover:text-primary transition-colors">{mod.name}</h3>
                  <p className="text-sm text-muted-foreground mt-2">{mod.desc}</p>
                </motion.div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
