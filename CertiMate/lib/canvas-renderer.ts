import { createCanvas, loadImage, registerFont, CanvasRenderingContext2D as NodeCanvasContext } from 'canvas';
import path from 'path';
import { writeFile, mkdir } from 'fs/promises';
import type { CertificateTemplate, TextBox } from '@/types/template';

/**
 * Map custom fonts to system-available alternatives
 */
function getFontFallback(fontFamily: string): string {
  const fontMap: Record<string, string> = {
    'Great Vibes': 'Georgia, serif',
    'Playfair Display': 'Georgia, serif',
    'Montserrat': 'Arial, sans-serif',
    'Roboto': 'Arial, sans-serif',
    'Open Sans': 'Arial, sans-serif',
    'Lato': 'Arial, sans-serif',
    'Poppins': 'Arial, sans-serif',
  };
  
  return fontMap[fontFamily] || 'Arial, sans-serif';
}

/**
 * Clean and normalize text for rendering
 */
function cleanTextForRendering(text: string): string {
  // Trim whitespace
  let cleaned = text.trim();
  
  // Remove BOM and zero-width characters
  cleaned = cleaned.replace(/[\uFEFF\u200B-\u200D\uFFFD]/g, '');
  
  // Remove control characters except newlines
  cleaned = cleaned.replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, '');
  
  // If text contains box-drawing or replacement characters, it's corrupted
  // Try to detect if we have Unicode box characters (U+2580-U+259F range)
  if (/[\u2580-\u259F\uFFFD]/.test(cleaned)) {
    console.warn('Detected corrupted text with box characters:', cleaned);
    // Return empty or placeholder if text is completely unreadable
    return '';
  }
  
  return cleaned;
}

/**
 * Renders text in a text box with proper alignment and word wrapping
 */
function renderTextInBox(
  ctx: NodeCanvasContext,
  text: string,
  box: TextBox
) {
  const { x, y, width, height, fontSize, fontColor, fontWeight, fontFamily, textAlign } = box;

  // Use fallback fonts for better compatibility on serverless environments
  const fallbackFonts = getFontFallback(fontFamily);
  ctx.font = `${fontWeight} ${fontSize}px ${fallbackFonts}`;
  ctx.fillStyle = fontColor;
  ctx.textBaseline = 'middle';

  // Calculate text alignment offset
  let textX = x;
  if (textAlign === 'center') {
    textX = x + width / 2;
    ctx.textAlign = 'center';
  } else if (textAlign === 'right') {
    textX = x + width;
    ctx.textAlign = 'right';
  } else {
    ctx.textAlign = 'left';
  }

  // Simple word wrapping
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const metrics = ctx.measureText(testLine);
    
    if (metrics.width > width && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }
  if (currentLine) {
    lines.push(currentLine);
  }

  // Calculate line height
  const lineHeight = box.lineHeight || 1.2;
  const totalHeight = lines.length * fontSize * lineHeight;
  const startY = y + (height - totalHeight) / 2 + fontSize / 2;

  // Draw each line
  lines.forEach((line, index) => {
    const lineY = startY + index * fontSize * lineHeight;
    ctx.fillText(line, textX, lineY);
  });
}

/**
 * Generate a single certificate from template and data
 */
