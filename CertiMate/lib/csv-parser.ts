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

  // Simple CSV parser that handles quoted fields
  const parseLine = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    
    // Remove quotes and clean text values
    return result.map(val => {
      // Remove surrounding quotes
      let cleaned = val.replace(/^"(.*)"$/, '$1').trim();
      
      // Replace non-ASCII characters with spaces or remove them
      // Keep only printable ASCII characters (32-126) plus common extended chars
      cleaned = cleaned.replace(/[^\x20-\x7E\xA0-\xFF]/g, '');
      
      // Remove any remaining control characters
      cleaned = cleaned.replace(/[\x00-\x1F\x7F]/g, '');
      
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
