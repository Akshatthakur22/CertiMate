"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Github, Linkedin, Twitter } from "lucide-react";

export function Footer() {
  return (
    <footer className="bg-gray-950 text-gray-400">
      {/* Built by Section */}
      <div className="border-b border-gray-800/50">
        <div className="container mx-auto px-4 py-16">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="max-w-2xl mx-auto text-center space-y-6"
          >
            <p className="text-sm font-medium text-gray-500">
              Crafted with <span className="text-pink-500">💜</span> by <span className="text-white font-semibold">Akshat Thakur</span> — building smart tools that make work effortless for creators, colleges, and solo builders.
            </p>
            <div className="flex items-center justify-center gap-6">
              <a 
                href="https://github.com/akshatthakur22" 
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors group"
              >
                <Github className="h-5 w-5 group-hover:scale-110 transition-transform" />
                <span className="text-sm">GitHub</span>
              </a>
              <a 
                href="https://www.linkedin.com/in/akshatthakur22/" 
                className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors group"
              >
                <Linkedin className="h-5 w-5 group-hover:scale-110 transition-transform" />
                <span className="text-sm">Linkedin</span>
              </a>
              <a 
                href="#" 
                className="text-sm text-gray-400 hover:text-white transition-colors"
              >
                Portfolio
              </a>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Footer Content */}
      <div className="py-20">
        <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Brand */}
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center space-x-2 mb-4">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center">
                <span className="text-white font-bold text-lg">C</span>
              </div>
              <span className="font-bold text-xl text-white">CertiMate</span>
            </div>
            <p className="text-gray-400 max-w-md">
              Generate beautiful, personalized certificates in minutes. 
              Automate your recognition workflow with AI-powered placement.
            </p>
          </div>

          {/* Product Links */}
          <div>
            <h3 className="font-semibold text-white mb-4">Product</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/upload" className="hover:text-white transition-colors">
                  Get Started
                </Link>
              </li>
              <li>
                <a href="#features" className="hover:text-white transition-colors">
                  Features
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-white transition-colors">
                  Pricing
                </a>
              </li>
              <li>
                <a href="#workflow" className="hover:text-white transition-colors">
                  How it Works
                </a>
              </li>
            </ul>
          </div>

          {/* Company Links */}
          <div>
            <h3 className="font-semibold text-white mb-4">Company</h3>
            <ul className="space-y-2">
              <li>
                <a href="#contact" className="hover:text-white transition-colors">
                  Contact
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-white transition-colors">
                  Privacy Policy
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-white transition-colors">
                  Terms of Service
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-gray-800/50 pt-12 flex flex-col md:flex-row justify-between items-center">
          <p className="text-gray-500 text-sm">
            © 2025 CertiMate | Made with ❤️ for creators and educators
          </p>
          <div className="flex items-center space-x-8 mt-6 md:mt-0 text-sm">
            <Link href="/about" className="hover:text-white transition-colors">About</Link>
            <Link href="#" className="hover:text-white transition-colors">Docs</Link>
            <Link href="#" className="hover:text-white transition-colors">Privacy</Link>
            <Link href="#" className="hover:text-white transition-colors">Contact</Link>
          </div>
        </div>
      </div>
      </div>
    </footer>
  );
}

