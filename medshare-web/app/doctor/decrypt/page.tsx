'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import MainLayout from '@/components/layout/MainLayout';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { useDecryptRecord } from '@/services/doctorService';
import { Database, Shield, Key, FileText, CheckCircle2, ChevronRight, Download } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';

const PIPELINE_STEPS = [
  { id: 'fetch', label: 'Fetch Encrypted Package (IPFS)', icon: Database, delay: 0 },
  { id: 'header', label: 'Extract BGW Header', icon: Shield, delay: 1000 },
  { id: 'verify', label: 'Verify Recipient Status (Fabric)', icon: CheckCircle2, delay: 2000 },
  { id: 'decrypt', label: 'BLS12-381 Re-encryption', icon: Key, delay: 3000 },
  { id: 'finish', label: 'Render Medical Record', icon: FileText, delay: 4000 },
];

export default function DecryptWorkspace() {
  const [activeStep, setActiveStep] = useState(-1);
  const searchParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
  const packageId = searchParams?.get('package') || 'UNKNOWN-PKG';
  const decryptMutation = useDecryptRecord();

  const handleStartDecryption = async () => {
    setActiveStep(0);
    // Simulate pipeline progression
    for (let i = 0; i < PIPELINE_STEPS.length; i++) {
      await new Promise(r => setTimeout(r, 1000));
      setActiveStep(i);
    }
    await decryptMutation.mutateAsync(packageId);
  };

  return (
    <ProtectedRoute allowedRoles={['DOCTOR', 'ADMIN']}>
      <MainLayout>
        <div className="max-w-5xl mx-auto space-y-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Decrypt Workspace</h1>
              <p className="text-muted-foreground">Securely reconstruct symmetric keys using the BGW Broadcast Encryption scheme.</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground uppercase tracking-widest">Package ID</p>
              <p className="text-sm font-mono text-primary bg-primary/10 px-3 py-1 rounded-md border border-primary/20 mt-1">
                {packageId}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Left: Animation Pipeline */}
            <div className="lg:col-span-7 glass-panel p-8 flex flex-col items-center min-h-[500px]">
              <h3 className="text-lg font-semibold text-white mb-8 w-full text-left">Cryptographic Pipeline</h3>
              
              <div className="flex-1 w-full flex flex-col items-center justify-center space-y-2 relative">
                {PIPELINE_STEPS.map((step, index) => {
                  const isActive = activeStep === index;
                  const isDone = activeStep > index || decryptMutation.isSuccess;
                  
                  return (
                    <div key={step.id} className="flex flex-col items-center w-full">
                      <motion.div 
                        initial={{ opacity: 0.5, scale: 0.95 }}
                        animate={{ 
                          opacity: isActive || isDone ? 1 : 0.4,
                          scale: isActive ? 1.05 : 1,
                          borderColor: isActive ? 'rgba(34, 211, 238, 0.5)' : isDone ? 'rgba(16, 185, 129, 0.3)' : 'rgba(255,255,255,0.1)'
                        }}
                        className={`w-full max-w-sm p-4 rounded-xl border flex items-center gap-4 transition-all ${
                          isActive ? 'bg-accent/10 shadow-[0_0_30px_rgba(34,211,238,0.2)]' :
                          isDone ? 'bg-success/10' : 'bg-white/5'
                        }`}
                      >
                        <div className={`p-2 rounded-lg ${isActive ? 'bg-accent/20 text-accent' : isDone ? 'bg-success/20 text-success' : 'bg-white/10 text-muted-foreground'}`}>
                          <step.icon className="w-5 h-5" />
                        </div>
                        <div className="flex-1">
                          <p className={`font-medium text-sm ${isActive || isDone ? 'text-white' : 'text-muted-foreground'}`}>{step.label}</p>
                          {isActive && (
                            <motion.div className="h-0.5 bg-accent w-full mt-2 rounded-full overflow-hidden" initial={{ width: 0 }} animate={{ width: "100%" }} transition={{ duration: 1 }} />
                          )}
                        </div>
                        {isDone && <CheckCircle2 className="w-5 h-5 text-success" />}
                      </motion.div>
                      
                      {/* Connection Line */}
                      {index < PIPELINE_STEPS.length - 1 && (
                        <div className={`w-0.5 h-6 my-1 ${isDone ? 'bg-success' : 'bg-white/10'}`} />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right: Controls & Result */}
            <div className="lg:col-span-5 flex flex-col gap-6">
              <div className="glass-panel p-6 space-y-4">
                <h3 className="text-lg font-semibold text-white">Execution Controls</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Initiating this workflow will invoke the local BGW cryptographic engine to attempt re-encryption using your private key.
                </p>
                <Button 
                  onClick={handleStartDecryption} 
                  disabled={activeStep > -1}
                  className="w-full bg-accent hover:bg-accent/90 text-[#050816] font-bold h-12 text-base"
                >
                  {activeStep > -1 ? (decryptMutation.isSuccess ? 'Decryption Complete' : 'Executing Pipeline...') : 'Initialize Decryption'}
                </Button>
              </div>

              <AnimatePresence>
                {decryptMutation.isSuccess && (
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                    className="glass-panel p-6 bg-success/10 border-success/30 flex flex-col items-center justify-center text-center space-y-4 flex-1"
                  >
                    <div className="w-16 h-16 rounded-full bg-success/20 flex items-center justify-center">
                      <FileText className="w-8 h-8 text-success" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-success mb-1">Access Granted</h3>
                      <p className="text-sm text-muted-foreground">The medical record has been successfully decrypted locally.</p>
                    </div>
                    <Button className="w-full mt-4 bg-white/10 hover:bg-white/20 text-white" onClick={() => alert('Viewing plaintext document...')}>
                      <Download className="w-4 h-4 mr-2" /> Download Plaintext
                    </Button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </MainLayout>
    </ProtectedRoute>
  );
}
