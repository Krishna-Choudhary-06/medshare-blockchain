import MainLayout from '@/components/layout/MainLayout';

export default function Home() {
  return (
    <MainLayout>
      <div className="flex flex-col space-y-6">
        <h1 className="text-3xl font-bold tracking-tight text-white">Dashboard Overview</h1>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="glass-panel p-6 h-40 flex items-center justify-center">
            <p className="text-muted-foreground text-sm">Active Contracts</p>
          </div>
          <div className="glass-panel p-6 h-40 flex items-center justify-center">
            <p className="text-muted-foreground text-sm">Encrypted Records</p>
          </div>
          <div className="glass-panel p-6 h-40 flex items-center justify-center">
            <p className="text-muted-foreground text-sm">Recent Access Logs</p>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
