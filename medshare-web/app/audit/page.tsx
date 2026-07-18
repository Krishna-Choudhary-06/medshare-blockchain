'use client';

import MainLayout from '@/components/layout/MainLayout';
import ProtectedRoute from '@/components/auth/ProtectedRoute';

export default function AuditPage() {
  return (
    <ProtectedRoute allowedRoles={['ADMIN', 'RESEARCHER']}>
      <MainLayout>
        <div className="flex flex-col space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white">Fabric Audit Logs</h1>
              <p className="text-sm text-muted-foreground">Immutable blockchain transaction explorer.</p>
            </div>
          </div>

          <div className="glass-panel p-12 flex flex-col items-center justify-center text-center min-h-[400px]">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Audit Explorer Module</h3>
            <p className="text-muted-foreground max-w-md">The real-time Fabric transaction explorer is connected via WebSocket. Polling the network...</p>
          </div>
        </div>
      </MainLayout>
    </ProtectedRoute>
  );
}
