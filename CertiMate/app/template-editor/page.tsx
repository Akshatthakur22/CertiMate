"use client";

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, X, Trash2, Check, MousePointer2, ArrowRight } from 'lucide-react';
import type { CertificateTemplate, TextBox } from '@/types/template';
import { PageLayout } from '@/components/layout/page-layout';
import { BrandButton } from '@/components/ui/brand-button';
import { Card, CardContent } from '@/components/ui/card';

export default function TemplateEditorPage() {
  const router = useRouter();
  const imageRef = useRef<HTMLImageElement>(null);
  const [templateImage, setTemplateImage] = useState<string | null>(null);
  const [textBoxes, setTextBoxes] = useState<TextBox[]>([]);
  const [showFieldSelector, setShowFieldSelector] = useState(false);
  const [clickPosition, setClickPosition] = useState({ x: 0, y: 0 });
  const [customFieldName, setCustomFieldName] = useState('');
  const [draggingBox, setDraggingBox] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [selectedBox, setSelectedBox] = useState<string | null>(null);

  useEffect(() => {
    const templatePath = sessionStorage.getItem('templatePath');
    if (templatePath) {
      // Use API endpoint to serve the file (works on Vercel)
      const imageUrl = `/api/serve-file?path=${encodeURIComponent(templatePath)}`;
      setTemplateImage(imageUrl);
    } else {
      toast.error('No template uploaded');
      router.push('/upload');
    }
  }, [router]);

  const commonFields = [
    { label: 'Name', key: 'NAME', icon: '👤' },
    { label: 'Role/Position', key: 'ROLE', icon: '💼' },
    { label: 'Event Name', key: 'EVENT', icon: '🎯' },
    { label: 'Date', key: 'DATE', icon: '📅' },
    { label: 'Organization', key: 'ORGANIZATION', icon: '🏢' },
    { label: 'Certificate ID', key: 'CERTIFICATE_ID', icon: '🔖' },
  ];

  const handleImageClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('.field-box')) return;

    const rect = imageRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const actualX = (x / rect.width) * (imageRef.current?.naturalWidth || 1200);
    const actualY = (y / rect.height) * (imageRef.current?.naturalHeight || 800);

    setClickPosition({ x: actualX, y: actualY });
    setShowFieldSelector(true);
  };

  const handleBoxMouseDown = (e: React.MouseEvent, boxId: string) => {
    e.stopPropagation();
    setDraggingBox(boxId);
    setSelectedBox(boxId);
    
    const box = textBoxes.find(b => b.id === boxId);
    const rect = imageRef.current?.getBoundingClientRect();
    if (!box || !rect) return;

    const scaleX = rect.width / (imageRef.current?.naturalWidth || 1200);
    const scaleY = rect.height / (imageRef.current?.naturalHeight || 800);

    setDragOffset({
      x: e.clientX - rect.left - box.x * scaleX,
      y: e.clientY - rect.top - box.y * scaleY,
    });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!draggingBox) return;
    const rect = imageRef.current?.getBoundingClientRect();
    if (!rect) return;

    const scaleX = (imageRef.current?.naturalWidth || 1200) / rect.width;
    const scaleY = (imageRef.current?.naturalHeight || 800) / rect.height;

    const newX = (e.clientX - rect.left - dragOffset.x) * scaleX;
    const newY = (e.clientY - rect.top - dragOffset.y) * scaleY;

    setTextBoxes(textBoxes.map(box => 
      box.id === draggingBox 
        ? { ...box, x: Math.max(0, newX), y: Math.max(0, newY) }
        : box
    ));
  };

  const handleMouseUp = () => setDraggingBox(null);

  const addField = (fieldKey: string) => {
    if (textBoxes.some(box => box.key === fieldKey)) {
      toast.error('This field is already added');
      return;
    }

    const newBox: TextBox = {
      id: `box_${Date.now()}`,
      x: clickPosition.x,
      y: clickPosition.y,
      width: 300,
      height: 50,
      key: fieldKey,
      fontSize: 24,
      fontFamily: 'Arial',
      fontWeight: 'bold',
      fontColor: '#000000',
      textAlign: 'center',
    };

    setTextBoxes([...textBoxes, newBox]);
    setShowFieldSelector(false);
    setCustomFieldName('');
    toast.success(`${fieldKey} field added!`);
  };

  const removeField = (boxId: string) => {
    setTextBoxes(textBoxes.filter(box => box.id !== boxId));
    if (selectedBox === boxId) setSelectedBox(null);
    toast.success('Field removed');
  };

  const saveTemplate = async () => {
    if (textBoxes.length === 0) {
      toast.error('Please add at least one field to your certificate');
      return;
    }

    const template: CertificateTemplate = {
      id: `template_${Date.now()}`,
      name: sessionStorage.getItem('templateFilename') || 'Untitled Template',
      imagePath: templateImage!,
      imageWidth: imageRef.current?.naturalWidth || 1200,
      imageHeight: imageRef.current?.naturalHeight || 800,
      textBoxes,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    try {
      sessionStorage.setItem('certificateTemplate', JSON.stringify(template));
      toast.success('Template saved successfully!');
      router.push('/mapping');
    } catch (error) {
      console.error('Save error:', error);
      toast.error('Failed to save template');
    }
  };

  return (
    <PageLayout>
      <div className="min-h-screen bg-gradient-to-br from-white via-[#f9faff] to-[#eef1ff] py-12">
        <div className="container mx-auto px-4 max-w-7xl">
          {/* Header */}
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-8"
          >
            <div className="inline-flex items-center gap-2 border border-indigo-100 bg-white/80 px-3 py-1 rounded-full text-sm text-indigo-600 shadow-sm backdrop-blur-md mb-3">
              🪶 Step 2 of 4
            </div>
            <h1 className="text-4xl md:text-5xl font-extrabold leading-tight text-gray-900 mb-3">
              Design Your Template
            </h1>
            <p className="text-lg text-gray-600">
              Click anywhere on your certificate to place fields. Drag to reposition them.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Certificate Canvas */}
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="lg:col-span-3"
        >
          <Card className="overflow-hidden">
            <div className="bg-gradient-to-br from-white via-[#f9faff] to-[#eef1ff] border-b p-4">
              <div className="flex items-start gap-3">
                <MousePointer2 className="w-5 h-5 text-[#4F46E5] mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Interactive Mode Active</p>
                  <p className="text-xs text-gray-600 mt-1">
                    Click to add fields • Drag to reposition • Click X to remove
                  </p>
                </div>
              </div>
            </div>

            <CardContent className="p-6">
              <div 
                className="relative inline-block w-full cursor-crosshair"
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
              >
                {templateImage && (
                  <div className="relative" onClick={handleImageClick}>
                    <img
                      ref={imageRef}
                      src={templateImage}
                      alt="Certificate Template"
                      className="w-full h-auto rounded-lg shadow-lg"
                      style={{ userSelect: 'none' }}
                    />
                    
                    <AnimatePresence>
                      {textBoxes.map((box) => {
                        const scaleX = imageRef.current ? imageRef.current.clientWidth / imageRef.current.naturalWidth : 1;
                        const scaleY = imageRef.current ? imageRef.current.clientHeight / imageRef.current.naturalHeight : 1;
                        const isSelected = selectedBox === box.id;
                        const isDragging = draggingBox === box.id;
                        
                        return (
                          <motion.div
                            key={box.id}
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0, opacity: 0 }}
                            className={`field-box absolute ${
                              isDragging ? 'cursor-grabbing z-50' : 'cursor-grab z-10'
                            }`}
                            style={{
                              left: box.x * scaleX,
                              top: box.y * scaleY,
                              width: box.width * scaleX,
                              height: box.height * scaleY,
                            }}
                            onMouseDown={(e) => handleBoxMouseDown(e, box.id)}
                          >
                            <div className={`relative w-full h-full rounded-lg flex items-center justify-center transition-all border-2 ${
                              isDragging 
                                ? 'border-[#4F46E5] bg-[#4F46E5]/10 shadow-lg' 
                                : isSelected
                                ? 'border-[#22C55E] bg-[#22C55E]/10 shadow-md'
                                : 'border-[#4F46E5]/50 bg-[#4F46E5]/5 hover:border-[#4F46E5] hover:bg-[#4F46E5]/10'
                            }`}>
                              <div className={`px-3 py-1.5 rounded-md font-semibold text-sm ${
                                isDragging 
                                  ? 'bg-[#4F46E5] text-white' 
                                  : 'bg-white text-[#4F46E5] shadow-sm'
                              }`}>
                                {box.key}
                              </div>
                              
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  removeField(box.id);
                                }}
                                onMouseDown={(e) => e.stopPropagation()}
                                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-600 transition-colors shadow-md"
                              >
                                <X className="w-3 h-3" />
                              </button>
                              
                              {isSelected && !isDragging && (
                                <div className="absolute -bottom-2 -right-2 bg-[#22C55E] text-white rounded-full w-6 h-6 flex items-center justify-center shadow-md">
                                  <Check className="w-3 h-3" />
                                </div>
                              )}
                            </div>
                          </motion.div>
                        );
                      })}
                    </AnimatePresence>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Sidebar */}
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="lg:col-span-1"
        >
          <div className="sticky top-6 space-y-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold text-gray-900">Fields Added</h2>
                  <div className="bg-[#4F46E5] text-white px-2.5 py-1 rounded-full text-sm font-bold">
                    {textBoxes.length}
                  </div>
                </div>
                
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {textBoxes.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                        <Plus className="w-8 h-8 text-gray-400" />
                      </div>
                      <p className="text-sm text-gray-500 font-medium">No fields yet</p>
                      <p className="text-xs text-gray-400 mt-1">Click on the certificate</p>
                    </div>
                  ) : (
                    textBoxes.map((box, index) => (
                      <motion.div
                        key={box.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className={`group flex items-center justify-between p-3 rounded-lg transition-all ${
                          selectedBox === box.id
                            ? 'bg-[#4F46E5]/10 border border-[#4F46E5]'
                            : 'bg-gray-50 border border-transparent hover:bg-gray-100'
                        }`}
                      >
                        <span className="font-semibold text-sm text-gray-800 flex items-center gap-2">
                          <Check className="w-4 h-4 text-[#22C55E]" />
                          {box.key}
                        </span>
                        <button
                          onClick={() => removeField(box.id)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </motion.div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>

            <BrandButton
              variant="gradient"
              size="lg"
              onClick={saveTemplate}
              disabled={textBoxes.length === 0}
              className="w-full"
            >
              Continue to Mapping
              <ArrowRight className="w-5 h-5" />
            </BrandButton>
          </div>
        </motion.div>
      </div>

      {/* Field Selector Modal */}
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
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-gray-900">Select Field Type</h3>
                <button
                  onClick={() => {
                    setShowFieldSelector(false);
                    setCustomFieldName('');
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <p className="text-sm text-gray-600 mb-4">Choose what data should appear at this position</p>
              
              <div className="space-y-2 mb-6 max-h-80 overflow-y-auto">
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

              <div className="border-t pt-4">
                <label className="block text-sm font-medium mb-2 text-gray-700">Custom Field Name</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="e.g., COURSE_NAME"
                    value={customFieldName}
                    onChange={(e) => setCustomFieldName(e.target.value.toUpperCase().replace(/[^A-Z_]/g, ''))}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && customFieldName) {
                        addField(customFieldName);
                      }
                    }}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4F46E5] focus:border-[#4F46E5] outline-none"
                  />
                  <BrandButton
                    variant="primary"
                    onClick={() => customFieldName && addField(customFieldName)}
                    disabled={!customFieldName}
                  >
                    Add
                  </BrandButton>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
        </div>
      </div>
    </PageLayout>
  );
}
