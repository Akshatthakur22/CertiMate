"use client";

import { motion } from "framer-motion";
import { Zap, Mail, Shield, Infinity } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const features = [
  {
    icon: Zap,
    title: "Automate Everything",
    description: "Fill hundreds of certificates in seconds. No copy-paste, no manual work.",
    color: "text-indigo-600"
  },
  {
    icon: Mail,
    title: "Send in Bulk",
    description: "Email all recipients at once with personalized attachments.",
    color: "text-violet-600"
  },
  {
    icon: Infinity,
    title: "Free Forever",
    description: "No hidden fees, no credit card, no nonsense. Always free.",
    color: "text-green-600"
  },
  {
    icon: Shield,
    title: "Your Data is Safe",
    description: "Encrypted, private, never shared. Your certificates stay yours.",
    color: "text-pink-600"
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
            Everything you need. Nothing you don't.
          </h2>
          <p className="text-lg sm:text-xl text-gray-600 max-w-2xl mx-auto px-4">
            Built for speed, simplicity, and peace of mind.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 max-w-7xl mx-auto">
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

