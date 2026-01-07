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
import { Skeleton, SkeletonCard, SkeletonText } from "@/components/ui/skeleton";

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
  const [isInitializing, setIsInitializing] = useState(true);
  
  const startTimeRef = useRef<number>(Date.now());
  const generationTimesRef = useRef<number[]>([]);

  useEffect(() => {
    startGeneration();
  }, []);

  const startGeneration = async () => {
    try {
      // Brief initialization to show skeleton (feels more intentional)
      await new Promise(resolve => setTimeout(resolve, 800));
      setIsInitializing(false);
      
      const templateStr = sessionStorage.getItem('certificateTemplate');
      const mappingsStr = sessionStorage.getItem('csvMappings');
      const csvDataStr = sessionStorage.getItem('csvData');
      const sessionId = sessionStorage.getItem('sessionId');

      if (!templateStr || !mappingsStr || !csvDataStr) {
        toast.error('Session expired. Let\'s start fresh.');
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
        toast.success(`🎉 All ${successCount} certificates ready to send!`);
      } else if (successCount > 0) {
        toast.success(`✓ ${successCount} certificates ready. ${failedCount} had issues — see details below.`);
      } else {
        toast.error(`Generation failed for all certificates. Let's troubleshoot.`);
      }
    } catch (error: any) {
      console.error('Generation error:', error);
      setStatus('failed');
      
      let errorMsg = 'Something unexpected happened';
      if (error.response?.status === 500) {
        errorMsg = 'Template or data format issue — check your CSV columns match template fields';
      } else if (error.message?.includes('Network')) {
        errorMsg = 'Internet connection interrupted — try again when stable';
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
      
      // Use serve-file API for Vercel compatibility
      const downloadUrl = `/api/serve-file?path=${encodeURIComponent(certPath)}`;
      
      // Fetch the certificate as blob to force download
      const response = await fetch(downloadUrl);
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
      <div className="min-h-screen bg-gradient-to-br from-white via-[#f9faff] to-[#eef1ff] pt-16 sm:pt-20 pb-6 sm:pb-8 px-4">
        <div className="container mx-auto max-w-5xl">
          {/* Header - Calm and reassuring */}
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-5 sm:mb-6"
          >
            <div className="inline-flex items-center gap-2 border border-indigo-100 bg-white/80 px-3 py-1 rounded-full text-sm text-indigo-600 shadow-sm backdrop-blur-md mb-2">
              🎯 Final Step
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold leading-tight text-gray-900 mb-2">
              {status === "generating" ? "Creating Your Certificates" : status === "completed" ? "You're All Set!" : "Let's Fix This"}
            </h1>
            <p className="text-sm sm:text-base text-gray-600 px-4">
              {status === "generating" && "Hang tight — we're building certificates for your participants"}
              {status === "completed" && "Your certificates are ready to send or download"}
              {status === "failed" && "We hit a snag, but your data is safe"}
            </p>
          </motion.div>

          <AnimatePresence mode="wait">
            {/* Initial Loading - Skeleton State */}
            {isInitializing && (
              <motion.div
                key="initializing"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <Card>
                  <CardContent className="p-5 sm:p-6">
                    <div className="text-center">
                      <div className="w-16 h-16 bg-gradient-to-br from-[#4F46E5]/10 to-[#22C55E]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Loader2 className="w-8 h-8 text-[#4F46E5] animate-spin" />
                      </div>
                      <Skeleton className="h-7 w-56 mx-auto mb-2" />
                      <Skeleton className="h-4 w-40 mx-auto mb-6" />
                    </div>
                    
                    <div className="space-y-3">
                      <Skeleton className="h-2.5 w-full rounded-full" />
                      <div className="flex justify-between">
                        <Skeleton className="h-3 w-16" />
                        <Skeleton className="h-3 w-10" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
            
            {/* Generating State */}
            {!isInitializing && status === "generating" && (
              <motion.div
                key="generating"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <Card>
                  <CardContent className="p-5 sm:p-6">
                    <div className="text-center mb-6">
                      <div className="w-16 h-16 bg-gradient-to-br from-[#4F46E5]/10 to-[#22C55E]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Loader2 className="w-8 h-8 text-[#4F46E5] animate-spin" />
                      </div>
                      <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">Building Your Certificates</h2>
                      
                      <div className="flex items-center justify-center gap-3 text-sm text-gray-600 mb-4">
                        <span className="font-semibold">{generated} of {total}</span>
                        {estimatedTimeRemaining && estimatedTimeRemaining > 5 && (
                          <span className="inline-flex items-center gap-1.5 text-[#4F46E5]">
                            <Clock className="w-3.5 h-3.5" />
                            ~{formatTime(estimatedTimeRemaining)}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Progress Bar - Clean and simple */}
                    <div className="space-y-3">
                      <div className="h-2.5 bg-gray-200 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${progress}%` }}
                          transition={{ duration: 0.3, ease: "easeOut" }}
                          className="h-full gradient-primary"
                        />
                      </div>
                      
                      <div className="flex items-center justify-center gap-2 text-sm">
                        <span className="font-bold text-[#4F46E5]">{Math.round(progress)}%</span>
                        <span className="text-gray-500">complete</span>
                      </div>
                    </div>
                    
                    {/* Simple reassurance message */}
                    <div className="mt-5 flex items-center justify-center gap-2 text-xs text-gray-600 bg-[#4F46E5]/5 py-2.5 px-4 rounded-lg">
                      <Shield className="w-3.5 h-3.5 text-[#4F46E5]" />
                      <span>Safe to keep this tab open</span>
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
                {/* Success Card - Compact for single-screen view */}
                <Card className="gradient-primary text-white">
                  <CardContent className="p-5 sm:p-6">
                    <div className="text-center">
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", duration: 0.5 }}
                        className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4"
                      >
                        <CheckCircle className="w-8 h-8" />
                      </motion.div>
                      <h2 className="text-2xl sm:text-3xl font-bold mb-2">
                        {failed > 0 ? `${successfulCerts.length} Certificates Ready` : 'All Certificates Ready!'}
                      </h2>
                      <p className="text-base opacity-90 mb-5">
                        {failed > 0 
                          ? `${successfulCerts.length} ready to send. ${failed} need review.`
                          : `Completed in ${formatTime(Math.floor((Date.now() - startTimeRef.current) / 1000))}. Nice work!`
                        }
                      </p>
                      
                      {/* Simplified stats - compact */}
                      <div className="inline-flex items-center gap-5 text-sm opacity-90">
                        <div>
                          <span className="text-2xl font-bold block">{successfulCerts.length}</span>
                          <span className="text-xs">Ready to Send</span>
                        </div>
                        {failed > 0 && (
                          <>
                            <div className="w-px h-10 bg-white/20"></div>
                            <div>
                              <span className="text-2xl font-bold block">{failed}</span>
                              <span className="text-xs">Need Review</span>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Download Actions - Clear primary focus */}
                <Card>
                  <CardContent className="p-5">
                    <div className="mb-4">
                      <h3 className="text-lg font-bold text-gray-900 mb-1">Choose Your Next Step</h3>
                      <p className="text-sm text-gray-600">
                        {successfulCerts.length > 50 
                          ? "Email recommended for large batches"
                          : "Send via email or download manually"
                        }
                      </p>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
                      {/* Primary action: Email (recommended for most users) */}
                      <BrandButton
                        variant="gradient"
                        size="lg"
                        onClick={() => router.push('/send')}
                        className="w-full"
                        disabled={successfulCerts.length === 0}
                      >
                        <Mail className="w-5 h-5" />
                        <span>Send Certificates Now</span>
                      </BrandButton>
                      
                      {/* Secondary action: Download */}
                      <BrandButton
                        variant="secondary"
                        size="lg"
                        onClick={downloadAll}
                        disabled={isDownloadingZip || successfulCerts.length === 0}
                        className="w-full"
                      >
                        {isDownloadingZip ? (
                          <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            <span>Preparing ZIP...</span>
                          </>
                        ) : (
                          <>
                            <FileArchive className="w-5 h-5" />
                            <span>Download All ({successfulCerts.length})</span>
                          </>
                        )}
                      </BrandButton>
                    </div>

                    {/* Individual Downloads - Collapsible to save screen space */}
                    <div className="border-t pt-4 mt-4">
                      <button
                        onClick={() => setShowAllCertificates(!showAllCertificates)}
                        className="flex items-center justify-between w-full text-sm font-bold text-gray-900 mb-3 hover:text-[#4F46E5] transition-colors"
                      >
                        <span>Individual Downloads ({successfulCerts.length})</span>
                        {showAllCertificates ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </button>
                      
                      {showAllCertificates && (
                        <div className="max-h-96 overflow-y-auto space-y-2 pr-2">
                          {successfulCerts.slice(0, showAllCertificates ? undefined : 5).map((cert, index) => (
                            <motion.div
                              key={cert.id}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: Math.min(index * 0.03, 0.3) }}
                              className="flex items-center justify-between p-3 bg-white hover:bg-gray-50 rounded-lg border border-gray-200 hover:border-[#4F46E5]/40 transition-all group"
                            >
                              <div className="flex items-center gap-3 min-w-0 flex-1">
                                <div className="w-8 h-8 bg-[#4F46E5]/10 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:bg-[#4F46E5]/20 transition-colors">
                                  <CheckCircle className="w-4 h-4 text-[#4F46E5]" />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="font-semibold text-sm text-gray-900 truncate">
                                    {cert.participantName}
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    Certificate ready
                                  </p>
                                </div>
                              </div>
                              <button
                                onClick={() => downloadIndividual(cert.path, certificateMetadata.indexOf(cert))}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-[#4F46E5] text-[#4F46E5] hover:text-white border border-[#4F46E5] rounded-lg text-sm font-medium transition-all flex-shrink-0 ml-2"
                              >
                                <Download className="w-4 h-4" />
                              </button>
                            </motion.div>
                          ))}
                          {!showAllCertificates && successfulCerts.length > 5 && (
                            <button
                              onClick={() => setShowAllCertificates(true)}
                              className="w-full py-3 text-sm text-[#4F46E5] font-medium hover:bg-[#4F46E5]/5 rounded-lg transition-colors"
                            >
                              Show {successfulCerts.length - 5} more certificates
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                    
                    {/* Show failed certificates if any - Compact display */}
                    {failedCerts.length > 0 && (
                      <div className="border-t mt-4 pt-4">
                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                          <div className="flex items-start gap-2 mb-2">
                            <div className="w-7 h-7 bg-amber-100 rounded-lg flex items-center justify-center flex-shrink-0">
                              <X className="w-3.5 h-3.5 text-amber-700" />
                            </div>
                            <div className="flex-1">
                              <h4 className="text-sm font-bold text-amber-900">
                                {failedCerts.length} Need Review
                              </h4>
                            </div>
                          </div>
                          <div className="space-y-1 max-h-32 overflow-y-auto">
                            {failedCerts.map((cert) => (
                              <div key={cert.id} className="text-xs text-amber-900 bg-white/50 px-2 py-1.5 rounded truncate">
                                {cert.participantName}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

              </motion.div>
            )}

            {/* Failed State - Supportive, not scary */}
            {!isInitializing && status === "failed" && (
              <motion.div
                key="failed"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <Card>
                  <CardContent className="p-6 sm:p-8 text-center">
                    <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-6">
                      <X className="w-10 h-10 text-amber-600" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Something Went Wrong</h2>
                    <p className="text-gray-600 mb-4">Don't worry — your data is safe. Let's figure this out.</p>
                    
                    {errorMessage && (
                      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4 text-left max-w-lg mx-auto">
                        <p className="text-sm font-semibold text-amber-900 mb-1">What happened:</p>
                        <p className="text-sm text-amber-800">{errorMessage}</p>
                      </div>
                    )}
                    
                    <div className="bg-[#4F46E5]/5 border border-[#4F46E5]/20 rounded-lg p-4 mb-6 text-left max-w-lg mx-auto">
                      <p className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
                        <Shield className="w-4 h-4 text-[#4F46E5]" />
                        Quick Fixes:
                      </p>
                      <ul className="text-sm text-gray-700 space-y-2">
                        <li className="flex items-start gap-2">
                          <span className="text-[#4F46E5] mt-0.5">•</span>
                          <span>Check your CSV for empty cells or special characters</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-[#4F46E5] mt-0.5">•</span>
                          <span>Verify template fields match CSV column names exactly</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-[#4F46E5] mt-0.5">•</span>
                          <span>Try a smaller batch (under 100 rows) first</span>
                        </li>
                      </ul>
                    </div>
                    
                    {generated > 0 && (
                      <div className="bg-[#22C55E]/10 border border-[#22C55E]/20 rounded-lg p-4 mb-6 max-w-lg mx-auto">
                        <p className="text-sm text-[#22C55E] font-medium flex items-center gap-2 justify-center">
                          <CheckCircle className="w-4 h-4" />
                          Good news: {generated} certificate{generated > 1 ? 's were' : ' was'} created successfully
                        </p>
                      </div>
                    )}
                    
                    <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
                      <BrandButton
                        variant="gradient"
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
                          setIsInitializing(true);
                          generationTimesRef.current = [];
                          startTimeRef.current = Date.now();
                          startGeneration();
                        }}
                      >
                        <RefreshCw className="w-5 h-5" />
                        Try Again
                      </BrandButton>
                      
                      <BrandButton
                        variant="secondary"
                        size="lg"
                        onClick={() => router.push('/upload')}
                      >
                        <ArrowLeft className="w-5 h-5" />
                        Start Fresh
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

