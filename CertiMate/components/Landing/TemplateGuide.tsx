"use client";

import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Download } from "lucide-react";
import { BrandButton } from "@/components/ui/brand-button";
import Link from "next/link";

export function TemplateGuide() {
  return (
    <section className="py-32 bg-white">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="max-w-6xl mx-auto"
        >
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Your template, your style — we just make it smarter
            </h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            {/* Instructions */}
            <Card className="border-2 border-indigo-100 bg-gradient-to-br from-indigo-50 to-white">
              <CardContent className="p-8">
                <div className="space-y-6 text-gray-700">
                  <div className="flex gap-4">
                    <span className="text-indigo-600 font-bold text-xl">1.</span>
                    <p>Design your certificate in Canva/Photoshop</p>
                  </div>
                  <div className="flex gap-4">
                    <span className="text-indigo-600 font-bold text-xl">2.</span>
                    <p>Add placeholders like <code className="bg-indigo-100 px-2 py-1 rounded font-mono text-indigo-700">{"{{name}}"}</code>, <code className="bg-indigo-100 px-2 py-1 rounded font-mono text-indigo-700">{"{{event}}"}</code>, <code className="bg-indigo-100 px-2 py-1 rounded font-mono text-indigo-700">{"{{date}}"}</code></p>
                  </div>
                  <div className="flex gap-4">
                    <span className="text-indigo-600 font-bold text-xl">3.</span>
                    <p>Upload and automate</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Example */}
            <Card className="border-2 border-violet-100">
              <CardContent className="p-8">
                <h3 className="text-2xl font-bold text-gray-900 mb-6">
                  Example Template
                </h3>
                <div className="aspect-[8.5/11] bg-gradient-to-br from-cream-50 to-white border-4 border-dashed border-gray-300 rounded-lg p-8 flex flex-col justify-center items-center text-center space-y-4">
                  <div className="text-5xl font-bold text-gray-800">CERTIFICATE</div>
                  <div className="text-gray-600">This certifies that</div>
                  <div className="text-3xl font-bold text-indigo-600 bg-indigo-50 px-4 py-2 rounded">
                    {"{{NAME}}"}
                  </div>
                  <div className="text-gray-600">has completed</div>
                  <div className="text-xl font-semibold text-gray-800">
                    {"{{EVENT}}"}
                  </div>
                  <div className="text-sm text-gray-500 mt-4">Date: {"{{DATE}}"}</div>
                </div>
                <p className="text-sm text-gray-600 mt-4 text-center">
                  <code className="text-indigo-600">{"{{NAME}}"}</code>, <code className="text-indigo-600">{"{{EVENT}}"}</code>, <code className="text-indigo-600">{"{{DATE}}"}</code> are placeholders
                </p>
              </CardContent>
            </Card>
          </div>

          {/* CTA */}
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center"
          >
            <Link href="/upload">
              <BrandButton variant="gradient" size="lg" className="px-8 py-6">
                <Download className="h-5 w-5 mr-2" />
                Download Sample Template
              </BrandButton>
            </Link>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}

