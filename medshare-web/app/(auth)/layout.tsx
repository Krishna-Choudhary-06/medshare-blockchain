import React from 'react';
import GuestRoute from '@/components/auth/GuestRoute';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <GuestRoute>
      <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-[#050816]">
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-primary/20 blur-[150px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-accent/20 blur-[150px] pointer-events-none" />
      
      <div className="z-10 w-full max-w-md p-6">
        <div className="glass-panel p-8">
          {children}
        </div>
      </div>
    </div>
    </GuestRoute>
  );
}
