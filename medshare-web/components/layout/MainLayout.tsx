'use client';

import Sidebar from './Sidebar';
import TopNav from './TopNav';
import { usePathname } from 'next/navigation';
import { ChevronRight } from 'lucide-react';

function Breadcrumbs() {
  const pathname = usePathname();
  const paths = pathname.split('/').filter(Boolean);
  
  if (paths.length === 0) return null;
  
  return (
    <nav className="flex mb-4 text-sm text-muted-foreground" aria-label="Breadcrumb">
      <ol className="inline-flex items-center space-x-1 md:space-x-3">
        <li className="inline-flex items-center">
          <span className="text-white hover:text-primary transition-colors">Home</span>
        </li>
        {paths.map((path, index) => {
          const isLast = index === paths.length - 1;
          return (
            <li key={path}>
              <div className="flex items-center">
                <ChevronRight className="w-4 h-4 mx-1" />
                <span className={isLast ? "text-white font-medium capitalize" : "hover:text-primary transition-colors capitalize"}>
                  {path.replace(/-/g, ' ')}
                </span>
              </div>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
}

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden relative">
        {/* Background ambient glow */}
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-primary/20 blur-[120px] pointer-events-none" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-accent/10 blur-[120px] pointer-events-none" />
        
        <TopNav />
        <main className="flex-1 overflow-y-auto p-6 sm:p-8 z-10 flex flex-col">
          <Breadcrumbs />
          <div className="flex-1">
            {children}
          </div>
          <footer className="mt-8 pt-4 border-t border-white/10 text-center text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} MedShare Blockchain Architecture. All rights reserved.
          </footer>
        </main>
      </div>
    </div>
  );
}
