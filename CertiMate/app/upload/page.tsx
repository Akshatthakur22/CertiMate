"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { UploadCloud, File, X, Check } from "lucide-react";
import { toast } from "sonner";
import axios from "axios";
import { BrandButton } from "@/components/ui/brand-button";
import { Card, CardContent } from "@/components/ui/card";
import { PageLayout } from "@/components/layout/page-layout";

export default function UploadPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 1) {
      toast.error("Please upload only one file.");
      return;
    }

    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      const validTypes = ['image/png', 'image/jpeg', 'application/pdf'];
      if (!validTypes.includes(droppedFile.type)) {
        toast.error("Invalid file type. Please upload PNG, JPG, or PDF.");
        return;
      }

      if (droppedFile.size > MAX_FILE_SIZE_BYTES) {
        toast.error("File too large. Maximum allowed size is 10MB.");
        return;
      }

      setFile(droppedFile);
    }
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    console.log("File selected:", selectedFile);
    
    if (selectedFile) {
      console.log("File type:", selectedFile.type);
      const validTypes = ['image/png', 'image/jpeg', 'application/pdf'];
      
      if (!validTypes.includes(selectedFile.type)) {
        console.log("Invalid file type:", selectedFile.type);
        toast.error("Invalid file type. Please upload PNG, JPG, or PDF.");
        // reset input so selecting the same file again will retrigger change
        if (fileInputRef.current) fileInputRef.current.value = "";
        return;
      }

      if (selectedFile.size > MAX_FILE_SIZE_BYTES) {
        console.log("File too large:", selectedFile.size);
        toast.error("File too large. Maximum allowed size is 10MB.");
        if (fileInputRef.current) fileInputRef.current.value = "";
        return;
      }

      setFile(selectedFile);
      console.log("File accepted and set");
      // allow reselecting the same file by clearing input value
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }, []);

  const handleRemove = useCallback(() => {
    setFile(null);
  }, []);

  const handleNext = useCallback(async () => {
    if (!file) return;

    setIsUploading(true);
    try {
      // First, wake up the backend (Render free tier cold start)
      toast.info("Connecting to server...", { duration: 2000 });
      try {
        await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/`, { 
          method: 'GET',
          signal: AbortSignal.timeout(10000) 
        });
      } catch (wakeError) {
        console.warn("Wake-up ping failed (may still work):", wakeError);
      }
      
      toast.info("Uploading template...");
      const formData = new FormData();
      formData.append("file", file);
      
      // Include existing sessionId if available
      const existingSessionId = sessionStorage.getItem("sessionId");
      if (existingSessionId) {
        formData.append("sessionId", existingSessionId);
      }
      
      const response = await axios.post("/api/upload", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      const result = response.data;
      
      // Backend returns success if no exception is thrown
      toast.success(result.message || "Template uploaded successfully!");
      
      // Store sessionId from response
      if (result.sessionId) {
        sessionStorage.setItem("sessionId", result.sessionId);
      }
      
      // Store file path in session for next page
      sessionStorage.setItem("templatePath", result.file_path);
      sessionStorage.setItem("templateFilename", result.filename);
      
      // Navigate to template editor page
      router.push("/template-editor");
    } catch (error: any) {
      console.error("Upload error:", error);
      
      // Better error messages for common Render issues
      let errorMessage = "Failed to upload template.";
      
      if (error.code === "ERR_NETWORK" || error.code === "ERR_EMPTY_RESPONSE") {
        errorMessage = "Server not responding. Render may be starting up (takes ~30s). Please try again in a moment.";
      } else if (error.code === "ECONNABORTED" || error.message?.includes("timeout")) {
        errorMessage = "Upload timed out. Server may be cold-starting. Please try again.";
      } else {
        errorMessage = error.response?.data?.detail || 
                      error.response?.data?.message || 
                      error.message || 
                      "Failed to upload template. Please try again.";
      }
      
      toast.error(errorMessage, { duration: 5000 });
    } finally {
      setIsUploading(false);
    }
  }, [file, router]);

  // Generate preview URL for images
  useEffect(() => {
    if (file && file.type.startsWith("image/")) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    }
    setPreviewUrl(null);
  }, [file]);

  const getFileIcon = (type: string) => {
    if (type.includes('pdf')) return '📄';
    return '🖼️';
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <PageLayout>
      {/* Background gradient aligned with landing */}
      <div className="min-h-screen py-8 sm:py-12 md:py-16 lg:py-20 px-4 sm:px-6 bg-gradient-to-br from-white via-indigo-50/30 to-white">
        <div className="container max-w-3xl mx-auto">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center mb-6 sm:mb-8 md:mb-12"
          >
            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-2 sm:mb-3 md:mb-4">
              Upload Your Template
            </h1>
            <p className="text-sm sm:text-base md:text-lg text-gray-600 max-w-2xl mx-auto px-2 sm:px-4">
              Start by uploading your certificate template. We support PNG, JPG, and PDF formats.
            </p>
          </motion.div>

          {/* Progress Steps */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="mb-8"
          >
            <div className="flex items-center justify-center space-x-2 sm:space-x-3 md:space-x-4 overflow-x-auto pb-2">
              {[
                { num: 1, label: 'Upload', active: true },
                { num: 2, label: 'Map Data', active: false },
                { num: 3, label: 'Generate', active: false },
              ].map((step) => (
                <div key={step.num} className="flex items-center flex-shrink-0">
                  <div
                    className={`flex flex-col items-center ${
                      step.active ? 'text-indigo-600' : 'text-gray-400'
                    }`}
                  >
                    <div
                      className={`h-10 w-10 sm:h-11 sm:w-11 md:h-12 md:w-12 rounded-full flex items-center justify-center font-bold border-2 transition-all ${
                        step.active
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-brand'
                          : 'bg-white text-gray-400 border-gray-300'
                      }`}
                    >
                      {step.active ? <Check className="h-5 w-5 sm:h-6 sm:w-6" /> : <span className="text-sm sm:text-base">{step.num}</span>}
                    </div>
                    <span className="text-xs sm:text-sm mt-2 font-medium whitespace-nowrap">{step.label}</span>
                  </div>
                  {step.num < 3 && (
                    <div
                      className={`h-0.5 w-4 sm:w-8 md:w-12 lg:w-16 mx-1 sm:mx-2 md:mx-3 lg:mx-4 transition-colors ${
                        step.active ? 'bg-indigo-600' : 'bg-gray-300'
                      }`}
                    />
                  )}
                </div>
              ))}
            </div>
          </motion.div>

          {/* Upload Area - gradient border dropzone */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
          >
            {/* Outer wrapper gives a subtle gradient border */}
            <div className={`rounded-2xl p-[1px] bg-gradient-to-r from-indigo-200/60 via-indigo-500/20 to-indigo-200/60 transition-all ${isDragging ? 'from-indigo-300 via-indigo-500/30 to-indigo-300' : ''}`}>
            <Card className={`rounded-xl border-2 border-dashed transition-all duration-300 ${isDragging ? 'border-indigo-500 bg-indigo-50/50' : 'border-gray-300'}`}>
              {!file ? (
                <CardContent className="p-6 sm:p-8 md:p-12">
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`text-center cursor-pointer transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40 rounded-xl ${
                      isDragging ? 'bg-indigo-50/50' : ''
                    }`}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        fileInputRef.current?.click();
                      }
                    }}
                    aria-label="Upload template file"
                  >
                    <UploadCloud
                      className={`h-12 w-12 sm:h-14 sm:w-14 md:h-16 md:w-16 mx-auto mb-4 transition-colors ${
                        isDragging ? 'text-indigo-600' : 'text-gray-400'
                      }`}
                    />
                    <h3 className="text-base sm:text-lg md:text-xl font-semibold text-gray-900 mb-2">
                      {isDragging ? 'Drop your file here' : 'Drag and drop your template'}
                    </h3>
                    <p className="text-sm sm:text-base text-gray-600 mb-6">
                      or click to browse files
                    </p>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/jpg,application/pdf"
                      onChange={handleFileSelect}
                      className="hidden"
                      id="file-upload"
                      name="template-upload"
                    />
                    <BrandButton
                      variant="outline"
                      size="default"
                      onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                      className="cursor-pointer min-h-[44px]"
                    >
                      Select File
                    </BrandButton>
                    <p className="text-xs sm:text-sm text-gray-500 mt-4">
                      Supported: PNG, JPG, PDF • Max 10MB
                    </p>
                  </div>
                </CardContent>
              ) : (
                <CardContent className="p-4 sm:p-6">
                  {/* Selected file summary + preview */}
                  <div className="flex items-center justify-between bg-gray-50 rounded-lg p-3 sm:p-4 gap-3">
                    <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
                      {previewUrl ? (
                        <img src={previewUrl} alt="Preview" className="h-12 w-12 sm:h-14 sm:w-14 md:h-16 md:w-16 rounded-md object-cover border border-gray-200 flex-shrink-0" />
                      ) : (
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className="text-2xl sm:text-3xl md:text-4xl">{getFileIcon(file.type)}</span>
                          {file.type.includes('pdf') && (
                            <span className="text-[10px] sm:text-xs px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700 border border-indigo-200">PDF</span>
                          )}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-gray-900 text-sm sm:text-base truncate">{file.name}</p>
                        <p className="text-xs sm:text-sm text-gray-600">
                          {formatFileSize(file.size)} • {file.type}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={handleRemove}
                      className="p-2 sm:p-2.5 hover:bg-gray-200 rounded-lg transition-colors flex-shrink-0 min-h-[44px] min-w-[44px] flex items-center justify-center"
                      aria-label="Remove file"
                    >
                      <X className="h-5 w-5 sm:h-6 sm:w-6 text-gray-600 hover:text-gray-900" />
                    </button>
                  </div>

                  {/* Indeterminate progress / skeleton while uploading */}
                  {isUploading && (
                    <div className="mt-4">
                      <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
                        <div className="h-full w-1/2 rounded-full bg-gradient-to-r from-indigo-400 via-indigo-600 to-indigo-400 animate-[pulse_1.2s_ease-in-out_infinite]" />
                      </div>
                      <p className="text-xs text-gray-600 mt-2">Uploading… please wait</p>
                    </div>
                  )}
                </CardContent>
              )}
            </Card>
            {/* Live region for screen readers announcing status */}
            <span className="sr-only" role="status" aria-live="polite">
              {isUploading ? 'Uploading template…' : file ? `${file.name} selected` : 'No file selected'}
            </span>
            </div>
          </motion.div>

          {/* Actions */}
          {file && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.5 }}
              className="flex justify-end mt-6 sm:mt-8"
            >
              <BrandButton
                variant="gradient"
                size="lg"
                onClick={handleNext}
                disabled={isUploading}
                className="w-full sm:w-auto min-h-[44px]"
                aria-label={isUploading ? "Uploading template" : "Continue to mapping"}
              >
                {isUploading ? "Uploading..." : "Next: Map Data"}
              </BrandButton>
            </motion.div>
          )}
        </div>
      </div>
    </PageLayout>
  );
}

