import { NextRequest, NextResponse } from 'next/server';
import { saveFile, readFileContent } from '@/lib/storage';
import { parseCSV } from '@/lib/csv-parser';
import { setTemplatePath, setCSVData, getCSVContent } from '@/lib/upload-state';
import { 
  generateSessionId, 
  createSession, 
  addTemplateToSession, 
  addCsvToSession 
} from '@/lib/session-storage';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    let sessionId = formData.get('sessionId') as string | null;

    if (!file) {
      return NextResponse.json(
        { message: 'No file uploaded', success: false },
        { status: 400 }
      );
    }

    // Create or get session
    if (!sessionId) {
      sessionId = generateSessionId();
      createSession(sessionId, 24); // 24 hour expiration
    }

    const fileType = file.type;
    
    // Handle template image upload
    if (fileType.startsWith('image/')) {
      const filePath = await saveFile(file, '/uploads/templates');
      
      // Track in session
      addTemplateToSession(sessionId, filePath);
      
      // Store template path in shared state (backward compatibility)
      setTemplatePath(filePath);
      
      return NextResponse.json(
        { 
          message: 'Template uploaded successfully', 
          success: true,
          file_path: filePath,
          filename: file.name,
          fileSize: file.size,
          sessionId
        },
        { status: 200 }
      );
    }
    
    // Handle CSV upload
    if (fileType === 'text/csv' || file.name.endsWith('.csv')) {
      const filePath = await saveFile(file, '/uploads/csv');
      const content = await readFileContent(filePath);
      
      // Track in session
      addCsvToSession(sessionId, filePath);
      
      // Store CSV data in shared state (backward compatibility)
      setCSVData(filePath, content);
      
      // Parse CSV to get stats
      const csvData = parseCSV(content);
      
      return NextResponse.json(
        { 
          message: 'CSV uploaded successfully', 
          success: true,
          file_path: filePath,
          filename: file.name,
          headers: csvData.headers,
          rowCount: csvData.rowCount,
          sessionId
        },
        { status: 200 }
      );
    }

    return NextResponse.json(
      { message: 'Invalid file type. Please upload an image or CSV file.', success: false },
      { status: 400 }
    );
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { message: 'Failed to upload file', success: false, error: String(error) },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // Return CSV content for email sending
    const csvContent = getCSVContent();
    
    if (!csvContent) {
      return NextResponse.json(
        { message: 'No CSV file uploaded', success: false },
        { status: 404 }
      );
    }
    
    return NextResponse.json(
      { 
        message: 'CSV content retrieved', 
        success: true, 
        content: csvContent
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { message: 'Failed to retrieve CSV content', success: false },
      { status: 500 }
    );
  }
}
