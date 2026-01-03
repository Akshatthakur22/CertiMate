import { NextRequest, NextResponse } from 'next/server';
import { 
  cleanupSession, 
  cleanupExpiredSessions, 
  getSessionStats,
  getSessionFiles 
} from '@/lib/session-storage';

/**
 * Manual session cleanup endpoint
 * POST /api/cleanup - Clean up a specific session
 * DELETE /api/cleanup?sessionId=xxx - Clean up a specific session
 * GET /api/cleanup/expired - Clean up all expired sessions
 * GET /api/cleanup/stats - Get storage statistics
 */

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId } = body;

    if (!sessionId) {
      return NextResponse.json(
        { message: 'Session ID is required', success: false },
        { status: 400 }
      );
    }

    const result = await cleanupSession(sessionId);

    return NextResponse.json(
      { 
        message: 'Session cleaned up successfully', 
        success: true,
        deleted: result.deleted,
        failed: result.failed
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Cleanup error:', error);
    return NextResponse.json(
      { 
        message: 'Failed to cleanup session', 
        success: false,
        error: String(error)
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
      return NextResponse.json(
        { message: 'Session ID is required', success: false },
        { status: 400 }
      );
    }

    const result = await cleanupSession(sessionId);

    return NextResponse.json(
      { 
        message: 'Session deleted successfully', 
        success: true,
        deleted: result.deleted,
        failed: result.failed
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Delete error:', error);
    return NextResponse.json(
      { 
        message: 'Failed to delete session', 
        success: false,
        error: String(error)
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const sessionId = searchParams.get('sessionId');

    // Get session files
    if (action === 'files' && sessionId) {
      const files = getSessionFiles(sessionId);
      return NextResponse.json(
        { 
          message: 'Session files retrieved', 
          success: true,
          sessionId,
          files,
          count: files.length
        },
        { status: 200 }
      );
    }

    // Get storage statistics
    if (action === 'stats') {
      const stats = getSessionStats();
      return NextResponse.json(
        { 
          message: 'Storage statistics retrieved', 
          success: true,
          stats
        },
        { status: 200 }
      );
    }

    // Clean up expired sessions
    if (action === 'expired') {
      const result = await cleanupExpiredSessions();
      return NextResponse.json(
        { 
          message: 'Expired sessions cleaned up', 
          success: true,
          sessionsDeleted: result.sessionsDeleted,
          filesDeleted: result.filesDeleted
        },
        { status: 200 }
      );
    }

    return NextResponse.json(
      { 
        message: 'Invalid action. Use ?action=stats, ?action=expired, or ?action=files&sessionId=xxx',
        success: false 
      },
      { status: 400 }
    );
  } catch (error) {
    console.error('Cleanup GET error:', error);
    return NextResponse.json(
      { 
        message: 'Failed to process cleanup request', 
        success: false,
        error: String(error)
      },
      { status: 500 }
    );
  }
}
