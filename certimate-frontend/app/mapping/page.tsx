"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Upload, FileSpreadsheet, Download, Check, Eye } from "lucide-react";
import { BrandButton } from "@/components/ui/brand-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageLayout } from "@/components/layout/page-layout";
import { uploadCSV, generateBatch } from "@/lib/api";

interface CSVData {
  headers: string[];
  rows: string[][];
}

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

  const handleCSVUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === "text/csv") {
      setCsvFile(file);
      
      // Parse CSV for preview
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        const lines = text.split("\n").filter((line) => line.trim());
        const headers = lines[0].split(",");
        const rows = lines.slice(1).map((line) => line.split(","));

        setCsvData({
          headers,
          rows: rows.slice(0, 5), // Preview first 5 rows
        });
      };
      reader.readAsText(file);

      // Upload CSV to backend
      setIsUploading(true);
      try {
        const result = await uploadCSV(file);
        toast.success(result.message || "CSV uploaded successfully!");
      } catch (error: any) {
        console.error("CSV upload error:", error);
        const errorMessage = error.response?.data?.detail || error.message || "Failed to upload CSV";
        toast.error(errorMessage);
      } finally {
        setIsUploading(false);
      }
    }
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
      const result = await generateBatch();
      toast.success(result.message || "Certificates generated successfully!");
      
      // Store download URL and stats in session
      sessionStorage.setItem("downloadUrl", result.download_url);
      sessionStorage.setItem("numCertificates", result.num_certificates.toString());
      sessionStorage.setItem("successful", result.successful.toString());
      sessionStorage.setItem("failed", result.failed.toString());
      
      router.push('/generate');
    } catch (error: any) {
      console.error("Generation error:", error);
      const errorMessage = error.response?.data?.detail || error.message || "Failed to generate certificates";
      toast.error(errorMessage);
    } finally {
      setIsGenerating(false);
    }
  };

  const sampleData = [
    ["John Doe", "Software Engineer", "2024-01-15"],
    ["Jane Smith", "Product Manager", "2024-01-16"],
    ["Mike Johnson", "Designer", "2024-01-17"],
  ];

  return (
    <PageLayout>
      <div className="min-h-screen py-12 sm:py-20 px-4 bg-gradient-to-br from-background via-primary/5">
        <div className="container max-w-7xl mx-auto">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center mb-8 sm:mb-12"
          >
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-foreground mb-3 sm:mb-4">
              Map Your Data
            </h1>
            <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto px-4">
              Upload your CSV file and map columns to certificate fields
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
                { num: 1, label: 'Upload', active: true, completed: true },
                { num: 2, label: 'Map Data', active: true, completed: false },
                { num: 3, label: 'Generate', active: false, completed: false },
              ].map((step) => (
                <div key={step.num} className="flex items-center">
                  <div
                    className={`flex flex-col items-center ${
                      step.active ? 'text-primary' : 'text-muted-foreground'
                    }`}
                  >
                    <div
                      className={`h-8 w-8 sm:h-10 sm:w-10 rounded-full flex items-center justify-center font-bold border-2 transition-all ${
                        step.completed
                          ? 'bg-primary text-primary-foreground border-primary shadow-brand'
                          : step.active
                          ? 'bg-primary text-primary-foreground border-primary shadow-brand'
                          : 'bg-card text-muted-foreground border-border'
                      }`}
                    >
                      {step.completed ? <Check className="h-4 w-4 sm:h-5 sm:w-5" /> : <span className="text-xs sm:text-sm">{step.num}</span>}
                    </div>
                    <span className="text-xs sm:text-sm mt-2 font-medium">{step.label}</span>
                  </div>
                  {step.num < 3 && (
                    <div
                      className={`h-0.5 w-6 sm:w-16 mx-2 sm:mx-4 transition-colors ${
                        step.completed ? 'bg-primary' : 'bg-border'
                      }`}
                    />
                  )}
                </div>
              ))}
            </div>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
            {/* CSV Upload Section */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3, duration: 0.5 }}
            >
              <Card>
                <CardHeader>
                  <div className="flex items-center space-x-2">
                    <FileSpreadsheet className="h-6 w-6 text-primary" />
                    <CardTitle>Upload CSV Data</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {!csvData ? (
                    <div>
                      <label htmlFor="csv-upload" className="cursor-pointer">
                        <div className="border-2 border-dashed border-border rounded-lg p-6 sm:p-8 text-center hover:border-primary/50">
                          <Upload className="h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground mx-auto mb-3 sm:mb-4" />
                          <p className="text-foreground text-sm sm:text-base mb-2">
                            Click to upload CSV file
                          </p>
                          <p className="text-xs sm:text-sm text-muted-foreground">
                            or drag and drop
                          </p>
                        </div>
                      </label>
                      <input
                        type="file"
                        accept=".csv"
                        onChange={handleCSVUpload}
                        className="hidden"
                        id="csv-upload"
                      />
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="bg-green-500/10">
                        <Check className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs sm:text-sm font-medium text-green-900">
                            CSV uploaded successfully
                          </p>
                          <p className="text-xs text-green-700">{csvFile?.name}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Mapping Section */}
              <Card className="mt-6">
                <CardHeader>
                  <CardTitle>Map Columns</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {[
                    { key: "name", label: "Name", placeholder: "Select column..." },
                    { key: "role", label: "Role/Title", placeholder: "Select column..." },
                    { key: "date", label: "Date", placeholder: "Select column..." },
                  ].map((field) => (
                    <div key={field.key}>
                      <label className="block text-xs sm:text-sm font-medium text-foreground mb-2">
                        {field.label}
                      </label>
                      <select
                        value={mapping[field.key]}
                        onChange={(e) =>
                          setMapping({ ...mapping, [field.key]: e.target.value })
                        }
                        className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-input bg-background rounded-lg focus:ring-2 focus:ring-ring focus:border-transparent transition-all"
                        aria-label={`Map ${field.label} field`}
                      >
                        <option value="">{field.placeholder}</option>
                        {csvData?.headers.map((header, index) => (
                          <option key={index} value={header}>
                            {header}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </motion.div>

            {/* Preview Section */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4, duration: 0.5 }}
            >
              <Card>
                <CardHeader>
                  <div className="flex items-center space-x-2">
                    <Eye className="h-6 w-6 text-primary" />
                    <CardTitle>Certificate Preview</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  {/* Placeholder Certificate Preview */}
                  <div className="border-2 border-dashed border-border rounded-lg aspect-[8.5/11] flex items-center justify-center bg-card relative overflow-hidden">
                    <div className="text-center p-4 sm:p-8">
                      <div className="text-4xl sm:text-6xl mb-3 sm:mb-4">🎓</div>
                      <div className="text-lg sm:text-2xl font-bold text-foreground mb-2">
                        {mapping.name || "Certificate of Completion"}
                      </div>
                      <div className="text-base sm:text-lg text-muted-foreground mb-3 sm:mb-4">
                        {mapping.role || "Role/Title"}
                      </div>
                      <div className="text-xs sm:text-sm text-muted-foreground">
                        {mapping.date || "Date"}
                      </div>
                    </div>
                    <div className="absolute top-2 right-2 text-xs text-muted-foreground">
                      Sample Preview
                    </div>
                  </div>

                  {/* Data Preview */}
                  {csvData && (
                    <div className="mt-6">
                      <h3 className="text-xs sm:text-sm font-semibold text-foreground mb-3">
                        Data Preview (First 3 rows)
                      </h3>
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs sm:text-sm">
                          <thead className="bg-muted">
                            <tr>
                              {csvData.headers.map((header, index) => (
                                <th
                                  key={index}
                                  className="px-2 sm:px-3 py-2 text-left text-xs font-semibold text-foreground"
                                >
                                  {header}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="bg-card divide-y divide-border">
                            {sampleData.map((row, rowIndex) => (
                              <tr key={rowIndex}>
                                {row.map((cell, cellIndex) => (
                                  <td
                                    key={cellIndex}
                                    className="px-2 sm:px-3 py-2 text-foreground"
                                  >
                                    {cell}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Actions */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.5 }}
            className="flex justify-end mt-6 sm:mt-8"
          >
            <BrandButton
              variant="gradient"
              size="lg"
              onClick={handleGenerate}
              disabled={!csvData || !mapping.name || isGenerating || isUploading}
              className="w-full sm:w-auto"
              aria-label={isGenerating ? "Generating certificates" : "Generate certificates"}
            >
              {isGenerating ? "Starting..." : "Generate Certificates"}
            </BrandButton>
          </motion.div>
        </div>
      </div>
    </PageLayout>
  );
}