export async function generateCertificate(
  template: CertificateTemplate,
  certificateData: Record<string, string>,
  outputPath: string
): Promise<string> {
  try {
    // Validate template has required properties
    if (!template.imagePath) {
      throw new Error('Template imagePath is missing or undefined');
    }

    // Extract actual file path if imagePath is an API URL
    let templatePath = template.imagePath;
    if (templatePath.includes('/api/serve-file?path=')) {
      const urlParams = new URLSearchParams(templatePath.split('?')[1]);
      templatePath = decodeURIComponent(urlParams.get('path') || '');
    }

    // Load template image - handle base64, absolute paths (/tmp on Vercel), and relative paths
    let image;
    
    if (templatePath.startsWith('data:image/')) {
      // Base64 data URL - load directly
      console.log('Loading image from base64 data URL');
      image = await loadImage(templatePath);
    } else {
      // File path - resolve and load
      let fullTemplatePath = templatePath;
      const isVercel = process.env.VERCEL === '1';
      
      if (fullTemplatePath.startsWith('/tmp')) {
        // Already an absolute /tmp path (Vercel)
        fullTemplatePath = fullTemplatePath;
      } else if (isVercel) {
        // On Vercel, convert relative path to /tmp
        fullTemplatePath = path.join('/tmp', fullTemplatePath);
      } else if (fullTemplatePath.startsWith('/')) {
        // Local: path starts with /, add public
        fullTemplatePath = path.join(process.cwd(), 'public', fullTemplatePath);
      } else {
        // Local: relative path, add public
        fullTemplatePath = path.join(process.cwd(), 'public', fullTemplatePath);
      }

      console.log('Loading image from:', fullTemplatePath);
      image = await loadImage(fullTemplatePath);
    }

    // Create canvas with template dimensions
    const canvas = createCanvas(template.imageWidth, template.imageHeight);
    const ctx = canvas.getContext('2d');

    // Draw template image
    ctx.drawImage(image, 0, 0, template.imageWidth, template.imageHeight);

    // Render each text box
    for (const box of template.textBoxes) {
      let value = certificateData[box.key] || '';
      if (value) {
        // Clean and normalize text
        value = cleanTextForRendering(value);
        
        if (value) {  // Only render if we have valid text after cleaning
          console.log(`Rendering text for ${box.key}:`, value, 'Font:', box.fontFamily);
          renderTextInBox(ctx, value, box);
        } else {
          console.warn(`Empty or corrupted value for ${box.key}, skipping`);
        }
      }
    }

    // Save certificate - handle both absolute paths (/tmp on Vercel) and relative paths
    let fullOutputPath: string;
    const isVercel = process.env.VERCEL === '1';
    // Remove leading slash so path.join doesn't drop the base directory
    const normalizedOutputPath = outputPath.startsWith('/') ? outputPath.slice(1) : outputPath;
    
    if (outputPath.startsWith('/tmp')) {
      // Already an absolute /tmp path (Vercel)
      fullOutputPath = outputPath;
    } else if (isVercel) {
      // On Vercel, use /tmp
      fullOutputPath = path.join('/tmp', normalizedOutputPath);
    } else {
      // Local: use public directory
      fullOutputPath = path.join(process.cwd(), 'public', normalizedOutputPath);
    }
    
    // Ensure directory exists
    const dir = path.dirname(fullOutputPath);
    await mkdir(dir, { recursive: true });
    
    const buffer = canvas.toBuffer('image/png');
    await writeFile(fullOutputPath, buffer);

    return outputPath;
  } catch (error) {
    console.error('Certificate generation error:', error);
    throw new Error(`Failed to generate certificate: ${error}`);
  }
}

/**
 * Generate preview certificate with sample data
 */
export async function generatePreviewCertificate(
  template: CertificateTemplate,
  sampleData?: Record<string, string>
): Promise<string> {
  // Generate sample data if not provided
  const data: Record<string, string> = sampleData || {};
  
  for (const box of template.textBoxes) {
    if (!data[box.key]) {
      data[box.key] = `Sample ${box.key}`;
    }
  }

  const outputPath = `/uploads/certificates/preview-${Date.now()}.png`;
  await generateCertificate(template, data, outputPath);
  return outputPath;
}

/**
 * Generate certificates in batch from CSV data
 */
export async function generateBatchCertificates(
  template: CertificateTemplate,
  dataList: Record<string, string>[]
): Promise<string[]> {
  const certificates: string[] = [];
  
  for (let i = 0; i < dataList.length; i++) {
    const outputPath = `/uploads/certificates/cert-${Date.now()}-${i}.png`;
    await generateCertificate(template, dataList[i], outputPath);
    certificates.push(outputPath);
    
    // Add small delay to avoid filename collisions
    await new Promise(resolve => setTimeout(resolve, 10));
  }
  
  return certificates;
}
