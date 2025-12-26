"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  Upload,
  FileSpreadsheet,
  Download,
  Check,
  Eye,
  User,
  Tag,
  Calendar,
  HelpCircle,
  Sparkles,
  ArrowLeft,
  FileText,
  RefreshCw,
  CheckCircle2,
  Loader2,
  Save,
} from "lucide-react";
import { BrandButton } from "@/components/ui/brand-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton, SkeletonCertificatePreview } from "@/components/ui/skeleton";
import { PageLayout } from "@/components/layout/page-layout";
import {
  uploadCSV,
  generateBatch,
  validateMapping,
  generatePreview,
  analyzeCSV,
  type MappingConfig,
} from "@/lib/api";

interface CSVData {
  headers: string[];
  rows: string[][];
}

interface FieldConfig {
  key: string;
  label: string;
  icon: React.ElementType;
  placeholder: string;
  tooltip: string;
}

const fieldConfigs: FieldConfig[] = [
  {
    key: "name",
    label: "Name",
    icon: User,
    placeholder: "Select column...",
    tooltip: "The recipient's full name that will appear on the certificate",
  },
  {
    key: "role",
    label: "Role/Title",
    icon: Tag,
    placeholder: "Select column...",
    tooltip: "The role, title, or course name for the certificate",
  },
  {
    key: "date",
    label: "Date",
    icon: Calendar,
    placeholder: "Select column...",
    tooltip: "The issue date or completion date for the certificate",
  },
];

