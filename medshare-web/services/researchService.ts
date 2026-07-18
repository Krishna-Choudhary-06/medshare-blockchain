import { useQuery } from '@tanstack/react-query';

export const useResearchDashboard = () => {
  return useQuery({
    queryKey: ['researchDashboard'],
    queryFn: async () => {
      return {
        stats: {
          activePackages: 12450,
          fabricTransactions: 342100,
          ipfsObjects: 12450,
          bgwBroadcastGroups: 8,
          smartContracts: 12450,
          activeRequests: 42,
          coordinatorExecutions: 852000,
          auditEvents: 1425000,
          provenanceEvents: 852000,
          permissionChecks: 3450000,
        },
      };
    },
    refetchInterval: 3000,
  });
};

export const useBgwVisualizer = () => {
  return useQuery({
    queryKey: ['bgwVisualizer'],
    queryFn: async () => {
      return {
        broadcastGroups: [
          { id: 'GROUP-A', name: 'Cardiology Dept', recipients: 45 },
          { id: 'GROUP-B', name: 'Neurology Dept', recipients: 32 },
          { id: 'GROUP-C', name: 'General Practitioners', recipients: 120 },
        ],
        activeKeys: 197,
        revokedKeys: 14,
        metrics: {
          encryptionTimeMs: 14,
          decryptionTimeMs: 22,
          headerSizeKB: 2.4,
        }
      };
    },
    refetchInterval: 5000,
  });
};
