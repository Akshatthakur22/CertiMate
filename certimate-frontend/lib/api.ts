import axios from "axios";

// Create axios instance with default config
export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000",
  timeout: 30000,
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    // Add auth token if available (client-side only)
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("token");
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // Handle common errors
    if (error.response?.status === 401 && typeof window !== "undefined") {
      localStorage.removeItem("token");
    }
    return Promise.reject(error);
  }
);

// API endpoints - match backend routes
export const endpoints = {
  health: "/health/",                     // Backend uses /health/
  uploadTemplate: "/api/upload/template",  // Backend uses /api/upload/template
  uploadCSV: "/api/upload/csv",           // Backend uses /api/upload/csv
  latestUploads: "/api/upload/latest",    // Backend uses /api/upload/latest
  generateBatch: "/api/generate/batch",   // Backend uses /api/generate/batch
  download: "/api/generate/download",     // Backend uses /api/generate/download/{filename}
  sendEmail: "/api/send/email",          // Backend uses /api/send/email
  csvContent: "/api/upload/csv/content", // Backend uses /api/upload/csv/content
};

// API functions
export interface UploadTemplateResponse {
  message: string;
  filename: string;
  file_path: string;
  file_type: string;
}

export interface UploadCSVResponse {
  message: string;
  filename: string;
  file_path: string;
}

export interface GenerateResponse {
  message: string;
  num_certificates: number;
  successful: number;
  failed: number;
  download_url: string;
}

export interface LatestUploadsResponse {
  message: string;
  template: {
    filename: string;
    file_path: string;
    timestamp: string;
  } | null;
  csv: {
    filename: string;
    file_path: string;
    timestamp: string;
  } | null;
  ready: boolean;
}

export interface CSVContentResponse {
  message: string;
  filename: string;
  content: string;
}

/**
 * Upload certificate template
 */
export async function uploadTemplate(file: File): Promise<UploadTemplateResponse> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await api.post<UploadTemplateResponse>(
    endpoints.uploadTemplate,
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    }
  );

  return response.data;
}

/**
 * Upload CSV file with student data
 */
export async function uploadCSV(file: File): Promise<UploadCSVResponse> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await api.post<UploadCSVResponse>(
    endpoints.uploadCSV,
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    }
  );

  return response.data;
}

/**
 * Get latest uploaded files
 */
export async function getLatestUploads(): Promise<LatestUploadsResponse> {
  const response = await api.get<LatestUploadsResponse>(endpoints.latestUploads);
  return response.data;
}

/**
 * Get CSV content
 */
export async function getCSVContent(): Promise<CSVContentResponse> {
  const response = await api.get<CSVContentResponse>(endpoints.csvContent);
  return response.data;
}

/**
 * Generate certificates using batch endpoint
 */
export async function generateBatch(): Promise<GenerateResponse> {
  const response = await api.post<GenerateResponse>(endpoints.generateBatch);
  return response.data;
}

/**
 * Health check
 */
export async function healthCheck(): Promise<{ status: string }> {
  const response = await api.get(endpoints.health);
  return response.data;
}

/**
 * Send certificates via email
 */
export interface EmailRecipient {
  email: string;
  name: string;
  certificate_filename?: string;
}

export interface SendEmailRequest {
  access_token: string;
  recipients: EmailRecipient[];
  subject?: string;
  body_template?: string;
  certificates_dir?: string;
}

export interface SendEmailResponse {
  message: string;
  total: number;
  successful: number;
  failed: number;
  success_rate: number;
  details: Array<{
    success: boolean;
    recipient_email: string;
    recipient_name: string;
    message_id?: string;
    error?: string;
  }>;
}

export async function sendCertificateEmail(
  request: SendEmailRequest
): Promise<SendEmailResponse> {
  // Log the request for debugging
  console.log('📧 Sending email request:', {
    has_token: !!request.access_token,
    recipients_count: request.recipients?.length || 0,
    subject: request.subject,
    certificates_dir: request.certificates_dir
  });

  const response = await api.post<SendEmailResponse>(
    endpoints.sendEmail,
    request
  );
  return response.data;
}
