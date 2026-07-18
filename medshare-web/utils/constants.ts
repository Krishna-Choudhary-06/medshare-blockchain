export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/register',
  },
  RECORDS: {
    UPLOAD: '/upload',
    LIST: '/data',
    DECRYPT: '/access/decrypt',
  },
  USERS: {
    LIST: '/users',
    PROFILE: '/users/profile',
  },
  AUDIT: {
    LOGS: '/logs',
  }
} as const;

export const SENSITIVITY_LEVELS = ['LOW', 'MEDIUM', 'HIGH', 'VERY_HIGH'] as const;
export const ROLES = ['DOCTOR', 'PATIENT', 'ADMIN', 'RESEARCHER'] as const;
