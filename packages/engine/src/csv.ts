import type { Row } from './types.ts';

/**
 * Parse CSV text into rows of strings. Handles quoted fields, escaped quotes (""),
 * commas and newlines inside quotes, CRLF line endings, a UTF-8 BOM, and
 * semicolon- or tab-separated files (detected from the header line).
 */
export function parseCsv(text: string): { columns: string[]; rows: Row[] } {
  const src = text.replace(/^\uFEFF/, '');
  const firstLine = src.slice(0, src.search(/\r?\n|$/));
  const delimiter = [',', ';', '\t'].reduce((best, d) => (count(firstLine, d) > count(firstLine, best) ? d : best), ',');

  const records: string[][] = [];
  let record: string[] = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (quoted) {
      if (ch === '"' && src[i + 1] === '"') {
        field += '"';
        i++;
      } else if (ch === '"') {
        quoted = false;
      } else {
        field += ch;
      }
    } else if (ch === '"' && field === '') {
      quoted = true;
    } else if (ch === delimiter) {
      record.push(field);
      field = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && src[i + 1] === '\n') i++;
      record.push(field);
      records.push(record);
      record = [];
      field = '';
    } else {
      field += ch;
    }
  }
  if (field !== '' || record.length) {
    record.push(field);
    records.push(record);
  }

  const [header = [], ...body] = records.filter((r) => r.some((c) => c.trim() !== ''));
  const names = header.map((h, i) => h.trim() || `column_${i + 1}`);
  return { columns: names, rows: body.map((r) => Object.fromEntries(names.map((n, i) => [n, (r[i] ?? '').trim()]))) };
}

function count(s: string, ch: string): number {
  let n = 0;
  let quoted = false;
  for (const c of s) {
    if (c === '"') quoted = !quoted;
    else if (c === ch && !quoted) n++;
  }
  return n;
}
