'use client';

import { motion } from 'framer-motion';
import MainLayout from '@/components/layout/MainLayout';
import { useBgwVisualizer } from '@/services/researchService';
import { Shield, Key, Users, ArrowRightLeft, Lock, Fingerprint } from 'lucide-react';

function CryptoMetric({ label, value, unit }: any) {
  return (
    <div className="flex flex-col p-4 bg-white/5 rounded-lg border border-white/10">
      <span className="text-xs text-muted-foreground uppercase tracking-widest mb-1">{label}</span>
      <div className="flex items-baseline gap-1">
        <span className="text-2xl font-bold text-white">{value}</span>
        <span className="text-sm font-medium text-accent">{unit}</span>
      </div>
    </div>
  );
}

export default function BgwVisualizer() {
  const { data, isLoading } = useBgwVisualizer();

  if (isLoading) return null;

  return (
    <MainLayout>
      <div className="flex flex-col space-y-8 h-full">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white mb-2">BGW Broadcast Encryption Visualizer</h1>
          <p className="text-sm text-muted-foreground max-w-3xl">
            Real-time rendering of the BLS12-381 pairing-based cryptography used for sharing medical records. 
            This graph demonstrates how a single encrypted payload (the broadcast header) can be securely accessed by an authorized subset of users, without generating unique keys for each.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Left Panel: Metrics & Setup */}
          <div className="lg:col-span-1 space-y-6">
            <div className="glass-panel p-6">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2"><Key className="w-5 h-5 text-warning" /> Public Parameters</h3>
              <div className="space-y-4">
                <CryptoMetric label="Active Key Pairs" value={data?.activeKeys} unit="keys" />
                <CryptoMetric label="Revoked Keys" value={data?.revokedKeys} unit="nodes" />
                <CryptoMetric label="Header Size" value={data?.metrics.headerSizeKB} unit="KB" />
                <CryptoMetric label="Avg Encrypt Latency" value={data?.metrics.encryptionTimeMs} unit="ms" />
                <CryptoMetric label="Avg Decrypt Latency" value={data?.metrics.decryptionTimeMs} unit="ms" />
              </div>
            </div>
          </div>

          {/* Right Panel: Visualization Engine */}
          <div className="lg:col-span-3 glass-panel p-8 flex flex-col relative overflow-hidden min-h-[600px]">
            {/* Background crypto patterns */}
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '32px 32px' }} />
            
            <h3 className="text-xl font-bold text-white mb-8 z-10 text-center">Cryptographic Packet Structure</h3>

            <div className="flex-1 flex flex-col items-center justify-center w-full z-10 space-y-12">
              
              {/* Publisher / Encrypter */}
              <motion.div 
                animate={{ y: [0, -10, 0] }} transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
                className="w-48 h-32 rounded-2xl bg-gradient-to-br from-primary/30 to-accent/20 border border-primary/50 flex flex-col items-center justify-center p-4 backdrop-blur-md shadow-[0_0_40px_rgba(37,99,235,0.2)]"
              >
                <Lock className="w-8 h-8 text-white mb-2" />
                <span className="font-bold text-white">Broadcast Header</span>
                <span className="text-[10px] text-primary mt-1 font-mono">C = (C0, C1)</span>
              </motion.div>

              {/* Data Flow */}
              <div className="w-full flex justify-center relative h-16">
                <div className="absolute top-0 w-0.5 h-full bg-gradient-to-b from-primary via-accent to-transparent" />
                <motion.div 
                  initial={{ top: 0, opacity: 1 }} animate={{ top: "100%", opacity: 0 }} transition={{ repeat: Infinity, duration: 2 }}
                  className="absolute w-3 h-3 rounded-full bg-accent blur-[2px] -ml-[5px]"
                />
              </div>

              {/* Recipients (Broadcast Groups) */}
              <div className="w-full flex justify-around items-start gap-4">
                {data?.broadcastGroups.map((group: any, i: number) => (
                  <motion.div 
                    initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.2 }}
                    key={group.id} className="flex flex-col items-center max-w-[150px] text-center"
                  >
                    <div className="w-20 h-20 rounded-full border-2 border-white/20 bg-white/5 flex items-center justify-center mb-3 relative group-hover:border-accent transition-colors">
                      <Users className="w-8 h-8 text-white/70" />
                      {/* Simulating authorized subset via a dynamic ring */}
                      {i !== 1 && (
                        <motion.svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 100 100">
                          <circle cx="50" cy="50" r="48" fill="none" stroke="#10b981" strokeWidth="4" strokeDasharray="300" strokeDashoffset={i === 0 ? "50" : "150"} />
                        </motion.svg>
                      )}
                    </div>
                    <h4 className="font-bold text-white text-sm">{group.name}</h4>
                    <p className="text-xs text-muted-foreground mt-1">{group.recipients} identities</p>
                    {i === 1 ? (
                      <span className="mt-2 text-[10px] font-bold text-destructive bg-destructive/20 px-2 py-0.5 rounded-full border border-destructive/30">Revoked</span>
                    ) : (
                      <span className="mt-2 text-[10px] font-bold text-success bg-success/20 px-2 py-0.5 rounded-full border border-success/30">Authorized (S)</span>
                    )}
                  </motion.div>
                ))}
              </div>

            </div>

            <div className="mt-auto pt-6 border-t border-white/10 flex justify-between text-xs text-muted-foreground">
              <span>Curve: BLS12-381</span>
              <span>Pairing: e(g1, g2)</span>
              <span>Security Level: 128-bit</span>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
