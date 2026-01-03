"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { BrandButton } from "@/components/ui/brand-button";
import { Menu, X } from "lucide-react";
import { motion, useScroll, useMotionValueEvent } from "framer-motion";

export function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { scrollY } = useScroll();

  useMotionValueEvent(scrollY, "change", (latest) => {
    setScrolled(latest > 50);
  });

  const navLinks = [
    { name: "Features", href: "/#features" },
    { name: "How it Works", href: "/#workflow" },
    { name: "About", href: "/about" },
    { name: "Docs", href: "/docs" },
    { name: "Contact", href: "/contact" },
  ];

  return (
    <motion.nav 
      className="fixed top-0 w-full backdrop-blur-md border-b z-50 bg-background/80 border-border"
      initial={{ y: 0 }}
      animate={{ 
        backgroundColor: scrolled 
          ? "hsl(var(--background) / 0.95)" 
          : "hsl(var(--background) / 0.80)",
        boxShadow: scrolled ? "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)" : "none",
      }}
      transition={{ duration: 0.3 }}
    >
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center">
            <span className="font-extrabold text-2xl md:text-3xl">
              <span className="text-slate-900">Certi</span>
              <span className="text-blue-600">Mate</span>
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                href={link.href}
                className="text-muted-foreground hover:text-foreground font-medium transition-colors"
              >
                {link.name}
              </Link>
            ))}
            <Link href="/upload">
              <BrandButton variant="gradient" size="default">
                Try Now
              </BrandButton>
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? (
              <X className="h-6 w-6 text-foreground" />
            ) : (
              <Menu className="h-6 w-6 text-foreground" />
            )}
          </button>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <motion.div 
            className="md:hidden border-t border-border py-4 space-y-3"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
          >
            {navLinks.map((link) => (
              <Link
                key={link.name}
                href={link.href}
                className="block text-muted-foreground hover:text-foreground font-medium transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                {link.name}
              </Link>
            ))}
            <div className="pt-2">
              <Link href="/upload" className="block w-full">
                <BrandButton variant="gradient" size="default" className="w-full">
                  Try Now
                </BrandButton>
              </Link>
            </div>
          </motion.div>
        )}
      </div>
    </motion.nav>
  );
}

