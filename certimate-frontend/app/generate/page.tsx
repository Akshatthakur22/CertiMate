"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  Download,
  CheckCircle,
  FileText,
  XCircle,
  Send,
} from "lucide-react";
import { BrandButton } from "@/components/ui/brand-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageLayout } from "@/components/layout/page-layout";

export default function GeneratePage() {
  const router = useRouter();
  const [status, setStatus] = useState<"loading" | "completed" | "failed">("loading");
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [stats, setStats] = useState({
    total: 0,
    success: 0,
    failed: 0,
  });
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const jobId = sessionStorage.getItem("jobId");

    // If we have legacy session data (direct completion), use it
    const legacyUrl = sessionStorage.getItem("downloadUrl");
    if (legacyUrl && !jobId) {
      setDownloadUrl(legacyUrl);
      setStats({
        total: parseInt(sessionStorage.getItem("numCertificates") || "0"),
        success: parseInt(sessionStorage.getItem("successful") || "0"),
        failed: parseInt(sessionStorage.getItem("failed") || "0"),
      });
      setStatus("completed");
      return;
    }

    if (!jobId) {
      toast.error("No active job found. Please start over.");
      router.push("/upload");
      return;
    }

    // Poll for status
    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/generate/status/${jobId}`);
        if (!response.ok) throw new Error("Failed to fetch status");

        const data = await response.json();

        if (data.status === "completed" || data.status === "completed_with_errors") {
          setStatus("completed");
          setDownloadUrl(data.download_url);
          setStats({
            total: data.total_items || 0,
            success: data.successful_items || 0,
            failed: data.failed_items || 0,
          });
          clearInterval(pollInterval);
        } else if (data.status === "failed") {
          setStatus("failed");
          clearInterval(pollInterval);
          toast.error("Job failed: " + (data.error || "Unknown error"));
        } else {
          // Update progress if available
          if (data.total_items > 0) {
            setProgress(Math.round((data.processed_items / data.total_items) * 100));
          }
        }
      } catch (error) {
        console.error("Polling error:", error);
      }
    }, 2000);

    return () => clearInterval(pollInterval);
  }, [router]);

  const handleDownload = () => {
    if (!downloadUrl) return;

    const backendUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
    // If downloadUrl is already absolute, use it, otherwise prepend backendUrl
    const fullUrl = downloadUrl.startsWith("http") ? downloadUrl : `${backendUrl}${downloadUrl}`;
    window.open(fullUrl, '_blank');
    toast.success("Downloading certificates...");
  };

  const handleNewGeneration = () => {
    sessionStorage.clear();
    router.push("/upload");
  };

  if (status === "loading") {
    return (
      <PageLayout>
        <div className="min-h-screen py-20 px-4 flex flex-col items-center justify-center bg-gradient-to-br from-white via-indigo-50/30 to-white">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center space-y-6 max-w-md w-full"
          >
            <div className="relative w-24 h-24 mx-auto">
              <div className="absolute inset-0 border-4 border-indigo-100 rounded-full"></div>
              <div className="absolute inset-0 border-4 border-indigo-600 rounded-full border-t-transparent animate-spin"></div>
              <div className="absolute inset-0 flex items-center justify-center font-bold text-indigo-600">
                {progress}%
              </div>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Generating Certificates...</h2>
              <p className="text-gray-600">Please wait while we process your request.</p>
              <p className="text-sm text-gray-500 mt-2">This may take a few minutes depending on the batch size.</p>
            </div>
          </motion.div>
        </div>
      </PageLayout>
    );
  }

  if (status === "failed") {
    return (
      <PageLayout>
        <div className="min-h-screen py-20 px-4 flex flex-col items-center justify-center bg-gradient-to-br from-white via-red-50/30 to-white">
          <Card className="max-w-md w-full border-red-200 shadow-lg">
            <CardHeader className="text-center">
              <div className="mx-auto bg-red-100 p-3 rounded-full w-fit mb-4">
                <XCircle className="h-8 w-8 text-red-600" />
              </div>
              <CardTitle className="text-red-900">Generation Failed</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-center text-gray-600">
                Something went wrong while processing your certificates. Please try again or check your input files.
              </p>
              <BrandButton onClick={handleNewGeneration} className="w-full">
                Try Again
              </BrandButton>
            </CardContent>
          </Card>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <div className="min-h-screen py-8 sm:py-12 md:py-16 lg:py-20 px-4 sm:px-6 bg-gradient-to-br from-white via-indigo-50/30 to-white">
        <div className="container max-w-4xl mx-auto">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center mb-6 sm:mb-8 md:mb-12"
          >
            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-2 sm:mb-3 md:mb-4">
              Generation Complete!
            </h1>
            <p className="text-sm sm:text-base md:text-lg text-gray-600 max-w-2xl mx-auto px-2 sm:px-4">
              Your certificates are ready for download
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
                { num: 1, label: 'Upload', completed: true },
                { num: 2, label: 'Map Data', completed: true },
                { num: 3, label: 'Generate', completed: true },
              ].map((step) => (
                <div key={step.num} className="flex items-center flex-shrink-0">
                  <div
                    className={`flex flex-col items-center ${step.completed ? 'text-indigo-600' : 'text-gray-400'
                      }`}
                  >
                    <div
                      className={`h-10 w-10 sm:h-11 sm:w-11 md:h-12 md:w-12 rounded-full flex items-center justify-center font-bold border-2 transition-all ${step.completed
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-brand'
                        : 'bg-white text-gray-400 border-gray-300'
                        }`}
                    >
                      {step.completed ? (
                        <CheckCircle className="h-5 w-5 sm:h-6 sm:w-6" />
                      ) : (
                        <span className="text-sm sm:text-base">{step.num}</span>
                      )}
                    </div>
                    <span className="text-xs sm:text-sm mt-2 font-medium whitespace-nowrap">{step.label}</span>
                  </div>
                  {step.num < 3 && (
                    <div
                      className={`h-0.5 w-4 sm:w-8 md:w-12 lg:w-16 mx-1 sm:mx-2 md:mx-3 lg:mx-4 transition-colors ${step.completed ? 'bg-indigo-600' : 'bg-gray-300'
                        }`}
                    />
                  )}
                </div>
              ))}
            </div>
          </motion.div>

          {/* Success Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
          >
            {/* Stats Card */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-6">
              <Card className="text-center hover:shadow-brand-lg transition-all duration-300 border-gray-200">
                <CardContent className="p-4 sm:p-6">
                  <div className="text-2xl sm:text-3xl md:text-4xl font-bold text-indigo-600 mb-2">
                    {stats.total}
                  </div>
                  <div className="text-xs sm:text-sm text-gray-600">Total Certificates</div>
                </CardContent>
              </Card>
              <Card className="text-center hover:shadow-brand-lg transition-all duration-300 border-green-500/50">
                <CardContent className="p-4 sm:p-6">
                  <div className="text-2xl sm:text-3xl md:text-4xl font-bold text-green-600">
                    {stats.success}
                  </div>
                  <div className="text-xs sm:text-sm text-gray-600">Successful</div>
                </CardContent>
              </Card>
              <Card className="text-center hover:shadow-brand-lg transition-all duration-300 border-gray-200">
                <CardContent className="p-4 sm:p-6">
                  <div className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-500 mb-2">
                    {stats.failed}
                  </div>
                  <div className="text-xs sm:text-sm text-gray-600">Failed</div>
                </CardContent>
              </Card>
            </div>

            {/* Success Message */}
            <Card className="border-green-500/50 mb-6">
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-start sm:items-center space-x-3">
                  <CheckCircle className="h-5 w-5 sm:h-6 sm:w-6 text-green-600 flex-shrink-0 mt-0.5 sm:mt-0" />
                  <div>
                    <p className="font-semibold text-green-900 text-sm sm:text-base">
                      Generation completed successfully!
                    </p>
                    <p className="text-xs sm:text-sm text-green-700 mt-1">
                      Your certificates are ready for download
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
              <BrandButton
                variant="gradient"
                size="lg"
                className="flex-1 min-h-[44px]"
                onClick={handleDownload}
              >
                <Download className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                Download ZIP
              </BrandButton>
              <BrandButton
                variant="outline"
                size="lg"
                className="flex-1 min-h-[44px]"
                onClick={() => router.push("/send")}
              >
                <Send className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                Send via Email →
              </BrandButton>
              <BrandButton
                variant="secondary"
                size="lg"
                className="flex-1 min-h-[44px]"
                onClick={handleNewGeneration}
              >
                Generate New
              </BrandButton>
            </div>

            {/* Failed Items */}
            {stats.failed > 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="mt-6"
              >
                <Card className="border-red-500/50">
                  <CardHeader>
                    <div className="flex items-center space-x-2">
                      <XCircle className="h-5 w-5 sm:h-6 sm:w-6 text-red-600" />
                      <CardTitle className="text-red-900 text-sm sm:text-base">
                        Failed Certificates
                      </CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs sm:text-sm text-red-700 mb-4">
                      {stats.failed} certificate(s) failed to generate. Please
                      check your data and try again.
                    </p>
                    <BrandButton variant="outline" size="default" className="min-h-[44px]">
                      View Error Details
                    </BrandButton>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </motion.div>
        </div>
      </div>
    </PageLayout>
  );
}

