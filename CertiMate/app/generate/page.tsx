"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { Download, CheckCircle, Loader2, FileArchive, Mail, RefreshCw, ArrowLeft, Zap, X, Clock, Shield, ChevronDown, ChevronUp } from "lucide-react";
import axios from "axios";
import type { CertificateTemplate } from "@/types/template";
import { PageLayout } from "@/components/layout/page-layout";
import { BrandButton } from "@/components/ui/brand-button";
import { Card, CardContent } from "@/components/ui/card";

interface CSVData {
  headers: string[];
  rows: string[][];
}

interface CertificateMetadata {
  id: string;
  path: string;
  participantName: string;
  csvData: Record<string, string>;
  generatedAt: string;
  status: 'success' | 'failed';
  fileSize?: number;
  error?: string;
}

export default function GeneratePage() {
  const router = useRouter();
  const [status, setStatus] = useState<"generating" | "completed" | "failed">("generating");
  const [progress, setProgress] = useState(0);
  const [total, setTotal] = useState(0);
  const [generated, setGenerated] = useState(0);
  const [failed, setFailed] = useState(0);
  const [certificatePaths, setCertificatePaths] = useState<string[]>([]);
  const [certificateMetadata, setCertificateMetadata] = useState<CertificateMetadata[]>([]);
  const [isDownloadingZip, setIsDownloadingZip] = useState(false);
  const [currentBatch, setCurrentBatch] = useState<string>("");
  const [estimatedTimeRemaining, setEstimatedTimeRemaining] = useState<number | null>(null);
  const [showAllCertificates, setShowAllCertificates] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>("");
  
  const startTimeRef = useRef<number>(Date.now());
  const generationTimesRef = useRef<number[]>([]);

  useEffect(() => {
    startGeneration();
  }, []);

  const startGeneration = async () => {
    try {
      const templateStr = sessionStorage.getItem('certificateTemplate');
      const mappingsStr = sessionStorage.getItem('csvMappings');
      const csvDataStr = sessionStorage.getItem('csvData');
      const sessionId = sessionStorage.getItem('sessionId');

      if (!templateStr || !mappingsStr || !csvDataStr) {
        toast.error('Missing required data. Please start over.');
        router.push('/upload');
        return;
      }

      const template = JSON.parse(templateStr) as CertificateTemplate;
      const mappings = JSON.parse(mappingsStr) as Record<string, string>;
      const csvData = JSON.parse(csvDataStr) as CSVData;

      if (!(template as any).imagePath && (template as any).backgroundImage) {
        (template as any).imagePath = (template as any).backgroundImage;
        (template as any).imageWidth = (template as any).width || 1200;
        (template as any).imageHeight = (template as any).height || 800;
      }

      setTotal(csvData.rows.length);

      const paths: string[] = [];
      const metadata: CertificateMetadata[] = [];
      
      for (let i = 0; i < csvData.rows.length; i++) {
        const batchStart = Date.now();
        const row = csvData.rows[i];
        
        // Create complete CSV row data with all columns (for email lookup later)
        const completeRowData: Record<string, string> = {};
        csvData.headers.forEach((header, index) => {
          completeRowData[header] = row[index] || '';
        });
        
        // Create certificateData for template rendering (only mapped fields)
        const certificateData: Record<string, string> = {};
        template.textBoxes.forEach(box => {
          const csvColumn = mappings[box.key];
          const columnIndex = csvData.headers.indexOf(csvColumn);
          if (columnIndex !== -1 && row[columnIndex]) {
            certificateData[box.key] = row[columnIndex];
          }
        });
        
        // Extract participant name for display
        const participantName = certificateData.name || certificateData.Name || 
                               certificateData.participant || certificateData.Participant ||
                               Object.values(certificateData)[0] || `Participant ${i + 1}`;
        
        setCurrentBatch(participantName);

        try {
          const response = await axios.post('/api/generate', {
            template,
            certificateData,
            generateBatch: false,
            index: i,
            sessionId, // Include sessionId for tracking
          });

          if (response.data.success && response.data.certificate_path) {
            paths.push(response.data.certificate_path);
            
            // Store comprehensive metadata
            metadata.push({
              id: `cert_${Date.now()}_${i}`,
              path: response.data.certificate_path,
              participantName,
              csvData: completeRowData, // Store complete row data including email
              generatedAt: new Date().toISOString(),
              status: 'success' as const,
              fileSize: response.data.file_size,
            });
            
            console.log(`✓ Generated certificate ${i + 1}/${csvData.rows.length} for ${participantName}`);
            
            setGenerated(i + 1);
            const newProgress = ((i + 1) / csvData.rows.length) * 100;
            setProgress(newProgress);
            
            // Calculate estimated time remaining
            const batchTime = Date.now() - batchStart;
            generationTimesRef.current.push(batchTime);
            
            if (generationTimesRef.current.length >= 3) {
              const recentTimes = generationTimesRef.current.slice(-10);
              const avgTime = recentTimes.reduce((a, b) => a + b, 0) / recentTimes.length;
              const remaining = csvData.rows.length - (i + 1);
              setEstimatedTimeRemaining(Math.ceil((avgTime * remaining) / 1000));
            }
          }
        } catch (error: any) {
          console.error(`Failed to generate certificate ${i + 1}:`, error);
          setFailed(prev => prev + 1);
          
          metadata.push({
            id: `cert_${Date.now()}_${i}`,
            path: '',
            participantName,
            csvData: completeRowData, // Store complete row data even on failure
            generatedAt: new Date().toISOString(),
            status: 'failed' as const,
            error: error.message || 'Generation failed',
          });
        }
      }

      setCertificatePaths(paths);
      setCertificateMetadata(metadata);
      
      // Store metadata in sessionStorage for future reference
      sessionStorage.setItem('certificateMetadata', JSON.stringify(metadata));
      
      console.log(`\n📊 Generation Summary:`);
      console.log(`   ✓ Successful: ${metadata.filter(m => m.status === 'success').length}`);
      console.log(`   ✗ Failed: ${metadata.filter(m => m.status === 'failed').length}`);
      console.log(`   📁 Total: ${metadata.length}\n`);
      
      setStatus('completed');
      
      const successCount = metadata.filter(m => m.status === 'success').length;
      const failedCount = metadata.filter(m => m.status === 'failed').length;
      
      if (failedCount === 0) {
        toast.success(`Successfully generated all ${successCount} certificates!`);
      } else if (successCount > 0) {
        toast.warning(`Generated ${successCount} of ${metadata.length} certificates. ${failedCount} failed.`);
      } else {
        toast.error(`All ${failedCount} certificates failed to generate.`);
      }
    } catch (error: any) {
      console.error('Generation error:', error);
      setStatus('failed');
      
      let errorMsg = 'Unknown error occurred';
      if (error.response?.status === 500) {
        errorMsg = 'Server error - Template or CSV data may be invalid';
      } else if (error.message?.includes('Network')) {
        errorMsg = 'Network connection lost - Please check your internet';
      } else if (error.response?.data?.error) {
        errorMsg = error.response.data.error;
      }
      
      setErrorMessage(errorMsg);
      toast.error('Generation process failed');
    }
  };

  const downloadAll = async () => {
    setIsDownloadingZip(true);
    toast.info('Preparing ZIP file...');
    
    try {
      const sessionId = sessionStorage.getItem('sessionId');
      
      const response = await axios.post('/api/generate/download-all', {
        certificatePaths,
        sessionId, // Include sessionId for cleanup
      }, {
        responseType: 'blob',
      });

      const blob = new Blob([response.data], { type: 'application/zip' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `certificates_${Date.now()}.zip`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      // Clear sessionId after successful download (files will be auto-deleted)
      sessionStorage.removeItem('sessionId');
      
      toast.success('ZIP file downloaded! Files cleaned up.');
    } catch (error) {
      console.error('Failed to download ZIP:', error);
      toast.error('Failed to download certificates');
    } finally {
      setIsDownloadingZip(false);
    }
  };

  const downloadIndividual = async (certPath: string, index: number) => {
    try {
      const metadata = certificateMetadata[index];
      const fileName = metadata 
        ? `${metadata.participantName.replace(/[^a-z0-9]/gi, '_')}_certificate.png`
        : `certificate_${index + 1}.png`;
      
      // Fetch the certificate as blob to force download
      const response = await fetch(certPath);
      if (!response.ok) throw new Error('Failed to fetch certificate');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      // Clean up
      window.URL.revokeObjectURL(url);
      
      toast.success(`${metadata?.participantName || `Certificate ${index + 1}`} downloaded!`);
    } catch (error) {
      console.error('Download failed:', error);
      toast.error('Failed to download certificate');
    }
  };
  
  const formatTime = (seconds: number): string => {
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };
  
  const successfulCerts = useMemo(() => 
    certificateMetadata.filter(m => m.status === 'success'),
    [certificateMetadata]
  );
  
  const failedCerts = useMemo(() => 
    certificateMetadata.filter(m => m.status === 'failed'),
    [certificateMetadata]
  );

  return (
    <PageLayout>
      <div className="min-h-screen bg-gradient-to-br from-white via-[#f9faff] to-[#eef1ff] pt-20 sm:pt-24 pb-8 sm:pb-12 px-4">
        <div className="container mx-auto max-w-5xl">
          {/* Header */}
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-6 sm:mb-8"
          >
            <div className="inline-flex items-center gap-2 border border-indigo-100 bg-white/80 px-3 py-1 rounded-full text-sm text-indigo-600 shadow-sm backdrop-blur-md mb-3">
              🪶 Step 4 of 4
            </div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold leading-tight text-gray-900 mb-2 sm:mb-3">
              {status === "generating" ? "Generating Certificates" : status === "completed" ? "Generation Complete!" : "Generation Failed"}
            </h1>
            <p className="text-base sm:text-lg text-gray-600 px-4">
              {status === "generating" && "Please wait while we create your certificates..."}
              {status === "completed" && "All certificates have been generated successfully!"}
              {status === "failed" && "Something went wrong during generation"}
            </p>
          </motion.div>

          <AnimatePresence mode="wait">
            {/* Generating State */}
            {status === "generating" && (
              <motion.div
                key="generating"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <Card>
                  <CardContent className="p-6 sm:p-8">
                    {/* Reassurance Header */}
                    <div className="flex items-center justify-center gap-2 mb-6 text-sm text-gray-600">
                      <Shield className="w-4 h-4 text-[#4F46E5]" />
                      <span className="font-medium">Generation in progress - Safe to keep this tab open</span>
                    </div>
                    
                    <div className="text-center mb-8">
                      <div className="w-20 h-20 bg-gradient-to-br from-[#4F46E5]/10 to-[#22C55E]/10 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Loader2 className="w-10 h-10 text-[#4F46E5] animate-spin" />
                      </div>
                      <h2 className="text-2xl font-bold text-gray-900 mb-2">Generating Your Certificates</h2>
                      
                      {currentBatch && (
                        <motion.p 
                          key={currentBatch}
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="text-sm text-[#4F46E5] font-medium mb-2"
                        >
                          Currently processing: <span className="font-bold">{currentBatch}</span>
                        </motion.p>
                      )}
                      
                      <p className="text-sm text-gray-500">
                        Certificate {generated} of {total}
                        {estimatedTimeRemaining && (
                          <span className="inline-flex items-center gap-1 ml-2">
                            <Clock className="w-3 h-3" />
                            ~{formatTime(estimatedTimeRemaining)} remaining
                          </span>
                        )}
                      </p>
                    </div>

                    {/* Progress Bar */}
                    <div className="space-y-4 mb-6">
                      <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${progress}%` }}
                          transition={{ duration: 0.3, ease: "easeOut" }}
                          className="h-full gradient-primary"
                        />
                      </div>
                      
                      <div className="flex justify-between text-sm font-medium">
                        <span className="text-gray-600">Progress</span>
                        <span className="text-[#4F46E5]">{Math.round(progress)}%</span>
                      </div>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="bg-gradient-to-br from-white via-[#f9faff] to-[#eef1ff] border border-gray-200 rounded-lg p-4 text-center">
                        <p className="text-2xl font-bold text-[#4F46E5]">{generated}</p>
                        <p className="text-xs text-gray-600 mt-1">Generated</p>
                      </div>
                      <div className="bg-gradient-to-br from-white via-[#f9faff] to-[#eef1ff] border border-gray-200 rounded-lg p-4 text-center">
                        <p className="text-2xl font-bold text-gray-600">{total - generated}</p>
                        <p className="text-xs text-gray-600 mt-1">Remaining</p>
                      </div>
                      <div className="bg-gradient-to-br from-white via-[#f9faff] to-[#eef1ff] border border-gray-200 rounded-lg p-4 text-center">
                        <p className="text-2xl font-bold text-gray-900">{total}</p>
                        <p className="text-xs text-gray-600 mt-1">Total</p>
                      </div>
                      {failed > 0 && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
                          <p className="text-2xl font-bold text-red-600">{failed}</p>
                          <p className="text-xs text-red-600 mt-1">Failed</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Completed State */}
            {status === "completed" && (
              <motion.div
                key="completed"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-6"
              >
                {/* Success Card */}
                <Card className="gradient-primary text-white">
                  <CardContent className="p-6 sm:p-8">
                    <div className="text-center">
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", duration: 0.5 }}
                        className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-6"
                      >
                        <CheckCircle className="w-10 h-10" />
                      </motion.div>
                      <h2 className="text-3xl font-bold mb-2">
                        {failed > 0 ? 'Generation Completed with Warnings' : 'All Done!'}
                      </h2>
                      <p className="text-lg opacity-90 mb-6">
                        {failed > 0 
                          ? `Successfully generated ${successfulCerts.length} of ${total} certificates`
                          : `Successfully generated all ${successfulCerts.length} certificates`
                        }
                      </p>
                      
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                        <div className="bg-white/10 rounded-lg p-3 sm:p-4">
                          <p className="text-2xl sm:text-3xl font-bold">{successfulCerts.length}</p>
                          <p className="text-xs opacity-90 mt-1">Successful</p>
                        </div>
                        {failed > 0 && (
                          <div className="bg-white/10 rounded-lg p-3 sm:p-4">
                            <p className="text-2xl sm:text-3xl font-bold">{failed}</p>
                            <p className="text-xs opacity-90 mt-1">Failed</p>
                          </div>
                        )}
                        <div className="bg-white/10 rounded-lg p-3 sm:p-4">
                          <p className="text-2xl sm:text-3xl font-bold">
                            {Math.round((successfulCerts.length / total) * 100)}%
                          </p>
                          <p className="text-xs opacity-90 mt-1">Success Rate</p>
                        </div>
                        <div className="bg-white/10 rounded-lg p-3 sm:p-4">
                          <p className="text-2xl sm:text-3xl font-bold">
                            {formatTime(Math.floor((Date.now() - startTimeRef.current) / 1000))}
                          </p>
                          <p className="text-xs opacity-90 mt-1">Total Time</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Download Actions - ZIP First */}
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-xl font-bold text-gray-900">Download Your Certificates</h3>
                      {total > 50 && (
                        <span className="text-sm text-[#4F46E5] font-medium bg-[#4F46E5]/10 px-3 py-1 rounded-full">
                          {total} certificates
                        </span>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-6">
                      <BrandButton
                        variant="gradient"
                        size="lg"
                        onClick={downloadAll}
                        disabled={isDownloadingZip || successfulCerts.length === 0}
                        className="w-full"
                      >
                        {isDownloadingZip ? (
                          <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            <span className="hidden sm:inline">Preparing ZIP...</span>
                            <span className="sm:hidden">Preparing...</span>
                          </>
                        ) : (
                          <>
                            <FileArchive className="w-5 h-5" />
                            <span className="hidden sm:inline">Download All as ZIP</span>
                            <span className="sm:hidden">Download ZIP</span>
                          </>
                        )}
                      </BrandButton>

                      <BrandButton
                        variant="secondary"
                        size="lg"
                        onClick={() => router.push('/send')}
                        className="w-full"
                        disabled={successfulCerts.length === 0}
                      >
                        <Mail className="w-5 h-5" />
                        <span className="hidden sm:inline">Send via Email</span>
                        <span className="sm:hidden">Email</span>
                      </BrandButton>
                    </div>
                    
                    {total > 50 && (
                      <div className="bg-[#4F46E5]/5 border border-[#4F46E5]/20 rounded-lg p-3 mb-4">
                        <p className="text-sm text-gray-700 flex items-start gap-2">
                          <Shield className="w-4 h-4 text-[#4F46E5] mt-0.5 flex-shrink-0" />
                          <span>For large batches, we recommend downloading as ZIP. Individual downloads are available below.</span>
                        </p>
                      </div>
                    )}

                    {/* Individual Downloads - Collapsible for large batches */}
                    <div className="border-t pt-4">
                      <button
                        onClick={() => setShowAllCertificates(!showAllCertificates)}
                        className="flex items-center justify-between w-full text-sm font-bold text-gray-900 mb-3 hover:text-[#4F46E5] transition-colors"
                      >
                        <span>Individual Certificates ({successfulCerts.length})</span>
                        {total > 50 ? (
                          showAllCertificates ? (
                            <ChevronUp className="w-4 h-4" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )
                        ) : null}
                      </button>
                      
                      {(total <= 50 || showAllCertificates) && (
                        <div className="max-h-80 overflow-y-auto space-y-2">
                          {successfulCerts.slice(0, showAllCertificates ? undefined : 10).map((cert, index) => (
                            <motion.div
                              key={cert.id}
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: Math.min(index * 0.02, 0.2) }}
                              className="flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-200 group"
                            >
                              <div className="flex items-center gap-3 min-w-0 flex-1">
                                <div className="w-8 h-8 bg-[#4F46E5]/10 rounded-lg flex items-center justify-center flex-shrink-0">
                                  <span className="font-bold text-[#4F46E5] text-sm">{index + 1}</span>
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="font-semibold text-sm text-gray-900 truncate">
                                    {cert.participantName}
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    {new Date(cert.generatedAt).toLocaleString()}
                                  </p>
                                </div>
                              </div>
                              <button
                                onClick={() => downloadIndividual(cert.path, certificateMetadata.indexOf(cert))}
                                className="flex items-center gap-2 px-3 py-1.5 bg-[#4F46E5] hover:bg-[#4338CA] text-white rounded-lg text-sm font-medium transition-colors flex-shrink-0 ml-2"
                              >
                                <Download className="w-4 h-4" />
                                <span className="hidden sm:inline">Download</span>
                              </button>
                            </motion.div>
                          ))}
                          {!showAllCertificates && successfulCerts.length > 10 && (
                            <button
                              onClick={() => setShowAllCertificates(true)}
                              className="w-full py-2 text-sm text-[#4F46E5] font-medium hover:underline"
                            >
                              Show all {successfulCerts.length} certificates
                            </button>
                          )}
                        </div>
                      )}
                      
                      {!showAllCertificates && total > 50 && (
                        <p className="text-sm text-gray-500 text-center py-3">
                          Click to view all {successfulCerts.length} certificates
                        </p>
                      )}
                    </div>
                    
                    {/* Show failed certificates if any */}
                    {failedCerts.length > 0 && (
                      <div className="border-t mt-4 pt-4">
                        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                          <h4 className="text-sm font-bold text-red-900 mb-2">
                            Failed Certificates ({failedCerts.length})
                          </h4>
                          <div className="space-y-1 max-h-40 overflow-y-auto">
                            {failedCerts.map((cert) => (
                              <div key={cert.id} className="text-sm text-red-800 flex items-center gap-2">
                                <X className="w-3 h-3 flex-shrink-0" />
                                <span className="truncate">{cert.participantName}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Quick Actions */}
                <Card>
                  <CardContent className="p-6">
                    <h4 className="text-lg font-bold text-gray-900 mb-4">What's Next?</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <button
                        onClick={() => router.push('/upload')}
                        className="flex items-center gap-3 p-4 bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-200 hover:border-[#4F46E5] transition-all"
                      >
                        <div className="w-12 h-12 bg-[#4F46E5]/10 rounded-lg flex items-center justify-center">
                          <Zap className="w-6 h-6 text-[#4F46E5]" />
                        </div>
                        <div className="text-left">
                          <p className="font-bold text-gray-900">Create New Batch</p>
                          <p className="text-xs text-gray-600">Start a new certificate generation</p>
                        </div>
                      </button>

                      <button
                        onClick={() => router.push('/')}
                        className="flex items-center gap-3 p-4 bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-200 hover:border-[#4F46E5] transition-all"
                      >
                        <div className="w-12 h-12 bg-[#22C55E]/10 rounded-lg flex items-center justify-center">
                          <ArrowLeft className="w-6 h-6 text-[#22C55E]" />
                        </div>
                        <div className="text-left">
                          <p className="font-bold text-gray-900">Back to Home</p>
                          <p className="text-xs text-gray-600">Return to dashboard</p>
                        </div>
                      </button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Failed State */}
            {status === "failed" && (
              <motion.div
                key="failed"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <Card>
                  <CardContent className="p-6 sm:p-8 text-center">
                    <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                      <X className="w-10 h-10 text-red-600" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Generation Failed</h2>
                    <p className="text-gray-600 mb-4">The certificate generation process encountered an error</p>
                    
                    {errorMessage && (
                      <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 text-left max-w-lg mx-auto">
                        <p className="text-sm font-semibold text-red-900 mb-2">Error Details:</p>
                        <p className="text-sm text-red-800">{errorMessage}</p>
                      </div>
                    )}
                    
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6 text-left max-w-lg mx-auto">
                      <p className="text-sm font-semibold text-gray-900 mb-2">Common Issues:</p>
                      <ul className="text-sm text-gray-700 space-y-1 list-disc list-inside">
                        <li>CSV file contains empty or invalid values</li>
                        <li>Template fields don't match CSV column names</li>
                        <li>Network connection interrupted</li>
                        <li>Server timeout due to large batch size</li>
                        <li>Template image file is missing or corrupt</li>
                      </ul>
                    </div>
                    
                    {generated > 0 && (
                      <div className="bg-[#22C55E]/10 border border-[#22C55E]/20 rounded-lg p-4 mb-6 max-w-lg mx-auto">
                        <p className="text-sm text-[#22C55E] font-medium">
                          ✓ {generated} certificates were generated before the error
                        </p>
                      </div>
                    )}
                    
                    <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
                      <BrandButton
                        variant="primary"
                        size="lg"
                        onClick={() => {
                          setStatus("generating");
                          setProgress(0);
                          setGenerated(0);
                          setFailed(0);
                          setCertificatePaths([]);
                          setCertificateMetadata([]);
                          setErrorMessage("");
                          setCurrentBatch("");
                          setEstimatedTimeRemaining(null);
                          generationTimesRef.current = [];
                          startTimeRef.current = Date.now();
                          startGeneration();
                        }}
                      >
                        <RefreshCw className="w-5 h-5" />
                        Try Again
                      </BrandButton>
                      
                      <BrandButton
                        variant="outline"
                        size="lg"
                        onClick={() => router.push('/upload')}
                      >
                        <ArrowLeft className="w-5 h-5" />
                        Start Over
                      </BrandButton>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </PageLayout>
  );
}

