'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { Plus, Minus, Check, X } from 'lucide-react';

import { BrandButton } from '@/components/ui/brand-button';
import type { TextBox, CertificateTemplate } from '@/types/template';

/* ---------------- COMMON FIELDS ---------------- */

  const commonFields = [
    { label: 'Name', key: 'NAME', icon: '👤' },
    { label: 'Date', key: 'DATE', icon: '📅' },
    { label: 'Event Name', key: 'EVENT', icon: '🎯' },
  ];export default function TemplateEditorPage() {
  const router = useRouter();
  const imageRef = useRef<HTMLImageElement>(null);

  const [templateImage, setTemplateImage] = useState<string | null>(null);
  const [textBoxes, setTextBoxes] = useState<TextBox[]>([]);
  const [showFieldSelector, setShowFieldSelector] = useState(false);
  const [clickPosition, setClickPosition] = useState({ x: 0, y: 0 });
  const [customFieldName, setCustomFieldName] = useState('');
  const [draggingBox, setDraggingBox] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [selectedField, setSelectedField] = useState<string | null>(null);
  const [zoomLevel, setZoomLevel] = useState(100);
  const [csvData, setCsvData] = useState<Record<string, string>>({});

  /* ---------------- LOAD TEMPLATE ---------------- */

  useEffect(() => {
    const templatePath = sessionStorage.getItem('templatePath');
    if (!templatePath) {
      toast.error('No template uploaded');
      router.push('/upload');
      return;
    }
    setTemplateImage(`/api/serve-file?path=${encodeURIComponent(templatePath)}`);
  }, [router]);

  // Load CSV data for preview
  useEffect(() => {
    const savedData = sessionStorage.getItem('certificateData');
    if (savedData) {
      try {
        setCsvData(JSON.parse(savedData));
      } catch (error) {
        console.error('Failed to parse CSV data:', error);
      }
    }
  }, []);

  /* ---------------- IMAGE CLICK ---------------- */

  const handleImageClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('.field-box')) return;
    if (!imageRef.current) return;

    const rect = imageRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Convert to actual image coordinates (accounting for zoom)
    const actualX = (x / rect.width) * imageRef.current.naturalWidth;
    const actualY = (y / rect.height) * imageRef.current.naturalHeight;

    setClickPosition({ x: actualX, y: actualY });
    setShowFieldSelector(true);
  };

  /* ---------------- DRAG START ---------------- */

  const handleBoxMouseDown = (e: React.MouseEvent, boxId: string) => {
    e.stopPropagation();
    setDraggingBox(boxId);
    setSelectedField(boxId);

    if (!imageRef.current) return;
    const rect = imageRef.current.getBoundingClientRect();
    const box = textBoxes.find(b => b.id === boxId);
    if (!box) return;

    // Convert box position to display coordinates for drag offset
    const displayX = (box.x / imageRef.current.naturalWidth) * imageRef.current.width;
    const displayY = (box.y / imageRef.current.naturalHeight) * imageRef.current.height;

    setDragOffset({
      x: e.clientX - rect.left - displayX,
      y: e.clientY - rect.top - displayY,
    });
  };

  /* ---------------- DRAG MOVE ---------------- */

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!draggingBox || !imageRef.current) return;

    const rect = imageRef.current.getBoundingClientRect();
    const scaleX = imageRef.current.naturalWidth / imageRef.current.width;
    const scaleY = imageRef.current.naturalHeight / imageRef.current.height;

    const displayX = e.clientX - rect.left - dragOffset.x;
    const displayY = e.clientY - rect.top - dragOffset.y;

    // Convert display coordinates back to actual image coordinates
    const actualX = displayX * scaleX;
    const actualY = displayY * scaleY;

    requestAnimationFrame(() => {
      setTextBoxes(prev => 
        prev.map(box => 
          box.id === draggingBox 
            ? { ...box, x: Math.max(0, actualX), y: Math.max(0, actualY) }
            : box
        )
      );
    });
  };

  const handleMouseUp = () => setDraggingBox(null);

  /* ---------------- ADD FIELD ---------------- */

  const addField = (key: string) => {
    if (textBoxes.some(b => b.key === key)) {
      toast.error('Field already added');
      return;
    }

    const newBox: TextBox = {
      id: `box_${Date.now()}`,
      key,
      x: clickPosition.x,
      y: clickPosition.y, // Exact click position - no offset
      width: 200, // Wider to prevent text wrapping
      height: 30, // Auto-height to fit text content
      fontSize: 24,
      fontFamily: 'Arial',
      fontWeight: 'bold',
      fontColor: '#000000',
      textAlign: 'center',
    };

    setTextBoxes(prev => [...prev, newBox]);
    setSelectedField(newBox.id);
    setShowFieldSelector(false);
  };

  /* ---------------- SAVE TEMPLATE ---------------- */

  const saveTemplate = async () => {
    if (!textBoxes.length) {
      toast.error('Please add at least one field');
      return;
    }

    let imageBase64 = '';
    if (imageRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = imageRef.current.naturalWidth;
      canvas.height = imageRef.current.naturalHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(imageRef.current, 0, 0);
        imageBase64 = canvas.toDataURL('image/png');
      }
    }

    const template: CertificateTemplate = {
      id: `template_${Date.now()}`,
      name: sessionStorage.getItem('templateFilename') || 'Untitled Template',
      imagePath: imageBase64 || templateImage!,
      imageWidth: imageRef.current?.naturalWidth || 1200,
      imageHeight: imageRef.current?.naturalHeight || 800,
      textBoxes,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    sessionStorage.setItem('certificateTemplate', JSON.stringify(template));
    toast.success('Template saved!');
    router.push('/mapping');
  };

  /* ---------------- UI ---------------- */

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="min-h-screen bg-[#f2f3f5] overflow-auto"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* CONTINUE & GUIDE */}
      <div className="fixed top-6 right-6 z-50">
        <BrandButton onClick={saveTemplate} disabled={!textBoxes.length}>
          Continue
        </BrandButton>
        
        {/* Quick Guide */}
        <motion.div
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.4 }}
          className="mt-3 bg-white/95 backdrop-blur-sm rounded-lg p-3 shadow-lg border border-gray-200 max-w-[220px]"
        >
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm">💡</span>
            <span className="text-xs font-semibold text-gray-700">Quick Start</span>
          </div>
          <div className="space-y-1.5 text-[11px] text-gray-600 leading-relaxed">
            <div>• Click template to add fields</div>
            <div>• Drag to reposition</div>
            <div>• Add name, date, or custom</div>
          </div>
        </motion.div>
      </div>

      {/* CANVAS */}
      <div className="flex justify-center py-16">
        {templateImage && (
          <div
            className="bg-white rounded-xl shadow-2xl p-6"
            style={{
              transform: `scale(${zoomLevel / 100})`,
              transformOrigin: 'top center',
            }}
          >
            <div
              className="relative max-w-[900px]"
              onClick={handleImageClick}
            >
              <img ref={imageRef} src={templateImage} alt="Template" />

              {textBoxes.map(box => {
                if (!imageRef.current) return null;
                
                // Get the actual displayed size (accounting for zoom)
                const scaleX = (zoomLevel / 100);
                const scaleY = (zoomLevel / 100);
                
                // Convert actual image coordinates to display coordinates
                const rect = imageRef.current.getBoundingClientRect();
                const displayX = (box.x / imageRef.current.naturalWidth) * imageRef.current.width;
                const displayY = (box.y / imageRef.current.naturalHeight) * imageRef.current.height;
                
                return (
                  <motion.div
                    key={box.id}
                    className={`absolute cursor-move border-2 border-dashed rounded px-2 py-1 ${
                      selectedField === box.id
                        ? 'border-green-500 bg-green-100/30'
                        : 'border-indigo-500 bg-indigo-100/20'
                    }`}
                    style={{
                      left: displayX,
                      top: displayY,
                      width: box.width,
                      height: box.height,
                      fontSize: box.fontSize,
                      fontFamily: box.fontFamily,
                      fontWeight: box.fontWeight,
                      color: box.fontColor,
                      textAlign: box.textAlign as any,
                      lineHeight: 1.2,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      whiteSpace: 'pre-wrap',
                      overflow: 'hidden',
                    }}
                    onMouseDown={e => handleBoxMouseDown(e, box.id)}
                  >
                    <span className="text-xs font-semibold opacity-60">{box.key}</span>
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ZOOM CONTROLS */}
      <div className="fixed bottom-6 right-6 z-50 bg-white shadow-lg rounded-xl flex items-center gap-2 px-3 py-2">
        <button onClick={() => setZoomLevel(z => Math.max(50, z - 10))}>
          <Minus />
        </button>
        <span className="text-sm font-medium w-12 text-center">
          {zoomLevel}%
        </span>
        <button onClick={() => setZoomLevel(z => Math.min(200, z + 10))}>
          <Plus />
        </button>
      </div>

      {/* FIELD SELECTOR MODAL */}
      <AnimatePresence>
        {showFieldSelector && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => {
              setShowFieldSelector(false);
              setCustomFieldName('');
            }}
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl shadow-2xl p-6 max-w-md w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-xl font-bold text-gray-900">Add Field to Certificate</h3>
                <button
                  onClick={() => {
                    setShowFieldSelector(false);
                    setCustomFieldName('');
                  }}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <p className="text-sm text-gray-600 mb-4">Choose a common field or create your own</p>
              
              {/* COMMON FIELDS - SIMPLIFIED */}
              <div className="space-y-2 mb-6">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide px-1">Essential Fields</p>
                {commonFields.map((field) => {
                  const isAdded = textBoxes.some(box => box.key === field.key);
                  
                  return (
                    <button
                      key={field.key}
                      onClick={() => !isAdded && addField(field.key)}
                      disabled={isAdded}
                      className={`w-full px-4 py-3 rounded-lg font-medium transition-all text-left flex items-center gap-3 ${
                        isAdded
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          : 'bg-gradient-to-br from-white via-[#f9faff] to-[#eef1ff] text-gray-900 hover:shadow-md border border-gray-200 hover:border-[#4F46E5]'
                      }`}
                    >
                      <span className="text-xl">{field.icon}</span>
                      <span className="flex-1">{field.label}</span>
                      {isAdded && <Check className="w-4 h-4 text-[#22C55E]" />}
                    </button>
                  );
                })}
              </div>

              {/* CUSTOM FIELD SECTION */}
              <div className="border-t pt-4">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide px-1 mb-3">Create Custom Field</p>
                <label className="block text-sm font-medium mb-2 text-gray-700">Field Name</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="e.g., COURSE, SCORE, ID"
                    value={customFieldName}
                    onChange={(e) => setCustomFieldName(e.target.value.toUpperCase().replace(/[^A-Z_]/g, ''))}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && customFieldName) {
                        addField(customFieldName);
                      }
                    }}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4F46E5] focus:border-[#4F46E5] outline-none text-sm"
                  />
                  <BrandButton
                    variant="primary"
                    onClick={() => customFieldName && addField(customFieldName)}
                    disabled={!customFieldName}
                    className="px-4"
                  >
                    Add
                  </BrandButton>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  💡 Tip: Use simple names like SCORE, COURSE, or RANK
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
