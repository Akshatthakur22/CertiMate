import axios from "axios";

// Create axios instance with default config
export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000",
  timeout: 120000, // ⏱ increased from 30s → 2min to prevent "timeout exceeded" errors

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
  validateMapping: "/api/mapping/validate", // Backend uses /api/mapping/validate
  generatePreview: "/api/mapping/preview", // Backend uses /api/mapping/preview
  analyzeCSV: "/api/mapping/analyze-csv",   // Backend uses /api/mapping/analyze-csv
  jobStatus: "/api/generate/status",        // Backend uses /api/generate/status/{job_id}
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
  job_id?: string;
  status?: string;
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
      timeout: 180000, // 3 minutes for uploads (Render cold start + upload time)
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
      timeout: 180000, // 3 minutes for uploads (Render cold start + upload time)
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
export interface MappingConfig {
  name: string;
  role?: string;
  date?: string;
}

export interface GenerateWithMappingRequest {
  mapping: MappingConfig;
}

export async function generateBatch(mapping?: MappingConfig): Promise<GenerateResponse> {
  const requestBody = mapping ? { mapping } : undefined;
  const response = await api.post<GenerateResponse>(
    endpoints.generateBatch,
    requestBody,
    {
      params: { placeholder_text: "{{NAME}}" }
    }
  );
  return response.data;
}

/**
 * Validate mapping configuration
 */
export interface ValidateMappingResponse {
  success: boolean;
  message: string;
  validation: {
    name: { valid: boolean; error: string | null; details?: string };
    role: { valid: boolean; error: string | null };
    date: { valid: boolean; error: string | null };
  };
  preview_data: {
    name: string;
    role: string;
    date: string;
  };
  csv_stats: {
    total_rows: number;
    total_columns: number;
    columns: string[];
  };
}

export async function validateMapping(
  mapping: MappingConfig
): Promise<ValidateMappingResponse> {
  const response = await api.post<ValidateMappingResponse>(
    endpoints.validateMapping,
    { mapping }
  );
  return response.data;
}

/**
 * Generate preview certificate image
 */
export interface PreviewResponse {
  success: boolean;
  message: string;
  preview_image: string; // base64 data URL
  preview_data: {
    name: string;
    role: string;
    date: string;
  };
}

export async function generatePreview(
  mapping: MappingConfig,
  rowIndex: number = 0
): Promise<PreviewResponse> {
  const response = await api.post<PreviewResponse>(
    endpoints.generatePreview,
    { mapping, row_index: rowIndex }
  );
  return response.data;
}

/**
 * Analyze CSV file and return column information
 */
export interface AnalyzeCSVResponse {
  success: boolean;
  message: string;
  csv_stats: {
    filename: string;
    total_rows: number;
    total_columns: number;
    columns: string[];
  };
  sample_data: Array<Record<string, any>>;
}

export async function analyzeCSV(): Promise<AnalyzeCSVResponse> {
  const response = await api.get<AnalyzeCSVResponse>(endpoints.analyzeCSV);
  return response.data;
}

/**
 * Get job status
 */
export interface JobStatusResponse {
  job_id: string;
  status: "queued" | "processing" | "completed" | "failed";
  num_certificates?: number;
  successful?: number;
  failed?: number;
  download_url?: string;
}

export async function getJobStatus(jobId: string): Promise<JobStatusResponse> {
  const response = await api.get<JobStatusResponse>(
    `${endpoints.jobStatus}/${jobId}`
  );
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
  event_name?: string; // For {{event}} placeholder
}

export interface SendEmailResponse {
  message: string;
  job_id?: string;
  status?: string;
  total: number;
  successful?: number;
  failed?: number;
  success_rate?: number;
  details?: Array<{
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

/**
 * Preview email with personalized content
 */
export interface EmailPreviewRequest {
  subject: string;
  body_template: string;
  recipient_name?: string;
  event_name?: string;
}

export interface EmailPreviewResponse {
  success: boolean;
  preview: {
    subject: string;
    body: string;
    recipient_name: string;
    event_name: string;
  };
}

export async function previewEmail(
  request: EmailPreviewRequest
): Promise<EmailPreviewResponse> {
  const response = await api.post<EmailPreviewResponse>(
    `${endpoints.sendEmail}/preview`,
    request
  );
  return response.data;
}
