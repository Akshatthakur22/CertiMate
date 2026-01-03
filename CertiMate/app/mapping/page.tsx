"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, ArrowRight, FileSpreadsheet, X, ZoomIn } from "lucide-react";
import axios from "axios";
import type { CertificateTemplate } from "@/types/template";
import { PageLayout } from "@/components/layout/page-layout";
import { BrandButton } from "@/components/ui/brand-button";
import { Card, CardContent } from "@/components/ui/card";

interface CSVData {
  headers: string[];
  rows: string[][];
}

export default function MappingPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [template, setTemplate] = useState<CertificateTemplate | null>(null);
  const [csvFile, setCSVFile] = useState<File | null>(null);
  const [csvData, setCSVData] = useState<CSVData | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [isGeneratingPreview, setIsGeneratingPreview] = useState(false);
  const [showEnlargedPreview, setShowEnlargedPreview] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    const templateStr = sessionStorage.getItem('certificateTemplate');
    if (templateStr) {
      const loadedTemplate = JSON.parse(templateStr) as CertificateTemplate;
      setTemplate(loadedTemplate);
    } else {
      toast.error('No template found. Please create a template first.');
      router.push('/upload');
    }
  }, [router]);

  const parseCSV = (text: string): CSVData => {
    const lines = text.split('\n').filter(line => line.trim());
    const headers = lines[0].split(',').map(h => h.trim());
    const rows = lines.slice(1).map(line => 
      line.split(',').map(cell => cell.trim())
    );
    return { headers, rows };
  };

  const autoMapAndGeneratePreview = async (data: CSVData) => {
    if (!template) return;

    // Auto-map columns to fields
    const mappings: Record<string, string> = {};
    template.textBoxes.forEach(box => {
      const matchingHeader = data.headers.find(h => 
        h.toLowerCase() === box.key.toLowerCase()
      );
      if (matchingHeader) {
        mappings[box.key] = matchingHeader;
      }
    });

    // Check if all fields are mapped
    const unmappedFields = template.textBoxes.filter(box => !mappings[box.key]);
    if (unmappedFields.length > 0) {
      toast.error(`Missing columns in CSV: ${unmappedFields.map(b => b.key).join(', ')}`);
      return;
    }

    // Generate preview automatically
    setIsGeneratingPreview(true);
    try {
      const certificateData: Record<string, string> = {};
      template.textBoxes.forEach(box => {
        const csvColumn = mappings[box.key];
        const columnIndex = data.headers.indexOf(csvColumn);
        if (columnIndex !== -1 && data.rows[0]) {
          certificateData[box.key] = data.rows[0][columnIndex];
        }
      });

      const response = await axios.post('/api/generate', {
        template,
        preview: true,
        certificateData,
      });

      if (response.data.success && response.data.preview_image) {
        // Convert path to API endpoint for serving
        const imagePath = response.data.preview_image;
        const imageUrl = `/api/serve-file?path=${encodeURIComponent(imagePath)}`;
        setPreviewImage(imageUrl);
        
        // Store mappings for generation page
        sessionStorage.setItem('csvMappings', JSON.stringify(mappings));
        sessionStorage.setItem('csvData', JSON.stringify(data));
        
        toast.success('Preview generated!');
      }
    } catch (error) {
      console.error('Preview error:', error);
      toast.error('Failed to generate preview');
    } finally {
      setIsGeneratingPreview(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files[0];
    if (file) {
      await processFile(file);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await processFile(file);
    }
  };

  const processFile = async (file: File) => {
    if (!file.name.endsWith('.csv') && !file.name.endsWith('.xlsx')) {
      toast.error('Please upload a CSV or Excel file');
      return;
    }

    setCSVFile(file);
    setPreviewImage(null);
    
    const text = await file.text();
    const data = parseCSV(text);
    setCSVData(data);
    
    toast.success(`${data.rows.length} records loaded`);
    
    // Auto-generate preview
    await autoMapAndGeneratePreview(data);
  };

  const proceedToGenerate = () => {
    if (!csvData) {
      toast.error('Please upload a CSV file first');
      return;
    }
    router.push('/generate');
  };

  if (!template) {
    return (
      <PageLayout>
        <div className="min-h-screen bg-gradient-to-br from-white via-[#f9faff] to-[#eef1ff] flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#4F46E5]"></div>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <div className="min-h-screen bg-gradient-to-br from-white via-[#f9faff] to-[#eef1ff] pt-24 pb-8">
        <div className="container mx-auto px-4 max-w-7xl">
          {/* Header */}
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-8"
          >
            <div className="inline-flex items-center gap-2 border border-indigo-100 bg-white/80 px-3 py-1 rounded-full text-sm text-indigo-600 shadow-sm backdrop-blur-md mb-3">
              🪶 Step 3 of 4
            </div>
            <h1 className="text-4xl md:text-5xl font-extrabold leading-tight text-gray-900 mb-3">
              Upload Your Data
            </h1>
            <p className="text-lg text-gray-600">
              Drop your CSV file and see the preview instantly
            </p>
          </motion.div>

          {/* Main Content - Single Screen */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-h-[calc(100vh-280px)]">
            {/* Left: CSV Upload */}
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
            >
              <Card className="h-full">
                <CardContent className="p-6 flex flex-col h-full">
                  {!csvFile ? (
                    <div
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      onClick={() => fileInputRef.current?.click()}
                      className={`flex-1 border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
                        isDragging
                          ? 'border-[#4F46E5] bg-[#4F46E5]/5'
                          : 'border-gray-300 hover:border-[#4F46E5] hover:bg-gradient-to-br hover:from-white hover:via-[#f9faff] hover:to-[#eef1ff]'
                      }`}
                    >
                      <div className="flex flex-col items-center justify-center h-full">
                        <div className="w-20 h-20 bg-gradient-to-br from-[#4F46E5]/10 to-[#22C55E]/10 rounded-full flex items-center justify-center mb-6">
                          <Upload className="w-10 h-10 text-[#4F46E5]" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 mb-2">
                          Drop your CSV file here
                        </h3>
                        <p className="text-sm text-gray-500 mb-4">or click to browse</p>
                        <div className="text-xs text-gray-400">
                          Supports: CSV, Excel files
                        </div>
                      </div>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".csv,.xlsx"
                        onChange={handleFileSelect}
                        className="hidden"
                      />
                    </div>
                  ) : (
                    <div className="flex-1 flex flex-col">
                      <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 bg-[#4F46E5]/10 rounded-lg flex items-center justify-center">
                            <FileSpreadsheet className="w-6 h-6 text-[#4F46E5]" />
                          </div>
                          <div>
                            <h3 className="font-bold text-gray-900">{csvFile.name}</h3>
                            <p className="text-sm text-gray-600">{csvData?.rows.length || 0} records</p>
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            setCSVFile(null);
                            setCSVData(null);
                            setPreviewImage(null);
                          }}
                          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                          <X className="w-5 h-5 text-gray-600" />
                        </button>
                      </div>

                      {isGeneratingPreview ? (
                        <div className="flex-1 flex flex-col items-center justify-center">
                          <div className="w-16 h-16 bg-gradient-to-br from-[#4F46E5]/10 to-[#22C55E]/10 rounded-full flex items-center justify-center mb-4">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#4F46E5]"></div>
                          </div>
                          <p className="text-sm text-gray-600 font-medium">Generating preview...</p>
                        </div>
                      ) : previewImage ? (
                        <div className="flex-1 flex flex-col">
                          <div className="flex-1 flex items-center justify-center mb-6">
                            <div className="w-16 h-16 bg-[#22C55E]/10 rounded-full flex items-center justify-center">
                              <svg className="w-8 h-8 text-[#22C55E]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            </div>
                          </div>
                          <div className="space-y-3">
                            <div className="bg-[#22C55E]/10 border border-[#22C55E]/20 rounded-lg p-4 text-center">
                              <p className="text-sm font-medium text-[#22C55E]">✓ Preview ready!</p>
                              <p className="text-xs text-gray-600 mt-1">Check the preview on the right →</p>
                            </div>
                            <BrandButton
                              variant="gradient"
                              size="lg"
                              onClick={proceedToGenerate}
                              className="w-full"
                            >
                              Generate All {csvData?.rows.length} Certificates
                              <ArrowRight className="w-5 h-5 ml-2" />
                            </BrandButton>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            {/* Right: Preview */}
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
            >
              <Card className="h-full">
                <CardContent className="p-6 flex flex-col h-full">
                  <h3 className="text-lg font-bold text-gray-900 mb-4">Certificate Preview</h3>
                  
                  {!previewImage ? (
                    <div className="flex-1 flex items-center justify-center border-2 border-dashed border-gray-200 rounded-xl">
                      <div className="text-center">
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                          <FileSpreadsheet className="w-8 h-8 text-gray-400" />
                        </div>
                        <p className="text-sm text-gray-500">Upload CSV to see preview</p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex-1 relative group">
                      <div 
                        className="absolute inset-0 rounded-lg overflow-hidden cursor-pointer"
                        onClick={() => setShowEnlargedPreview(true)}
                      >
                        <img
                          src={previewImage}
                          alt="Certificate Preview"
                          className="w-full h-full object-contain"
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center">
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-white rounded-full p-4">
                            <ZoomIn className="w-6 h-6 text-[#4F46E5]" />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Enlarged Preview Modal */}
      <AnimatePresence>
        {showEnlargedPreview && previewImage && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setShowEnlargedPreview(false)}
          >
            <motion.div 
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className="relative max-w-6xl max-h-[90vh] w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setShowEnlargedPreview(false)}
                className="absolute -top-12 right-0 bg-white/10 hover:bg-white/20 text-white rounded-full p-2 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
              <img
                src={previewImage}
                alt="Enlarged Certificate Preview"
                className="w-full h-full object-contain rounded-lg"
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </PageLayout>
  );
}
