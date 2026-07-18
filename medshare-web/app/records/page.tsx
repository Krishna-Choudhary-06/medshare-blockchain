'use client';

import MainLayout from '@/components/layout/MainLayout';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { useMedicalRecords } from '@/services/patientService';
import { Search, Filter, Shield, MoreHorizontal, Eye, Share2, Download, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function RecordsPage() {
  const { data: records, isLoading } = useMedicalRecords();

  return (
    <ProtectedRoute allowedRoles={['PATIENT', 'DOCTOR', 'ADMIN', 'RESEARCHER']}>
      <MainLayout>
        <div className="flex flex-col space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white">Medical Records</h1>
              <p className="text-sm text-muted-foreground">Manage your encrypted records stored on IPFS.</p>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-64">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search records..." className="pl-9" />
              </div>
              <Button variant="outline" size="icon" className="glass-panel"><Filter className="h-4 w-4" /></Button>
            </div>
          </div>

          <div className="glass-panel overflow-hidden rounded-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-muted-foreground uppercase bg-white/5 border-b border-white/10">
                  <tr>
                    <th className="px-6 py-4 font-medium">Record ID / Title</th>
                    <th className="px-6 py-4 font-medium">Date</th>
                    <th className="px-6 py-4 font-medium">Doctor</th>
                    <th className="px-6 py-4 font-medium">Privacy</th>
                    <th className="px-6 py-4 font-medium">Status</th>
                    <th className="px-6 py-4 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-8 text-center text-muted-foreground">Loading secure records...</td>
                    </tr>
                  ) : records?.map((record: any) => (
                    <tr key={record.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-medium text-white">{record.title}</div>
                        <div className="text-xs text-muted-foreground">{record.id}</div>
                      </td>
                      <td className="px-6 py-4 text-muted-foreground">{record.date}</td>
                      <td className="px-6 py-4 text-muted-foreground">{record.doctor}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 text-[10px] font-semibold rounded-full border ${
                          record.privacy === 'HIGH' ? 'bg-warning/20 text-warning border-warning/30' :
                          record.privacy === 'VERY_HIGH' ? 'bg-destructive/20 text-destructive border-destructive/30' :
                          'bg-primary/20 text-primary border-primary/30'
                        }`}>
                          {record.privacy}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5 text-xs text-success">
                          <Shield className="w-3.5 h-3.5" />
                          {record.status}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-white"><Eye className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary"><Share2 className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-white"><MoreHorizontal className="h-4 w-4" /></Button>
                        </div>
                      </td>
                    </tr>
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
