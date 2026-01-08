"use client";

import { motion } from "framer-motion";
import { Star, Quote } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const testimonials = [
  {
    name: "Priya Sharma",
    role: "Event Manager",
    company: "Tech Hackathons India",
    image: "👩‍💼",
    text: "Used to take 3 days to send certificates to 500 participants. Now it's done in 10 minutes.",
    metric: "3 days → 10 min",
    rating: 5
  },
  {
    name: "Rohit",
    role: "Bootcamp Director",
    company: "Coding Academy",
    image: "👨‍💻",
    text: "Saved us 40+ hours of manual certificate work per batch. Absolutely brilliant.",
    metric: "40+ hours saved",
    rating: 5
  },
  {
    name: "Anjali",
    role: "University Administrator",
    company: "Delhi University",
    image: "👩‍🏫",
    text: "No more copy-pasting names. 200 certificates in 3 minutes. My team loves this.",
    metric: "200 in 3 min",
    rating: 5
  }
];

export function Testimonials() {
  return (
    <section className="py-32 bg-white">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 mb-8 sm:mb-12 px-4">
            Used by teachers, organizers, and creatives.
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 max-w-7xl mx-auto">
          {testimonials.map((testimonial, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              whileInView={{ opacity: 1, y: 0, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.15, duration: 0.6, ease: "easeOut" }}
              whileHover={{ y: -5, transition: { duration: 0.3 } }}
            >
              <Card className="h-full hover:shadow-md transition-all border border-gray-200 bg-white hover:border-gray-300">
                <CardContent className="p-8">
                  {/* Quote Icon */}
                  <div className="mb-6">
                    <Quote className="h-7 w-7 text-gray-300" />
                  </div>

                  {/* Metric Badge */}
                  <div className="mb-4 inline-flex items-center justify-center px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 font-semibold text-sm">
                    {testimonial.metric}
                  </div>

                  {/* Rating */}
                  <div className="flex gap-1 mb-4">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, scale: 0 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true }}
                        transition={{ delay: index * 0.15 + i * 0.1, duration: 0.3 }}
                      >
                        <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                      </motion.div>
                    ))}
                  </div>

                  {/* Testimonial Text */}
                  <p className="text-gray-700 mb-6 leading-relaxed">
                    "{testimonial.text}"
                  </p>

                  {/* Author */}
                  <div className="flex items-center space-x-4">
                    <div className="text-4xl">{testimonial.image}</div>
                    <div>
                      <p className="font-bold text-gray-900">{testimonial.name}</p>
                      <p className="text-sm text-gray-600">{testimonial.role}</p>
                      <p className="text-xs text-gray-500">{testimonial.company}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

