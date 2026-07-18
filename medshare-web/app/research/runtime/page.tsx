'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import MainLayout from '@/components/layout/MainLayout';
import { Play, RotateCcw, CheckCircle2, ShieldCheck, Database, Network } from 'lucide-react';
import { Button } from '@/components/ui/button';

const STAGES = [
  { id: 'upload', label: 'Patient Upload', layer: 'Client' },
  { id: 'query', label: 'Query Layer', layer: 'Gateway' },
  { id: 'trigger', label: 'Trigger Layer', layer: 'Gateway' },
  { id: 'auth', label: 'Authenticator', layer: 'Security' },
  { id: 'node', label: 'Processing Node', layer: 'Core' },
  { id: 'package', label: 'Package Builder', layer: 'Core' },
  { id: 'contract', label: 'Contract Runtime', layer: 'Fabric' },
  { id: 'bgw', label: 'BGW Encryption', layer: 'Crypto' },
  { id: 'ipfs', label: 'IPFS Storage', layer: 'Network' },
  { id: 'fabric', label: 'Fabric Commit', layer: 'Network' },
  { id: 'db', label: 'Permission DB', layer: 'Storage' },
  { id: 'audit', label: 'Audit Engine', layer: 'Storage' },
  { id: 'provenance', label: 'Provenance', layer: 'Storage' },
  { id: 'doc_req', label: 'Doctor Request', layer: 'Client' },
  { id: 'perm_val', label: 'Permission Val', layer: 'Security' },
  { id: 'rec_ver', label: 'Recipient Verif', layer: 'Fabric' },
  { id: 'bgw_dec', label: 'BGW Decryption', layer: 'Crypto' },
  { id: 'render', label: 'Record Render', layer: 'Client' },
];

export default function RuntimePipeline() {
  const [activeStageIndex, setActiveStageIndex] = useState(-1);
  const [isRunning, setIsRunning] = useState(false);

  useEffect(() => {
    if (isRunning && activeStageIndex < STAGES.length - 1) {
      const timer = setTimeout(() => {
        setActiveStageIndex(p => p + 1);
      }, 800); // 800ms per stage jump
      return () => clearTimeout(timer);
    } else if (activeStageIndex === STAGES.length - 1) {
      setIsRunning(false);
    }
  }, [isRunning, activeStageIndex]);

  const handleStart = () => {
    setActiveStageIndex(0);
    setIsRunning(true);
  };

  const handleReset = () => {
    setActiveStageIndex(-1);
    setIsRunning(false);
  };

  return (
    <MainLayout>
      <div className="flex flex-col space-y-6 h-full max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Execution Pipeline</h1>
            <p className="text-sm text-muted-foreground">End-to-end visualization of the MeDShare runtime coordinator routing.</p>
          </div>
          <div className="flex gap-4">
            <Button onClick={handleReset} variant="outline" className="glass-panel text-white">
              <RotateCcw className="w-4 h-4 mr-2" /> Reset
            </Button>
            <Button onClick={handleStart} disabled={isRunning || activeStageIndex === STAGES.length - 1} className="bg-primary text-white">
              <Play className="w-4 h-4 mr-2" /> Simulate Request
            </Button>
          </div>
        </div>

        <div className="glass-panel flex-1 p-8 overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 relative">
            {/* Draw connecting lines behind the grid using absolute positioning logic would be complex in pure CSS without exact coords, 
                so we will use a visual flow indicator inside the cards */}
            
            {STAGES.map((stage, index) => {
              const isActive = index === activeStageIndex;
              const isDone = index < activeStageIndex;
              const isPending = index > activeStageIndex;

              return (
                <motion.div
                  key={stage.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className={`relative p-5 rounded-xl border-2 flex flex-col justify-between transition-all duration-500 ${
                    isActive ? 'bg-primary/20 border-primary scale-105 shadow-[0_0_30px_rgba(37,99,235,0.3)] z-10' :
                    isDone ? 'bg-success/10 border-success/30' :
                    'bg-white/5 border-white/10 opacity-50'
                  }`}
                >
                  <div className="flex justify-between items-start mb-4">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground bg-black/20 px-2 py-1 rounded">
                      {stage.layer}
                    </span>
                    {isDone && <CheckCircle2 className="w-4 h-4 text-success" />}
                    {isActive && (
                      <span className="flex h-3 w-3 relative">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-primary"></span>
                      </span>
                    )}
                  </div>
                  <h3 className={`font-bold text-lg ${isActive ? 'text-white' : isDone ? 'text-success/90' : 'text-muted-foreground'}`}>
                    {stage.label}
                  </h3>
                  
                  {isActive && (
                    <motion.div 
                      className="absolute bottom-0 left-0 h-1 bg-primary w-full"
                      initial={{ width: 0 }}
                      animate={{ width: "100%" }}
                      transition={{ duration: 0.8, ease: "linear" }}
                    />
                  )}
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
