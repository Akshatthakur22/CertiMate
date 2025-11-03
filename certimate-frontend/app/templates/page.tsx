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
      <div className="min-h-screen py-12 sm:py-20 px-4 bg-gradient-to-br from-background via-primary/5">
        <div className="container max-w-7xl mx-auto">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center mb-12"
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
            className="mb-12"
          >
            <Card className="border-2">
              <CardHeader>
                <div className="flex items-center space-x-2 mb-4">
                  <Filter className="h-5 w-5 text-primary" />
                  <CardTitle>Filter Templates</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* Category Filter */}
                  <div>
                    <label className="block text-xs sm:text-sm font-semibold text-foreground mb-3">
                      Category
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {categories.map((cat) => {
                        const Icon = cat.icon;
                        return (
                          <button
                            key={cat.id}
                            onClick={() => setSelectedCategory(cat.id)}
                            className={`flex items-center space-x-2 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all ${
                              selectedCategory === cat.id
                                ? "bg-primary text-primary-foreground shadow-brand"
                                : "bg-card text-foreground hover:bg-muted border border-border"
                            }`}
                            aria-label={`Filter by ${cat.label}`}
                          >
                            <Icon className="h-3 w-3 sm:h-4 sm:w-4" />
                            <span>{cat.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Style Filter */}
                  <div>
                    <label className="block text-xs sm:text-sm font-semibold text-foreground mb-3">
                      Style
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {styles.map((style) => (
                        <button
                          key={style}
                          onClick={() => setSelectedStyle(style)}
                          className={`px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all ${
                            selectedStyle === style
                              ? "bg-primary text-primary-foreground shadow-brand"
                              : "bg-card text-foreground hover:bg-muted border border-border"
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
                    <label className="block text-xs sm:text-sm font-semibold text-foreground mb-3">
                      Color
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {colors.map((color) => (
                        <button
                          key={color}
                          onClick={() => setSelectedColor(color)}
                          className={`px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all ${
                            selectedColor === color
                              ? "bg-primary text-primary-foreground shadow-brand"
                              : "bg-card text-foreground hover:bg-muted border border-border"
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
                <p className="text-xs sm:text-sm text-muted-foreground">
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
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
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
                  <Card className="h-full hover:shadow-brand-lg transition-all duration-300 cursor-pointer overflow-hidden">
                    {/* Template Preview */}
                    <div className="relative aspect-[8.5/11] bg-gradient-to-br from-primary/10 via-white to-primary/5 border-b-2 border-primary/20 flex items-center justify-center p-8 overflow-hidden">
                      <AnimatePresence>
                        {hoveredTemplate === template.id ? (
                          <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-gradient-to-br from-primary/20 to-transparent"
                          />
                        ) : null}
                      </AnimatePresence>
                      
                      <div className="relative z-10 text-center">
                        <div className="text-4xl sm:text-6xl mb-3 sm:mb-4">🎓</div>
                        <div className="text-lg sm:text-xl font-bold text-foreground mb-2">
                          {template.name}
                        </div>
                        <div className="text-xs sm:text-sm text-muted-foreground">
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
                            className="absolute inset-0 bg-black/50 flex items-center justify-center z-20"
                          >
                            <div className="flex gap-3">
                              <BrandButton
                                variant="gradient"
                                size="sm"
                                onClick={() => handleUseTemplate(template)}
                              >
                                Use Template
                              </BrandButton>
                              <BrandButton
                                variant="outline"
                                size="sm"
                                className="text-white border-white hover:bg-white hover:text-primary"
                              >
                                <Eye className="h-4 w-4" />
                              </BrandButton>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    <CardHeader>
                      <CardTitle className="text-lg">{template.name}</CardTitle>
                      <p className="text-sm text-gray-600">{template.description}</p>
                    </CardHeader>

                    <CardContent>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2 text-xs text-gray-500">
                          <span className="px-2 py-1 rounded bg-primary/10 text-primary capitalize">
                            {template.category}
                          </span>
                          <span className="px-2 py-1 rounded bg-gray-100 text-gray-600 capitalize">
                            {template.style}
                          </span>
                        </div>
                        <div className="flex items-center space-x-1 text-xs text-gray-400">
                          <FileText className="h-4 w-4" />
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
              <FileText className="h-12 w-12 sm:h-16 sm:w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-base sm:text-lg font-semibold text-foreground mb-2">
                No templates found
              </h3>
              <p className="text-sm sm:text-base text-muted-foreground mb-6">
                Try adjusting your filters to find what you're looking for.
              </p>
              <BrandButton
                variant="outline"
                onClick={() => {
                  setSelectedCategory("all");
                  setSelectedStyle("all");
                  setSelectedColor("all");
                }}
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
              <CardContent className="p-8">
                <Sparkles className="h-12 w-12 mx-auto mb-4 text-white" />
                <h2 className="text-2xl font-bold mb-2">
                  Don't see what you're looking for?
                </h2>
                <p className="text-blue-100 mb-6 max-w-2xl mx-auto">
                  Upload your own template or integrate with Canva to create custom certificates
                </p>
                <div className="flex flex-wrap justify-center gap-4">
                  <BrandButton
                    variant="accent"
                    size="lg"
                    className="text-gray-900 font-semibold"
                  >
                    Upload Custom Template
                  </BrandButton>
                  <BrandButton
                    variant="outline"
                    size="lg"
                    className="border-white text-white hover:bg-white hover:text-primary"
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

