import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { access_token, recipients, subject, body_template } = body || {};

    if (!access_token) {
      return NextResponse.json({ success: false, message: 'Access token is required' }, { status: 400 });
    }
    if (!Array.isArray(recipients) || recipients.length === 0) {
      return NextResponse.json({ success: false, message: 'Recipients list is required' }, { status: 400 });
    }
    if (!subject || !body_template) {
      return NextResponse.json({ success: false, message: 'Subject and body template are required' }, { status: 400 });
    }

    const total = recipients.length;
    const mode: 'direct' | 'batch' = total <= 50 ? 'direct' : 'batch';

    // To remain Vercel-safe under function timeouts, choose a conservative batch size.
    // With concurrency=2 and 6–12s per send, 8–12 recipients keep a batch ~48–120s per lane.
    // If your plan limits are strict (~60s), prefer 8–10.
    const batchSize = mode === 'direct' ? total : Math.min(12, Math.max(8, Math.floor(total / Math.ceil(total / 10))));
    const cooldownRange = { minSeconds: 60, maxSeconds: 180 };

    const jobId = cryptoRandomId();

    return NextResponse.json(
      {
        success: true,
        jobId,
        mode,
        total,
        batchSize,
        cooldownRange,
        // Client should orchestrate batching and persistence via sessionStorage
        message: 'Client should run batches sequentially and wait cooldowns.'
      },
      { status: 200 }
    );
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error?.message || 'Failed to start' }, { status: 500 });
  }
}

function cryptoRandomId() {
  // Lightweight, no persistence required. Browsers also generate their own ID but we return one for convenience.
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}
