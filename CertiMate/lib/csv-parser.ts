export interface CSVData {
  headers: string[];
  rows: string[][];
  rowCount: number;
}

export function parseCSV(content: string): CSVData {
  // Handle both \n and \r\n line endings
  const lines = content.split(/\r?\n/).filter(line => line.trim());
  
  if (lines.length === 0) {
    throw new Error('CSV file is empty');
  }

  // Parse headers
  const headers = lines[0].split(',').map(h => h.trim());
  
  // Parse rows
  const rows = lines.slice(1).map(line => {
    return line.split(',').map(cell => cell.trim());
  });

  return {
    headers,
    rows,
    rowCount: rows.length
  };
}

export function getPlaceholdersFromTemplate(templateText: string): string[] {
  const placeholderRegex = /\{\{(\w+)\}\}/g;
  const matches = templateText.matchAll(placeholderRegex);
  const placeholders = Array.from(matches, m => m[1]);
  return [...new Set(placeholders)]; // Remove duplicates
}
