"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
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
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB
  const handleAutoUpload = useCallback(async (fileToUpload: File) => {
    setIsUploading(true);
    try {
      // First, wake up the backend (Render free tier cold start)
      try {
        await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/`, { 
          method: 'GET',
          signal: AbortSignal.timeout(10000) 
        });
      } catch (wakeError) {
        console.warn("Wake-up ping failed (may still work):", wakeError);
      }
      
      const formData = new FormData();
      formData.append("file", fileToUpload);
      
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
      
      // Store sessionId from response
      if (result.sessionId) {
        sessionStorage.setItem("sessionId", result.sessionId);
      }
      
      // Store file path in session for next page
      sessionStorage.setItem("templatePath", result.file_path);
      sessionStorage.setItem("templateFilename", result.filename);
      
      // Start the wow transition
      setIsTransitioning(true);
      setTimeout(() => {
        router.push("/template-editor");
      }, 3000);
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
  }, [router, setIsTransitioning]);

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
      
      // Auto-upload after file drop
      setTimeout(() => {
        const fileToUpload = droppedFile;
        setIsUploading(true);
        handleAutoUpload(fileToUpload);
      }, 100);
    }
  }, [handleAutoUpload]);

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
      
      // Auto-upload after file selection
      setTimeout(() => {
        const fileToUpload = selectedFile;
        setIsUploading(true);
        handleAutoUpload(fileToUpload);
      }, 100);
    }
  }, [handleAutoUpload]);

  const handleRemove = useCallback(() => {
    setFile(null);
  }, []);

  const handleNext = useCallback(async () => {
    if (!file) return;
    await handleAutoUpload(file);
  }, [file, handleAutoUpload]);

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
                { num: 1, label: 'Upload Template', active: true },
                { num: 2, label: 'Design Template', active: false },
                { num: 3, label: 'Map Data', active: false },
                { num: 4, label: 'Generate', active: false },
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
                  {step.num < 4 && (
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
                      <p className="text-xs text-gray-600 mt-2 text-center">
                        {isUploading ? "Processing template…" : "Preparing editor…"}
                      </p>
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

          {/* Upload completion message */}
          {file && !isUploading && !isTransitioning && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.3 }}
              className="text-center mt-6"
            >
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-50 border border-green-200 rounded-full">
                <Check className="h-4 w-4 text-green-600" />
                <span className="text-sm text-green-700 font-medium">Opening editor...</span>
              </div>
            </motion.div>
          )}
        </div>
        
        {/* Wow Transition Overlay */}
        <AnimatePresence>
          {isTransitioning && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[9999] flex items-center justify-center bg-gradient-to-br from-white to-indigo-50"
            >
              <div className="text-center max-w-4xl mx-auto px-4">
                {/* CertiMate Branding */}
                <motion.div
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                  className="mb-8"
                >
                  <span className="font-extrabold text-3xl md:text-4xl">
                    <span className="text-slate-900">Certi</span>
                    <span className="text-blue-600">Mate</span>
                  </span>
                  <div className="mt-2 text-sm text-gray-500">Making certificate distribution effortless</div>
                </motion.div>
                
                {/* Animated Background Elements */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                  {[...Array(4)].map((_, i) => (
                    <motion.div
                      key={i}
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: [0, 1, 0], opacity: [0, 0.2, 0] }}
                      transition={{ 
                        delay: i * 0.3, 
                        duration: 3, 
                        repeat: Infinity, 
                        ease: "easeInOut" 
                      }}
                      className="absolute w-24 h-24 rounded-full bg-gradient-to-br from-indigo-200/20 to-blue-200/20"
                      style={{
                        top: `${15 + (i % 2) * 40}%`,
                        left: `${20 + (i % 2) * 30}%`,
                      }}
                    />
                  ))}
                </div>
                
                {/* Main Loading Animation */}
                <motion.div
                  initial={{ scale: 0, rotate: 0 }}
                  animate={{ scale: 1, rotate: 360 }}
                  transition={{ duration: 0.8, ease: "easeInOut" }}
                  className="mb-8 relative"
                >
                  <div className="w-28 h-28 mx-auto relative">
                    {/* Outer ring */}
                    <motion.div 
                      animate={{ rotate: 360 }}
                      transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                      className="absolute inset-0 rounded-full border-4 border-indigo-200"
                    />
                    {/* Middle ring */}
                    <motion.div 
                      animate={{ rotate: -360 }}
                      transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                      className="absolute inset-2 rounded-full border-2 border-blue-200"
                    />
                    {/* Center circle */}
                    <div className="absolute inset-4 bg-gradient-to-br from-indigo-100 to-blue-100 rounded-full flex items-center justify-center shadow-lg">
                      <motion.div
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                        className="text-2xl"
                      >
                        ✨
                      </motion.div>
                    </div>
                  </div>
                </motion.div>
                
                <motion.h2 
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3, duration: 0.6 }}
                  className="text-3xl md:text-5xl font-bold bg-gradient-to-r from-indigo-600 to-blue-600 bg-clip-text text-transparent mb-4"
                >
                  Preparing Your Canvas
                </motion.h2>
                
                <motion.p 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5, duration: 0.6 }}
                  className="text-lg md:text-xl text-gray-600 mb-8"
                >
                  Your creative workspace is almost ready...
                </motion.p>
                
                {/* What's Coming Preview */}
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.7, duration: 0.6 }}
                  className="mb-8"
                >
                </motion.div>
                
                {/* Loading Dots */}
                <motion.div 
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 1.5, duration: 0.5 }}
                  className="flex items-center justify-center gap-2 mb-6"
                >
                  <div className="flex gap-1">
                    {[0, 1, 2].map((i) => (
                      <motion.div
                        key={i}
                        animate={{ scale: [1, 1.5, 1] }}
                        transition={{ 
                          delay: 1.6 + i * 0.1, 
                          duration: 0.6, 
                          repeat: Infinity, 
                          ease: "easeInOut" 
                        }}
                        className="w-3 h-3 bg-gradient-to-r from-indigo-400 to-blue-400 rounded-full"
                      />
                    ))}
                  </div>
                </motion.div>
                
                {/* Progress Bar */}
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: "280px" }}
                  transition={{ delay: 1.7, duration: 1, ease: "easeInOut" }}
                  className="h-2 bg-gray-200 rounded-full mx-auto overflow-hidden"
                >
                  <motion.div 
                    initial={{ x: -280 }}
                    animate={{ x: 280 }}
                    transition={{ delay: 1.7, duration: 2, repeat: Infinity, ease: "linear" }}
                    className="h-full w-16 bg-gradient-to-r from-indigo-400 to-blue-400 rounded-full"
                  />
                </motion.div>
                
                <motion.p 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 2.0, duration: 0.4 }}
                  className="text-sm text-gray-500 mt-4"
                >
                  Preparing your design tools...
                </motion.p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </PageLayout>
  );
}

