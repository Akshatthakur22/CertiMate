export interface CSVData {
  headers: string[];
  rows: string[][];
  rowCount: number;
}

export function parseCSV(content: string): CSVData {
  // Remove BOM if present
  if (content.charCodeAt(0) === 0xFEFF) {
    content = content.slice(1);
  }
  
  // Handle both \n and \r\n line endings
  const lines = content.split(/\r?\n/).filter(line => line.trim());
  
  if (lines.length === 0) {
    throw new Error('CSV file is empty');
  }

  // Robust CSV parser that handles quoted fields and escaped quotes
  const parseLine = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    let i = 0;
    
    while (i < line.length) {
      const char = line[i];
      
      if (char === '"') {
        // Handle escaped quotes ("" -> ")
        if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++; // Skip the escaped quote
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
      i++;
    }
    
    result.push(current.trim());
    
    // Clean values but preserve Unicode characters and proper formatting
    return result.map(val => {
      let cleaned = val;
      
      // Remove surrounding quotes if present
      if (cleaned.startsWith('"') && cleaned.endsWith('"')) {
        cleaned = cleaned.slice(1, -1);
      }
      
      // Only remove actual control characters (not printable chars)
      // Keep Unicode letters, numbers, punctuation, emojis
      cleaned = cleaned.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
      
      return cleaned;
    });
  };

  // Parse headers
  const headers = parseLine(lines[0]);
  
  // Parse rows
  const rows = lines.slice(1).map(line => parseLine(line));

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
