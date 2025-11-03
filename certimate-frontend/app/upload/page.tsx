"use client";

import { useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { UploadCloud, File, X, Check } from "lucide-react";
import { toast } from "sonner";
import { BrandButton } from "@/components/ui/brand-button";
import { Card, CardContent } from "@/components/ui/card";
import { PageLayout } from "@/components/layout/page-layout";
import { uploadTemplate } from "@/lib/api";

export default function UploadPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

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
    
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      const validTypes = ['image/png', 'image/jpeg', 'application/pdf'];
      if (validTypes.includes(droppedFile.type)) {
        setFile(droppedFile);
      }
    }
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    console.log("File selected:", selectedFile);
    
    if (selectedFile) {
      console.log("File type:", selectedFile.type);
      const validTypes = ['image/png', 'image/jpeg', 'application/pdf'];
      
      if (validTypes.includes(selectedFile.type)) {
        setFile(selectedFile);
        console.log("File accepted and set");
      } else {
        console.log("Invalid file type:", selectedFile.type);
        toast.error("Invalid file type. Please upload PNG, JPG, or PDF.");
      }
    }
  }, []);

  const handleRemove = useCallback(() => {
    setFile(null);
  }, []);

  const handleNext = useCallback(async () => {
    if (!file) return;

    setIsUploading(true);
    try {
      const result = await uploadTemplate(file);
      
      // Backend returns success if no exception is thrown
      toast.success(result.message || "Template uploaded successfully!");
      
      // Store file path in session for next page
      sessionStorage.setItem("templatePath", result.file_path);
      sessionStorage.setItem("templateFilename", result.filename);
      
      router.push("/mapping");
    } catch (error: any) {
      console.error("Upload error:", error);
      const errorMessage = error.response?.data?.detail || 
                          error.response?.data?.message || 
                          error.message || 
                          "Failed to upload template. Please try again.";
      toast.error(errorMessage);
    } finally {
      setIsUploading(false);
    }
  }, [file, router]);

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
      <div className="min-h-screen py-12 sm:py-20 px-4 bg-gradient-to-br from-background via-primary/5">
        <div className="container max-w-4xl mx-auto">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center mb-8 sm:mb-12"
          >
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-foreground mb-3 sm:mb-4">
              Upload Your Template
            </h1>
            <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto px-4">
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
            <div className="flex items-center justify-center space-x-2 sm:space-x-4">
              {[
                { num: 1, label: 'Upload', active: true },
                { num: 2, label: 'Map Data', active: false },
                { num: 3, label: 'Generate', active: false },
              ].map((step) => (
                <div key={step.num} className="flex items-center">
                  <div
                    className={`flex flex-col items-center ${
                      step.active ? 'text-primary' : 'text-muted-foreground'
                    }`}
                  >
                    <div
                      className={`h-8 w-8 sm:h-10 sm:w-10 rounded-full flex items-center justify-center font-bold border-2 transition-all ${
                        step.active
                          ? 'bg-primary text-primary-foreground border-primary shadow-brand'
                          : 'bg-card text-muted-foreground border-border'
                      }`}
                    >
                      {step.active ? <Check className="h-4 w-4 sm:h-5 sm:w-5" /> : <span className="text-xs sm:text-sm">{step.num}</span>}
                    </div>
                    <span className="text-xs sm:text-sm mt-2 font-medium">{step.label}</span>
                  </div>
                  {step.num < 3 && (
                    <div
                      className={`h-0.5 w-6 sm:w-16 mx-2 sm:mx-4 transition-colors ${
                        step.active ? 'bg-primary' : 'bg-border'
                      }`}
                    />
                  )}
                </div>
              ))}
            </div>
          </motion.div>

          {/* Upload Area */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
          >
            <Card className={`border-2 border-dashed transition-all duration-300 ${isDragging ? 'border-primary bg-primary/5' : 'border-border'}`}>
              {!file ? (
                <CardContent className="p-6 sm:p-12">
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`text-center cursor-pointer transition-colors ${
                      isDragging ? 'bg-primary/5' : ''
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
                      className={`h-12 w-12 sm:h-16 sm:w-16 mx-auto mb-4 transition-colors ${
                        isDragging ? 'text-primary' : 'text-muted-foreground'
                      }`}
                    />
                    <h3 className="text-base sm:text-xl font-semibold text-foreground mb-2">
                      {isDragging ? 'Drop your file here' : 'Drag and drop your template'}
                    </h3>
                    <p className="text-sm sm:text-base text-muted-foreground mb-6">
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
                      onClick={() => fileInputRef.current?.click()}
                      className="cursor-pointer"
                    >
                      Select File
                    </BrandButton>
                    <p className="text-xs sm:text-sm text-muted-foreground mt-4">
                      Supported formats: PNG, JPG, PDF (Max 10MB)
                    </p>
                  </div>
                </CardContent>
              ) : (
                <CardContent className="p-4 sm:p-6">
                  <div className="flex items-center justify-between bg-muted/50 rounded-lg p-3 sm:p-4">
                    <div className="flex items-center space-x-3 sm:space-x-4 flex-1 min-w-0">
                      <span className="text-2xl sm:text-4xl flex-shrink-0">{getFileIcon(file.type)}</span>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-foreground text-sm sm:text-base truncate">{file.name}</p>
                        <p className="text-xs sm:text-sm text-muted-foreground">
                          {formatFileSize(file.size)} • {file.type}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={handleRemove}
                      className="p-2 hover:bg-muted rounded-lg transition-colors flex-shrink-0 ml-2"
                      aria-label="Remove file"
                    >
                      <X className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground hover:text-foreground" />
                    </button>
                  </div>
                </CardContent>
              )}
            </Card>
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
                className="w-full sm:w-auto"
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

