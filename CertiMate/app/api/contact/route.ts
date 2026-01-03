import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, message } = body;

    // Add your contact form logic here
    // For example: send email, save to database, etc.

    return NextResponse.json(
      { message: 'Contact form submitted successfully', success: true },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { message: 'Failed to submit contact form', success: false },
      { status: 500 }
    );
  }
}
