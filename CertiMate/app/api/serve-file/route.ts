import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import path from 'path';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const filepath = searchParams.get('path');

    if (!filepath) {
      return NextResponse.json(
        { message: 'File path is required', success: false },
        { status: 400 }
      );
    }

    // Handle both absolute paths (Vercel /tmp) and relative paths (local)
    const isVercel = process.env.VERCEL === '1';
    let fullPath: string;

    if (filepath.startsWith('/tmp')) {
      fullPath = filepath;
    } else if (isVercel) {
      // On Vercel, files are in /tmp
      fullPath = path.join('/tmp', filepath);
    } else {
      // Locally, files are in public directory
      fullPath = path.join(process.cwd(), 'public', filepath);
    }

    const fileBuffer = await readFile(fullPath);
    
    // Determine content type based on file extension
    const ext = path.extname(filepath).toLowerCase();
    const contentTypes: Record<string, string> = {
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.csv': 'text/csv',
    };

    const contentType = contentTypes[ext] || 'application/octet-stream';

    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000',
      },
    });
  } catch (error) {
    console.error('Error serving file:', error);
    return NextResponse.json(
      { message: 'File not found', success: false },
      { status: 404 }
    );
  }
}
