"use client";

import { motion } from "framer-motion";
import { BrandButton } from "@/components/ui/brand-button";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

export function CTASection() {
  return (
    <section className="py-24 text-white relative overflow-hidden">
      {/* Gradient background - simplified, no looping animation */}
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 via-indigo-500 to-purple-600"></div>
      
      {/* Subtle decorative glow - static, not animated */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.1),transparent_70%)]"></div>

      <div className="container mx-auto px-4 relative z-10">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="max-w-4xl mx-auto text-center space-y-8"
        >
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-semibold mb-4 sm:mb-6 px-4">
            Ready to kill certificate busy-work?
          </h2>
          <p className="text-lg sm:text-xl text-white/90 mb-6 sm:mb-8 max-w-2xl mx-auto px-4">
            Try it free. No credit card needed. Start with your next batch today.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 px-4">
            <Link href="/generate">
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <BrandButton
                  variant="accent"
                  size="lg"
                  className="text-base sm:text-lg px-6 sm:px-8 py-4 sm:py-6 bg-white text-indigo-600 hover:bg-gray-100 font-semibold shadow-xl w-full sm:w-auto"
                >
                  Generate Your First Batch
                  <ArrowRight className="ml-2 h-4 w-4 sm:h-5 sm:w-5" />
                </BrandButton>
              </motion.div>
            </Link>
          </div>

          <p className="text-sm text-white/70 px-4">
            ✓ Free forever • ✓ No signup • ✓ Takes 3 minutes
          </p>
        </motion.div>
      </div>
    </section>
  );
}

