"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { useGoogleLogin } from "@react-oauth/google";
import { Mail, Send, FileText, Download, CheckCircle, AlertCircle, Loader2, LogIn } from "lucide-react";
import { BrandButton } from "@/components/ui/brand-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageLayout } from "@/components/layout/page-layout";
import { sendCertificateEmail } from "@/lib/api";
import { Skeleton, SkeletonText } from "@/components/ui/skeleton";

export default function SendPage() {
  const router = useRouter();
  const [emailTemplate, setEmailTemplate] = useState(
    "Hi {{name}},\n\nCongratulations on completing {{event}}!\n\nYour certificate is attached.\n\nBest regards,\nThe CertiMate Team"
  );
  const [subject, setSubject] = useState("Your Certificate is Ready!");
  const [isSending, setIsSending] = useState(false);
  const [sendProgress, setSendProgress] = useState<number>(0);
  const [googleToken, setGoogleToken] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Google Login
  const login = useGoogleLogin({
    onSuccess: (tokenResponse) => {
      setGoogleToken(tokenResponse.access_token);
      setIsAuthenticated(true);
      toast.success("Successfully signed in to Google!");
    },
    onError: (error) => {
      console.error("Login error:", error);
      toast.error("Failed to sign in to Google. Please try again.");
    },
    scope: "https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/userinfo.email",
  });

  // Check if token is stored in session
  // Clear existing token to force re-authentication with new scopes
  useEffect(() => {
    // Clear old token to ensure re-authentication with updated scopes
    sessionStorage.removeItem("google_token");
    // Note: User will need to sign in again with the new scopes
  }, []);

  // Store token in session when authenticated
  useEffect(() => {
    if (googleToken) {
      sessionStorage.setItem("google_token", googleToken);
    }
  }, [googleToken]);

  const handleSend = async () => {
    if (!isAuthenticated || !googleToken) {
      toast.error("Please sign in with Google first");
      login();
      return;
    }

    // Validate required fields
    if (!googleToken) {
      toast.error("Google token is missing");
      return;
    }

    if (!subject) {
      toast.error("Email subject is required");
      return;
    }

    if (!emailTemplate) {
      toast.error("Email message is required");
      return;
    }

    setIsSending(true);
    setSendProgress(10);

    try {
      // Fetch the CSV content from backend
      console.log('📧 Fetching CSV content for recipients...');
      const { getCSVContent } = await import('@/lib/api');
      const csvData = await getCSVContent();

      console.log('📄 CSV Content:', csvData.content);

      // Parse CSV - handle both \n and \r\n line endings
      const lines = csvData.content.split(/\r?\n/).filter(line => line.trim());
      console.log('📄 CSV Lines:', lines);

      const headers = lines[0].split(',').map(h => h.trim());
      console.log('📄 CSV Headers:', headers);

      const rows = lines.slice(1);
      console.log('📄 CSV Rows:', rows);

      // Find email column (case-insensitive)
      const emailIdx = headers.findIndex(h => h.toLowerCase().includes('email'));
      const nameIdx = headers.findIndex(h => h.toLowerCase().includes('name'));

      console.log('📄 Email Column Index:', emailIdx);
      console.log('📄 Name Column Index:', nameIdx);

      if (emailIdx === -1) {
        console.error('❌ Email column not found. Headers:', headers);
        toast.error(`CSV file must contain an 'Email' column. Found: ${headers.join(', ')}`);
        setIsSending(false);
        return;
      }

      // Build recipients list
      const recipients = rows
        .map(row => {
          const cells = row.split(',').map(c => c.trim());
          console.log('📄 Row cells:', cells);

          const email = cells[emailIdx];
          const name = nameIdx !== -1 ? cells[nameIdx] : email?.split('@')[0] || 'Recipient';

          console.log('📄 Extracted email:', email, 'name:', name);

          return email && email.includes('@') ? { email, name } : null;
        })
        .filter(r => r !== null) as Array<{ email: string; name: string }>;

      console.log('📧 Final Recipients:', recipients);

      if (recipients.length === 0) {
        toast.error("No valid email addresses found in CSV");
        setIsSending(false);
        return;
      }

      setSendProgress(30);

      // Send batch email request (now queued)
      setSendProgress(50);

      const response = await sendCertificateEmail({
        access_token: googleToken,
        recipients: recipients,
        subject: subject,
        body_template: emailTemplate,
        certificates_dir: "uploads/certificates"
      });

      setSendProgress(90);

      // Handle async response (job queued)
      if (response.job_id) {
        toast.success(`Email sending started! Processing ${response.total} recipients in background.`);
        // Store job ID for potential status checking
        sessionStorage.setItem("email_job_id", response.job_id);
      } else {
        // Legacy response handling (if backend returns immediate results)
        const successful = response.successful ?? 0;
        const failed = response.failed ?? 0;

        if (successful > 0) {
          toast.success(`Successfully sent ${successful} certificate(s)!`);
        }
        if (failed > 0) {
          toast.error(`${failed} certificate(s) failed to send`);
        }
      }

      setSendProgress(100);
    } catch (error: any) {
      console.error("Send error:", error);
      const errorMessage = error.response?.data?.detail ||
        error.response?.data?.message ||
        error.message ||
        "Failed to send certificates";
      toast.error(errorMessage);
    } finally {
      setIsSending(false);
      setSendProgress(0);
    }
  };

  const handleDownload = () => {
    const downloadUrl = sessionStorage.getItem("downloadUrl");
    if (downloadUrl) {
      const backendUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const fullUrl = `${backendUrl}${downloadUrl}`;
      window.open(fullUrl, '_blank');
      toast.success("Downloading ZIP...");
    }
  };

  return (
    <PageLayout>
      <div className="min-h-screen py-8 sm:py-12 md:py-16 lg:py-20 px-4 sm:px-6 bg-gradient-to-br from-white via-indigo-50/30 to-white">
        <div className="container max-w-5xl mx-auto">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center mb-6 sm:mb-8 md:mb-12"
          >
            <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full bg-indigo-100/80 text-indigo-700 text-xs sm:text-sm font-medium mb-3 sm:mb-4">
              <Mail className="h-3 w-3 sm:h-4 sm:w-4" />
              <span>Email Sending</span>
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-2 sm:mb-3 md:mb-4">
              Send Certificates via Email
            </h1>
            <p className="text-sm sm:text-base md:text-lg text-gray-600 max-w-2xl mx-auto px-2 sm:px-4">
              Personalize and send certificates to all participants at once
            </p>
          </motion.div>

          {/* Google Sign-In Status */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.5 }}
            className="mb-6 sm:mb-8"
          >
            {!isAuthenticated ? (
              <Card className="border-2 border-indigo-300">
                <CardContent className="p-4 sm:p-6">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-indigo-100">
                        <AlertCircle className="h-5 w-5 sm:h-6 sm:w-6 text-indigo-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900 text-sm sm:text-base">Sign in Required</h3>
                        <p className="text-xs sm:text-sm text-gray-600">Connect your Gmail account to send certificates</p>
                      </div>
                    </div>
                    <BrandButton
                      variant="gradient"
                      onClick={() => login()}
                      className="w-full sm:w-auto min-h-[44px]"
                    >
                      <LogIn className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                      Sign in with Google
                    </BrandButton>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="border-2 border-green-500/50">
                <CardContent className="p-4 sm:p-6">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="h-5 w-5 sm:h-6 sm:w-6 text-green-600 flex-shrink-0" />
                    <div>
                      <h3 className="font-semibold text-gray-900 text-sm sm:text-base">Signed in to Gmail</h3>
                      <p className="text-xs sm:text-sm text-gray-600">Ready to send certificates</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </motion.div>

          {/* Email Subject */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.5 }}
            className="mb-6"
          >
            <Card className="border-gray-200">
              <CardHeader>
                <CardTitle className="text-base sm:text-lg text-gray-900">Email Subject</CardTitle>
              </CardHeader>
              <CardContent>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base border border-gray-300 bg-white rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all min-h-[44px]"
                  placeholder="Your Certificate is Ready!"
                  aria-label="Email subject"
                />
              </CardContent>
            </Card>
          </motion.div>

          {/* Email Template Editor */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="mb-6 sm:mb-8"
          >
            <Card className="border-gray-200">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5 sm:h-6 sm:w-6 text-indigo-600" />
                  <CardTitle className="text-base sm:text-lg text-gray-900">Email Message Template</CardTitle>
                </div>
                <p className="text-xs sm:text-sm text-gray-600 mt-1">
                  Customize your email message. Use <code className="bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded">{"{{name}}"}</code> and <code className="bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded">{"{{event}}"}</code> for personalization.
                </p>
              </CardHeader>
              <CardContent>
                <textarea
                  value={emailTemplate}
                  onChange={(e) => setEmailTemplate(e.target.value)}
                  className="w-full h-40 sm:h-48 md:h-64 p-3 sm:p-4 text-sm sm:text-base border border-gray-300 bg-white rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent font-mono resize-none transition-all"
                  placeholder="Hi {{name}},&#10;&#10;Congratulations on completing {{event}}!"
                  aria-label="Email template"
                />
              </CardContent>
            </Card>
          </motion.div>

          {/* Preview */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="mb-6 sm:mb-8"
          >
            <Card className="border-2 border-indigo-300">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Mail className="h-5 w-5 sm:h-6 sm:w-6 text-indigo-600" />
                  <CardTitle className="text-base sm:text-lg text-gray-900">Email Preview</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6 shadow-sm">
                  <div className="space-y-2 mb-4">
                    <div className="text-xs sm:text-sm text-gray-600">To:</div>
                    <div className="font-medium text-gray-900 text-sm sm:text-base">akshat@example.com</div>
                  </div>
                  <div className="border-b border-gray-200 pb-4 mb-4">
                    <div className="text-sm sm:text-base md:text-lg font-semibold mb-2 text-gray-900">Subject: {subject}</div>
                    <div className="text-xs sm:text-sm text-gray-600">From: Your Gmail</div>
                  </div>
                  <div className="text-gray-900 whitespace-pre-wrap text-xs sm:text-sm leading-relaxed">
                    {emailTemplate.replace(/{{name}}/g, "Akshat Thakur").replace(/{{event}}/g, "Hackathon 2025")}
                  </div>
                  <div className="mt-4 border-t border-gray-200 pt-4">
                    <div className="text-xs sm:text-sm text-gray-600 mb-2">Attachments:</div>
                    <div className="flex items-center gap-2 text-xs sm:text-sm">
                      <FileText className="h-3 w-3 sm:h-4 sm:w-4 text-indigo-600" />
                      <span className="font-medium text-indigo-600">certificate_ZIP.zip</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Progress Bar (when sending) */}
          {isSending && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mb-6 sm:mb-8"
            >
              <Card className="bg-indigo-50 border-indigo-200">
                <CardContent className="p-4 sm:p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <Loader2 className="h-4 w-4 sm:h-5 sm:w-5 animate-spin text-indigo-600" />
                    <span className="font-semibold text-gray-900 text-sm sm:text-base">Sending certificates...</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${sendProgress}%` }}
                      transition={{ duration: 0.3, ease: "easeOut" }}
                      className="bg-gradient-to-r from-indigo-500 to-indigo-600 h-full"
                    />
                  </div>
                  <p className="text-xs sm:text-sm text-gray-600 mt-2">{sendProgress.toFixed(0)}% complete</p>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Actions */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.5 }}
            className="flex flex-col sm:flex-row gap-3 sm:gap-4"
          >
            <BrandButton
              variant="gradient"
              size="lg"
              className="flex-1 min-h-[44px]"
              onClick={handleSend}
              disabled={isSending || !isAuthenticated}
              aria-label={isSending ? "Sending certificates" : "Send all certificates"}
            >
              {isSending ? (
                <>
                  <Loader2 className="h-4 w-4 sm:h-5 sm:w-5 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                  Send All Certificates
                </>
              )}
            </BrandButton>
            <BrandButton
              variant="outline"
              size="lg"
              className="flex-1 min-h-[44px]"
              onClick={handleDownload}
              aria-label="Download ZIP file"
            >
              <Download className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
              Download ZIP Instead
            </BrandButton>
            <BrandButton
              variant="secondary"
              size="lg"
              className="flex-1 sm:flex-none min-h-[44px]"
              onClick={() => router.push("/upload")}
              aria-label="Start new generation"
            >
              Generate New
            </BrandButton>
          </motion.div>
        </div>
      </div>
    </PageLayout>
  );
}
