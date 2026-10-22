import * as XLSX from 'xlsx';

export interface ExportSheetData {
  sheetName: string;
  headers: string[];
  rows: (Record<string, any> | any[])[];
}

export function generateMultiSheetExcel(sheets: ExportSheetData[]): Buffer {
  const workbook = XLSX.utils.book_new();
  const usedSheetNames = new Set<string>();

  sheets.forEach((sheet, index) => {
    // Sanitize sheet name: max 31 characters, remove forbidden characters \ / ? * : [ ]
    let cleanName = (sheet.sheetName || `Sheet${index + 1}`)
      .replace(/[\\/?*:[\]]/g, '_')
      .trim();

    if (!cleanName) {
      cleanName = `Sheet${index + 1}`;
    }
    if (cleanName.length > 28) {
      cleanName = cleanName.substring(0, 28);
    }

    // Ensure unique name
    let finalName = cleanName;
    let counter = 1;
    while (usedSheetNames.has(finalName.toLowerCase())) {
      finalName = `${cleanName.substring(0, 25)}_${counter++}`;
    }
    usedSheetNames.add(finalName.toLowerCase());

    // Prepare table data in AOA (Array of Arrays) format
    const headers = sheet.headers && sheet.headers.length > 0 ? sheet.headers : ['内容'];
    const aoaData: any[][] = [headers];

    if (Array.isArray(sheet.rows)) {
      sheet.rows.forEach((row) => {
        if (Array.isArray(row)) {
          aoaData.push(row);
        } else if (typeof row === 'object' && row !== null) {
          const rowArray = headers.map((header) => {
            const val = row[header];
            if (val === undefined || val === null) return '';
            if (typeof val === 'object') return JSON.stringify(val);
            return val;
          });
          aoaData.push(rowArray);
        } else {
          aoaData.push([String(row)]);
        }
      });
    }

    // Fallback if empty
    if (aoaData.length === 1) {
      aoaData.push(headers.map(() => ''));
    }

    const worksheet = XLSX.utils.aoa_to_sheet(aoaData);

    // Auto-compute column widths
    const colWidths = headers.map((header, colIndex) => {
      let maxLen = String(header).length * 2; // rough width for CJK
      aoaData.forEach((row) => {
        const cellValue = row[colIndex];
        if (cellValue !== undefined && cellValue !== null) {
          const str = String(cellValue);
          // Count non-ascii as 2 chars, ascii as 1
          let len = 0;
          for (let i = 0; i < str.length; i++) {
            len += str.charCodeAt(i) > 255 ? 2 : 1;
          }
          if (len > maxLen) {
            maxLen = len;
          }
        }
      });
      // Clamp between min 12 and max 60
      return { wch: Math.min(Math.max(maxLen + 2, 12), 65) };
    });

    worksheet['!cols'] = colWidths;

    XLSX.utils.book_append_sheet(workbook, worksheet, finalName);
  });

  const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  return buffer;
}