export default function MappingPage() {
  const router = useRouter();
  const [csvData, setCsvData] = useState<CSVData | null>(null);
  const [mapping, setMapping] = useState<Record<string, string>>({
    name: "",
    role: "",
    date: "",
  });
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [suggestedMapping, setSuggestedMapping] = useState<Record<string, string>>({});
  const [isValidating, setIsValidating] = useState(false);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [autoSaveStatus, setAutoSaveStatus] = useState<"saved" | "saving" | null>(null);
  const [csvStats, setCsvStats] = useState<{
    total_rows: number;
    total_columns: number;
    columns: string[];
  } | null>(null);
  const csvInputRef = useRef<HTMLInputElement>(null);
  const validationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const previewTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const MAX_CSV_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

  // Check if all fields are mapped
  const allFieldsMapped = mapping.name && mapping.role && mapping.date;

  // Auto-save feedback
  useEffect(() => {
    if (mapping.name && csvData) {
      setAutoSaveStatus("saving");
      const timer = setTimeout(() => {
        setAutoSaveStatus("saved");
        setTimeout(() => setAutoSaveStatus(null), 2000);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [mapping, csvData]);

  // Validate mapping when it changes
  useEffect(() => {
    if (validationTimeoutRef.current) {
      clearTimeout(validationTimeoutRef.current);
    }

    if (mapping.name && csvData) {
      validationTimeoutRef.current = setTimeout(async () => {
        setIsValidating(true);
        try {
          const mappingConfig: MappingConfig = {
            name: mapping.name,
            role: mapping.role || undefined,
            date: mapping.date || undefined,
          };
          await validateMapping(mappingConfig);
        } catch (error: any) {
          const errorDetail = error.response?.data?.detail;
          if (errorDetail?.error === "Missing column") {
            toast.error(errorDetail.details || "Column not found in CSV");
          }
        } finally {
          setIsValidating(false);
        }
      }, 1000); // Debounce validation
    }

    return () => {
      if (validationTimeoutRef.current) {
        clearTimeout(validationTimeoutRef.current);
      }
    };
  }, [mapping, csvData]);

  // Load preview image when mapping changes
  useEffect(() => {
    if (previewTimeoutRef.current) {
      clearTimeout(previewTimeoutRef.current);
    }

    if (mapping.name && csvData) {
      previewTimeoutRef.current = setTimeout(async () => {
        setIsLoadingPreview(true);
        try {
          const mappingConfig: MappingConfig = {
            name: mapping.name,
            role: mapping.role || undefined,
            date: mapping.date || undefined,
          };
          const preview = await generatePreview(mappingConfig, 0);
          setPreviewImage(preview.preview_image);
        } catch (error: any) {
          console.error("Preview generation error:", error);
          // Don't show error toast for preview failures, just log
        } finally {
          setIsLoadingPreview(false);
        }
      }, 1500); // Debounce preview generation
    }

    return () => {
      if (previewTimeoutRef.current) {
        clearTimeout(previewTimeoutRef.current);
      }
    };
  }, [mapping, csvData]);

  // Show success toast when all fields are mapped
  useEffect(() => {
    if (allFieldsMapped && csvData) {
      const timer = setTimeout(() => {
        toast.success("All fields mapped! Ready to generate certificates.", {
          duration: 3000,
        });
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [allFieldsMapped, csvData]);

  const handleCSVUpload = useCallback(async (file: File) => {
    // Validate type and size
    const isCsvType = file.type === "text/csv" || file.name.toLowerCase().endsWith(".csv");
    if (!isCsvType) {
      toast.error("Invalid file type. Please upload a CSV file.");
      if (csvInputRef.current) csvInputRef.current.value = "";
      return;
    }
    if (file.size > MAX_CSV_SIZE_BYTES) {
      toast.error("File too large. Maximum allowed size is 10MB.");
      if (csvInputRef.current) csvInputRef.current.value = "";
      return;
    }

    setCsvFile(file);

    // Upload CSV to backend first
    setIsUploading(true);
    try {
      const result = await uploadCSV(file);
      toast.success(result.message || "CSV uploaded successfully!");

      // Parse CSV for preview (simple split; assumes no quoted commas)
      const reader = new FileReader();
      reader.onload = async (event) => {
        const text = (event.target?.result as string) || "";
        const lines = text.split("\n").filter((line) => line.trim());
        if (lines.length === 0) {
          toast.error("CSV appears to be empty.");
          return;
        }
        const headers = lines[0].split(",").map((h) => h.trim());
        const rows = lines
          .slice(1)
          .map((line) => line.split(",").map((c) => c.trim()))
          .filter((r) => r.length > 0);

        const parsedData = { headers, rows };
        setCsvData(parsedData);

        // Auto-detect mapping by common header names
        const lowerHeaders = headers.map((h) => h.toLowerCase());
        const findHeader = (patterns: RegExp[]) => {
          for (const pattern of patterns) {
            const idx = lowerHeaders.findIndex((h) => pattern.test(h));
            if (idx !== -1) return headers[idx];
          }
          return "";
        };

        const autoName = findHeader([/name/, /full\s*name/, /student\s*name/, /participant/]);
        const autoRole = findHeader([/role/, /title/, /position/, /course/, /program/]);
        const autoDate = findHeader([/date/, /issued/, /certificate\s*date/, /completion\s*date/]);

        const suggestions: Record<string, string> = {};
        if (autoName) suggestions.name = autoName;
        if (autoRole) suggestions.role = autoRole;
        if (autoDate) suggestions.date = autoDate;

        setSuggestedMapping(suggestions);

        setMapping((prev) => ({
          ...prev,
          name: prev.name || autoName,
          role: prev.role || autoRole,
          date: prev.date || autoDate,
        }));

        // Analyze CSV from backend
        try {
          const analysis = await analyzeCSV();
          setCsvStats(analysis.csv_stats);
          toast.success(`CSV analyzed: ${analysis.csv_stats.total_rows} rows, ${analysis.csv_stats.total_columns} columns detected`);
        } catch (error) {
          console.error("CSV analysis error:", error);
          // Fallback to local parsing - use the parsed data
          setCsvStats({
            total_rows: parsedData.rows.length,
            total_columns: parsedData.headers.length,
            columns: parsedData.headers,
          });
        }
      };
      reader.readAsText(file);

      sessionStorage.setItem("csvFilename", file.name);
    } catch (error: any) {
      console.error("CSV upload error:", error);
      const errorMessage = error.response?.data?.detail || error.message || "Failed to upload CSV";
      toast.error(errorMessage);
    } finally {
      setIsUploading(false);
      // Reset input so selecting same file retriggers change
      if (csvInputRef.current) csvInputRef.current.value = "";
    }
  }, []);

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleCSVUpload(file);
    },
    [handleCSVUpload]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files?.[0];
      if (file) handleCSVUpload(file);
    },
    [handleCSVUpload]
  );

  const handleMappingChange = useCallback((key: string, value: string) => {
    setMapping((prev) => ({ ...prev, [key]: value }));
    // Reset preview when mapping changes
    setPreviewImage(null);
  }, []);

  const handleGenerate = async () => {
    if (!mapping.name) {
      toast.error("Please map at least the Name field");
      return;
    }

    if (!csvData) {
      toast.error("Please upload a CSV file first");
      return;
    }

    setIsGenerating(true);
    try {
      const mappingConfig: MappingConfig = {
        name: mapping.name,
        role: mapping.role || undefined,
        date: mapping.date || undefined,
      };

      const result = await generateBatch(mappingConfig);

      if (result.job_id) {
        toast.success("Generation started! Processing in background.");
        sessionStorage.setItem("jobId", result.job_id);
        // Clear previous results
        sessionStorage.removeItem("downloadUrl");
        sessionStorage.removeItem("numCertificates");
        sessionStorage.removeItem("successful");
        sessionStorage.removeItem("failed");

        router.push("/generate");
      } else {
        throw new Error("No job ID returned from server");
      }
    } catch (error: any) {
      console.error("Generation error:", error);
      const errorMessage =
        error.response?.data?.detail || error.message || "Failed to generate certificates";
      toast.error(errorMessage);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleBack = () => {
    router.push("/upload");
  };

  const downloadSampleCSV = () => {
    const sampleData = [
      ["Name", "Role/Title", "Date"],
      ["John Doe", "Web Developer", "2025-01-15"],
      ["Jane Smith", "Data Scientist", "2025-01-16"],
      ["Bob Johnson", "UX Designer", "2025-01-17"],
    ];
    const csvContent = sampleData.map((row) => row.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "sample_certificates.csv";
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success("Sample CSV downloaded!");
  };

  // Persist and restore mapping between navigations
  useEffect(() => {
    const saved = sessionStorage.getItem("mapping");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setMapping((prev) => ({ ...prev, ...parsed }));
      } catch { }
    }
  }, []);

  useEffect(() => {
    sessionStorage.setItem("mapping", JSON.stringify(mapping));
  }, [mapping]);

  // Get preview data from first row
  const previewData = csvData
    ? {
      name: mapping.name
        ? csvData.rows[0]?.[csvData.headers.indexOf(mapping.name)] || "Name"
        : "Name",
      role: mapping.role
        ? csvData.rows[0]?.[csvData.headers.indexOf(mapping.role)] || "Role/Title"
        : "Role/Title",
      date: mapping.date
        ? csvData.rows[0]?.[csvData.headers.indexOf(mapping.date)] || "Date"
        : "Date",
    }
    : null;

  return (
    <PageLayout>
      <div className="min-h-screen py-6 sm:py-8 md:py-12 lg:py-16 px-4 sm:px-6 bg-gradient-to-br from-white via-indigo-50/30 to-white">
        {/* Background glow effect */}
        <div className="fixed inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(99,102,241,0.05),transparent_70%)] pointer-events-none" />

        <div className="relative z-10 container max-w-7xl mx-auto">
          {/* Header Section with Progress */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center mb-6 sm:mb-8 md:mb-12"
          >
            <div className="inline-flex items-center gap-2 mb-3 sm:mb-4 px-3 sm:px-4 py-1.5 rounded-full bg-indigo-100/80 text-indigo-700 text-xs sm:text-sm font-medium">
              <span>Step 2 of 3</span>
              <span className="text-indigo-400">•</span>
              <span>Map Your Data</span>
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-2 sm:mb-3 md:mb-4">
              Map Your Data
            </h1>
            <p className="text-sm sm:text-base md:text-lg text-gray-600 max-w-2xl mx-auto px-2 sm:px-4">
              Match your CSV columns with certificate fields. We'll handle the rest.
            </p>
          </motion.div>

          {/* Animated Progress Bar */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="mb-8 sm:mb-12 max-w-2xl mx-auto"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Progress</span>
              <span className="text-sm font-medium text-indigo-600">66%</span>
            </div>
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: "66%" }}
                transition={{ duration: 1, ease: "easeOut" }}
                className="h-full bg-gradient-to-r from-indigo-500 to-blue-500 rounded-full"
              />
            </div>
          </motion.div>

          {/* Auto-save indicator */}
          {autoSaveStatus && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex items-center justify-center gap-2 mb-4 text-sm text-indigo-600"
            >
              {autoSaveStatus === "saving" ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Saving mapping...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Mapping saved</span>
                </>
              )}
            </motion.div>
          )}

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 md:gap-8 mb-6 sm:mb-8">
            {/* Left Column - CSV Upload & Mapping */}
            <div className="lg:col-span-2 space-y-4 sm:space-y-6">
              {/* CSV Upload Card */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3, duration: 0.5 }}
              >
                <Card className="bg-white/80 backdrop-blur-sm border-indigo-100 shadow-brand-lg hover:shadow-brand-xl transition-all duration-300">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div className="p-2 rounded-lg bg-indigo-100">
                          <FileSpreadsheet className="h-5 w-5 text-indigo-600" />
                        </div>
                        <CardTitle className="text-lg font-semibold text-gray-900">
                          Upload CSV Data
                        </CardTitle>
                      </div>
                      {csvData && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="flex items-center gap-1 text-sm text-green-600"
                        >
                          <CheckCircle2 className="h-4 w-4" />
                          <span>Uploaded</span>
                        </motion.div>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {!csvData ? (
                      <div
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        onClick={() => csvInputRef.current?.click()}
                        className={`relative border-2 border-dashed rounded-xl p-6 sm:p-8 md:p-12 text-center transition-all duration-300 cursor-pointer ${isDragging
                            ? "border-indigo-400 bg-indigo-50/50 scale-[1.02]"
                            : "border-gray-300 hover:border-indigo-300 hover:bg-indigo-50/30"
                          }`}
                      >
                        <input
                          type="file"
                          accept=".csv"
                          onChange={handleFileInput}
                          className="hidden"
                          id="csv-upload"
                          ref={csvInputRef}
                          disabled={isUploading}
                        />
                        <motion.div
                          animate={{ y: [0, -5, 0] }}
                          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                          className="mb-4"
                        >
                          <Upload className="h-12 w-12 sm:h-16 sm:w-16 text-indigo-500 mx-auto" />
                        </motion.div>
                        <p className="text-gray-900 font-medium text-base sm:text-lg mb-2">
                          Click to upload CSV file
                        </p>
                        <p className="text-sm text-gray-500 mb-4">or drag and drop</p>
                        <div
                          onClick={(e) => e.stopPropagation()}
                          className="inline-block"
                        >
                          <BrandButton
                            variant="outline"
                            size="default"
                            className="border-indigo-200 text-indigo-600 hover:bg-indigo-50 min-h-[44px]"
                            disabled={isUploading}
                            onClick={(e) => {
                              e.stopPropagation();
                              csvInputRef.current?.click();
                            }}
                          >
                            {isUploading ? (
                              <>
                                <RefreshCw className="h-4 w-4 sm:h-5 sm:w-5 animate-spin" />
                                Uploading...
                              </>
                            ) : (
                              <>
                                <Upload className="h-4 w-4 sm:h-5 sm:w-5" />
                                Choose File
                              </>
                            )}
                          </BrandButton>
                        </div>
                        <div className="mt-4">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              downloadSampleCSV();
                            }}
                            className="text-sm text-indigo-600 hover:text-indigo-700 hover:underline flex items-center gap-1 mx-auto"
                          >
                            <FileText className="h-3 w-3" />
                            Need sample CSV?
                          </button>
                        </div>
                      </div>
                    ) : (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="space-y-4"
                      >
                        <div className="flex items-start gap-3 p-4 rounded-lg bg-green-50 border border-green-200">
                          <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-green-900 mb-1">
                              CSV uploaded successfully
                            </p>
                            <p className="text-xs text-green-700 truncate">{csvFile?.name}</p>
                            <div className="flex items-center gap-4 mt-2 text-xs text-green-600">
                              <span className="flex items-center gap-1">
                                <FileText className="h-3 w-3" />
                                {csvStats?.total_rows || csvData.rows.length} rows
                              </span>
                              <span className="flex items-center gap-1">
                                <Tag className="h-3 w-3" />
                                {csvStats?.total_columns || csvData.headers.length} columns
                              </span>
                            </div>
                            {csvStats && (
                              <p className="text-xs text-green-600 mt-1">
                                Columns detected: {csvStats.columns.join(", ")}
                              </p>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            setCsvData(null);
                            setCsvFile(null);
                            setMapping({ name: "", role: "", date: "" });
                            setSuggestedMapping({});
                            setPreviewImage(null);
                            setCsvStats(null);
                            if (csvInputRef.current) csvInputRef.current.value = "";
                          }}
                          className="text-sm text-indigo-600 hover:text-indigo-700 hover:underline flex items-center gap-1"
                        >
                          <RefreshCw className="h-3 w-3" />
                          Re-upload File
                        </button>
                      </motion.div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>

              {/* Column Mapping Card */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4, duration: 0.5 }}
              >
                <Card className="bg-white/80 backdrop-blur-sm border-indigo-100 shadow-brand-lg hover:shadow-brand-xl transition-all duration-300">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-lg font-semibold text-gray-900">
                          Map Columns
                        </CardTitle>
                        <p className="text-sm text-gray-500 mt-1">
                          Select which CSV columns correspond to each certificate field
                        </p>
                      </div>
                      {isValidating && (
                        <Loader2 className="h-4 w-4 animate-spin text-indigo-600" />
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {fieldConfigs.map((field) => {
                      const Icon = field.icon;
                      const isMapped = !!mapping[field.key];
                      const suggested = suggestedMapping[field.key];

                      return (
                        <motion.div
                          key={field.key}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.5 + fieldConfigs.indexOf(field) * 0.1 }}
                          className={`relative p-4 rounded-xl border-2 transition-all duration-300 ${isMapped
                              ? "border-green-200 bg-green-50/50 shadow-sm"
                              : "border-gray-200 bg-white hover:border-indigo-300 hover:shadow-sm"
                            }`}
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <div
                                className={`p-2 rounded-lg ${isMapped ? "bg-green-100" : "bg-indigo-100"
                                  }`}
                              >
                                <Icon
                                  className={`h-4 w-4 ${isMapped ? "text-green-600" : "text-indigo-600"
                                    }`}
                                />
                              </div>
                              <label className="text-sm font-semibold text-gray-900">
                                {field.label}
                                {field.key === "name" && (
                                  <span className="text-red-500 ml-1">*</span>
                                )}
                              </label>
                              {isMapped && (
                                <motion.div
                                  initial={{ scale: 0 }}
                                  animate={{ scale: 1 }}
                                  className="ml-2"
                                >
                                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                                </motion.div>
                              )}
                            </div>
                            <div className="group relative">
                              <HelpCircle className="h-4 w-4 text-gray-400 hover:text-indigo-600 cursor-help" />
                              <div className="absolute right-0 top-6 w-64 p-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                                {field.tooltip}
                              </div>
                            </div>
                          </div>

                          {suggested && !isMapped && (
                            <motion.div
                              initial={{ opacity: 0, y: -5 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="mb-2 flex items-center gap-1.5 px-2 py-1 rounded-md bg-indigo-100/50 text-xs text-indigo-700"
                            >
                              <Sparkles className="h-3 w-3" />
                              <span className="font-medium">Suggested:</span>
                              <span className="font-semibold">{suggested}</span>
                            </motion.div>
                          )}

                          <select
                            value={mapping[field.key]}
                            onChange={(e) => handleMappingChange(field.key, e.target.value)}
                            className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base border rounded-lg transition-all duration-200 focus:ring-2 focus:ring-indigo-300 focus:border-transparent min-h-[44px] ${isMapped
                                ? "border-green-300 bg-white"
                                : "border-gray-300 bg-white hover:border-indigo-300"
                              }`}
                            aria-label={`Map ${field.label} field`}
                          >
                            <option value="">{field.placeholder}</option>
                            {csvData?.headers.map((header, index) => (
                              <option key={index} value={header}>
                                {header}
                              </option>
                            ))}
                          </select>
                        </motion.div>
                      );
                    })}
                  </CardContent>
                </Card>
              </motion.div>
            </div>

            {/* Right Column - Certificate Preview */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5, duration: 0.5 }}
            >
              <Card className="bg-white/80 backdrop-blur-sm border border-indigo-100 shadow-brand-lg hover:shadow-brand-xl transition-all duration-300 lg:sticky top-8">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="p-2 rounded-lg bg-indigo-100">
                        <Sparkles className="h-5 w-5 text-indigo-600" />
                      </div>
                      <CardTitle className="text-lg font-semibold text-gray-900">
                        Live Certificate Preview
                      </CardTitle>
                    </div>
                    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                      Sample Preview
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Preview updates automatically as you map columns
                  </p>
                </CardHeader>
                <CardContent>
                  <AnimatePresence mode="wait">
                    {isLoadingPreview ? (
                      <SkeletonCertificatePreview />
                    ) : previewImage ? (
                      <motion.img
                        key="preview-image"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.3 }}
                        src={previewImage}
                        alt="Certificate preview"
                        className="w-full rounded-xl shadow-lg border-2 border-gray-200"
                      />
                    ) : (
                      <motion.div
                        key="preview-placeholder"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.3 }}
                        className="border-2 border-dashed border-gray-200 rounded-xl aspect-[8.5/11] flex items-center justify-center bg-gradient-to-br from-white to-gray-50 relative overflow-hidden shadow-lg"
                      >
                        <div className="text-center p-4 sm:p-6 md:p-8 w-full">
                          <motion.div
                            animate={{ y: [0, -3, 0] }}
                            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                            className="text-4xl sm:text-5xl md:text-6xl mb-3 sm:mb-4"
                          >
                            🎓
                          </motion.div>
                          <motion.h2
                            key="certificate-title"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 mb-2 sm:mb-3"
                          >
                            Certificate of Completion
                          </motion.h2>
                          <motion.p
                            key={`preview-name-${previewData?.name || 'default'}`}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 }}
                            className="text-sm sm:text-base md:text-lg font-semibold text-indigo-600 mb-2"
                          >
                            {previewData?.name || "Name"}
                          </motion.p>
                          <motion.p
                            key={`preview-role-${previewData?.role || 'default'}`}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                            className="text-xs sm:text-sm md:text-base text-gray-600 mb-2 sm:mb-3"
                          >
                            {previewData?.role || "Role/Title"}
                          </motion.p>
                          <motion.p
                            key={`preview-date-${previewData?.date || 'default'}`}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 }}
                            className="text-xs sm:text-sm text-gray-500"
                          >
                            {previewData?.date || "Date"}
                          </motion.p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Bottom CTA Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.5 }}
            className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4 pt-4 sm:pt-6 border-t border-gray-200"
          >
            <BrandButton
              variant="outline"
              size="lg"
              onClick={handleBack}
              className="w-full sm:w-auto border-gray-300 text-gray-700 hover:bg-gray-50 min-h-[44px]"
            >
              <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
              Back
            </BrandButton>

            <div className="flex flex-col items-stretch sm:items-end gap-2">
              <BrandButton
                variant="gradient"
                size="lg"
                onClick={handleGenerate}
                disabled={!csvData || !mapping.name || isGenerating || isUploading || isValidating}
                className="w-full sm:w-auto min-h-[44px]"
                aria-label={isGenerating ? "Generating certificates" : "Generate certificates"}
              >
                {isGenerating ? (
                  <>
                    <RefreshCw className="h-4 w-4 sm:h-5 sm:w-5 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    Generate Certificates
                    <Sparkles className="h-4 w-4 sm:h-5 sm:w-5 ml-2" />
                  </>
                )}
              </BrandButton>
              <p className="text-xs sm:text-sm text-gray-500 text-center sm:text-right">
                This will create certificates for all records automatically.
              </p>
            </div>
          </motion.div>
        </div>

        {/* Live region for screen readers */}
        <span className="sr-only" role="status" aria-live="polite">
          {isUploading
            ? "Uploading CSV…"
            : csvFile
              ? `${csvFile.name} selected`
              : "No CSV selected"}
        </span>
      </div>
    </PageLayout>
  );
}
