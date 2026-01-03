import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

export async function POST(request: NextRequest) {
  try {
    const { code, access_token } = await request.json();

    // If direct access token is provided (implicit flow), use it
    if (access_token) {
      console.log("✅ Using direct access token from implicit flow");
      return NextResponse.json({ access_token }, { status: 200 });
    }

    // Otherwise, exchange authorization code for token (auth code flow)
    if (!code) {
      return NextResponse.json(
        { error: 'No authorization code or access token provided' },
        { status: 400 }
      );
    }

    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      console.error("❌ Missing Google OAuth credentials");
      return NextResponse.json(
        { error: 'Server not configured for OAuth' },
        { status: 500 }
      );
    }

    // Exchange code for token
    const response = await axios.post('https://oauth2.googleapis.com/token', {
      client_id: clientId,
      client_secret: clientSecret,
      code,
      grant_type: 'authorization_code',
      redirect_uri: process.env.NEXT_PUBLIC_REDIRECT_URI || 'http://localhost:3000/api/auth/callback',
    });

    const { access_token: token } = response.data;

    if (!token) {
      throw new Error('No access token in response');
    }

    console.log("✅ Token exchange successful");
    return NextResponse.json({ access_token: token }, { status: 200 });
  } catch (error) {
    console.error("❌ Google token exchange error:", error);
    
    if (axios.isAxiosError(error)) {
      return NextResponse.json(
        { error: error.response?.data?.error_description || error.message },
        { status: error.response?.status || 500 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to exchange authorization code for token' },
      { status: 500 }
    );
  }
}
