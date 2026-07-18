import { useQuery, useMutation } from '@tanstack/react-query';

export const useDoctorDashboard = () => {
  return useQuery({
    queryKey: ['doctorDashboard'],
    queryFn: async () => {
      return {
        stats: {
          pendingRequests: 5,
          approvedRecords: 12,
          todaysPatients: 8,
          successfulDecryptions: 45,
          activePackages: 10,
        },
        recentRequests: [
          { id: 'REQ-01', patient: 'Alice B.', status: 'PENDING', date: new Date().toISOString() },
          { id: 'REQ-02', patient: 'Charlie D.', status: 'APPROVED', date: new Date().toISOString() },
        ],
        chartData: {
          requests: [
            { name: 'Mon', value: 3 }, { name: 'Tue', value: 5 }, { name: 'Wed', value: 2 }, { name: 'Thu', value: 8 }, { name: 'Fri', value: 4 }
          ],
        }
      };
    }
  });
};

export const useApprovedRecords = () => {
  return useQuery({
    queryKey: ['doctorApprovedRecords'],
    queryFn: async () => {
      return [
        { id: 'PKG-101', patientName: 'Alice B.', record: 'MRI Brain Scan', department: 'Neurology', hospital: 'General Hospital', expiry: '2026-07-20', status: 'AVAILABLE' },
        { id: 'PKG-102', patientName: 'Charlie D.', record: 'Blood Work Panel', department: 'Internal Medicine', hospital: 'General Hospital', expiry: '2026-07-19', status: 'AVAILABLE' },
      ];
    }
  });
};

export const useDecryptRecord = () => {
  return useMutation({
    mutationFn: async (packageId: string) => {
      return new Promise((resolve) => setTimeout(() => resolve({ success: true, plaintextUrl: '/mock-record.pdf' }), 4000));
    }
  });
};
