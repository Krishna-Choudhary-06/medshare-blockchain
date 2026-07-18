import { useQuery, useMutation } from '@tanstack/react-query';
import api from './api';

// Placeholder mock data generator for seamless UI development while backend is disconnected
export const usePatientDashboard = () => {
  return useQuery({
    queryKey: ['patientDashboard'],
    queryFn: async () => {
      // return api.get('/patient/dashboard');
      return {
        stats: {
          totalRecords: 12,
          sharedRecords: 8,
          pendingRequests: 3,
          revokedAccess: 2,
          lastUpload: new Date().toISOString(),
        },
        recentActivity: [
          { id: 1, action: 'UPLOAD', resource: 'MRI Scan', date: new Date().toISOString() },
          { id: 2, action: 'GRANT', resource: 'Blood Test Results', recipient: 'Dr. Smith', date: new Date().toISOString() },
        ],
        chartData: {
          uploads: [
            { name: 'Jan', value: 2 }, { name: 'Feb', value: 4 }, { name: 'Mar', value: 3 }, { name: 'Apr', value: 7 }
          ],
          sharing: [
            { name: 'Jan', granted: 1, revoked: 0 }, { name: 'Feb', granted: 3, revoked: 1 },
          ]
        }
      };
    }
  });
};

export const useMedicalRecords = () => {
  return useQuery({
    queryKey: ['medicalRecords'],
    queryFn: async () => {
      // return api.get('/data');
      return [
        { id: 'REC-001', title: 'Annual Blood Work', date: '2026-07-01', privacy: 'HIGH', status: 'ENCRYPTED', doctor: 'Dr. Adams' },
        { id: 'REC-002', title: 'Chest X-Ray', date: '2026-06-15', privacy: 'VERY_HIGH', status: 'STORED', doctor: 'Dr. Smith' },
      ];
    }
  });
};

export const useUploadRecord = () => {
  return useMutation({
    mutationFn: async (data: any) => {
      // return api.post('/upload', data);
      return new Promise((resolve) => setTimeout(() => resolve({ success: true, txId: '0xabc123' }), 2000));
    }
  });
};
