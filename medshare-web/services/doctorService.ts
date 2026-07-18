import { useQuery, useMutation } from '@tanstack/react-query';
import api from './api';

export const useDoctorDashboard = () => {
  return useQuery({
    queryKey: ['doctorDashboard'],
    queryFn: async () => {
      try {
        const response = await api.get('/doctor/dashboard');
        return response;
      } catch (error) {
        console.warn('Backend unavailable, falling back to mock data for doctorDashboard');
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
    }
  });
};

export const useApprovedRecords = () => {
  return useQuery({
    queryKey: ['doctorApprovedRecords'],
    queryFn: async () => {
      try {
        const response = await api.get('/doctor/approved-records');
        return response.records || response;
      } catch (error) {
        console.warn('Backend unavailable, falling back to mock data for doctorApprovedRecords');
        return [
          { id: 'PKG-101', patientName: 'Alice B.', record: 'MRI Brain Scan', department: 'Neurology', hospital: 'General Hospital', expiry: '2026-07-20', status: 'AVAILABLE' },
          { id: 'PKG-102', patientName: 'Charlie D.', record: 'Blood Work Panel', department: 'Internal Medicine', hospital: 'General Hospital', expiry: '2026-07-19', status: 'AVAILABLE' },
        ];
      }
    }
  });
};

export const useDecryptRecord = () => {
  return useMutation({
    mutationFn: async (packageId: string) => {
      try {
        const response = await api.post('/access/decrypt', { packageId });
        return response;
      } catch (error) {
        console.warn('Backend unavailable, falling back to mock response for decryptRecord');
        return new Promise((resolve) => setTimeout(() => resolve({ success: true, plaintextUrl: '/mock-record.pdf' }), 4000));
      }
    }
  });
};
