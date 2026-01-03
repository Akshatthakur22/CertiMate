import { createCanvas, loadImage, registerFont, CanvasRenderingContext2D as NodeCanvasContext } from 'canvas';
import path from 'path';
import { writeFile } from 'fs/promises';
import type { CertificateTemplate, TextBox } from '@/types/template';

/**
 * Renders text in a text box with proper alignment and word wrapping
 */
function renderTextInBox(
  ctx: NodeCanvasContext,
  text: string,
  box: TextBox
) {
  const { x, y, width, height, fontSize, fontColor, fontWeight, fontFamily, textAlign } = box;

  // Set font properties
  ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
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

    // Load template image - handle both absolute paths (/tmp on Vercel) and relative paths
    let fullTemplatePath = template.imagePath;
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
    const image = await loadImage(fullTemplatePath);

    // Create canvas with template dimensions
    const canvas = createCanvas(template.imageWidth, template.imageHeight);
    const ctx = canvas.getContext('2d');

    // Draw template image
    ctx.drawImage(image, 0, 0, template.imageWidth, template.imageHeight);

    // Render each text box
    for (const box of template.textBoxes) {
      const value = certificateData[box.key] || '';
      if (value) {
        renderTextInBox(ctx, value, box);
      }
    }

    // Save certificate - handle both absolute paths (/tmp on Vercel) and relative paths
    const isVercel = process.env.VERCEL === '1';
    let fullOutputPath: string;
    
    if (outputPath.startsWith('/tmp')) {
      // Already an absolute /tmp path (Vercel)
      fullOutputPath = outputPath;
    } else if (isVercel) {
      // On Vercel, use /tmp
      fullOutputPath = path.join('/tmp', outputPath);
    } else if (outputPath.startsWith('/')) {
      // Local: starts with /, add public
      fullOutputPath = path.join(process.cwd(), 'public', outputPath);
    } else {
      // Local: relative path, add public
      fullOutputPath = path.join(process.cwd(), 'public', outputPath);
    }
    
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
