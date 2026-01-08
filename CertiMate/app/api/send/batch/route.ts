import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import path from 'path';
import { scheduleWithLanes, sleep } from '@/lib/email-throttle';

interface Recipient {
  email: string;
  name: string;
  certificatePath?: string;
}

interface EmailResult {
  email: string;
  name: string;
  status: 'success' | 'failed';
  error?: string;
}

function createMimeMessage(
  to: string,
  subject: string,
  body: string,
  attachmentBuffer: Buffer,
  attachmentFilename: string
): string {
  const boundary = `boundary_${Date.now()}`;
  const mimeMessage = [
    `To: ${to}`,
    `Subject: ${subject}`,
    `MIME-Version: 1.0`,
    `Content-Type: multipart/mixed; boundary="${boundary}"`,
    '',
    `--${boundary}`,
    `Content-Type: text/html; charset=UTF-8`,
    `Content-Transfer-Encoding: 7bit`,
    '',
    body,
    '',
    `--${boundary}`,
    `Content-Type: application/octet-stream; name="${attachmentFilename}"`,
    `Content-Disposition: attachment; filename="${attachmentFilename}"`,
    `Content-Transfer-Encoding: base64`,
    '',
    attachmentBuffer.toString('base64'),
    '',
    `--${boundary}--`
  ].join('\r\n');

  return Buffer.from(mimeMessage)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

async function sendEmailViaGmail(
  accessToken: string,
  to: string,
  subject: string,
  body: string,
  attachmentBuffer: Buffer,
  attachmentFilename: string
): Promise<void> {
  const rawMessage = createMimeMessage(to, subject, body, attachmentBuffer, attachmentFilename);

  const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ raw: rawMessage })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `Gmail API error: ${response.status}`);
  }
}

async function sendOne(
  accessToken: string,
  recipient: Recipient,
  subject: string,
  bodyTemplate: string,
  certificatesDir: string,
  indexHint: number
) {
  const personalizedBody = bodyTemplate.replace(/\{\{name\}\}/g, recipient.name);
  const possiblePaths = [
    recipient.certificatePath,
    path.join(process.cwd(), 'public', certificatesDir, `certificate_${indexHint}.png`),
    path.join(process.cwd(), 'public', certificatesDir, `${recipient.name.replace(/[^a-z0-9]/gi, '_')}_certificate.png`),
    path.join(process.cwd(), 'public', 'uploads', 'certificates', `certificate_${indexHint}.png`),
  ].filter(Boolean) as string[];

  let certificateBuffer: Buffer | null = null;
  for (const p of possiblePaths) {
    try {
      certificateBuffer = await readFile(p);
      break;
    } catch {
      // try next
    }
  }
  if (!certificateBuffer) {
    throw new Error(`Certificate not found for ${recipient.name}`);
  }

  await sendEmailViaGmail(
    accessToken,
    recipient.email,
    subject,
    personalizedBody,
    certificateBuffer,
    `${recipient.name.replace(/[^a-z0-9]/gi, '_')}_certificate.png`
  );
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      access_token,
      jobId, // client-managed identifier for idempotency on the client side
      batchIndex,
      mode, // 'direct' | 'batch'
      recipients,
      subject,
      body_template,
      certificates_dir = 'uploads/certificates',
    } = body || {};

    if (!access_token) {
      return NextResponse.json({ success: false, message: 'Access token is required' }, { status: 400 });
    }
    if (!Array.isArray(recipients) || recipients.length === 0) {
      return NextResponse.json({ success: false, message: 'Recipients for this batch are required' }, { status: 400 });
    }
    if (typeof batchIndex !== 'number' || batchIndex < 0) {
      return NextResponse.json({ success: false, message: 'Valid batchIndex is required' }, { status: 400 });
    }
    if (!subject || !body_template) {
      return NextResponse.json({ success: false, message: 'Subject and body template are required' }, { status: 400 });
    }

    // Concurrency: 2 lanes
    // Delays: 6–12s in batch mode, smaller jitter (1–2s) in direct mode
    const lanes = 2;
    const minDelay = mode === 'direct' ? 1 : 6;
    const maxDelay = mode === 'direct' ? 2 : 12;
    const starts = scheduleWithLanes(recipients.length, lanes, minDelay, maxDelay);

    const results: EmailResult[] = [];

    // Execute all sends for this batch; each send respects its scheduled start offset.
    // Note: This endpoint processes only a single batch to keep within Vercel time limits.
    await Promise.all(
      recipients.map((r: Recipient, i: number) => (async () => {
        const delay = starts[i];
        if (delay > 0) await sleep(delay);
        try {
          const globalIndexHint = batchIndex * recipients.length + i;
          await sendOne(access_token, r, subject, body_template, certificates_dir, globalIndexHint);
          results.push({ email: r.email, name: r.name, status: 'success' });
        } catch (e: any) {
          results.push({ email: r.email, name: r.name, status: 'failed', error: e?.message });
        }
      })())
    );

    const sent = results.filter(r => r.status === 'success').length;
    const failed = results.length - sent;

    return NextResponse.json({ success: true, jobId, batchIndex, sent, failed, results }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error?.message || 'Batch failed' }, { status: 500 });
  }
}
