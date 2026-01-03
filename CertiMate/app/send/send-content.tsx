"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { useGoogleLogin } from "@react-oauth/google";
import { Mail, Send, FileText, Download, CheckCircle, AlertCircle, Loader2, LogIn } from "lucide-react";
import axios from "axios";
import { BrandButton } from "@/components/ui/brand-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageLayout } from "@/components/layout/page-layout";
import { Skeleton, SkeletonText } from "@/components/ui/skeleton";

export default function SendPageContent() {
  const router = useRouter();
  const [emailTemplate, setEmailTemplate] = useState(
    `<p>Hello <strong>{{name}}</strong>,</p>

<p>Congratulations on your achievement!</p>

<p>We are pleased to share your certificate of completion. You can find it attached to this email.</p>

<p>Thank you for your participation!</p>

<p>Best regards,<br>
<strong>Team CertiMate</strong></p>`
  );
  const [subject, setSubject] = useState("🎉 Your Certificate is Ready!");
  const [isSending, setIsSending] = useState(false);
  const [sendProgress, setSendProgress] = useState<number>(0);
  const [googleToken, setGoogleToken] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [hasGoogleClientId, setHasGoogleClientId] = useState(true);

  // Check if Google Client ID is configured
  useEffect(() => {
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    if (!clientId) {
      console.error("❌ NEXT_PUBLIC_GOOGLE_CLIENT_ID is not configured");
      setHasGoogleClientId(false);
      toast.error("Google OAuth is not configured. Please contact the administrator.");
    }
  }, []);

  // Google Login
  const login = useGoogleLogin({
    flow: "implicit",
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
    if (!subject.trim()) {
      toast.error("Email subject is required");
      return;
    }

    if (!emailTemplate.trim()) {
      toast.error("Email message is required");
      return;
    }

    setIsSending(true);
    setSendProgress(10);

    try {
      // Get certificate metadata from sessionStorage (generated in generate page)
      const metadataStr = sessionStorage.getItem('certificateMetadata');
      
      if (!metadataStr) {
        toast.error('No certificates found. Please generate certificates first.');
        setIsSending(false);
        return;
      }

      const metadata = JSON.parse(metadataStr);
      const successfulCerts = metadata.filter((m: any) => m.status === 'success');

      if (successfulCerts.length === 0) {
        toast.error('No successfully generated certificates found.');
        setIsSending(false);
        return;
      }

      console.log(`📧 Preparing to send ${successfulCerts.length} emails...`);
      console.log('First certificate data:', successfulCerts[0]?.csvData);
      setSendProgress(20);

      // Build recipients list from metadata
      const recipients = successfulCerts.map((cert: any) => {
        // Try standard email field names first
        let email = cert.csvData.email || 
                   cert.csvData.Email || 
                   cert.csvData.EMAIL ||
                   cert.csvData['email'] ||
                   cert.csvData['Email'];

        // If not found, search through all fields for an email-like value
        if (!email) {
          for (const [key, value] of Object.entries(cert.csvData)) {
            const strValue = String(value);
            if (strValue.includes('@') && strValue.includes('.')) {
              email = strValue;
              console.log(`✓ Found email in field "${key}": ${email}`);
              break;
            }
          }
        }
        
        if (!email || !email.includes('@')) {
          console.warn(`❌ No valid email for ${cert.participantName}`, cert.csvData);
          return null;
        }

        return {
          email: email.trim(),
          name: cert.participantName,
          certificatePath: cert.path
        };
      }).filter((r: any) => r !== null);

      if (recipients.length === 0) {
        // Show what fields were available for debugging
        const availableFields = successfulCerts[0] ? Object.keys(successfulCerts[0].csvData) : [];
        console.error('Available fields in CSV data:', availableFields);
        console.error('No email fields found in:', successfulCerts[0]?.csvData);
        
        toast.error(
          `No valid email addresses found in your CSV data.\n\n` +
          `Available columns: ${availableFields.join(', ')}\n\n` +
          `Please make sure your CSV includes a column named "email" or "Email" with valid email addresses (format: user@example.com).`
        );
        setIsSending(false);
        return;
      }

      console.log(`✓ Found ${recipients.length} recipients with valid emails`);
      setSendProgress(40);

      // Get sessionId for cleanup
      const sessionId = sessionStorage.getItem('sessionId');

      // Send emails via API
      const response = await axios.post('/api/send', {
        access_token: googleToken,
        recipients: recipients,
        subject: subject.trim(),
        body_template: emailTemplate,
        certificates_dir: 'uploads/certificates',
        sessionId, // Include for auto-cleanup after sending
      });

      setSendProgress(90);

      const { successful, failed, total } = response.data;

      console.log(`\n📊 Send Results:`);
      console.log(`   ✓ Successful: ${successful}`);
      console.log(`   ✗ Failed: ${failed}`);
      console.log(`   📁 Total: ${total}\n`);

      setSendProgress(100);

      // Clear sessionId after successful send (files will be auto-deleted)
      if (successful > 0 && sessionId) {
        sessionStorage.removeItem('sessionId');
      }

      if (failed === 0) {
        toast.success(`Successfully sent all ${successful} certificates via email! Files cleaned up.`);
      } else if (successful > 0) {
        toast.warning(`Sent ${successful} of ${total} certificates. ${failed} failed.`);
      } else {
        toast.error(`All ${failed} emails failed to send. Please check your Gmail permissions.`);
      }

    } catch (error: any) {
      console.error("Send error:", error);
      
      // Handle specific 404 error for missing CSV
      if (error.response?.status === 404) {
        toast.error('No CSV file found. Please upload and generate certificates first.');
        setIsSending(false);
        return;
      }

      // Handle Gmail API specific errors
      if (error.response?.data?.error?.includes('Gmail API')) {
        toast.error('Gmail API error. Please sign in again and grant email sending permissions.');
        setIsAuthenticated(false);
        setGoogleToken(null);
      } else {
        const errorMessage = error.response?.data?.message ||
          error.response?.data?.error ||
          error.message ||
          "Failed to send certificates";
        toast.error(errorMessage);
      }
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
                  <div className="text-gray-900 text-xs sm:text-sm leading-relaxed">
                    <div 
                      dangerouslySetInnerHTML={{ 
                        __html: emailTemplate
                          .replace(/\{\{name\}\}/g, "Akshat Thakur")
                          .replace(/\{\{event\}\}/g, "Hackathon 2025") 
                      }}
                    />
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

          {/* Send Summary Info */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35, duration: 0.5 }}
            className="mb-6"
          >
            <Card className="border-blue-200 bg-blue-50">
              <CardContent className="p-4 sm:p-6">
                <div className="space-y-2">
                  <p className="text-sm text-blue-900 font-semibold">📊 Send Summary</p>
                  <p className="text-xs sm:text-sm text-blue-800">
                    This will send personalized emails to all participants with their certificates attached. Each email will be customized with the recipient's name.
                  </p>
                  <p className="text-xs sm:text-sm text-blue-700 font-medium">
                    ✓ Signed in to Google • Ready to send
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>

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
