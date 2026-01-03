import { writeFile, readFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

export async function saveFile(file: File, directory: string): Promise<string> {
  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  // Use /tmp directory on Vercel (serverless), local public directory otherwise
  const isVercel = process.env.VERCEL === '1';
  const baseDir = isVercel ? '/tmp' : path.join(process.cwd(), 'public');
  const normalizedDir = directory.startsWith('/') ? directory.slice(1) : directory;
  const uploadDir = path.join(baseDir, normalizedDir);
  
  if (!existsSync(uploadDir)) {
    await mkdir(uploadDir, { recursive: true });
  }

  // Generate unique filename
  const timestamp = Date.now();
  const filename = `${timestamp}-${file.name}`;
  const filepath = path.join(uploadDir, filename);

  // Save file
  await writeFile(filepath, buffer);

  // Return the path (absolute for Vercel, relative for local)
  return isVercel ? filepath : `${directory}/${filename}`;
}

export async function readFileContent(filepath: string): Promise<string> {
  // Handle both absolute paths (Vercel /tmp) and relative paths (local)
  const normalizedPath = filepath.startsWith('/') ? filepath.slice(1) : filepath;
  const fullPath = filepath.startsWith('/tmp') 
    ? filepath 
    : path.join(process.cwd(), 'public', normalizedPath);
  const content = await readFile(fullPath, 'utf-8');
  return content;
}

export async function readFileBuffer(filepath: string): Promise<Buffer> {
  // Handle both absolute paths (Vercel /tmp) and relative paths (local)
  const normalizedPath = filepath.startsWith('/') ? filepath.slice(1) : filepath;
  const fullPath = filepath.startsWith('/tmp') 
    ? filepath 
    : path.join(process.cwd(), 'public', normalizedPath);
  const content = await readFile(fullPath);
  return content;
}
