import api from './api';
import { API_ENDPOINTS } from '@/utils/constants';

export const authService = {
  login: async (credentials: any) => {
    return api.post(API_ENDPOINTS.AUTH.LOGIN, credentials);
  },
  register: async (data: any) => {
    return api.post(API_ENDPOINTS.AUTH.REGISTER, data);
  },
  forgotPassword: async (email: string) => {
    return api.post(`${API_ENDPOINTS.AUTH.LOGIN}/forgot-password`, { email });
  },
  me: async () => {
    return api.get(`${API_ENDPOINTS.AUTH.LOGIN}/me`);
  }
};
