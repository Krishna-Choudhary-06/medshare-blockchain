'use client';

import MainLayout from '@/components/layout/MainLayout';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { useUsersList } from '@/services/adminService';
import { Search, Filter, ShieldAlert, MoreHorizontal, UserCog } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function UserManagement() {
  const { data: users, isLoading } = useUsersList();

  return (
    <ProtectedRoute allowedRoles={['ADMIN']}>
      <MainLayout>
        <div className="flex flex-col space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white">User Management</h1>
              <p className="text-sm text-muted-foreground">Manage RBAC, roles, and network access for all entities.</p>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-64">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search users by name, role..." className="pl-9" />
              </div>
              <Button variant="outline" size="icon" className="glass-panel"><Filter className="h-4 w-4" /></Button>
              <Button className="bg-primary text-white ml-2">Add User</Button>
            </div>
          </div>

          <div className="glass-panel overflow-hidden rounded-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left whitespace-nowrap">
                <thead className="text-xs text-muted-foreground uppercase bg-white/5 border-b border-white/10">
                  <tr>
                    <th className="px-6 py-4 font-medium">User ID / Name</th>
                    <th className="px-6 py-4 font-medium">Role</th>
                    <th className="px-6 py-4 font-medium">Organization</th>
                    <th className="px-6 py-4 font-medium">Department</th>
                    <th className="px-6 py-4 font-medium">Status</th>
                    <th className="px-6 py-4 font-medium">Last Login</th>
                    <th className="px-6 py-4 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-8 text-center text-muted-foreground">Loading identity registry...</td>
                    </tr>
                  ) : users?.map((user: any) => (
                    <tr key={user.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-medium text-white">{user.name}</div>
                        <div className="text-xs text-muted-foreground">{user.id}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 text-[10px] font-bold rounded-md border ${
                          user.role === 'ADMIN' ? 'bg-destructive/20 text-destructive border-destructive/30' :
                          user.role === 'DOCTOR' ? 'bg-primary/20 text-primary border-primary/30' :
                          user.role === 'RESEARCHER' ? 'bg-accent/20 text-accent border-accent/30' :
                          'bg-white/10 text-white border-white/20'
                        }`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-muted-foreground">{user.organization}</td>
                      <td className="px-6 py-4 text-muted-foreground">{user.department}</td>
                      <td className="px-6 py-4">
                        <span className={`flex items-center gap-1.5 text-xs font-medium ${user.status === 'ACTIVE' ? 'text-success' : 'text-muted-foreground'}`}>
                          <div className={`w-2 h-2 rounded-full ${user.status === 'ACTIVE' ? 'bg-success' : 'bg-muted-foreground'}`} />
                          {user.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-muted-foreground">{new Date(user.lastLogin).toLocaleDateString()}</td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-white"><UserCog className="h-4 w-4" /></Button>
                          {user.status === 'ACTIVE' && <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-warning"><ShieldAlert className="h-4 w-4" /></Button>}
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
