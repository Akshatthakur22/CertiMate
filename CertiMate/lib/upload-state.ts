// Shared state for storing uploaded files (use database in production)
let uploadedTemplatePath: string | null = null;
let uploadedCSVPath: string | null = null;
let uploadedCSVContent: string | null = null;

export function setTemplatePath(path: string) {
  uploadedTemplatePath = path;
}

export function getTemplatePath(): string | null {
  return uploadedTemplatePath;
}

export function setCSVData(path: string, content: string) {
  uploadedCSVPath = path;
  uploadedCSVContent = content;
}

export function getCSVPath(): string | null {
  return uploadedCSVPath;
}

export function getCSVContent(): string | null {
  return uploadedCSVContent;
}

export function clearAll() {
  uploadedTemplatePath = null;
  uploadedCSVPath = null;
  uploadedCSVContent = null;
}
