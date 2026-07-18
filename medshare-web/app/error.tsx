'use client'; // Error components must be Client Components

import { useEffect } from 'react';
import { ShieldAlert, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('MedShare Critical Error:', error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#050816] p-4 text-white font-sans">
      <div className="max-w-md w-full glass-panel p-8 flex flex-col items-center text-center border-destructive/20 bg-destructive/5 shadow-[0_0_50px_rgba(239,68,68,0.15)]">
        <div className="w-16 h-16 rounded-full bg-destructive/20 flex items-center justify-center mb-6">
          <ShieldAlert className="w-8 h-8 text-destructive" />
        </div>
        
        <h2 className="text-2xl font-bold mb-2">System Interruption</h2>
        <p className="text-sm text-muted-foreground mb-6">
          The MedShare frontend encountered a critical client-side error. Security contexts have been preserved.
        </p>

        <div className="w-full p-4 bg-black/40 rounded-lg text-xs font-mono text-destructive/80 text-left overflow-hidden text-ellipsis mb-8">
          {error.message || "Unknown rendering exception."}
        </div>

        <Button 
          onClick={() => reset()} 
          className="w-full bg-white hover:bg-white/90 text-black font-bold h-12"
        >
          <RotateCcw className="w-4 h-4 mr-2" />
          Attempt Recovery
        </Button>
      </div>
    </div>
  );
}
