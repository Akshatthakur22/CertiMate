import { Metadata } from "next";
import { PageLayout } from "@/components/layout/page-layout";
import { Mail, Github, Twitter } from "lucide-react";

export const metadata: Metadata = {
  title: "Contact",
  description: "Get in touch with CertiMate - email, GitHub, and Twitter support.",
};

export default function ContactPage() {
  return (
    <PageLayout>
      <div className="container mx-auto px-4 py-16 max-w-4xl">
        <div className="prose prose-slate max-w-none">
          <h1 className="text-4xl font-bold text-foreground mb-8">Get in Touch</h1>
          
          <div className="space-y-8 text-muted-foreground">
            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">We're Here to Help</h2>
              <p className="text-lg leading-relaxed">
                CertiMate is built by a solo developer who cares about making certificate generation simple and accessible. 
                Whether you have questions, feedback, or need support, I'd love to hear from you.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-6">Reach Out Directly</h2>
              
              <div className="grid gap-6 md:grid-cols-3">
                <a 
                  href="mailto:certimate.ai@gmail.com"
                  className="group p-6 bg-card border border-border rounded-lg hover:border-primary transition-all hover:shadow-lg"
                >
                  <div className="flex items-center space-x-3 mb-3">
                    <Mail className="h-6 w-6 text-primary" />
                    <h3 className="font-semibold text-foreground group-hover:text-primary">Email</h3>
                  </div>
                  <p className="text-sm">certimate.ai@gmail.com</p>
                  <p className="text-xs mt-2">Best for: Support questions, feedback, partnerships</p>
                </a>

                <a 
                  href="https://github.com/Akshatthakur22"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group p-6 bg-card border border-border rounded-lg hover:border-primary transition-all hover:shadow-lg"
                >
                  <div className="flex items-center space-x-3 mb-3">
                    <Github className="h-6 w-6 text-primary" />
                    <h3 className="font-semibold text-foreground group-hover:text-primary">GitHub</h3>
                  </div>
                  <p className="text-sm">@Akshatthakur22</p>
                  <p className="text-xs mt-2">Best for: Bug reports, feature requests, contributions</p>
                </a>

                <a 
                  href="https://x.com/akshatt66612958/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group p-6 bg-card border border-border rounded-lg hover:border-primary transition-all hover:shadow-lg"
                >
                  <div className="flex items-center space-x-3 mb-3">
                    <Twitter className="h-6 w-6 text-primary" />
                    <h3 className="font-semibold text-foreground group-hover:text-primary">Twitter</h3>
                  </div>
                  <p className="text-sm">@akshatt66612958</p>
                  <p className="text-xs mt-2">Best for: Quick questions, updates, community</p>
                </a>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">What to Expect</h2>
              <ul className="space-y-2 list-disc list-inside">
                <li><strong>Quick Response</strong> - I typically reply within 24 hours</li>
                <li><strong>Personal Support</strong> - You'll hear directly from me, the developer</li>
                <li><strong>Helpful Solutions</strong> - I'm committed to making CertiMate work for you</li>
                <li><strong>Open Feedback</strong> - Your suggestions help shape the product's future</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">Before You Reach Out</h2>
              <ul className="space-y-2 list-disc list-inside">
                <li>Check the <a href="/docs" className="text-primary hover:underline">documentation</a> for common questions</li>
                <li>Review the <a href="/privacy" className="text-primary hover:underline">privacy policy</a> for data handling questions</li>
                <li>Look at existing <a href="https://github.com/Akshatthakur22" className="text-primary hover:underline">GitHub issues</a> for known problems</li>
                <li>Email us directly at <a href="mailto:certimate.ai@gmail.com" className="text-primary hover:underline">certimate.ai@gmail.com</a></li>
              </ul>
            </section>

            <section className="p-6 bg-muted/50 rounded-lg border border-border">
              <h3 className="font-semibold text-foreground mb-3">Building in Public ❤️</h3>
              <p className="text-sm leading-relaxed">
                CertiMate is an indie project built with passion for making certificate generation accessible to everyone. 
                Your feedback and support help make it better every day.
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
