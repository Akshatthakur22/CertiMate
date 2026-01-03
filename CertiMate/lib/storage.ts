import { writeFile, readFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

export async function saveFile(file: File, directory: string): Promise<string> {
  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  // Create directory if it doesn't exist
  const uploadDir = path.join(process.cwd(), 'public', directory);
  if (!existsSync(uploadDir)) {
    await mkdir(uploadDir, { recursive: true });
  }

  // Generate unique filename
  const timestamp = Date.now();
  const filename = `${timestamp}-${file.name}`;
  const filepath = path.join(uploadDir, filename);

  // Save file
  await writeFile(filepath, buffer);

  // Return public path
  return `${directory}/${filename}`;
}

export async function readFileContent(filepath: string): Promise<string> {
  const fullPath = path.join(process.cwd(), 'public', filepath);
  const content = await readFile(fullPath, 'utf-8');
  return content;
}

export async function readFileBuffer(filepath: string): Promise<Buffer> {
  const fullPath = path.join(process.cwd(), 'public', filepath);
  const content = await readFile(fullPath);
  return content;
}
