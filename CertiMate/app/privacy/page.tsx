import { Metadata } from "next";
import { PageLayout } from "@/components/layout/page-layout";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "CertiMate's simple, transparent privacy policy - no data selling, secure file processing.",
};

export default function PrivacyPage() {
  return (
    <PageLayout>
      <div className="container mx-auto px-4 py-16 max-w-4xl">
        <div className="prose prose-slate max-w-none">
          <h1 className="text-4xl font-bold text-foreground mb-8">Privacy Policy</h1>
          
          <div className="space-y-8 text-muted-foreground">
            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">Your Data, Your Rules</h2>
              <p className="text-lg leading-relaxed">
                CertiMate is built with privacy in mind. We believe in simple, transparent practices that respect your data.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">What We Collect</h2>
              <ul className="space-y-2 list-disc list-inside">
                <li>Certificate files you upload for processing</li>
                <li>Basic usage information to improve the service</li>
                <li>Essential technical data for security and performance</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">What We Don't Do</h2>
              <ul className="space-y-2 list-disc list-inside">
                <li><strong>We never sell your data</strong> - to anyone, ever</li>
                <li><strong>We don't use tracking cookies</strong> or invasive analytics</li>
                <li><strong>We don't store your files permanently</strong> - they're processed and deleted</li>
                <li><strong>We don't share your information</strong> with third parties</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">How We Handle Your Files</h2>
              <ul className="space-y-2 list-disc list-inside">
                <li>Files are processed securely on our servers</li>
                <li>Temporary storage is used only during processing</li>
                <li>All files are automatically deleted after completion</li>
                <li>We use industry-standard encryption for data protection</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">Your Rights</h2>
              <ul className="space-y-2 list-disc list-inside">
                <li>You can request deletion of any data at any time</li>
                <li>You have the right to know what data we process</li>
                <li>You control what information you share with us</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">Contact About Privacy</h2>
              <p className="leading-relaxed">
                If you have questions about this privacy policy or how we handle your data, 
                reach out to us at <a href="mailto:certimate.ai@gmail.com" className="text-primary hover:underline">certimate.ai@gmail.com</a>
              </p>
            </section>
          </div>

          <div className="mt-12 p-6 bg-muted/50 rounded-lg border border-border">
            <p className="text-sm text-muted-foreground text-center">
              CertiMate is an independently built product. Policies and features may evolve as the platform grows.
            </p>
          </div>
        </div>
      </div>
    </PageLayout>
  );
}
