"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PageLayout } from "@/components/layout/page-layout";
import { BrandButton } from "@/components/ui/brand-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SectionTitle } from "@/components/ui/section-title";
import {
  Filter,
  FileText,
  Award,
  GraduationCap,
  Briefcase,
  Heart,
  Sparkles,
  Eye,
  Download,
} from "lucide-react";

// Template categories
interface TemplateCategory {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

// Certificate template interface (ready for Canva API integration)
interface CertificateTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  style: string; // modern, classic, elegant, minimal, colorful
  color: string; // blue, green, red, purple, gold
  previewUrl?: string;
  canvaTemplateId?: string; // For future Canva API integration
  downloadUrl?: string;
  thumbnailUrl?: string;
}

const categories: TemplateCategory[] = [
  { id: "all", label: "All Templates", icon: FileText },
  { id: "achievement", label: "Achievement", icon: Award },
  { id: "education", label: "Education", icon: GraduationCap },
  { id: "professional", label: "Professional", icon: Briefcase },
  { id: "appreciation", label: "Appreciation", icon: Heart },
];

const sampleTemplates: CertificateTemplate[] = [
  {
    id: "1",
    name: "Classic Achievement",
    description: "Elegant design for academic and professional achievements",
    category: "achievement",
    style: "classic",
    color: "blue",
    canvaTemplateId: "temp_001",
  },
  {
    id: "2",
    name: "Modern Education",
    description: "Contemporary design perfect for course completions",
    category: "education",
    style: "modern",
    color: "green",
    canvaTemplateId: "temp_002",
  },
  {
    id: "3",
    name: "Professional Excellence",
    description: "Professional certificate for workplace achievements",
    category: "professional",
    style: "elegant",
    color: "purple",
    canvaTemplateId: "temp_003",
  },
  {
    id: "4",
    name: "Minimal Achievement",
    description: "Clean and minimal design for simple recognitions",
    category: "achievement",
    style: "minimal",
    color: "blue",
    canvaTemplateId: "temp_004",
  },
  {
    id: "5",
    name: "Certificate of Completion",
    description: "Standard completion certificate design",
    category: "education",
    style: "modern",
    color: "green",
    canvaTemplateId: "temp_005",
  },
  {
    id: "6",
    name: "Employee of the Month",
    description: "Recognition certificate for outstanding performance",
    category: "professional",
    style: "elegant",
    color: "gold",
    canvaTemplateId: "temp_006",
  },
  {
    id: "7",
    name: "Volunteer Appreciation",
    description: "Heartfelt appreciation certificate design",
    category: "appreciation",
    style: "modern",
    color: "red",
    canvaTemplateId: "temp_007",
  },
  {
    id: "8",
    name: "Training Completion",
    description: "Certificate for professional training programs",
    category: "professional",
    style: "minimal",
    color: "blue",
    canvaTemplateId: "temp_008",
  },
];

const styles = ["all", "modern", "classic", "elegant", "minimal", "colorful"];
const colors = ["all", "blue", "green", "red", "purple", "gold"];

