"use client";

import { Navbar } from "@/components/layout/navbar";
import { Hero } from "@/components/Landing/Hero";
import { HowItWorks } from "@/components/Landing/HowItWorks";
import { Demo } from "@/components/Landing/Demo";
import { Features } from "@/components/Landing/Features";
import { TemplateGuide } from "@/components/Landing/TemplateGuide";
import { Testimonials } from "@/components/Landing/Testimonials";
import { CTASection } from "@/components/Landing/CTASection";
import { Footer } from "@/components/Landing/Footer";

export default function Home() {
  return (
    <div className="min-h-screen">
      <Navbar />
      <Hero />
      <HowItWorks />
      <Demo />
      <Features />
      <TemplateGuide />
      <Testimonials />
      <CTASection />
      <Footer />
    </div>
  );
}
