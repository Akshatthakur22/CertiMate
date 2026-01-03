import { Metadata } from "next";
import { PageLayout } from "@/components/layout/page-layout";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "CertiMate's straightforward terms - free service, user responsibility, and transparent usage.",
};

export default function TermsPage() {
  return (
    <PageLayout>
      <div className="container mx-auto px-4 py-16 max-w-4xl">
        <div className="prose prose-slate max-w-none">
          <h1 className="text-4xl font-bold text-foreground mb-8">Terms of Service</h1>
          
          <div className="space-y-8 text-muted-foreground">
            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">Simple Terms for Simple Service</h2>
              <p className="text-lg leading-relaxed">
                CertiMate is provided as a free tool to help you generate certificates. 
                These terms are designed to be clear and fair.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">Service Agreement</h2>
              <ul className="space-y-2 list-disc list-inside">
                <li><strong>Free to Use</strong> - CertiMate is completely free with no hidden charges</li>
                <li><strong>No Guarantees</strong> - Service is provided "as-is" without warranties</li>
                <li><strong>User Responsibility</strong> - You're responsible for content you upload</li>
                <li><strong>Fair Use</strong> - Use the service reasonably and don't abuse it</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">What You Can Do</h2>
              <ul className="space-y-2 list-disc list-inside">
                <li>Generate certificates for personal and commercial use</li>
                <li>Use the service for educational purposes</li>
                <li>Share certificates you create with others</li>
                <li>Provide feedback to help improve the service</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">What You Can't Do</h2>
              <ul className="space-y-2 list-disc list-inside">
                <li>Use the service for illegal or harmful purposes</li>
                <li>Upload malicious or inappropriate content</li>
                <li>Attempt to break or compromise the service</li>
                <li>Spam or abuse the service resources</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">Your Content</h2>
              <ul className="space-y-2 list-disc list-inside">
                <li><strong>You Own Your Data</strong> - Your uploaded files remain your property</li>
                <li><strong>You're Responsible</strong> - Ensure you have rights to use uploaded content</li>
                <li><strong>We Process Securely</strong> - Files are handled securely and deleted after processing</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">Service Changes</h2>
              <ul className="space-y-2 list-disc list-inside">
                <li><strong>Features May Evolve</strong> - We may add, remove, or modify features</li>
                <li><strong>Availability</strong> - Service may be temporarily unavailable for maintenance</li>
                <li><strong>No Notice Required</strong> - We may change or discontinue the service</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">Limitation of Liability</h2>
              <p className="leading-relaxed">
                CertiMate is provided as-is. We're not liable for any damages arising from your use of the service. 
                Use at your own risk and discretion.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">Questions?</h2>
              <p className="leading-relaxed">
                If anything here is unclear, contact us at <a href="mailto:certimate.ai@gmail.com" className="text-primary hover:underline">certimate.ai@gmail.com</a>
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
