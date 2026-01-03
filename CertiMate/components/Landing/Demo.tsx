"use client";

import { motion } from "framer-motion";
import { CheckCircle, Mail } from "lucide-react";
import { BrandButton } from "@/components/ui/brand-button";
import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";

export function Demo() {
  return (
    <section className="py-32 bg-gray-50">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 mb-3 sm:mb-4 px-4">
            See how CertiMate brings your design to life
          </h2>
          <p className="text-lg sm:text-xl text-gray-600 max-w-3xl mx-auto px-4">
            Watch your plain template turn into ready-to-send personalized certificates — in seconds.
          </p>
        </motion.div>

          <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
            {/* Step 1: Template */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1, duration: 0.6, ease: "easeOut" }}
              whileHover={{ scale: 1.02, transition: { duration: 0.3 } }}
            >
              <Card className="h-full border border-gray-200 bg-white">
                <CardContent className="p-8 text-center">
                  <div className="text-4xl mb-4">📄</div>
                  <h3 className="font-bold text-lg text-gray-900 mb-2">1. Your Template</h3>
                  <div className="aspect-[8.5/11] bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg flex items-center justify-center border-2 border-dashed border-gray-300 mb-4">
                    <div className="text-center p-4">
                      <div className="text-2xl font-bold text-gray-400 mb-2">{"{{NAME}}"}</div>
                      <div className="text-sm text-gray-400">{"{{EVENT}}"}</div>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600">Template with placeholders</p>
                </CardContent>
              </Card>
            </motion.div>

            {/* Step 2: Filled Certificate */}
            <motion.div
              initial={{ opacity: 0, y: -30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2, duration: 0.6, ease: "easeOut" }}
              whileHover={{ scale: 1.02, transition: { duration: 0.3 } }}
            >
              <Card className="h-full border-2 border-indigo-200 bg-white">
                <CardContent className="p-8 text-center">
                  <div className="text-4xl mb-4">✨</div>
                  <h3 className="font-bold text-lg text-gray-900 mb-2">2. Filled Certificate</h3>
                  <div className="aspect-[8.5/11] bg-gradient-to-br from-white to-cream-50 rounded-lg border-4 border-indigo-200 flex items-center justify-center mb-4">
                    <div className="text-center p-4">
                      <div className="text-2xl font-bold text-indigo-600 mb-2">Akshat Thakur</div>
                      <div className="text-sm text-gray-600">Hackathon 2025</div>
                    </div>
                  </div>
                  <p className="text-sm text-indigo-700 font-semibold">Personalized & ready</p>
                </CardContent>
              </Card>
            </motion.div>

            {/* Step 3: Email Sent */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3, duration: 0.6, ease: "easeOut" }}
              whileHover={{ scale: 1.02, transition: { duration: 0.3 } }}
            >
              <Card className="h-full border-2 border-green-200 bg-white">
                <CardContent className="p-8 text-center">
                  <div className="text-4xl mb-4">📧</div>
                  <h3 className="font-bold text-lg text-gray-900 mb-2">3. Email Sent</h3>
                  <div className="aspect-[8.5/11] bg-gradient-to-br from-green-50 to-white rounded-lg border-4 border-green-200 flex flex-col items-center justify-center mb-4">
                    <Mail className="h-12 w-12 text-green-600 mb-2" />
                    <CheckCircle className="h-6 w-6 text-green-600 mb-2" />
                    <div className="text-xs text-green-700 font-medium">Delivered!</div>
                  </div>
                  <p className="text-sm text-green-700 font-semibold">Automatically sent</p>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* CTA */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.5, duration: 0.6 }}
            className="text-center mt-12"
          >
            <Link href="/upload">
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <BrandButton variant="gradient" size="lg" className="px-8 py-6 hover:shadow-indigo-500/50 transition-shadow">
                  Generate Sample Certificates
                </BrandButton>
              </motion.div>
            </Link>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

