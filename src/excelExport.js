// Builds an .xlsx file in the browser from an answer that is already on screen.
// No server call and no AI call, so it is instant, and it can only contain data
// the user was already allowed to see.
//
// Weekly scoring answers (Name / KRA / KPI / Current Week ...) are laid out like
// the MIS Summary Sheet: one block per employee. Everything else becomes a plain
// table (one Excel sheet per markdown table).

const EXCEL_WORDS = /(excel|xlsx|\.xls\b|spreadsheet|एक्सेल)/i;
const ASK_WORDS =
  /(\bdo\b|\bde\b|\bdedo\b|de do|chahiye|chahie|chaahiye|bhejo|bhej|banao|bana do|generate|export|download|nikalo|nikal|send|give|want|need|\bfile\b|दो|चाहिए|दे)/i;

// True for messages like "iska excel file do" or "give me this in excel".
export function wantsExcel(text) {
  return EXCEL_WORDS.test(text) && ASK_WORDS.test(text);
}

// "iska excel do" -> reuse the last answer. "give me last week scoring in
// excel file" -> a fresh question: answer it, then offer that answer as a file.
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

// ---------------------------------------------------------------- parsing

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

// ------------------------------------------------------------ styling bits

const thin = { style: 'thin', color: { argb: 'FF000000' } };
const BORDER = { top: thin, left: thin, bottom: thin, right: thin };
const CENTER = { vertical: 'middle', horizontal: 'center', wrapText: true };
const fill = (argb) => ({ type: 'pattern', pattern: 'solid', fgColor: { argb } });

// Employee name colours, repeated in this order (like the MIS sheet).
const NAME_COLORS = [
  'FFE69138', 'FFB6D7A8', 'FFD9D9D9', 'FF3D85C6',
  'FFFFE599', 'FFD5A6BD', 'FF76A5AF', 'FFF9CB9C'
];

// ------------------------------------------------------- scoring layout

const SCORE_HEADERS = [
  'Task/System', 'KRA', 'KPI', 'Benchmark',
  'Last Week Actual %', 'Current Week Planned', 'Current Week Actual',
  'Current Week Actual %', 'Next Week Planned'
];

function findCol(header, tests) {
  return header.findIndex((h) => tests.some((t) => t.test(h)));
}

// Returns a column map when the table looks like weekly scoring, else null.
function scoringColumns(table) {
  const h = table[0].map((x) => x.toLowerCase());
  const map = {
    name: findCol(h, [/^name$/, /employee/, /task\/system/, /^task/]),
    kra: findCol(h, [/^kra$/]),
    kpi: findCol(h, [/^kpi$/]),
    bench: findCol(h, [/benchmark/]),
    last: findCol(h, [/last week/]),
    planned: findCol(h, [/current week.*planned/, /^planned$/]),
    actual: findCol(h, [/current week actual$/, /current week.*actual(?!.*%)/, /^actual$/]),
    pct: findCol(h, [/current week.*%/, /actual\s*%/]),
    next: findCol(h, [/next week/])
  };
  if (map.name < 0 || map.kra < 0 || map.kpi < 0 || map.planned < 0) return null;
  return map;
}

