import { NextRequest, NextResponse } from 'next/server';

// Deprecated route - use /api/send/start and /api/send/batch instead
// This route is kept for backward compatibility but returns 410 Gone

export async function POST() {
  // Deprecated: Use /api/send/start and /api/send/batch
  return NextResponse.json(
    { success: false, message: 'Deprecated. Use /api/send/start and /api/send/batch.' },
    { status: 410 }
  );
}

export async function GET(request: NextRequest) {
  // Deprecated: Use client-driven progress via sessionStorage.
  return NextResponse.json(
    { success: false, message: 'Deprecated. No job polling. Use client-driven batches.' },
    { status: 410 }
  );
}
