'use client';

import { motion } from 'framer-motion';
import MainLayout from '@/components/layout/MainLayout';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { useApprovedRecords } from '@/services/doctorService';
import { Unlock, FileText, Clock, Building2 } from 'lucide-react';
import Link from 'next/link';

export default function ApprovedRecords() {
  const { data: records, isLoading } = useApprovedRecords();

  return (
    <ProtectedRoute allowedRoles={['DOCTOR', 'ADMIN']}>
      <MainLayout>
        <div className="flex flex-col space-y-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white mb-2">Approved Packages</h1>
            <p className="text-sm text-muted-foreground">Medical records you have been granted access to decrypt.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {isLoading ? (
              <div className="col-span-3 text-center py-12 text-muted-foreground">Loading approved packages...</div>
            ) : (
              records?.map((record: any, i: number) => (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
                  key={record.id} 
                  className="glass-panel p-6 flex flex-col group hover:bg-white/10 transition-colors"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="p-3 bg-accent/20 rounded-xl text-accent">
                      <FileText className="w-5 h-5" />
                    </div>
                    <span className="px-2 py-1 text-[10px] font-bold rounded-full bg-success/20 text-success uppercase tracking-wider border border-success/30">
                      {record.status}
                    </span>
                  </div>
                  
                  <h3 className="text-lg font-bold text-white mb-1">{record.patientName}</h3>
                  <p className="text-sm text-accent mb-4">{record.record}</p>
                  
                  <div className="space-y-2 mb-6 text-xs text-muted-foreground">
                    <div className="flex items-center gap-2"><Building2 className="w-3.5 h-3.5" /> {record.department} - {record.hospital}</div>
                    <div className="flex items-center gap-2"><Clock className="w-3.5 h-3.5" /> Expires: {record.expiry}</div>
                  </div>

                  <Link 
                    href={`/doctor/decrypt?package=${record.id}`} 
                    className="mt-auto flex items-center justify-center gap-2 w-full bg-white/5 hover:bg-accent hover:text-[#050816] text-white py-2.5 rounded-lg text-sm font-semibold transition-all"
                  >
                    <Unlock className="w-4 h-4" /> Decrypt Workspace
                  </Link>
                </motion.div>
              ))
            )}
          </div>
        </div>
      </MainLayout>
    </ProtectedRoute>
  );
}