function addScoringSheet(wb, table, map) {
  const ws = wb.addWorksheet('Weekly Scoring');
  [24, 20, 20, 14, 14, 14, 14, 14, 14].forEach((w, i) => {
    ws.getColumn(i + 1).width = w;
  });

  const get = (row, i) => (i >= 0 && row[i] !== undefined ? row[i] : '');

  // Group rows by employee (a blank name means "same employee as above").
  const groups = [];
  let last = null;
  for (const row of table.slice(1)) {
    const nm = get(row, map.name);
    if (nm) {
      last = { name: nm, rows: [] };
      groups.push(last);
    }
    if (last) last.rows.push(row);
  }

  let r = 1;
  groups.forEach((g, gi) => {
    // "Scores" band above the block
    ws.mergeCells(r, 5, r, 9);
    const band = ws.getCell(r, 5);
    band.value = 'Scores';
    band.alignment = CENTER;
    band.font = { bold: true };
    band.fill = fill('FFF4CCCC');
    for (let c = 5; c <= 9; c++) ws.getCell(r, c).border = BORDER;
    r++;

    // header row
    SCORE_HEADERS.forEach((t, i) => {
      const cell = ws.getCell(r, i + 1);
      cell.value = t;
      cell.font = { bold: true };
      cell.alignment = CENTER;
      cell.border = BORDER;
      cell.fill = fill('FFF3F3F3');
    });
    ws.getRow(r).height = 30;
    r++;

    // data rows
    const first = r;
    g.rows.forEach((row) => {
      const vals = [
        null,
        get(row, map.kra),
        get(row, map.kpi),
        get(row, map.bench),
        get(row, map.last),
        get(row, map.planned),
        get(row, map.actual),
        get(row, map.pct),
        get(row, map.next)
      ];
      vals.forEach((v, i) => {
        const cell = ws.getCell(r, i + 1);
        if (i > 0) cell.value = typeof v === 'string' ? toValue(v) : v;
        cell.alignment = CENTER;
        cell.border = BORDER;
      });
      ws.getRow(r).height = 34;
      r++;
    });

    // employee name, merged over the block's rows
    if (r - 1 > first) ws.mergeCells(first, 1, r - 1, 1);
    const nameCell = ws.getCell(first, 1);
    nameCell.value = g.name;
    nameCell.alignment = CENTER;
    nameCell.font = { size: 12 };
    nameCell.fill = fill(NAME_COLORS[gi % NAME_COLORS.length]);
    for (let rr = first; rr < r; rr++) ws.getCell(rr, 1).border = BORDER;
    r++; // blank line before the next employee
  });
}

// ----------------------------------------------------------- plain tables

function addPlainSheet(wb, rawRows, title) {
  const rows = pad(rawRows).map((r, ri) => (ri === 0 ? r : r.map(toValue)));
  const ws = wb.addWorksheet(title);
  ws.addRows(rows);
  ws.getRow(1).font = { bold: true };
  ws.getRow(1).eachCell((cell) => {
    cell.fill = fill('FFEDEDED');
    cell.border = BORDER;
  });
  ws.columns.forEach((col, c) => {
    col.width = Math.min(
      50,
      Math.max(10, ...rows.map((r) => String(r[c] ?? '').length + 2))
    );
  });
  return rows.length - 1;
}

// ---------------------------------------------------------------- public

function fileName() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `oasis-site-desk-${d.getFullYear()}${p(d.getMonth() + 1)}${p(
    d.getDate()
  )}-${p(d.getHours())}${p(d.getMinutes())}.xlsx`;
}

// Creates the file in memory. Nothing is downloaded until saveExcel() is called.
export async function buildExcel(markdown) {
  const mod = await import('exceljs');
  const ExcelJS = mod.default || mod;
  const wb = new ExcelJS.Workbook();

  let tables = tablesFrom(markdown);
  if (tables.length === 0) tables = linesFrom(markdown);

  let rows = 0;
  tables.forEach((t, i) => {
    const map = scoringColumns(t);
    if (map) {
      addScoringSheet(wb, t, map);
      rows += t.length - 1;
    } else {
      rows += addPlainSheet(
        wb,
        t,
        tables.length === 1 ? 'Data' : `Table ${i + 1}`
      );
    }
  });

  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  });
  return { blob, name: fileName(), tables: tables.length, rows };
}

// Starts the browser download of a file made by buildExcel().
export function saveExcel(file) {
  const url = URL.createObjectURL(file.blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = file.name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

// Build and download in one go (used by the Excel button under an answer).
export async function downloadExcel(markdown) {
  const file = await buildExcel(markdown);
  saveExcel(file);
  return file;
}