export default function TemplatesPage() {
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedStyle, setSelectedStyle] = useState("all");
  const [selectedColor, setSelectedColor] = useState("all");
  const [hoveredTemplate, setHoveredTemplate] = useState<string | null>(null);

  // Filter templates
  const filteredTemplates = useMemo(() => {
    return sampleTemplates.filter((template) => {
      const categoryMatch = selectedCategory === "all" || template.category === selectedCategory;
      const styleMatch = selectedStyle === "all" || template.style === selectedStyle;
      const colorMatch = selectedColor === "all" || template.color === selectedColor;
      return categoryMatch && styleMatch && colorMatch;
    });
  }, [selectedCategory, selectedStyle, selectedColor]);

  const handleUseTemplate = (template: CertificateTemplate) => {
    // Future: Redirect to Canva editor or upload with pre-filled template
    console.log("Using template:", template.canvaTemplateId);
    // router.push(`/upload?template=${template.canvaTemplateId}`);
  };

  return (
    <PageLayout>
      <div className="min-h-screen py-8 sm:py-12 md:py-16 lg:py-20 px-4 sm:px-6 bg-gradient-to-br from-white via-indigo-50/30 to-white">
        <div className="container max-w-7xl mx-auto">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center mb-8 sm:mb-10 md:mb-12"
          >
            <SectionTitle
              subtitle="Browse"
              title="Certificate Templates"
              description="Choose from our collection of professional certificate templates. All templates are ready to customize and integrate with Canva."
              align="center"
            />
          </motion.div>

          {/* Filters */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="mb-8 sm:mb-10 md:mb-12"
          >
            <Card className="border-2 border-gray-200">
              <CardHeader>
                <div className="flex items-center space-x-2 mb-4">
                  <Filter className="h-5 w-5 text-indigo-600" />
                  <CardTitle className="text-base sm:text-lg text-gray-900">Filter Templates</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 sm:space-y-6">
                  {/* Category Filter */}
                  <div>
                    <label className="block text-xs sm:text-sm font-semibold text-gray-900 mb-2 sm:mb-3">
                      Category
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {categories.map((cat) => {
                        const Icon = cat.icon;
                        return (
                          <button
                            key={cat.id}
                            onClick={() => setSelectedCategory(cat.id)}
                            className={`flex items-center space-x-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg text-xs sm:text-sm font-medium transition-all min-h-[44px] ${
                              selectedCategory === cat.id
                                ? "bg-indigo-600 text-white shadow-brand"
                                : "bg-white text-gray-700 hover:bg-gray-50 border border-gray-300"
                            }`}
                            aria-label={`Filter by ${cat.label}`}
                          >
                            <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
                            <span>{cat.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Style Filter */}
                  <div>
                    <label className="block text-xs sm:text-sm font-semibold text-gray-900 mb-2 sm:mb-3">
                      Style
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {styles.map((style) => (
                        <button
                          key={style}
                          onClick={() => setSelectedStyle(style)}
                          className={`px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg text-xs sm:text-sm font-medium transition-all min-h-[44px] ${
                            selectedStyle === style
                              ? "bg-indigo-600 text-white shadow-brand"
                              : "bg-white text-gray-700 hover:bg-gray-50 border border-gray-300"
                          }`}
                          aria-label={`Filter by ${style} style`}
                        >
                          {style.charAt(0).toUpperCase() + style.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Color Filter */}
                  <div>
                    <label className="block text-xs sm:text-sm font-semibold text-gray-900 mb-2 sm:mb-3">
                      Color
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {colors.map((color) => (
                        <button
                          key={color}
                          onClick={() => setSelectedColor(color)}
                          className={`px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg text-xs sm:text-sm font-medium transition-all min-h-[44px] ${
                            selectedColor === color
                              ? "bg-indigo-600 text-white shadow-brand"
                              : "bg-white text-gray-700 hover:bg-gray-50 border border-gray-300"
                          }`}
                          aria-label={`Filter by ${color} color`}
                        >
                          {color.charAt(0).toUpperCase() + color.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Templates Grid */}
          <AnimatePresence mode="wait">
            <motion.div
              key={`${selectedCategory}-${selectedStyle}-${selectedColor}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="mb-6"
            >
              <div className="flex items-center justify-between mb-4">
                <p className="text-xs sm:text-sm text-gray-600">
                  {filteredTemplates.length} template{filteredTemplates.length !== 1 ? "s" : ""} found
                </p>
              </div>
            </motion.div>

            <motion.div
              key={`grid-${selectedCategory}-${selectedStyle}-${selectedColor}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6"
            >
              {filteredTemplates.map((template, index) => (
                <motion.div
                  key={template.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.1, duration: 0.3 }}
                  onMouseEnter={() => setHoveredTemplate(template.id)}
                  onMouseLeave={() => setHoveredTemplate(null)}
                  className="relative group"
                >
                  <Card className="h-full hover:shadow-brand-lg transition-all duration-300 cursor-pointer overflow-hidden border-gray-200">
                    {/* Template Preview */}
                    <div className="relative aspect-[8.5/11] bg-gradient-to-br from-indigo-50 via-white to-indigo-50/50 border-b-2 border-indigo-100 flex items-center justify-center p-6 sm:p-8 overflow-hidden">
                      <AnimatePresence>
                        {hoveredTemplate === template.id ? (
                          <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-gradient-to-br from-indigo-100/50 to-transparent"
                          />
                        ) : null}
                      </AnimatePresence>
                      
                      <div className="relative z-10 text-center">
                        <div className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl mb-2 sm:mb-3 md:mb-4">🎓</div>
                        <div className="text-base sm:text-lg md:text-xl font-bold text-gray-900 mb-2">
                          {template.name}
                        </div>
                        <div className="text-xs sm:text-sm text-gray-600">
                          Sample Certificate
                        </div>
                      </div>

                      {/* Hover Overlay */}
                      <AnimatePresence>
                        {hoveredTemplate === template.id && (
                          <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 20 }}
                            className="absolute inset-0 bg-black/60 flex items-center justify-center z-20"
                          >
                            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 px-4">
                              <BrandButton
                                variant="gradient"
                                size="default"
                                onClick={() => handleUseTemplate(template)}
                                className="min-h-[44px]"
                              >
                                Use Template
                              </BrandButton>
                              <BrandButton
                                variant="outline"
                                size="default"
                                className="text-white border-white hover:bg-white hover:text-indigo-600 min-h-[44px]"
                              >
                                <Eye className="h-4 w-4 sm:h-5 sm:w-5" />
                              </BrandButton>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    <CardHeader className="p-4 sm:p-6">
                      <CardTitle className="text-base sm:text-lg text-gray-900">{template.name}</CardTitle>
                      <p className="text-xs sm:text-sm text-gray-600 mt-1">{template.description}</p>
                    </CardHeader>

                    <CardContent className="p-4 sm:p-6 pt-0">
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0">
                        <div className="flex flex-wrap items-center gap-2 text-xs">
                          <span className="px-2 py-1 rounded bg-indigo-100 text-indigo-700 capitalize">
                            {template.category}
                          </span>
                          <span className="px-2 py-1 rounded bg-gray-100 text-gray-600 capitalize">
                            {template.style}
                          </span>
                        </div>
                        <div className="flex items-center space-x-1 text-xs text-gray-500">
                          <FileText className="h-3 w-3 sm:h-4 sm:w-4" />
                          <span>Canva Ready</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </motion.div>
          </AnimatePresence>

          {/* Empty State */}
          {filteredTemplates.length === 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
              className="text-center py-12"
            >
              <FileText className="h-12 w-12 sm:h-16 sm:w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2">
                No templates found
              </h3>
              <p className="text-sm sm:text-base text-gray-600 mb-6">
                Try adjusting your filters to find what you're looking for.
              </p>
              <BrandButton
                variant="outline"
                onClick={() => {
                  setSelectedCategory("all");
                  setSelectedStyle("all");
                  setSelectedColor("all");
                }}
                className="min-h-[44px]"
              >
                Clear Filters
              </BrandButton>
            </motion.div>
          )}

          {/* CTA Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="mt-16 text-center"
          >
              <Card className="gradient-primary text-white border-none">
              <CardContent className="p-6 sm:p-8 md:p-10">
                <Sparkles className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-4 text-white" />
                <h2 className="text-xl sm:text-2xl md:text-3xl font-bold mb-2 sm:mb-3">
                  Don't see what you're looking for?
                </h2>
                <p className="text-indigo-100 mb-6 sm:mb-8 max-w-2xl mx-auto text-sm sm:text-base">
                  Upload your own template or integrate with Canva to create custom certificates
                </p>
                <div className="flex flex-col sm:flex-row flex-wrap justify-center gap-3 sm:gap-4">
                  <BrandButton
                    variant="accent"
                    size="lg"
                    className="text-gray-900 font-semibold min-h-[44px] w-full sm:w-auto"
                  >
                    Upload Custom Template
                  </BrandButton>
                  <BrandButton
                    variant="outline"
                    size="lg"
                    className="border-white text-white hover:bg-white hover:text-indigo-600 min-h-[44px] w-full sm:w-auto"
                  >
                    Browse Canva Templates
                  </BrandButton>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </PageLayout>
  );
}

