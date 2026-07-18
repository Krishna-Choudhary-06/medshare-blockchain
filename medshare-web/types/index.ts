export interface BaseRecord {
  id: string;
  createdAt: string;
  updatedAt: string;
}

export interface User extends BaseRecord {
  name: string;
  role: 'DOCTOR' | 'PATIENT' | 'ADMIN' | 'RESEARCHER';
  organization: string;
  publicKey?: string;
}

export interface MedicalRecord extends BaseRecord {
  patientId: string;
  ipfsHash: string;
  sensitivity: 'LOW' | 'MEDIUM' | 'HIGH' | 'VERY_HIGH';
  metadata: Record<string, any>;
}

export interface AccessLog extends BaseRecord {
  recordId: string;
  requesterId: string;
  action: 'READ' | 'WRITE' | 'DOWNLOAD';
  status: 'GRANTED' | 'DENIED';
  timestamp: string;
}
