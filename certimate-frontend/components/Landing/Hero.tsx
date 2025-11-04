"use client";

import { motion } from "framer-motion";
import { BrandButton } from "@/components/ui/brand-button";
import { Upload, Play } from "lucide-react";
import Link from "next/link";

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-white via-[#f9faff] to-[#eef1ff] py-12 sm:py-16 md:py-24">
      {/* Background glow effect */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_40%_20%,rgba(99,102,241,0.08),transparent_60%)]"></div>

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 md:flex md:items-center md:justify-between">
        {/* Left content */}
        <motion.div 
          className="max-w-2xl"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          {/* Small badge */}
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-white/80 px-3 py-1 text-xs sm:text-sm text-indigo-600 shadow-sm backdrop-blur-md">
            🪶 Trusted by 10000000000000+ educators & creators
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold leading-tight tracking-tight text-gray-900">
            Make certificate <br className="hidden sm:block" /> distribution effortless.
          </h1>

          <p className="mt-4 sm:mt-5 max-w-lg text-base sm:text-lg text-gray-500">
            Upload your design, add your list, and let <span className="font-semibold text-indigo-600">CertiMate</span> handle the rest — automatically, beautifully, and for free.
          </p>

          <div className="mt-6 sm:mt-8 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
            <Link href="/upload">
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <BrandButton 
                  variant="gradient" 
                  size="lg"
                  className="w-full sm:w-auto px-6 py-3 rounded-xl text-sm sm:text-base shadow-md hover:shadow-lg transition-shadow"
                >
                  <Upload className="mr-2 h-[18px] w-[18px]" />
                  Upload Template
                </BrandButton>
              </motion.div>
            </Link>

            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <BrandButton
                variant="outline"
                size="lg"
                className="w-full sm:w-auto border-indigo-200 hover:border-indigo-300 hover:bg-indigo-50 text-indigo-600 px-6 py-3 rounded-xl text-sm sm:text-base"
              >
                <Play className="mr-2 h-[18px] w-[18px]" />
                Try it Live
              </BrandButton>
            </motion.div>
          </div>

          <div className="mt-6 flex flex-wrap gap-4 text-xs sm:text-sm text-gray-500">
            <span className="flex items-center gap-2">✅ Free forever</span>
            <span className="flex items-center gap-2">✅ No signup needed</span>
            <span className="flex items-center gap-2">✅ Works instantly</span>
          </div>
        </motion.div>

        {/* Right certificate preview */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2, duration: 0.6 }}
          className="mt-12 sm:mt-16 md:mt-0 md:w-[45%]"
        >
          <motion.div
            animate={{ y: [0, -5, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            className="mx-auto max-w-sm sm:max-w-md rounded-2xl border border-gray-100 bg-white p-6 sm:p-8 shadow-lg"
          >
            <div className="text-center">
              <span className="mb-3 inline-block rounded-full border border-gray-200 bg-gray-50 px-2 sm:px-3 py-1 text-xs text-gray-500">
                Automated
              </span>

              <h2 className="mt-3 text-xl sm:text-2xl font-bold text-gray-900">
                Certificate of Completion
              </h2>
              <p className="mt-2 text-base sm:text-lg font-semibold text-indigo-600">
                John Doe
              </p>
              <p className="text-sm sm:text-base text-gray-600">has successfully completed</p>
              <p className="mt-1 text-base sm:text-lg font-bold text-gray-900">
                Advanced Web Development Course
              </p>
              <p className="mt-2 text-xs sm:text-sm text-gray-500">
                Issued on January 15, 2025
              </p>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
