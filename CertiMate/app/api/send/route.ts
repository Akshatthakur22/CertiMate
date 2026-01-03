import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import path from 'path';
import { cleanupSession } from '@/lib/session-storage';

interface Recipient {
  email: string;
  name: string;
}

interface EmailResult {
  email: string;
  name: string;
  status: 'success' | 'failed';
  error?: string;
}

/**
 * Create a MIME email message with attachment
 */
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

  // Convert to base64url (Gmail API requirement)
  return Buffer.from(mimeMessage)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * Send email via Gmail API
 */
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
    body: JSON.stringify({
      raw: rawMessage
    })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `Gmail API error: ${response.status}`);
  }
}

/**
 * Send emails in parallel with concurrency control
 */
async function sendEmailsInParallel(
  accessToken: string,
  recipients: Recipient[],
  subject: string,
  bodyTemplate: string,
  certificatesDir: string,
  concurrency: number = 5
): Promise<EmailResult[]> {
  const results: EmailResult[] = [];
  const executing: Promise<void>[] = [];
  let index = 0;

  for (const recipient of recipients) {
    const currentIndex = index++;
    
    const task = (async () => {
      try {
        // Personalize email body (replace {{name}} placeholder)
        const personalizedBody = bodyTemplate.replace(/\{\{name\}\}/g, recipient.name);
        
        // Try multiple certificate path formats
        const possiblePaths = [
          // Use recipient's certificate path if provided
          (recipient as any).certificatePath,
          // Standard indexed format
          path.join(process.cwd(), 'public', certificatesDir, `certificate_${currentIndex}.png`),
          // Name-based format
          path.join(process.cwd(), 'public', certificatesDir, `${recipient.name.replace(/[^a-z0-9]/gi, '_')}_certificate.png`),
          // Alternative indexed format
          path.join(process.cwd(), 'public', 'uploads', 'certificates', `certificate_${currentIndex}.png`)
        ].filter(Boolean);
        
        // Try to read certificate from possible paths
        let certificateBuffer: Buffer | null = null;
        let usedPath = '';
        
        for (const certPath of possiblePaths) {
          try {
            certificateBuffer = await readFile(certPath as string);
            usedPath = certPath as string;
            console.log(`✓ Found certificate at: ${certPath}`);
            break;
          } catch (error) {
            // Try next path
            continue;
          }
        }

        if (!certificateBuffer) {
          throw new Error(`Certificate not found for ${recipient.name} (tried ${possiblePaths.length} paths)`);
        }

        // Send email
        await sendEmailViaGmail(
          accessToken,
          recipient.email,
          subject,
          personalizedBody,
          certificateBuffer,
          `${recipient.name.replace(/[^a-z0-9]/gi, '_')}_certificate.png`
        );

        results.push({
          email: recipient.email,
          name: recipient.name,
          status: 'success'
        });

        console.log(`✓ Email sent to ${recipient.email} (${recipient.name})`);
      } catch (error: any) {
        results.push({
          email: recipient.email,
          name: recipient.name,
          status: 'failed',
          error: error.message
        });

        console.error(`✗ Failed to send email to ${recipient.email}:`, error.message);
      }
    })();

    executing.push(task);

    // Control concurrency
    if (executing.length >= concurrency) {
      await Promise.race(executing);
      const completed = await Promise.race(executing.map((p, i) => p.then(() => i)));
      executing.splice(completed, 1);
    }
  }

  // Wait for remaining tasks
  await Promise.all(executing);

  return results;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      access_token, 
      recipients, 
      subject, 
      body_template, 
      certificates_dir,
      sessionId 
    } = body;

    // Validation
    if (!access_token) {
      return NextResponse.json(
        { message: 'Access token is required', success: false },
        { status: 400 }
      );
    }

    if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
      return NextResponse.json(
        { message: 'Recipients list is required', success: false },
        { status: 400 }
      );
    }

    if (!subject || !body_template) {
      return NextResponse.json(
        { message: 'Subject and body template are required', success: false },
        { status: 400 }
      );
    }

    console.log(`\n📧 Starting email send to ${recipients.length} recipients...`);
    console.log(`Subject: ${subject}`);

    // Send emails in parallel (5 concurrent requests to avoid rate limits)
    const results = await sendEmailsInParallel(
      access_token,
      recipients,
      subject,
      body_template,
      certificates_dir || 'uploads/certificates',
      5 // Concurrent limit
    );

    const successful = results.filter(r => r.status === 'success').length;
    const failed = results.filter(r => r.status === 'failed').length;

    console.log(`\n📊 Email Send Summary:`);
    console.log(`   ✓ Successful: ${successful}`);
    console.log(`   ✗ Failed: ${failed}`);
    console.log(`   📁 Total: ${results.length}\n`);

    // Clean up session files after successful email sending
    if (sessionId && successful > 0) {
      // Run cleanup in background (don't wait for it)
      cleanupSession(sessionId)
        .then(result => {
          console.log(`✓ Session ${sessionId} cleaned up after emails sent:`, result);
        })
        .catch(error => {
          console.error(`✗ Failed to cleanup session ${sessionId}:`, error);
        });
    }

    return NextResponse.json(
      { 
        message: `Successfully sent ${successful} of ${results.length} emails`, 
        success: true,
        successful,
        failed,
        total: results.length,
        results: results.map(r => ({
          email: r.email,
          name: r.name,
          status: r.status,
          error: r.error
        }))
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Email sending error:', error);
    return NextResponse.json(
      { 
        message: 'Failed to send certificates', 
        success: false,
        error: error.message 
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // Get email sending history or status
    return NextResponse.json(
      { 
        message: 'Email history retrieved', 
        success: true,
        history: [] 
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { message: 'Failed to retrieve email history', success: false },
      { status: 500 }
    );
  }
}
