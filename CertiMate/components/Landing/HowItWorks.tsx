"use client";

import { motion } from "framer-motion";
import { Upload, FileSpreadsheet, Download, Check } from "lucide-react";
import Link from "next/link";
import { BrandButton } from "@/components/ui/brand-button";
import { Card, CardContent } from "@/components/ui/card";

const steps = [
  {
    icon: Upload,
    title: "Upload Template with placeholders",
    description: "Design your certificate with {{name}}, {{event}}, {{date}} placeholders",
    color: "from-blue-500 to-indigo-500"
  },
  {
    icon: FileSpreadsheet,
    title: "Add Details (CSV or Excel file)",
    description: "Upload your recipient list and let CertiMate map the data",
    color: "from-indigo-500 to-violet-500"
  },
  {
    icon: Download,
    title: "Generate & Send (via email or ZIP)",
    description: "Get all certificates instantly — download ZIP or send via email",
    color: "from-violet-500 to-purple-500"
  }
];

export function HowItWorks() {
  return (
    <section id="workflow" className="py-32 bg-gray-50">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 mb-6 sm:mb-8">
            Automate your certificates in just 3 steps
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 max-w-6xl mx-auto">
          {steps.map((step, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1, duration: 0.5 }}
            >
              <Card className="h-full hover:shadow-md transition-all border border-gray-200 bg-white hover:border-gray-300">
                <CardContent className="p-6 sm:p-8 md:p-10 text-center">
                  <div className={`mx-auto mb-4 sm:mb-6 w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-gradient-to-br ${step.color} flex items-center justify-center`}>
                    <step.icon className="h-6 w-6 sm:h-7 sm:w-7 text-white" />
                  </div>
                  <div className="mb-2">
                    <span className="inline-flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-indigo-100 text-indigo-600 font-bold text-xs sm:text-sm">
                      {index + 1}
                    </span>
                  </div>
                  <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-2 sm:mb-3">
                    {step.title}
                  </h3>
                  <p className="text-sm sm:text-base text-gray-600">
                    {step.description}
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.4, duration: 0.5 }}
          className="text-center mt-8 sm:mt-12"
        >
          <Link href="/upload">
            <BrandButton variant="gradient" size="lg" className="px-6 sm:px-8 py-4 sm:py-6 w-full sm:w-auto">
              Try It Now
            </BrandButton>
          </Link>
        </motion.div>
      </div>
    </section>
  );
}

