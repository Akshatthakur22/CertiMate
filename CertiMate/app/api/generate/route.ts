import { NextRequest, NextResponse } from 'next/server';
import { generatePreviewCertificate, generateBatchCertificates, generateCertificate } from '@/lib/canvas-renderer';
import { parseCSV } from '@/lib/csv-parser';
import { getCSVContent } from '@/lib/upload-state';
import type { CertificateTemplate } from '@/types/template';
import { addCertificateToSession, addCertificatesToSession } from '@/lib/session-storage';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { template, preview, generateBatch, mappings, certificateData, index, sessionId } = body;

    if (!template) {
      return NextResponse.json(
        { message: 'Template is required', success: false },
        { status: 400 }
      );
    }

    const certificateTemplate = template as CertificateTemplate;

    // Handle backward compatibility - convert old format to new format
    if (!certificateTemplate.imagePath && (template as any).backgroundImage) {
      certificateTemplate.imagePath = (template as any).backgroundImage;
      certificateTemplate.imageWidth = (template as any).width || 1200;
      certificateTemplate.imageHeight = (template as any).height || 800;
    }

    console.log('Received template:', JSON.stringify(certificateTemplate, null, 2));
    
    if (certificateData) {
      console.log('Certificate data received:', JSON.stringify(certificateData, null, 2));
      // Log each value with its character codes to debug encoding
      Object.keys(certificateData).forEach(key => {
        const value = certificateData[key];
        console.log(`Field "${key}": "${value}" (length: ${value?.length}, chars:`, 
          value?.split('').map((c: string) => c.charCodeAt(0)).join(','), ')');
      });
    }

    // Handle single certificate generation (from generate page)
    if (certificateData && !preview && !generateBatch) {
      try {
        const outputPath = `/uploads/certificates/certificate_${index !== undefined ? index : Date.now()}.png`;
        await generateCertificate(certificateTemplate, certificateData, outputPath);
        
        // Track certificate in session
        if (sessionId) {
          addCertificateToSession(sessionId, outputPath);
        }
        
        return NextResponse.json(
          { 
            message: 'Certificate generated successfully', 
            success: true,
            certificate_path: outputPath
          },
          { status: 200 }
        );
      } catch (error) {
        console.error('Certificate generation error:', error);
        return NextResponse.json(
          { 
            message: 'Certificate generation failed', 
            success: false,
            error: String(error)
          },
          { status: 500 }
        );
      }
    }

    // Handle preview generation
    if (preview) {
      try {
        if (!certificateData) {
          return NextResponse.json(
            { message: 'Certificate data is required for preview', success: false },
            { status: 400 }
          );
        }

        console.log('Generating preview with data:', certificateData);
        const previewPath = await generatePreviewCertificate(certificateTemplate, certificateData);
        
        // Track preview in session (will be cleaned up)
        if (sessionId) {
          addCertificateToSession(sessionId, previewPath);
        }
        
        return NextResponse.json(
          { 
            message: 'Preview generated successfully', 
            success: true,
            preview_image: previewPath
          },
          { status: 200 }
        );
      } catch (error) {
        console.error('Preview generation error:', error);
        return NextResponse.json(
          { 
            message: 'Preview generation failed', 
            success: false,
            error: String(error)
          },
          { status: 500 }
        );
      }
    }

    // Handle batch generation
    if (generateBatch) {
      try {
        const csvContent = getCSVContent();
        
        if (!csvContent) {
          return NextResponse.json(
            { message: 'No CSV file uploaded', success: false },
            { status: 400 }
          );
        }

        // Parse CSV
        const csvData = parseCSV(csvContent);
        
        // Convert CSV rows to certificate data using mappings
        const certificateDataList: Record<string, string>[] = csvData.rows.map((row) => {
          const certData: Record<string, string> = {};
          
          // Apply mappings from CSV columns to template keys
          if (mappings) {
            mappings.forEach((mapping: { templateKey: string; csvColumn: string }) => {
              const columnIndex = csvData.headers.indexOf(mapping.csvColumn);
              if (columnIndex !== -1 && row[columnIndex]) {
                certData[mapping.templateKey] = row[columnIndex];
              }
            });
          }
          
          return certData;
        });
        
        // Generate certificates
        const job_id = `job_${Date.now()}`;
        
        // Start generation (in production, use a queue like Bull or BullMQ)
        setTimeout(async () => {
          try {
            const certificatePaths = await generateBatchCertificates(certificateTemplate, certificateDataList);
            
            // Track all certificates in session
            if (sessionId && certificatePaths.length > 0) {
              addCertificatesToSession(sessionId, certificatePaths);
            }
          } catch (error) {
            console.error('Batch generation error:', error);
          }
        }, 0);
        
        return NextResponse.json(
          { 
            message: 'Batch generation started', 
            success: true,
            job_id,
            totalCertificates: certificateDataList.length
          },
          { status: 200 }
        );
      } catch (error) {
        console.error('Batch generation error:', error);
        return NextResponse.json(
          { 
            message: 'Batch generation failed', 
            success: false,
            error: String(error)
          },
          { status: 500 }
        );
      }
    }

    return NextResponse.json(
      { message: 'Invalid request', success: false },
      { status: 400 }
    );
  } catch (error) {
    console.error('Generate error:', error);
    return NextResponse.json(
      { message: 'Failed to generate certificate', success: false, error: String(error) },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // Get generation history or status
    return NextResponse.json(
      { message: 'Generation history retrieved', success: true, data: [] },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { message: 'Failed to retrieve generation history', success: false },
      { status: 500 }
    );
  }
}
