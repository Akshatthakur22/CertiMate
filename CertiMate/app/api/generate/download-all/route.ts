import { NextRequest, NextResponse } from 'next/server';
import JSZip from 'jszip';
import path from 'path';
import { readFile } from 'fs/promises';
import { cleanupSession } from '@/lib/session-storage';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { certificatePaths, sessionId } = body;

    if (!certificatePaths || !Array.isArray(certificatePaths) || certificatePaths.length === 0) {
      return NextResponse.json(
        { message: 'Certificate paths are required', success: false },
        { status: 400 }
      );
    }

    // Create ZIP archive
    const zip = new JSZip();

    // Add all certificates to archive
    for (let i = 0; i < certificatePaths.length; i++) {
      const certPath = certificatePaths[i];
      const fullPath = path.join(process.cwd(), 'public', certPath);
      
      try {
        const fileBuffer = await readFile(fullPath);
        const fileName = `certificate_${i + 1}.png`;
        zip.file(fileName, fileBuffer);
      } catch (error) {
        console.error(`Failed to read certificate: ${certPath}`, error);
        return NextResponse.json(
          { message: `Certificate not found: ${certPath}`, success: false },
          { status: 404 }
        );
      }
    }

    // Generate ZIP buffer
    const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' });

    // Clean up session files after successful download
    if (sessionId) {
      // Run cleanup in background (don't wait for it)
      cleanupSession(sessionId)
        .then(result => {
          console.log(`✓ Session ${sessionId} cleaned up after download:`, result);
        })
        .catch(error => {
          console.error(`✗ Failed to cleanup session ${sessionId}:`, error);
        });
    }

    return new NextResponse(new Uint8Array(zipBuffer), {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="certificates_${Date.now()}.zip"`,
      },
    });
  } catch (error) {
    console.error('ZIP creation error:', error);
    return NextResponse.json(
      { 
        message: 'Failed to create ZIP archive', 
        success: false,
        error: String(error)
      },
      { status: 500 }
    );
  }
}
