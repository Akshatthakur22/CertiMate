import { NextRequest, NextResponse } from 'next/server';
import { cleanupExpiredSessions } from '@/lib/session-storage';

/*
 * Cron job endpoint for automatic cleanup
 * Configure in vercel.json:
 * "crons": [{ "path": "/api/cron/cleanup", "schedule": "0 * /6 * * *" }]
 * 
 * For local testing: GET http://localhost:3000/api/cron/cleanup
 * 
 * Security: Add CRON_SECRET to .env and verify in production
 */

export async function GET(request: NextRequest) {
  try {
    // Verify cron secret in production
    const cronSecret = process.env.CRON_SECRET;
    const authHeader = request.headers.get('authorization');
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      console.warn('⚠️  Unauthorized cron attempt');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log('🧹 Running scheduled cleanup...');
    
    // Clean up expired sessions
    const result = await cleanupExpiredSessions();
    
    console.log(`✓ Cleanup completed: ${result.sessionsDeleted} sessions, ${result.filesDeleted} files deleted`);

    return NextResponse.json(
      { 
        success: true,
        message: 'Cleanup completed successfully',
        sessionsDeleted: result.sessionsDeleted,
        filesDeleted: result.filesDeleted,
        timestamp: new Date().toISOString()
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('❌ Cron cleanup error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: String(error),
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}
