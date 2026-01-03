import { NextRequest, NextResponse } from 'next/server';
import { parseCSV } from '@/lib/csv-parser';
import { readFileContent } from '@/lib/storage';

// Store CSV data in memory (use database in production)
let csvData: { headers: string[]; rows: string[][]; rowCount: number } | null = null;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { csvPath, fieldMapping } = body;

    return NextResponse.json(
      { 
        message: 'Field mapping saved successfully', 
        success: true,
        mapping: fieldMapping
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { message: 'Failed to save field mapping', success: false },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // Return CSV statistics
    // This should be set when CSV is uploaded
    const csv_stats = csvData ? {
      total_rows: csvData.rowCount
    } : {
      total_rows: 0
    };

    return NextResponse.json(
      { 
        message: 'CSV stats retrieved', 
        success: true,
        csv_stats
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { message: 'Failed to retrieve CSV stats', success: false },
      { status: 500 }
    );
  }
}

export function setCSVData(data: { headers: string[]; rows: string[][]; rowCount: number }) {
  csvData = data;
}

export function getCSVData() {
  return csvData;
}
