"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  Upload,
  RefreshCw,
  ArrowLeft,
  Sparkles,
  CheckCircle2,
  Download,
} from "lucide-react";
import { BrandButton } from "@/components/ui/brand-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageLayout } from "@/components/layout/page-layout";
import {
  uploadCSV,
  generateBatch,
  generatePreview,
  analyzeCSV,
  type MappingConfig,
} from "@/lib/api";

/* ---------------- TYPES ---------------- */

interface CSVData {
  headers: string[];
  rows: string[][];
}

/* ---------------- ANIMATION VARIANTS ---------------- */

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: {
      duration: 0.6
    }
  }
};

const uploadAreaVariants = {
  idle: { 
    scale: 1
  },
  hover: { 
    scale: 1.02,
    transition: {
      duration: 0.3
    }
  }
};

const previewVariants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { 
    opacity: 1, 
    scale: 1,
    transition: {
      duration: 0.5
    }
  }
};

/* ---------------- COMPONENT ---------------- */

export default function MappingPage() {
  const router = useRouter();

  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvData, setCsvData] = useState<CSVData | null>(null);
  const [csvStats, setCsvStats] = useState<{ total_rows: number } | null>(null);

  const [mapping, setMapping] = useState({
    name: "",
    role: "",
    date: "",
  });

  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);

  const [showPreview, setShowPreview] = useState(false);

  const csvInputRef = useRef<HTMLInputElement>(null);

  /* ---------------- CSV UPLOAD ---------------- */

  const handleCSVUpload = useCallback(async (file: File) => {
    setCsvFile(file);
    setIsUploading(true);

    try {
      await uploadCSV(file);

      const reader = new FileReader();
      reader.onload = async (e) => {
        const text = String(e.target?.result || "");
        const lines = text.split("\n").filter(Boolean);

        if (lines.length < 2) {
          toast.error("CSV must contain headers and at least one row");
          return;
        }

        const headers = lines[0].split(",").map((h) => h.trim());
        const rows = lines
          .slice(1)
          .map((r) => r.split(",").map((c) => c.trim()));

        setCsvData({ headers, rows });

        /* ✅ SAFE AUTO-MAPPING */
        const lowerHeaders = headers.map((h) => h.toLowerCase());

        const findColumn = (pattern: RegExp): string => {
          const idx = lowerHeaders.findIndex((h) => pattern.test(h));
          return idx !== -1 ? headers[idx] : "";
        };

        setMapping({
          name: findColumn(/name/),
          role: findColumn(/role|course|title/),
          date: findColumn(/date/),
        });

        const stats = await analyzeCSV();
        setCsvStats(stats.csv_stats);
      };

      reader.readAsText(file);
      toast.success("CSV uploaded successfully");
    } catch {
      toast.error("Failed to upload CSV");
    } finally {
      setIsUploading(false);
      if (csvInputRef.current) csvInputRef.current.value = "";
    }
  }, []);

  /* ---------------- PREVIEW ---------------- */

  useEffect(() => {
    if (!mapping.name) return;

    const loadPreview = async () => {
      setIsLoadingPreview(true);
      try {
        const preview = await generatePreview(
          {
            name: mapping.name,
            role: mapping.role || undefined,
            date: mapping.date || undefined,
          } satisfies MappingConfig,
          0
        );
        setPreviewImage(preview.preview_image);
      } catch {
        setPreviewImage(null);
      } finally {
        setIsLoadingPreview(false);
      }
    };

    loadPreview();
  }, [mapping]);

  /* ---------------- GENERATE ---------------- */

  const handleGenerate = async () => {
    if (!mapping.name || !csvData) {
      toast.error("Please upload a valid CSV file");
      return;
    }

    setIsGenerating(true);
    try {
      const result = await generateBatch({
        name: mapping.name,
        role: mapping.role || undefined,
        date: mapping.date || undefined,
      });

      sessionStorage.setItem("jobId", result.job_id || "");
router.push("/generate");
    } catch {
      toast.error("Generation failed");
    } finally {
      setIsGenerating(false);
    }
  };

  /* ---------------- UI ---------------- */

  return (
    <PageLayout>
      <div className="min-h-screen px-6 py-10 bg-gradient-to-br from-white via-indigo-50/40 to-white">
        <div className="max-w-7xl mx-auto">

          {/* HEADER */}
          <div className="text-center mb-6 mt-8">
            <div className="inline-flex px-4 py-1.5 rounded-full bg-indigo-100 text-indigo-700 text-sm mb-4">
              Step 2 of 3 • Review & Generate
            </div>
            <h1 className="text-4xl font-bold mt-4 mb-4">Review & Generate</h1>
            <p className="text-gray-600 mt-2">
              We automatically mapped your data. Check the preview and generate certificates.
            </p>
          </div>

          {/* MAIN GRID */}
          <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_0.6fr] gap-6">

            {/* CSV CARD */}
            <motion.div
              variants={cardVariants}
              initial="hidden"
              animate="visible"
              whileHover={{ y: -2 }}
              transition={{ duration: 0.3 }}
            >
              <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300 border-0 bg-white/80 backdrop-blur-sm">
                <CardHeader className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-t-lg">
                  <CardTitle className="flex items-center justify-between text-lg font-semibold text-gray-800">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse"></div>
                      Upload CSV Data
                    </div>
                    <a
                      href="/sample.csv"
                      download="sample.csv"
                      className="text-sm text-indigo-600 hover:text-indigo-700 flex items-center gap-1 transition-colors duration-200"
                    >
                      <Download className="h-4 w-4" />
                      Sample CSV
                    </a>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  {!csvData ? (
                    <motion.div
                      variants={uploadAreaVariants}
                      initial="idle"
                      whileHover="hover"
                      onClick={() => csvInputRef.current?.click()}
                      className="border-2 border-dashed rounded-xl text-center cursor-pointer"
                    >
                      <motion.div 
                        variants={uploadAreaVariants}
                        initial="idle"
                        whileHover="hover"
                        className="p-10"
                      >
                        <motion.div
                          animate={{ y: [0, -5, 0] }}
                          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                        >
                          <Upload className="mx-auto h-12 w-12 text-indigo-600 mb-4" />
                        </motion.div>
                        <p className="font-medium text-gray-700">Upload CSV file</p>
                        <p className="text-sm text-gray-500 mt-2">Click to browse or drag and drop</p>
                      </motion.div>
                      <input
                        ref={csvInputRef}
                        type="file"
                        accept=".csv"
                        hidden
                        onChange={(e) =>
                          e.target.files && handleCSVUpload(e.target.files[0])
                        }
                      />
                    </motion.div>
                  ) : (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.4 }}
                      className="flex items-center justify-between bg-gradient-to-r from-green-50 to-emerald-50 p-4 rounded-lg border border-green-200"
                    >
                      <div>
                        <p className="font-semibold text-gray-800">{csvFile?.name}</p>
                        <p className="text-sm text-gray-600">
                          {csvStats?.total_rows ?? csvData.rows.length} records detected
                        </p>
                      </div>
                      <motion.div
                        animate={{ rotate: [0, 360] }}
                        transition={{ duration: 0.5, ease: "easeOut" }}
                      >
                        <CheckCircle2 className="text-green-600 h-6 w-6" />
                      </motion.div>
                    </motion.div>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            {/* PREVIEW */}
            <motion.div
              variants={cardVariants}
              initial="hidden"
              animate="visible"
              whileHover={{ y: -2 }}
              transition={{ duration: 0.3 }}
            >
              <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300 border-0 bg-white/80 backdrop-blur-sm">
                <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-t-lg">
                  <CardTitle className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse"></div>
                    Preview
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  {isLoadingPreview ? (
                    <motion.div 
                      className="h-64 bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg"
                      animate={{ opacity: [0.5, 1, 0.5] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                    />
                  ) : previewImage ? (
                    <motion.div
                      variants={previewVariants}
                      initial="hidden"
                      animate="visible"
                      onClick={() => setShowPreview(true)}
                      className="cursor-zoom-in relative group"
                      whileHover={{ scale: 1.02 }}
                      transition={{ duration: 0.3 }}
                    >
                      <img
                        src={previewImage}
                        alt="Certificate preview"
                        className="rounded-lg border shadow-lg w-full"
                      />
                      <motion.div 
                        className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all duration-300 rounded-lg"
                        whileHover={{ backgroundColor: "rgba(0,0,0,0.2)" }}
                      >
                        <motion.span 
                          className="bg-black/70 text-white px-4 py-2 rounded-lg text-sm font-medium"
                          initial={{ y: 10, opacity: 0 }}
                          whileHover={{ y: 0, opacity: 1 }}
                          transition={{ duration: 0.2 }}
                        >
                          Click to enlarge
                        </motion.span>
                      </motion.div>
                    </motion.div>
                  ) : (
                    <motion.div 
                      className="h-64 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center text-gray-400 bg-gradient-to-br from-gray-50 to-white"
                      whileHover={{ borderColor: "rgb(147 51 234)", backgroundColor: "rgb(243 232 255)" }}
                      transition={{ duration: 0.3 }}
                    >
                      <div className="text-center">
                        <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-gray-200 flex items-center justify-center">
                          <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </div>
                        <p className="text-sm font-medium">Upload CSV to preview</p>
                      </div>
                    </motion.div>
                  )}
                </CardContent>
              </Card>
            </motion.div>

          </div>

          {/* CTA */}
          <div className="flex justify-between items-center mt-8 border-t pt-6">
            <BrandButton variant="outline" onClick={() => router.push("/upload")}>
              <ArrowLeft className="mr-2 h-4 w-4" /> Back
            </BrandButton>

            <BrandButton
              variant="gradient"
              onClick={handleGenerate}
              disabled={isGenerating || !csvData}
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="animate-spin mr-2 h-4 w-4" />
                  Generating…
                </>
              ) : (
                <>
                  Generate {csvStats?.total_rows ?? 0} Certificates
                  <Sparkles className="ml-2 h-4 w-4" />
                </>
              )}
            </BrandButton>
          </div>
        </div>

        {/* FULL PREVIEW MODAL */}
        {showPreview && previewImage && (
          <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center">
            <img src={previewImage} className="max-h-[90vh] rounded-lg" />
            <button
              onClick={() => setShowPreview(false)}
              className="absolute top-6 right-6 text-white text-xl"
            >
              ✕
            </button>
          </div>
        )}
      </div>
    </PageLayout>
  );
}
