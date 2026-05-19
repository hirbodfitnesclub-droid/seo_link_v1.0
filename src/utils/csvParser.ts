import Papa from 'papaparse';
import { CATEGORIES } from '@/constants/categories';

export interface ParsedRow {
  title: string;
  categories: string; // JSON stringify of categories object
}

export interface ParseResult {
  rows: ParsedRow[];
  totalCount: number;
}

export function parseCSV(file: File): Promise<ParseResult> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const data = results.data as Record<string, string>[];
        
        if (data.length === 0) {
          return reject(new Error('فایل CSV خالی است.'));
        }

        // Validate headers
        if (!Object.keys(data[0]).includes('عنوان_H1')) {
          return reject(new Error('ستون "عنوان_H1" در فایل CSV یافت نشد. این ستون اجباری است.'));
        }

        const categoryNames = CATEGORIES.map(c => c.name);

        const rows: ParsedRow[] = data.map((row) => {
          const categoriesObj: Record<string, string | null> = {};
          
          for (const catName of categoryNames) {
            const val = row[catName];
            categoriesObj[catName] = (val === undefined || val === null || String(val).trim() === '') ? null : String(val).trim();
          }

          const titleVal = row['عنوان_H1'];
          const title = (titleVal === undefined || titleVal === null) ? '' : String(titleVal).trim();

          return {
            title,
            categories: JSON.stringify(categoriesObj),
          }
        }).filter(row => row.title !== ''); // Filter out rows without a title

        resolve({
          rows,
          totalCount: rows.length,
        });
      },
      error: (error) => {
        reject(new Error(`خطا در پارس CSV: ${error.message}`));
      }
    });
  });
}
