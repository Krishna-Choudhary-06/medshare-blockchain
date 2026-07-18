'use client';

import { useState } from 'react';
import { Bell, Search, UserCircle, LogOut, Sun, Moon, Menu } from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';
import { useTheme } from 'next-themes';
import { useRouter } from 'next/navigation';

export default function TopNav() {
  const { currentUser, logout } = useAuthStore();
  const { theme, setTheme } = useTheme();
  const router = useRouter();
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  return (
    <div className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b border-white/10 bg-background/50 px-4 backdrop-blur-md sm:gap-x-6 sm:px-6 lg:px-8">
      {/* Mobile Menu Toggle (placeholder for actual implementation) */}
      <button type="button" className="lg:hidden -m-2.5 p-2.5 text-muted-foreground hover:text-white">
        <span className="sr-only">Open sidebar</span>
        <Menu className="h-6 w-6" aria-hidden="true" />
      </button>
      
      <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
        <form className="relative flex flex-1 items-center" action="#" method="GET">
          <label htmlFor="search-field" className="sr-only">Search</label>
          <Search className="pointer-events-none absolute left-0 h-5 w-5 text-muted-foreground" aria-hidden="true" />
          <input
            id="search-field"
            className="block h-full w-full border-0 bg-transparent py-0 pl-8 pr-0 text-white focus:ring-0 sm:text-sm"
            placeholder="Search records, patients, tx ids..."
            type="search"
            name="search"
          />
        </form>
        
        <div className="flex items-center gap-x-4 lg:gap-x-6">
          <button 
            type="button" 
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="-m-2.5 p-2.5 text-muted-foreground hover:text-white transition-colors"
          >
            <span className="sr-only">Toggle theme</span>
            {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </button>
          
          <button type="button" className="-m-2.5 p-2.5 text-muted-foreground hover:text-white transition-colors">
            <span className="sr-only">View notifications</span>
            <Bell className="h-5 w-5" aria-hidden="true" />
          </button>
          
          <div className="hidden lg:block lg:h-6 lg:w-px lg:bg-white/10" aria-hidden="true" />
          
          <div className="relative">
            <button 
              type="button" 
              className="-m-1.5 flex items-center p-1.5 text-muted-foreground hover:text-white transition-colors"
              onClick={() => setIsProfileOpen(!isProfileOpen)}
            >
              <span className="sr-only">User menu</span>
              <UserCircle className="h-8 w-8 rounded-full bg-white/5" aria-hidden="true" />
              <span className="hidden lg:flex lg:items-center">
                <span className="ml-4 text-sm font-semibold leading-6" aria-hidden="true">
                  {currentUser?.name || 'Guest'}
                </span>
              </span>
            </button>
            
            {isProfileOpen && (
              <div className="absolute right-0 z-10 mt-2.5 w-48 origin-top-right rounded-md glass-panel py-2 shadow-lg focus:outline-none">
                <div className="px-4 py-2 border-b border-white/10 mb-1">
                  <p className="text-sm font-medium text-white truncate">{currentUser?.name}</p>
                  <p className="text-xs text-muted-foreground capitalize">{currentUser?.role?.toLowerCase()}</p>
                </div>
                <button
                  onClick={handleLogout}
                  className="block w-full text-left px-4 py-2 text-sm text-white hover:bg-white/10 transition-colors flex items-center"
                >
                  <LogOut className="mr-2 h-4 w-4 text-destructive" />
                  Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
