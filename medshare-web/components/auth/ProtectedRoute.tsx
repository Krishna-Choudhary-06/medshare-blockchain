'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/useAuthStore';

export default function ProtectedRoute({ children, allowedRoles }: { children: React.ReactNode, allowedRoles?: string[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, role, restoreSession } = useAuthStore();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Attempt to restore session on mount if there's a token
    restoreSession();
  }, [restoreSession]);

  useEffect(() => {
    // We only want to run redirects after hydration is complete and state is loaded
    setIsReady(true);
  }, []);

  useEffect(() => {
    if (!isReady) return;

    if (!isAuthenticated) {
      router.push(`/login?redirect=${pathname}`);
      return;
    }

    if (allowedRoles && role && !allowedRoles.includes(role)) {
      router.push('/unauthorized');
    }
  }, [isAuthenticated, role, isReady, router, pathname, allowedRoles]);

  if (!isReady || !isAuthenticated) {
    // Render a secure loading state while evaluating access
    return (
      <div className="flex h-screen w-full items-center justify-center p-8 bg-[#050816]">
        <div className="flex flex-col items-center space-y-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground animate-pulse">Verifying secure session...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
