// Strict TypeScript definitions for MedShare Domain Models

export type Role = 'ADMIN' | 'DOCTOR' | 'PATIENT' | 'RESEARCHER';
export type PrivacyLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'VERY_HIGH';
export type RecordStatus = 'ENCRYPTED' | 'STORED' | 'AVAILABLE';

export interface IUser {
  id: string;
  name: string;
  email?: string;
  role: Role;
  organization?: string;
  department?: string;
  status: 'ACTIVE' | 'DISABLED';
  lastLogin?: string;
}

export interface IMedicalRecord {
  id: string;
  title: string;
  date: string;
  privacy: PrivacyLevel;
  status: RecordStatus;
  doctor?: string;
  patientName?: string;
  record?: string;
  department?: string;
  hospital?: string;
  expiry?: string;
}

export interface ISystemStats {
  totalPatients: number;
  totalDoctors: number;
  hospitalsConnected: number;
  activePackages: number;
  activeContracts: number;
  fabricTransactions: number;
  ipfsObjects: number;
  bgwRecipients: number;
  todaysRequests: number;
  failedRequests: number;
}

export interface IChartDataPoint {
  name: string;
  value?: number;
  requests?: number;
  packages?: number;
  granted?: number;
  revoked?: number;
}
