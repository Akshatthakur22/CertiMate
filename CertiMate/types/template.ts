// Template JSON Schema for Certificate Generation System

export interface TextBox {
  id: string;
  x: number; // Position from left (pixels)
  y: number; // Position from top (pixels)
  width: number; // Box width (pixels)
  height: number; // Box height (pixels)
  key: string; // Field key for CSV mapping (e.g., "NAME", "DATE")
  fontFamily: string; // Font family name
  fontSize: number; // Font size in pixels
  fontColor: string; // Hex color (e.g., "#000000")
  fontWeight: 'normal' | 'bold'; // Font weight
  textAlign: 'left' | 'center' | 'right'; // Text alignment
  lineHeight?: number; // Optional line height multiplier (default: 1.2)
}

export interface CertificateTemplate {
  id: string;
  name: string;
  imagePath: string; // Path to background certificate image
  imageWidth: number; // Original image width
  imageHeight: number; // Original image height
  textBoxes: TextBox[]; // Array of text boxes on the template
  createdAt: string;
  updatedAt: string;
}

export interface CSVMapping {
  templateKey: string; // Key from template (e.g., "NAME")
  csvColumn: string; // Column name from CSV (e.g., "Student Name")
}

export interface GenerationJob {
  id: string;
  templateId: string;
  csvPath: string;
  mappings: CSVMapping[];
  status: 'pending' | 'processing' | 'completed' | 'failed';
  totalCertificates: number;
  processedCertificates: number;
  outputPath?: string;
  createdAt: string;
  completedAt?: string;
  error?: string;
}

// Example Template JSON
export const exampleTemplate: CertificateTemplate = {
  id: "template_001",
  name: "Achievement Certificate",
  imagePath: "/uploads/templates/cert-bg.png",
  imageWidth: 1920,
  imageHeight: 1080,
  textBoxes: [
    {
      id: "box_1",
      x: 500,
      y: 400,
      width: 920,
      height: 100,
      key: "NAME",
      fontFamily: "Arial",
      fontSize: 72,
      fontColor: "#000000",
      fontWeight: "bold",
      textAlign: "center",
      lineHeight: 1.2
    },
    {
      id: "box_2",
      x: 600,
      y: 550,
      width: 720,
      height: 60,
      key: "COURSE",
      fontFamily: "Arial",
      fontSize: 36,
      fontColor: "#333333",
      fontWeight: "normal",
      textAlign: "center",
      lineHeight: 1.2
    },
    {
      id: "box_3",
      x: 1400,
      y: 900,
      width: 300,
      height: 40,
      key: "DATE",
      fontFamily: "Arial",
      fontSize: 24,
      fontColor: "#666666",
      fontWeight: "normal",
      textAlign: "right",
      lineHeight: 1.2
    }
  ],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
};
