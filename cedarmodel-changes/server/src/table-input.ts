import { Workbook } from 'exceljs';
import { z } from 'zod';

export const MAX_FILE_BYTES = 2 * 1024 * 1024;
export const MAX_SHEET_ROWS = 5000;

export class TableInputError extends Error {}

/** Either CSV text, or a base64 .xlsx file. Both end up as CSV text for the shared parsers. */
export const tableInputSchema = z
  .object({
    csv: z.string().max(2_000_000).optional(),
    xlsxBase64: z.string().max(3_000_000).optional(),
  })
  .refine((value) => Boolean(value.csv) || Boolean(value.xlsxBase64), { message: 'Choose a file to upload.' });

export type TableInput = z.infer<typeof tableInputSchema>;

function csvCell(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

export async function tableInputToCsv(input: TableInput): Promise<string> {
  if (input.csv) return input.csv;

  const buffer = Buffer.from(input.xlsxBase64 ?? '', 'base64');
  if (buffer.length === 0 || buffer.length > MAX_FILE_BYTES) {
    throw new TableInputError('The file is empty or larger than 2 MB.');
  }

  const workbook = new Workbook();
  try {
    await workbook.xlsx.load(buffer as never);
  } catch {
    throw new TableInputError('That file is not a valid .xlsx workbook. Save it as .xlsx or .csv and try again.');
  }

  const sheet = workbook.worksheets[0];
  if (!sheet) throw new TableInputError('The workbook has no sheets.');

  const columns = Math.min(sheet.columnCount, 50);
  const lines: string[] = [];

  sheet.eachRow({ includeEmpty: false }, (row) => {
    if (lines.length > MAX_SHEET_ROWS) return;
    const cells: string[] = [];
    for (let column = 1; column <= columns; column += 1) {
      cells.push(String(row.getCell(column).text ?? '').trim());
    }
    if (cells.every((cell) => cell === '')) return;
    lines.push(cells.map(csvCell).join(','));
  });

  return lines.join('\n');
}
