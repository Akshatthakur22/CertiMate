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

      // Send batch email request
      setSendProgress(50);

      const response = await sendCertificateEmail({
        access_token: googleToken,
        recipients: recipients,
        subject: subject,
        body_template: emailTemplate,
        certificates_dir: "uploads/certificates"
      });

      setSendProgress(90);

      // Handle response
      if (response.successful > 0) {
        toast.success(`Successfully sent ${response.successful} certificate(s)!`);
      }

      if (response.failed > 0) {
        toast.error(`${response.failed} certificate(s) failed to send`);
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
      <div className="min-h-screen py-12 sm:py-20 px-4 bg-gradient-to-br from-background via-primary/5">
        <div className="container max-w-5xl mx-auto">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center mb-8 sm:mb-12"
          >
            <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full bg-primary/10">
              <Mail className="h-3 w-3 sm:h-4 sm:w-4" />
              <span>Email Sending</span>
            </div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-foreground mb-3 sm:mb-4">
              Send Certificates via Email
            </h1>
            <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto px-4">
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
              <Card className="border-2 border-primary/30">
                <CardContent className="p-4 sm:p-6">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-primary/20">
                        <AlertCircle className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground text-sm sm:text-base">Sign in Required</h3>
                        <p className="text-xs sm:text-sm text-muted-foreground">Connect your Gmail account to send certificates</p>
                      </div>
                    </div>
                    <BrandButton
                      variant="gradient"
                      onClick={() => login()}
                      className="w-full sm:w-auto"
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
                    <CheckCircle className="h-5 w-5 sm:h-6 sm:w-6 text-green-600" />
                    <div>
                      <h3 className="font-semibold text-foreground text-sm sm:text-base">Signed in to Gmail</h3>
                      <p className="text-xs sm:text-sm text-muted-foreground">Ready to send certificates</p>
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
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="text-base sm:text-lg">Email Subject</CardTitle>
              </CardHeader>
              <CardContent>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-input bg-background rounded-lg focus:ring-2 focus:ring-ring focus:border-transparent transition-all"
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
            <Card className="border-border">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                  <CardTitle className="text-base sm:text-lg">Email Message Template</CardTitle>
                </div>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                  Customize your email message. Use <code className="bg-primary/10">{"{{name}}"}</code> and <code className="bg-primary/10">{"{{event}}"}</code> for personalization.
                </p>
              </CardHeader>
              <CardContent>
                <textarea
                  value={emailTemplate}
                  onChange={(e) => setEmailTemplate(e.target.value)}
                  className="w-full h-40 sm:h-48 md:h-64 p-3 sm:p-4 text-sm sm:text-base border border-input bg-background rounded-lg focus:ring-2 focus:ring-ring focus:border-transparent font-mono resize-none transition-all"
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
            <Card className="border-2 border-primary/30">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Mail className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                  <CardTitle className="text-base sm:text-lg">Email Preview</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="bg-card rounded-lg border border-border p-4 sm:p-6 shadow-sm">
                  <div className="space-y-2 mb-4">
                    <div className="text-xs sm:text-sm text-muted-foreground">To:</div>
                    <div className="font-medium text-foreground text-sm sm:text-base">akshat@example.com</div>
                  </div>
                  <div className="border-b border-border pb-4 mb-4">
                    <div className="text-sm sm:text-base md:text-lg font-semibold mb-2 text-foreground">Subject: {subject}</div>
                    <div className="text-xs sm:text-sm text-muted-foreground">From: Your Gmail</div>
                  </div>
                  <div className="text-foreground/90 whitespace-pre-wrap text-xs sm:text-sm leading-relaxed">
                    {emailTemplate.replace(/{{name}}/g, "Akshat Thakur").replace(/{{event}}/g, "Hackathon 2025")}
                  </div>
                  <div className="mt-4 border-t border-border pt-4">
                    <div className="text-xs sm:text-sm text-muted-foreground mb-2">Attachments:</div>
                    <div className="flex items-center gap-2 text-xs sm:text-sm">
                      <FileText className="h-3 w-3 sm:h-4 sm:w-4 text-primary" />
                      <span className="font-medium text-primary">certificate_ZIP.zip</span>
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
              <Card className="bg-primary/10">
                <CardContent className="p-4 sm:p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <Loader2 className="h-4 w-4 sm:h-5 sm:w-5 animate-spin text-primary" />
                    <span className="font-semibold text-foreground text-sm sm:text-base">Sending certificates...</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${sendProgress}%` }}
                      transition={{ duration: 0.3, ease: "easeOut" }}
                      className="bg-gradient-to-r from-primary to-primary/80 h-full"
                    />
                  </div>
                  <p className="text-xs sm:text-sm text-muted-foreground mt-2">{sendProgress.toFixed(0)}% complete</p>
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
              className="flex-1"
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
              className="flex-1"
              onClick={handleDownload}
              aria-label="Download ZIP file"
            >
              <Download className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
              Download ZIP Instead
            </BrandButton>
            <BrandButton
              variant="secondary"
              size="lg"
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
