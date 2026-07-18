'use client';

import { FileText, Shield, Users, Activity, Settings, LayoutDashboard } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/useAuthStore';

const allNavigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard, roles: ['DOCTOR', 'PATIENT', 'ADMIN', 'RESEARCHER'] },
  { name: 'Medical Records', href: '/records', icon: FileText, roles: ['DOCTOR', 'PATIENT', 'ADMIN', 'RESEARCHER'] },
  { name: 'Access Control', href: '/access', icon: Shield, roles: ['DOCTOR', 'PATIENT', 'ADMIN'] },
  { name: 'Patients', href: '/patients', icon: Users, roles: ['DOCTOR', 'ADMIN', 'RESEARCHER'] },
  { name: 'Audit Logs', href: '/audit', icon: Activity, roles: ['ADMIN', 'RESEARCHER'] },
  { name: 'Settings', href: '/settings', icon: Settings, roles: ['DOCTOR', 'PATIENT', 'ADMIN', 'RESEARCHER'] },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { role } = useAuthStore();

  const navigation = allNavigation.filter(item => 
    role ? item.roles.includes(role) : false
  );

  return (
    <div className="flex h-full w-64 flex-col bg-background/50 border-r border-white/10 backdrop-blur-md">
      <div className="flex h-16 items-center px-6">
        <Shield className="h-6 w-6 text-primary mr-3" />
        <span className="text-lg font-bold text-white tracking-tight">MedShare</span>
      </div>
      <nav className="flex-1 space-y-1 px-3 py-4">
        {navigation.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'group flex items-center rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-white/5 hover:text-white'
              )}
            >
              <item.icon
                className={cn(
                  'mr-3 h-5 w-5 flex-shrink-0',
                  isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-white'
                )}
                aria-hidden="true"
              />
              {item.name}
            </Link>
          );
        })}
      </nav>
      <div className="p-4 mt-auto">
        <div className="rounded-lg bg-primary/10 p-4 border border-primary/20">
          <h4 className="text-sm font-semibold text-primary mb-1">Blockchain Sync</h4>
          <div className="flex items-center text-xs text-muted-foreground">
            <span className="relative flex h-2 w-2 mr-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-success"></span>
            </span>
            Fabric Network Active
          </div>
        </div>
      </div>
    </div>
  );
}
