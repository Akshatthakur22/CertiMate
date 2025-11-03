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
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [stats, setStats] = useState({
    total: 0,
    success: 0,
    failed: 0,
  });

  useEffect(() => {
    const url = sessionStorage.getItem("downloadUrl");
    const total = sessionStorage.getItem("numCertificates");
    const successful = sessionStorage.getItem("successful");
    const failed = sessionStorage.getItem("failed");

    if (!url) {
      toast.error("No download URL found. Please start from the beginning.");
      router.push("/upload");
      return;
    }

    setDownloadUrl(url);
    setStats({
      total: total ? parseInt(total) : 0,
      success: successful ? parseInt(successful) : 0,
      failed: failed ? parseInt(failed) : 0,
    });
  }, [router]);

  const handleDownload = () => {
    if (!downloadUrl) return;
    
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
    const fullUrl = `${backendUrl}${downloadUrl}`;
    window.open(fullUrl, '_blank');
    toast.success("Downloading certificates...");
  };

  const handleNewGeneration = () => {
    // Clear session storage
    sessionStorage.removeItem("downloadUrl");
    sessionStorage.removeItem("numCertificates");
    sessionStorage.removeItem("successful");
    sessionStorage.removeItem("failed");
    router.push("/upload");
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
              Generation Complete!
            </h1>
            <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto px-4">
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
            <div className="flex items-center justify-center space-x-2 sm:space-x-4">
              {[
                { num: 1, label: 'Upload', completed: true },
                { num: 2, label: 'Map Data', completed: true },
                { num: 3, label: 'Generate', completed: true },
              ].map((step) => (
                <div key={step.num} className="flex items-center">
                  <div
                    className={`flex flex-col items-center ${
                      step.completed ? 'text-primary' : 'text-muted-foreground'
                    }`}
                  >
                    <div
                      className={`h-8 w-8 sm:h-10 sm:w-10 rounded-full flex items-center justify-center font-bold border-2 transition-all ${
                        step.completed
                          ? 'bg-primary text-primary-foreground border-primary shadow-brand'
                          : 'bg-card text-muted-foreground border-border'
                      }`}
                    >
                      {step.completed ? (
                        <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5" />
                      ) : (
                        <span className="text-xs sm:text-sm">{step.num}</span>
                      )}
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

          {/* Success Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
          >
              {/* Stats Card */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                <Card className="text-center hover:shadow-brand-lg transition-all duration-300 border-border">
                  <CardContent className="p-4 sm:p-6">
                    <div className="text-2xl sm:text-3xl font-bold text-primary mb-2">
                      {stats.total}
                    </div>
                    <div className="text-xs sm:text-sm text-muted-foreground">Total Certificates</div>
                  </CardContent>
                </Card>
                <Card className="text-center hover:shadow-brand-lg transition-all duration-300 border-green-500/50">
                  <CardContent className="p-4 sm:p-6">
                    <div className="text-2xl sm:text-3xl font-bold text-green-600">
                      {stats.success}
                    </div>
                    <div className="text-xs sm:text-sm text-muted-foreground">Successful</div>
                  </CardContent>
                </Card>
                <Card className="text-center hover:shadow-brand-lg transition-all duration-300 border-border">
                  <CardContent className="p-4 sm:p-6">
                    <div className="text-2xl sm:text-3xl font-bold text-muted-foreground mb-2">
                      {stats.failed}
                    </div>
                    <div className="text-xs sm:text-sm text-muted-foreground">Failed</div>
                  </CardContent>
                </Card>
              </div>

              {/* Success Message */}
              <Card className="border-green-500/50">
                <CardContent className="p-4 sm:p-6">
                  <div className="flex items-start sm:items-center space-x-3">
                    <CheckCircle className="h-5 w-5 sm:h-6 sm:w-6 text-green-600" />
                    <div>
                      <p className="font-semibold text-green-900">
                        Generation completed successfully!
                      </p>
                      <p className="text-xs sm:text-sm text-green-700">
                        Your certificates are ready for download
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-4">
                <BrandButton
                  variant="gradient"
                  size="lg"
                  className="flex-1"
                  onClick={handleDownload}
                >
                  <Download className="h-5 w-5 mr-2" />
                  Download ZIP
                </BrandButton>
                <BrandButton
                  variant="outline"
                  size="lg"
                  className="flex-1"
                  onClick={() => router.push("/send")}
                >
                  <Send className="h-5 w-5 mr-2" />
                  Send via Email →
                </BrandButton>
                <BrandButton
                  variant="secondary"
                  size="lg"
                  className="flex-1"
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
                        <XCircle className="h-5 w-5 text-red-600" />
                        <CardTitle className="text-red-900">
                          Failed Certificates
                        </CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-red-700">
                        {stats.failed} certificate(s) failed to generate. Please
                        check your data and try again.
                      </p>
                      <BrandButton variant="outline" size="sm">
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

