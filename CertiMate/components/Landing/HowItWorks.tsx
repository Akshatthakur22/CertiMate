"use client";

import { motion } from "framer-motion";
import { Upload, FileSpreadsheet, Download, Mail, Check } from "lucide-react";
import Link from "next/link";
import { BrandButton } from "@/components/ui/brand-button";
import { Card, CardContent } from "@/components/ui/card";

const steps = [
  {
    icon: Upload,
    title: "Upload Your Template",
    description: "Design in Canva, Photoshop, or PowerPoint. Add placeholders like {{name}}, {{date}}, {{event}}.",
    time: "2 minutes",
    color: "from-blue-500 to-indigo-500"
  },
  {
    icon: FileSpreadsheet,
    title: "Upload Your Recipient List",
    description: "CSV or Excel file with names, emails, and any other details you need.",
    time: "1 minute",
    color: "from-indigo-500 to-violet-500"
  },
  {
    icon: Download,
    title: "Generate Certificates",
    description: "CertiMate fills in all the details. Preview before you send.",
    time: "30 seconds",
    color: "from-violet-500 to-purple-500"
  },
  {
    icon: Mail,
    title: "Send or Download",
    description: "Email all certificates at once, or download as ZIP. Done.",
    time: "1 click",
    color: "from-purple-500 to-pink-500"
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
            4 steps. 4 minutes. Done.
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            The simplest workflow from template to inbox.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8 max-w-7xl mx-auto">
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
                  <div className="mb-4">
                    <div className="inline-flex items-center gap-2">
                      <span className="inline-flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-indigo-100 text-indigo-600 font-bold text-xs sm:text-sm">
                        {index + 1}
                      </span>
                      <span className="inline-flex items-center justify-center px-2 py-1 rounded-full bg-gray-100 text-gray-700 text-xs font-semibold">
                        {step.time}
                      </span>
                    </div>
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

