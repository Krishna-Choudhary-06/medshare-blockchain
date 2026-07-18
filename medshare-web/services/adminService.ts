import { useQuery } from '@tanstack/react-query';

export const useAdminDashboard = () => {
  return useQuery({
    queryKey: ['adminDashboard'],
    queryFn: async () => {
      return {
        stats: {
          totalPatients: 1250,
          totalDoctors: 340,
          hospitalsConnected: 12,
          activePackages: 8900,
          activeContracts: 8850,
          fabricTransactions: 45200,
          ipfsObjects: 9100,
          bgwRecipients: 420,
          todaysRequests: 156,
          failedRequests: 2,
        },
        systemAlerts: [
          { id: 1, severity: 'warning', message: 'Fabric Peer 2 sync delayed by 400ms.', time: '10 mins ago' },
          { id: 2, severity: 'error', message: 'Failed decryption attempt from unauthorized IP.', time: '1 hr ago' }
        ],
        chartData: {
          activity: [
            { name: 'Mon', requests: 120, packages: 40 },
            { name: 'Tue', requests: 150, packages: 55 },
            { name: 'Wed', requests: 180, packages: 70 },
            { name: 'Thu', requests: 140, packages: 45 },
            { name: 'Fri', requests: 200, packages: 90 },
          ]
        }
      };
    }
  });
};

export const useSystemHealth = () => {
  return useQuery({
    queryKey: ['systemHealth'],
    queryFn: async () => {
      return {
        overallScore: 98,
        metrics: {
          cpu: 45,
          memory: 62,
          responseTime: 120, // ms
          runtimeLatency: 45, // ms
        },
        services: [
          { name: 'Hyperledger Fabric', status: 'HEALTHY', latency: 85, uptime: '99.99%' },
          { name: 'IPFS Storage Node', status: 'HEALTHY', latency: 110, uptime: '99.95%' },
          { name: 'BGW Crypto Engine', status: 'HEALTHY', latency: 15, uptime: '100%' },
          { name: 'Runtime Coordinator', status: 'HEALTHY', latency: 5, uptime: '100%' },
          { name: 'MongoDB Permission DB', status: 'HEALTHY', latency: 25, uptime: '99.9%' },
        ]
      };
    },
    refetchInterval: 5000, // Enterprise live dashboard feel
  });
};

export const useUsersList = () => {
  return useQuery({
    queryKey: ['adminUsersList'],
    queryFn: async () => {
      return [
        { id: 'USR-001', name: 'Dr. Sarah Jenkins', role: 'DOCTOR', organization: 'General Hospital', department: 'Cardiology', status: 'ACTIVE', lastLogin: '2026-07-18T10:00:00Z' },
        { id: 'USR-002', name: 'Mark Roberts', role: 'PATIENT', organization: 'N/A', department: 'N/A', status: 'ACTIVE', lastLogin: '2026-07-17T15:30:00Z' },
        { id: 'USR-003', name: 'Dr. Emily Chen', role: 'RESEARCHER', organization: 'National Health Institute', department: 'Genetics', status: 'DISABLED', lastLogin: '2026-06-12T09:15:00Z' },
      ];
    }
  });
};
