import { unlink } from 'fs/promises';
import path from 'path';

/**
 * Session-based storage manager
 * Tracks files associated with a user session and cleans them up when done
 */

interface SessionFiles {
  sessionId: string;
  templatePath?: string;
  csvPath?: string;
  certificatePaths: string[];
  createdAt: Date;
  expiresAt: Date;
}

// In-memory session storage (use Redis/DB in production)
const sessions = new Map<string, SessionFiles>();

/**
 * Generate a unique session ID
 */
export function generateSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Create a new session
 */
export function createSession(sessionId: string, expirationHours: number = 24): SessionFiles {
  const now = new Date();
  const session: SessionFiles = {
    sessionId,
    certificatePaths: [],
    createdAt: now,
    expiresAt: new Date(now.getTime() + expirationHours * 60 * 60 * 1000),
  };
  
  sessions.set(sessionId, session);
  return session;
}

/**
 * Get session or create if doesn't exist
 */
export function getSession(sessionId: string): SessionFiles | null {
  return sessions.get(sessionId) || null;
}

/**
 * Add template to session
 */
export function addTemplateToSession(sessionId: string, templatePath: string): void {
  const session = sessions.get(sessionId);
  if (session) {
    session.templatePath = templatePath;
  }
}

/**
 * Add CSV to session
 */
export function addCsvToSession(sessionId: string, csvPath: string): void {
  const session = sessions.get(sessionId);
  if (session) {
    session.csvPath = csvPath;
  }
}

/**
 * Add certificate to session
 */
export function addCertificateToSession(sessionId: string, certificatePath: string): void {
  const session = sessions.get(sessionId);
  if (session) {
    session.certificatePaths.push(certificatePath);
  }
}

/**
 * Add multiple certificates to session
 */
export function addCertificatesToSession(sessionId: string, certificatePaths: string[]): void {
  const session = sessions.get(sessionId);
  if (session) {
    session.certificatePaths.push(...certificatePaths);
  }
}

/**
 * Delete a single file safely
 */
async function deleteFile(filePath: string): Promise<void> {
  try {
    const fullPath = filePath.startsWith('/') 
      ? path.join(process.cwd(), 'public', filePath)
      : path.join(process.cwd(), 'public', filePath);
    
    await unlink(fullPath);
    console.log(`✓ Deleted: ${filePath}`);
  } catch (error) {
    console.error(`✗ Failed to delete ${filePath}:`, error);
  }
}

/**
 * Clean up all files associated with a session
 */
export async function cleanupSession(sessionId: string): Promise<{
  deleted: number;
  failed: number;
}> {
  const session = sessions.get(sessionId);
  if (!session) {
    return { deleted: 0, failed: 0 };
  }

  let deleted = 0;
  let failed = 0;

  // Delete template
  if (session.templatePath) {
    try {
      await deleteFile(session.templatePath);
      deleted++;
    } catch {
      failed++;
    }
  }

  // Delete CSV
  if (session.csvPath) {
    try {
      await deleteFile(session.csvPath);
      deleted++;
    } catch {
      failed++;
    }
  }

  // Delete all certificates
  for (const certPath of session.certificatePaths) {
    try {
      await deleteFile(certPath);
      deleted++;
    } catch {
      failed++;
    }
  }

  // Remove session from memory
  sessions.delete(sessionId);

  console.log(`Session ${sessionId} cleanup: ${deleted} deleted, ${failed} failed`);
  return { deleted, failed };
}

/**
 * Clean up expired sessions (run periodically)
 */
export async function cleanupExpiredSessions(): Promise<{
  sessionsDeleted: number;
  filesDeleted: number;
}> {
  const now = new Date();
  let sessionsDeleted = 0;
  let filesDeleted = 0;

  for (const [sessionId, session] of sessions.entries()) {
    if (session.expiresAt < now) {
      const result = await cleanupSession(sessionId);
      sessionsDeleted++;
      filesDeleted += result.deleted;
    }
  }

  console.log(`Expired sessions cleanup: ${sessionsDeleted} sessions, ${filesDeleted} files`);
  return { sessionsDeleted, filesDeleted };
}

/**
 * Get session statistics
 */
export function getSessionStats() {
  const now = new Date();
  const activeSessions = Array.from(sessions.values()).filter(
    s => s.expiresAt > now
  ).length;
  
  const expiredSessions = Array.from(sessions.values()).filter(
    s => s.expiresAt <= now
  ).length;
  
  const totalFiles = Array.from(sessions.values()).reduce((sum, session) => {
    let count = session.certificatePaths.length;
    if (session.templatePath) count++;
    if (session.csvPath) count++;
    return sum + count;
  }, 0);

  return {
    activeSessions,
    expiredSessions,
    totalFiles,
    totalSessions: sessions.size,
  };
}

/**
 * List all files in a session
 */
export function getSessionFiles(sessionId: string): string[] {
  const session = sessions.get(sessionId);
  if (!session) return [];

  const files: string[] = [];
  if (session.templatePath) files.push(session.templatePath);
  if (session.csvPath) files.push(session.csvPath);
  files.push(...session.certificatePaths);

  return files;
}
