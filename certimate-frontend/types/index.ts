// Global type definitions for CertiMate

export interface Certificate {
  id: string;
  studentName: string;
  courseName: string;
  completionDate: string;
  issueDate: string;
  certificateNumber: string;
}

export interface CertificateTemplate {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  createdAt: string;
}

export interface UploadResponse {
  success: boolean;
  message: string;
  data?: {
    previewUrl?: string;
    totalRecords?: number;
  };
}

export interface GenerateResponse {
  success: boolean;
  message: string;
  data?: {
    downloadUrl?: string;
    totalGenerated?: number;
    failed?: number;
  };
}
