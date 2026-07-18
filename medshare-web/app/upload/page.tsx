'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UploadCloud, File, Shield, CheckCircle, ArrowRight, ArrowLeft } from 'lucide-react';
import MainLayout from '@/components/layout/MainLayout';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useUploadRecord } from '@/services/patientService';
import { useRouter } from 'next/navigation';

const steps = [
  { id: 1, title: 'Upload File', icon: UploadCloud },
  { id: 2, title: 'Medical Metadata', icon: File },
  { id: 3, title: 'Security', icon: Shield },
  { id: 4, title: 'Confirmation', icon: CheckCircle },
];

export default function UploadPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [file, setFile] = useState<File | null>(null);
  const [metadata, setMetadata] = useState({ title: '', description: '', doctor: '', category: '' });
  const [security, setSecurity] = useState({ privacy: 'HIGH', sensitivity: 'MEDIUM' });
  const uploadMutation = useUploadRecord();
  const router = useRouter();

  const handleNext = () => setCurrentStep(p => Math.min(p + 1, steps.length));
  const handlePrev = () => setCurrentStep(p => Math.max(p - 1, 1));

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files?.length) setFile(e.dataTransfer.files[0]);
  };

  const handleFinalSubmit = async () => {
    const res: any = await uploadMutation.mutateAsync({ file, metadata, security });
    if (res.success) {
      setTimeout(() => router.push('/records'), 2000);
    }
  };

  return (
    <ProtectedRoute allowedRoles={['PATIENT', 'DOCTOR', 'ADMIN']}>
      <MainLayout>
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold tracking-tight text-white">Upload Medical Record</h1>
            <p className="text-muted-foreground">Securely encrypt and store your records on the IPFS & Fabric network.</p>
          </div>

          {/* Stepper */}
          <div className="flex justify-between items-center mb-12 relative">
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-0.5 bg-white/10 -z-10" />
            {steps.map(step => {
              const isActive = step.id === currentStep;
              const isPast = step.id < currentStep;
              return (
                <div key={step.id} className="flex flex-col items-center">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors duration-300 ${
                    isActive ? 'bg-primary text-white shadow-[0_0_20px_rgba(37,99,235,0.4)]' : 
                    isPast ? 'bg-success text-white' : 'bg-[#050816] border border-white/20 text-muted-foreground'
                  }`}>
                    <step.icon className="w-5 h-5" />
                  </div>
                  <span className={`mt-3 text-xs font-medium ${isActive ? 'text-white' : 'text-muted-foreground'}`}>
                    {step.title}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Form Content */}
          <div className="glass-panel p-8 min-h-[400px] flex flex-col">
            <AnimatePresence mode="wait">
              {currentStep === 1 && (
                <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex-1 flex flex-col items-center justify-center space-y-6">
                  <div 
                    onDragOver={e => e.preventDefault()} 
                    onDrop={handleDrop}
                    className="w-full max-w-lg p-12 border-2 border-dashed border-white/20 rounded-2xl flex flex-col items-center justify-center text-center hover:border-primary/50 transition-colors cursor-pointer bg-white/5"
                  >
                    <UploadCloud className="w-12 h-12 text-primary mb-4" />
                    <p className="text-white font-medium mb-1">Drag and drop your medical file here</p>
                    <p className="text-xs text-muted-foreground">Supported: PDF, DICOM, JPG, PNG (Max 50MB)</p>
                    <label className="mt-6">
                      <span className="bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-lg text-sm font-medium cursor-pointer transition-colors">Browse Files</span>
                      <input type="file" className="hidden" onChange={e => e.target.files && setFile(e.target.files[0])} />
                    </label>
                  </div>
                  {file && (
                    <div className="flex items-center gap-3 p-3 bg-success/10 border border-success/30 rounded-lg text-success">
                      <File className="w-5 h-5" />
                      <span className="text-sm font-medium">{file.name}</span>
                    </div>
                  )}
                </motion.div>
              )}

              {currentStep === 2 && (
                <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex-1 space-y-6 max-w-lg mx-auto w-full">
                  <div className="space-y-2">
                    <Label>Document Title</Label>
                    <Input placeholder="e.g. Annual Blood Test Results" value={metadata.title} onChange={e => setMetadata({...metadata, title: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Input placeholder="Brief overview of the record..." value={metadata.description} onChange={e => setMetadata({...metadata, description: e.target.value})} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Category</Label>
                      <Input placeholder="e.g. Lab Results" value={metadata.category} onChange={e => setMetadata({...metadata, category: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                      <Label>Issuing Doctor</Label>
                      <Input placeholder="Dr. Name" value={metadata.doctor} onChange={e => setMetadata({...metadata, doctor: e.target.value})} />
                    </div>
                  </div>
                </motion.div>
              )}

              {currentStep === 3 && (
                <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex-1 space-y-6 max-w-lg mx-auto w-full">
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium text-white mb-2">Access Control via BGW Encryption</h3>
                    <div className="p-4 glass-panel border-primary/30 flex items-start gap-4">
                      <Shield className="w-8 h-8 text-primary shrink-0" />
                      <div>
                        <p className="text-sm text-white font-medium">BLS12-381 Broadcast Encryption Active</p>
                        <p className="text-xs text-muted-foreground mt-1">Your file will be symmetrically encrypted before uploading to IPFS. The symmetric key is then encrypted via BGW scheme ensuring only you and granted doctors can access it.</p>
                      </div>
                    </div>

                    <div className="space-y-2 mt-6">
                      <Label>Privacy Level</Label>
                      <select 
                        value={security.privacy} onChange={e => setSecurity({...security, privacy: e.target.value})}
                        className="flex h-10 w-full rounded-md border border-white/20 bg-background/50 px-3 py-1 text-sm glass-panel focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary text-white"
                      >
                        <option value="LOW">Low (Basic Vitals)</option>
                        <option value="MEDIUM">Medium (General Diagnosis)</option>
                        <option value="HIGH">High (Lab Results / Scans)</option>
                        <option value="VERY_HIGH">Very High (Psychiatric / Genetic)</option>
                      </select>
                    </div>
                  </div>
                </motion.div>
              )}

              {currentStep === 4 && (
                <motion.div key="step4" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex-1 flex flex-col items-center justify-center max-w-lg mx-auto w-full space-y-8">
                  {uploadMutation.isSuccess ? (
                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="flex flex-col items-center">
                      <div className="w-20 h-20 bg-success/20 rounded-full flex items-center justify-center mb-4">
                        <CheckCircle className="w-10 h-10 text-success" />
                      </div>
                      <h3 className="text-xl font-bold text-white mb-2">Record Secured & Uploaded!</h3>
                      <p className="text-sm text-muted-foreground text-center">Smart contract instantiated. IPFS CID permanently anchored to Hyperledger Fabric.</p>
                    </motion.div>
                  ) : (
                    <div className="w-full space-y-4">
                      <h3 className="text-lg font-medium text-white text-center">Review Package Generation</h3>
                      <div className="glass-panel p-4 space-y-3 text-sm">
                        <div className="flex justify-between"><span className="text-muted-foreground">File:</span> <span className="text-white font-medium">{file?.name}</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">Title:</span> <span className="text-white font-medium">{metadata.title}</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">Privacy:</span> <span className="text-primary font-medium">{security.privacy}</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">Est. Network Fee:</span> <span className="text-success font-medium">0.00 Gas (Consortium)</span></div>
                      </div>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Navigation Buttons */}
            <div className="mt-auto pt-8 flex justify-between items-center border-t border-white/10">
              <Button variant="ghost" onClick={handlePrev} disabled={currentStep === 1 || uploadMutation.isSuccess} className="text-muted-foreground hover:text-white">
                <ArrowLeft className="w-4 h-4 mr-2" /> Back
              </Button>
              
              {currentStep < 4 ? (
                <Button onClick={handleNext} disabled={currentStep === 1 && !file}>
                  Continue <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              ) : (
                !uploadMutation.isSuccess && (
                  <Button onClick={handleFinalSubmit} disabled={uploadMutation.isPending} className="bg-success hover:bg-success/90 text-white">
                    {uploadMutation.isPending ? "Generating Package & Encrypting..." : "Confirm & Upload"}
                  </Button>
                )
              )}
            </div>
          </div>

        </div>
      </MainLayout>
    </ProtectedRoute>
  );
}
