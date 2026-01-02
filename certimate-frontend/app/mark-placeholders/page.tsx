"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { BrandButton } from "@/components/ui/brand-button";
import { ArrowLeft, Save, Trash2, Info } from "lucide-react";
import { api } from "@/lib/api";

interface PlaceholderBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface Placeholders {
  [key: string]: PlaceholderBox;
}

export default function PlaceholderMarkingPage() {
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [templateImage, setTemplateImage] = useState<HTMLImageElement | null>(null);
  const [placeholders, setPlaceholders] = useState<Placeholders>({});
  const [activeField, setActiveField] = useState<string | null>("NAME");
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [currentBox, setCurrentBox] = useState<PlaceholderBox | null>(null);
  const [scale, setScale] = useState(1);
  const [templateFilename, setTemplateFilename] = useState("");

  const fields = [
    { name: "NAME", color: "#3b82f6", label: "Name" },
    { name: "ROLE", color: "#10b981", label: "Role/Event" },
    { name: "DATE", color: "#f59e0b", label: "Date" },
  ];

  useEffect(() => {
    loadTemplate();
  }, []);

  const loadTemplate = async () => {
    try {
      const response = await api.get("/api/upload/latest");
      const { template } = response.data;

      if (!template) {
        toast.error("No template found. Please upload a template first.");
        router.push("/upload");
        return;
      }

      setTemplateFilename(template.filename);

      // Load the template image
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.src = `${process.env.NEXT_PUBLIC_API_URL}/uploads/templates/${template.filename}`;
      
      img.onload = () => {
        setTemplateImage(img);
        drawCanvas(img, {});
      };

      img.onerror = () => {
        toast.error("Failed to load template image");
      };

      // Check for existing placeholders
      try {
        const placeholdersResponse = await api.get("/api/placeholders/get");
        if (placeholdersResponse.data.has_placeholders) {
          const saved = placeholdersResponse.data.placeholders;
          const converted: Placeholders = {};
          
          Object.keys(saved).forEach((key) => {
            const p = saved[key];
            converted[key] = {
              x: p.left || p.bbox?.left || 0,
              y: p.top || p.bbox?.top || 0,
              width: p.width || p.bbox?.width || 100,
              height: p.height || p.bbox?.height || 30,
            };
          });
          
          setPlaceholders(converted);
          toast.success("Loaded existing placeholder positions");
        }
      } catch (error) {
        console.log("No existing placeholders found");
      }
    } catch (error: any) {
      console.error("Error loading template:", error);
      toast.error("Failed to load template");
    }
  };

  const drawCanvas = (img: HTMLImageElement, boxes: Placeholders) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Calculate scale to fit canvas
    const maxWidth = 800;
    const maxHeight = 600;
    const scaleX = maxWidth / img.width;
    const scaleY = maxHeight / img.height;
    const newScale = Math.min(scaleX, scaleY, 1);
    setScale(newScale);

    canvas.width = img.width * newScale;
    canvas.height = img.height * newScale;

    // Draw template
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    // Draw existing boxes
    Object.entries(boxes).forEach(([name, box]) => {
      const field = fields.find((f) => f.name === name);
      if (!field) return;

      ctx.strokeStyle = field.color;
      ctx.lineWidth = 3;
      ctx.strokeRect(
        box.x * newScale,
        box.y * newScale,
        box.width * newScale,
        box.height * newScale
      );

      // Draw label
      ctx.fillStyle = field.color;
      ctx.fillRect(
        box.x * newScale,
        box.y * newScale - 25,
        100,
        25
      );
      ctx.fillStyle = "white";
      ctx.font = "14px sans-serif";
      ctx.fillText(field.label, box.x * newScale + 5, box.y * newScale - 8);
    });

    // Draw current box being drawn
    if (currentBox && activeField) {
      const field = fields.find((f) => f.name === activeField);
      if (field) {
        ctx.strokeStyle = field.color;
        ctx.lineWidth = 3;
        ctx.setLineDash([5, 5]);
        ctx.strokeRect(
          currentBox.x * newScale,
          currentBox.y * newScale,
          currentBox.width * newScale,
          currentBox.height * newScale
        );
        ctx.setLineDash([]);
      }
    }
  };

  useEffect(() => {
    if (templateImage) {
      drawCanvas(templateImage, placeholders);
    }
  }, [placeholders, currentBox, templateImage, activeField]);

  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!activeField) {
      toast.error("Please select a field to mark");
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / scale;
    const y = (e.clientY - rect.top) / scale;

    setIsDrawing(true);
    setStartPos({ x, y });
    setCurrentBox({ x, y, width: 0, height: 0 });
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !activeField) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / scale;
    const y = (e.clientY - rect.top) / scale;

    const width = x - startPos.x;
    const height = y - startPos.y;

    setCurrentBox({
      x: width > 0 ? startPos.x : x,
      y: height > 0 ? startPos.y : y,
      width: Math.abs(width),
      height: Math.abs(height),
    });
  };

  const handleCanvasMouseUp = () => {
    if (!isDrawing || !currentBox || !activeField) return;

    // Minimum size check
    if (currentBox.width < 20 || currentBox.height < 10) {
      toast.error("Box too small. Please draw a larger area.");
      setIsDrawing(false);
      setCurrentBox(null);
      return;
    }

    setPlaceholders((prev) => ({
      ...prev,
      [activeField]: currentBox,
    }));

    toast.success(`${activeField} position marked!`);
    setIsDrawing(false);
    setCurrentBox(null);

    // Auto-select next field
    const currentIndex = fields.findIndex((f) => f.name === activeField);
    if (currentIndex < fields.length - 1) {
      setActiveField(fields[currentIndex + 1].name);
    } else {
      setActiveField(null);
    }
  };

  const handleSave = async () => {
    if (Object.keys(placeholders).length === 0) {
      toast.error("Please mark at least one placeholder");
      return;
    }

    try {
      const response = await api.post("/api/placeholders/save", {
        template_filename: templateFilename,
        placeholders,
      });

      toast.success("Placeholder positions saved successfully!");
      router.push("/mapping");
    } catch (error: any) {
      console.error("Error saving placeholders:", error);
      toast.error(error.response?.data?.detail || "Failed to save placeholders");
    }
  };

  const handleClear = async () => {
    try {
      await api.delete("/api/placeholders/clear");
      setPlaceholders({});
      toast.success("All placeholder positions cleared");
    } catch (error: any) {
      console.error("Error clearing placeholders:", error);
      toast.error("Failed to clear placeholders");
    }
  };

  const handleRemoveField = (fieldName: string) => {
    setPlaceholders((prev) => {
      const newPlaceholders = { ...prev };
      delete newPlaceholders[fieldName];
      return newPlaceholders;
    });
    toast.success(`${fieldName} position removed`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.push("/upload")}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Upload
          </button>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Mark Placeholder Positions
          </h1>
          <p className="text-gray-600">
            Click and drag on the template to mark where each field should appear
          </p>
        </div>

        {/* Instructions */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex gap-2">
            <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-900">
              <p className="font-semibold mb-1">How to mark placeholders:</p>
              <ol className="list-decimal list-inside space-y-1">
                <li>Select a field (NAME, ROLE, or DATE) below</li>
                <li>Click and drag on the template to draw a box where that field should appear</li>
                <li>Repeat for all fields you want to mark</li>
                <li>Click "Save Positions" when done</li>
              </ol>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Canvas */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-xl font-semibold mb-4">Template</h2>
              <div className="border-2 border-gray-300 rounded-lg overflow-hidden">
                <canvas
                  ref={canvasRef}
                  onMouseDown={handleCanvasMouseDown}
                  onMouseMove={handleCanvasMouseMove}
                  onMouseUp={handleCanvasMouseUp}
                  onMouseLeave={handleCanvasMouseUp}
                  className="cursor-crosshair w-full"
                  style={{ maxWidth: "100%", height: "auto" }}
                />
              </div>
            </div>
          </div>

          {/* Right: Controls */}
          <div className="space-y-6">
            {/* Field Selection */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-xl font-semibold mb-4">Select Field to Mark</h2>
              <div className="space-y-3">
                {fields.map((field) => (
                  <div key={field.name} className="flex items-center gap-3">
                    <button
                      onClick={() => setActiveField(field.name)}
                      className={`flex-1 px-4 py-3 rounded-lg border-2 font-medium transition-all ${
                        activeField === field.name
                          ? "border-blue-500 bg-blue-50 text-blue-700"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                      style={{
                        borderColor:
                          activeField === field.name ? field.color : undefined,
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <span>{field.label}</span>
                        {placeholders[field.name] && (
                          <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                            ✓ Marked
                          </span>
                        )}
                      </div>
                    </button>
                    {placeholders[field.name] && (
                      <button
                        onClick={() => handleRemoveField(field.name)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-xl font-semibold mb-4">Actions</h2>
              <div className="space-y-3">
                <BrandButton
                  onClick={handleSave}
                  disabled={Object.keys(placeholders).length === 0}
                  className="w-full"
                >
                  <Save className="w-4 h-4 mr-2" />
                  Save Positions
                </BrandButton>
                <button
                  onClick={handleClear}
                  className="w-full px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                >
                  <Trash2 className="w-4 h-4 inline mr-2" />
                  Clear All
                </button>
              </div>
            </div>

            {/* Stats */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-xl font-semibold mb-4">Progress</h2>
              <div className="text-center">
                <div className="text-4xl font-bold text-blue-600 mb-2">
                  {Object.keys(placeholders).length}/{fields.length}
                </div>
                <p className="text-gray-600 text-sm">Fields Marked</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
