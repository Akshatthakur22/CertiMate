"use client";

import { motion } from "framer-motion";
import { Github, Twitter, Mail, Linkedin, Code, Heart, Instagram } from "lucide-react";
import { BrandButton } from "@/components/ui/brand-button";
import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";

export default function AboutPage() {
  const socialLinks = [
    { icon: Github, label: "GitHub", href: "https://github.com/akshatthakur22", color: "text-gray-400" },
    { icon: Instagram, label: "Instagram", href: "https://www.instagram.com/akshat_thakur_22/?hl=en", color: "text-gray-400" },
    { icon: Linkedin, label: "LinkedIn", href: "https://www.linkedin.com/in/akshatthakur22/", color: "text-gray-400" },
    { icon: Mail, label: "Email", href: "mailto:certimate.ai@gmail.com", color: "text-gray-400" },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-background/80">
        <div className="container mx-auto px-4 py-4">
          <Link href="/" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
            <div className="h-7 w-7 rounded-lg gradient-primary flex items-center justify-center">
              <span className="text-white font-bold text-sm">C</span>
            </div>
            <span className="font-semibold text-foreground">CertiMate</span>
          </Link>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-20">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-semibold text-foreground mb-4 sm:mb-6">
            Hey, I'm Akshat 👋
          </h1>
          <p className="text-lg sm:text-xl text-muted-foreground leading-relaxed max-w-2xl mx-auto">
            I build simple, free tools that automate boring work — starting with CertiMate.
          </p>
        </motion.div>

        {/* Story */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.6 }}
          className="space-y-8 mb-16"
        >
          <Card className="border border-border bg-card">
            <CardContent className="p-6 sm:p-8 md:p-10">
              <h2 className="text-xl sm:text-2xl font-semibold text-foreground mb-4 sm:mb-6">Why CertiMate?</h2>
              <div className="space-y-4 text-foreground/90 leading-relaxed text-sm sm:text-base">
                <p>
                  A few months ago, I watched my college's event organizer spend hours manually creating and emailing certificates to 200+ participants. She was frustrated — it was boring, repetitive work that ate up her entire weekend.
                </p>
                <p>
                  That's when I thought: <em>"Why isn't this automated? Why should anyone spend hours doing something a computer can do in minutes?"</em>
                </p>
                <p>
                  So I built CertiMate — a free tool that lets you upload a template, add a CSV, and generate hundreds of personalized certificates instantly. It uses AI (OCR) to automatically detect where names should go in your design, so you don't have to manually position anything.
                </p>
                <p className="pt-4 border-t border-border">
                  My goal is simple: <strong className="text-foreground">make automation accessible, elegant, and free — for everyone.</strong>
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Vision */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.6 }}
          className="mb-16"
        >
          <Card className="border-2 border-primary/30">
            <CardContent className="p-6 sm:p-8 md:p-10 text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 rounded-2xl gradient-primary mb-4 sm:mb-6">
                <Code className="h-6 w-6 sm:h-8 sm:w-8 text-white" />
              </div>
              <h2 className="text-xl sm:text-2xl font-semibold text-foreground mb-3 sm:mb-4">My Vision</h2>
              <p className="text-base sm:text-lg text-foreground/90 max-w-xl mx-auto">
                To build automation tools that are beautiful, easy-to-use, and completely free — because great tools shouldn't be locked behind paywalls or complex setups.
              </p>
            </CardContent>
          </Card>
        </motion.div>

        {/* Social */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.6 }}
          className="mb-12"
        >
          <h3 className="text-lg sm:text-xl font-semibold text-foreground mb-4 sm:mb-6 text-center">Let's Connect</h3>
          <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4">
            {socialLinks.map((link, index) => (
              <motion.a
                key={index}
                href={link.href}
                target={link.href.startsWith("http") ? "_blank" : undefined}
                rel={link.href.startsWith("http") ? "noopener noreferrer" : undefined}
                className="flex items-center gap-2 px-4 sm:px-6 py-2 sm:py-3 border border-border rounded-xl hover:border-primary hover:bg-primary/10"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                aria-label={`Connect via ${link.label}`}
              >
                <link.icon className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground hover:text-primary transition-colors" />
                <span className="text-xs sm:text-sm font-medium text-foreground">{link.label}</span>
              </motion.a>
            ))}
          </div>
        </motion.div>

        {/* Fun Line */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8, duration: 0.6 }}
          className="text-center py-6 sm:py-8 border-t border-border"
        >
          <p className="text-xs sm:text-sm text-muted-foreground">
            Currently building from my Mac — one clean commit at a time ⚡️
          </p>
        </motion.div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1, duration: 0.6 }}
          className="text-center"
        >
          <Link href="/">
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <BrandButton variant="gradient" size="lg" className="px-6 sm:px-8 py-4 sm:py-6">
                Try CertiMate →
              </BrandButton>
            </motion.div>
          </Link>
        </motion.div>

        {/* Footer Note */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2, duration: 0.6 }}
          className="text-center mt-8 sm:mt-12 text-xs sm:text-sm text-muted-foreground"
        >
          Made with <Heart className="inline h-3 w-3 text-pink-500" /> by Akshat
        </motion.div>
      </div>
    </div>
  );
}

