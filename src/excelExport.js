// Builds an .xlsx file in the browser from an answer that is already on screen.
// No server call and no AI call, so it is instant, and it can only contain data
// the user was already allowed to see.

const EXCEL_WORDS = /(excel|xlsx|\.xls\b|spreadsheet|एक्सेल)/i;
const ASK_WORDS =
  /(\bdo\b|\bde\b|\bdedo\b|de do|chahiye|chahie|chaahiye|bhejo|bhej|banao|bana do|generate|export|download|nikalo|nikal|send|give|want|need|\bfile\b|दो|चाहिए|दे)/i;

// True for messages like "iska excel file do" or "give me this in excel".
export function wantsExcel(text) {
  return EXCEL_WORDS.test(text) && ASK_WORDS.test(text);
}

// "iska excel do" -> reuse the last answer. "give me last week scoring in
// excel file" -> a fresh question: answer it, then download that answer.
export function excelRequest(text) {
  const question = text
    .replace(
      /\b(in|as|into|ka|ki|ke|me|mein)?\s*(an?\s+)?(excel|xlsx|spreadsheet|एक्सेल)\s*(file|sheet|format)?/gi,
      ' '
    )
    .replace(/\s+/g, ' ')
    .trim();
  const rest = question
    .replace(
      /\b(give me|send me|please|plz|mujhe|iska|iski|iske|this|it|do|de|dedo|chahiye|chahie|download|export|generate|banao|bhejo|file|want|need|can you|could you|kar|karo)\b/gi,
      ' '
    )
    .split(/\s+/)
    .filter((w) => w.length > 1);
  return { fresh: rest.length >= 2, question };
}

function cleanCell(s) {
  return s
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/\*\*|__|`/g, '')
    .trim();
}

function splitRow(line) {
  let s = line.trim();
  if (s.startsWith('|')) s = s.slice(1);
  if (s.endsWith('|')) s = s.slice(0, -1);
  return s.split('|').map(cleanCell);
}

const SEPARATOR = /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/;

// Finds every markdown table in the answer.
function tablesFrom(markdown) {
  const tables = [];
  let current = [];
  const flush = () => {
    if (current.length >= 2) tables.push(current);
    current = [];
  };
  for (const line of markdown.split('\n')) {
    if (line.trim().startsWith('|')) {
      if (!SEPARATOR.test(line)) current.push(splitRow(line));
    } else {
      flush();
    }
  }
  flush();
  return tables;
}

// No table in the answer: keep the text, one line per row.
function linesFrom(markdown) {
  const rows = [['Answer']];
  for (const raw of markdown.split('\n')) {
    const t = cleanCell(raw.replace(/^\s*(#+|[-*]|\d+[.)])\s+/, ''));
    if (t) rows.push([t]);
  }
  return [rows];
}

// "12" and "-83.33" become real numbers; "007" or "PB65AH3159" stay text.
function toValue(s) {
  if (/^-?(0|[1-9]\d*)(\.\d+)?$/.test(s)) return Number(s);
  return s;
}

function pad(rows) {
  const width = Math.max(...rows.map((r) => r.length));
  return rows.map((r) => [...r, ...Array(width - r.length).fill('')]);
}

export async function downloadExcel(markdown) {
  const XLSX = await import('xlsx');
  let tables = tablesFrom(markdown);
  if (tables.length === 0) tables = linesFrom(markdown);

  const wb = XLSX.utils.book_new();
  let rowCount = 0;
  tables.forEach((raw, i) => {
    const rows = pad(raw).map((r, ri) => (ri === 0 ? r : r.map(toValue)));
    rowCount += rows.length - 1;
    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws['!cols'] = rows[0].map((_, c) => ({
      wch: Math.min(
        50,
        Math.max(10, ...rows.map((r) => String(r[c] ?? '').length + 2))
      )
    }));
    XLSX.utils.book_append_sheet(
      wb,
      ws,
      tables.length === 1 ? 'Data' : `Table ${i + 1}`
    );
  });

  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  const name = `oasis-site-desk-${d.getFullYear()}${p(d.getMonth() + 1)}${p(
    d.getDate()
  )}-${p(d.getHours())}${p(d.getMinutes())}.xlsx`;
  XLSX.writeFile(wb, name);
  return { name, tables: tables.length, rows: rowCount };
}
