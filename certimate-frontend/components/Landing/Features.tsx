"use client";

import { motion } from "framer-motion";
import { Wand2, Mail, Zap, Shield, Sparkles, Infinity } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const features = [
  {
    icon: Zap,
    title: "Smart Automation",
    description: "Handles repetitive tasks automatically so you can focus on what matters",
    color: "text-indigo-600"
  },
  {
    icon: Mail,
    title: "Bulk Email Sender",
    description: "Send personalized certificates to everyone in your list — instantly",
    color: "text-violet-600"
  },
  {
    icon: Wand2,
    title: "AI Name Placement",
    description: "Automatically detects where to place names in your design using advanced OCR",
    color: "text-purple-600"
  },
  {
    icon: Sparkles,
    title: "Template Flexibility",
    description: "Use any design tool you prefer — Canva, Photoshop, or even PowerPoint",
    color: "text-blue-600"
  },
  {
    icon: Shield,
    title: "Secure & Private",
    description: "Your data is encrypted and never shared with third parties",
    color: "text-pink-600"
  },
  {
    icon: Infinity,
    title: "Free Forever",
    description: "No hidden costs, no credit card required — truly free forever",
    color: "text-green-600"
  }
];

export function Features() {
  return (
    <section id="features" className="py-20 sm:py-32 bg-white">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12 sm:mb-16"
        >
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 mb-3 sm:mb-4 px-4">
            Designed to save your time and sanity
          </h2>
          <p className="text-lg sm:text-xl text-gray-600 max-w-2xl mx-auto px-4">
            CertiMate does the boring work so you can focus on what actually matters.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 max-w-7xl mx-auto">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              whileInView={{ opacity: 1, y: 0, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1, duration: 0.6, ease: "easeOut" }}
              whileHover={{ y: -5, transition: { duration: 0.3 } }}
            >
              <Card className="h-full hover:shadow-sm transition-all border border-gray-200 bg-white hover:border-gray-300">
                <CardContent className="p-6 sm:p-8">
                  <motion.div 
                    className={`mb-3 sm:mb-4 w-10 h-10 sm:w-11 sm:h-11 rounded-lg bg-gray-50 flex items-center justify-center ${feature.color} group-hover:bg-indigo-50 transition-colors`}
                  >
                    <feature.icon className="h-4 w-4 sm:h-5 sm:w-5" />
                  </motion.div>
                  <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-sm sm:text-base text-gray-600">
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

