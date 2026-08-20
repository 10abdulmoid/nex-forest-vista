export type NumberFmt = "g" | "n" | "c" | "p" | "d" | "t";

export type CellStyle = {
  b?: boolean;
  i?: boolean;
  u?: boolean;
  fs?: number;
  fc?: string;
  bg?: string;
  ha?: "l" | "c" | "r";
  wrap?: boolean;
  fmt?: NumberFmt;
  dec?: number;
};

export type Merge = { r1: number; c1: number; r2: number; c2: number };

export type ExcelSheetState = {
  name: string;
  grid: string[][];
  colWidths: number[];
  rowHeights: number[];
  styles: Record<string, CellStyle>;
  merges: Merge[];
  freezeR: number;
  freezeC: number;
  hiddenRows: number[];
  hiddenCols: number[];
  comments: Record<string, string>;
  filterOn?: boolean;
  filters?: Record<string, string[]>;
};

export type ExcelWorkbook = {
  sheets: ExcelSheetState[];
  active: number;
  zoom: number;
  showFormulas: boolean;
  gridlines: boolean;
};

export const DEFAULT_COL_W = 96;
export const DEFAULT_ROW_H = 24;
export const MIN_COL_W = 40;
export const MIN_ROW_H = 16;
export const GUTTER_W = 48;
export const COLS = 16;
export const ROWS = 40;

export function colLetter(index: number) {
  let n = index;
  let s = "";
  while (n >= 0) {
    s = String.fromCharCode(65 + (n % 26)) + s;
    n = Math.floor(n / 26) - 1;
  }
  return s;
}

export function cellKey(r: number, c: number) {
  return `${r}:${c}`;
}

export function parseRef(ref: string): { r: number; c: number; absR: boolean; absC: boolean } | null {
  const m = ref.trim().toUpperCase().match(/^(\$?)([A-Z]+)(\$?)(\d+)$/);
  if (!m) return null;
  let c = 0;
  const letters = m[2] ?? "";
  for (const ch of letters) c = c * 26 + (ch.charCodeAt(0) - 64);
  return { r: Number(m[4]) - 1, c: c - 1, absC: m[1] === "$", absR: m[3] === "$" };
}

export function parseRange(expr: string): { r1: number; c1: number; r2: number; c2: number } | null {
  const parts = expr.split(":");
  if (parts.length === 1) {
    const a = parseRef(parts[0] ?? "");
    return a ? { r1: a.r, c1: a.c, r2: a.r, c2: a.c } : null;
  }
  const a = parseRef(parts[0] ?? "");
  const b = parseRef(parts[1] ?? "");
  if (!a || !b) return null;
  return { r1: Math.min(a.r, b.r), c1: Math.min(a.c, b.c), r2: Math.max(a.r, b.r), c2: Math.max(a.c, b.c) };
}

export function toNumber(v: string) {
  const n = Number(String(v).replace(/[,%₹$]/g, "").trim());
  return Number.isFinite(n) ? n : null;
}

export function shiftFormula(raw: string, dr: number, dc: number) {
  if (!raw.startsWith("=")) return raw;
  return raw.replace(/(\$?)([A-Z]+)(\$?)(\d+)/gi, (full, dollarC, letters, dollarR, digits) => {
    const pos = parseRef(`${dollarC}${letters}${dollarR}${digits}`);
    if (!pos) return full;
    const c = pos.absC ? pos.c : pos.c + dc;
    const r = pos.absR ? pos.r : pos.r + dr;
    if (c < 0 || r < 0) return "#REF!";
    return `${pos.absC ? "$" : ""}${colLetter(c)}${pos.absR ? "$" : ""}${r + 1}`;
  });
}

function splitArgs(s: string): string[] {
  const out: string[] = [];
  let cur = "";
  let depth = 0;
  let quote = false;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (ch === '"') quote = !quote;
    else if (!quote && ch === "(") depth += 1;
    else if (!quote && ch === ")") depth -= 1;
    else if (!quote && depth === 0 && ch === ",") {
      out.push(cur.trim());
      cur = "";
      continue;
    }
    cur += ch;
  }
  if (cur.trim() !== "" || out.length) out.push(cur.trim());
  return out.filter((a, i, arr) => a !== "" || i < arr.length - 1 || arr.length === 1);
}

function splitOp(expr: string, op: string): [string, string] | null {
  let depth = 0;
  let quote = false;
  for (let i = 0; i <= expr.length - op.length; i++) {
    const ch = expr[i];
    if (ch === '"') quote = !quote;
    else if (!quote && ch === "(") depth += 1;
    else if (!quote && ch === ")") depth -= 1;
    else if (!quote && depth === 0 && expr.slice(i, i + op.length) === op) {
      const left = expr.slice(0, i).trim();
      const right = expr.slice(i + op.length).trim();
      if (left && right) return [left, right];
    }
  }
  return null;
}

function truthy(v: string) {
  const u = v.trim().toUpperCase();
  if (u === "FALSE" || u === "0" || u === "") return false;
  return true;
}

function matchCriteria(value: string, criteria: string) {
  const c = criteria.replace(/^"|"$/g, "");
  const m = c.match(/^(>=|<=|<>|>|<|=)(.*)$/);
  if (m) {
    const op = m[1];
    const rhs = m[2];
    const ln = toNumber(value);
    const rn = toNumber(rhs ?? "");
    if (ln != null && rn != null) {
      if (op === ">=") return ln >= rn;
      if (op === "<=") return ln <= rn;
      if (op === ">") return ln > rn;
      if (op === "<") return ln < rn;
      if (op === "<>") return ln !== rn;
      return ln === rn;
    }
    if (op === "<>") return value !== rhs;
    return value === rhs;
  }
  if (c.includes("*")) {
    const re = new RegExp("^" + c.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*") + "$", "i");
    return re.test(value);
  }
  return value.toLowerCase() === c.toLowerCase();
}

export function displayRaw(grid: string[][], r: number, c: number, stack = new Set<string>()): string {
  const raw = grid[r]?.[c] ?? "";
  if (!raw.startsWith("=")) return raw;
  const key = `${r}:${c}`;
  if (stack.has(key)) return "#REF!";
  stack.add(key);
  try {
    return evaluateExpr(raw.slice(1), grid, stack);
  } catch {
    return "#VALUE!";
  } finally {
    stack.delete(key);
  }
}

function collect(grid: string[][], range: { r1: number; c1: number; r2: number; c2: number }, stack: Set<string>) {
  const vals: string[] = [];
  for (let r = range.r1; r <= range.r2; r++) {
    for (let c = range.c1; c <= range.c2; c++) vals.push(displayRaw(grid, r, c, stack));
  }
  return vals;
}

function numsOf(vals: string[]) {
  return vals.map(toNumber).filter((n): n is number => n != null);
}

function callFn(name: string, args: string[], grid: string[][], stack: Set<string>): string {
  const ev = (a: string) => evaluateExpr(a, grid, stack);
  const rangeOrVals = (a: string) => {
    const range = parseRange(a);
    return range ? collect(grid, range, stack) : [ev(a)];
  };

  switch (name) {
    case "SUM":
      return String(args.flatMap(rangeOrVals).reduce((s, v) => s + (toNumber(v) ?? 0), 0));
    case "AVERAGE":
    case "AVG": {
      const n = numsOf(args.flatMap(rangeOrVals));
      return n.length ? String(n.reduce((a, b) => a + b, 0) / n.length) : "#DIV/0!";
    }
    case "MIN": {
      const n = numsOf(args.flatMap(rangeOrVals));
      return n.length ? String(Math.min(...n)) : "0";
    }
    case "MAX": {
      const n = numsOf(args.flatMap(rangeOrVals));
      return n.length ? String(Math.max(...n)) : "0";
    }
    case "COUNT":
      return String(numsOf(args.flatMap(rangeOrVals)).length);
    case "COUNTA":
      return String(args.flatMap(rangeOrVals).filter((v) => v !== "").length);
    case "COUNTBLANK":
      return String(args.flatMap(rangeOrVals).filter((v) => v === "").length);
    case "COUNTIF": {
      const range = parseRange(args[0] ?? "");
      if (!range || args[1] == null) return "#N/A";
      const crit = ev(args[1]);
      return String(collect(grid, range, stack).filter((v) => matchCriteria(v, crit)).length);
    }
    case "SUMIF": {
      const range = parseRange(args[0] ?? "");
      if (!range || args[1] == null) return "#N/A";
      const crit = ev(args[1]);
      const sumRange = parseRange(args[2] ?? args[0] ?? "") ?? range;
      const keys = collect(grid, range, stack);
      const vals = collect(grid, sumRange, stack);
      return String(keys.reduce((s, v, i) => s + (matchCriteria(v, crit) ? toNumber(vals[i] ?? "") ?? 0 : 0), 0));
    }
    case "AVERAGEIF": {
      const range = parseRange(args[0] ?? "");
      if (!range || args[1] == null) return "#N/A";
      const crit = ev(args[1]);
      const avgRange = parseRange(args[2] ?? args[0] ?? "") ?? range;
      const keys = collect(grid, range, stack);
      const vals = numsOf(keys.map((v, i) => (matchCriteria(v, crit) ? collect(grid, avgRange, stack)[i] ?? "" : "")));
      return vals.length ? String(vals.reduce((a, b) => a + b, 0) / vals.length) : "#DIV/0!";
    }
    case "IF":
      return truthy(ev(args[0] ?? "FALSE")) ? ev(args[1] ?? "0") : ev(args[2] ?? "0");
    case "IFERROR": {
      const v = ev(args[0] ?? "");
      return v.startsWith("#") ? ev(args[1] ?? "") : v;
    }
    case "AND":
      return args.every((a) => truthy(ev(a))) ? "TRUE" : "FALSE";
    case "OR":
      return args.some((a) => truthy(ev(a))) ? "TRUE" : "FALSE";
    case "NOT":
      return truthy(ev(args[0] ?? "")) ? "FALSE" : "TRUE";
    case "ROUND": {
      const n = toNumber(ev(args[0] ?? "")) ?? 0;
      const d = toNumber(ev(args[1] ?? "0")) ?? 0;
      const f = 10 ** d;
      return String(Math.round(n * f) / f);
    }
    case "ROUNDUP": {
      const n = toNumber(ev(args[0] ?? "")) ?? 0;
      const d = toNumber(ev(args[1] ?? "0")) ?? 0;
      const f = 10 ** d;
      return String(Math.ceil(n * f) / f);
    }
    case "ROUNDDOWN": {
      const n = toNumber(ev(args[0] ?? "")) ?? 0;
      const d = toNumber(ev(args[1] ?? "0")) ?? 0;
      const f = 10 ** d;
      return String(Math.floor(n * f) / f);
    }
    case "ABS":
      return String(Math.abs(toNumber(ev(args[0] ?? "")) ?? 0));
    case "INT":
      return String(Math.trunc(toNumber(ev(args[0] ?? "")) ?? 0));
    case "MOD": {
      const a = toNumber(ev(args[0] ?? "")) ?? 0;
      const b = toNumber(ev(args[1] ?? "")) ?? 1;
      return b === 0 ? "#DIV/0!" : String(a % b);
    }
    case "POWER":
    case "POW":
      return String((toNumber(ev(args[0] ?? "")) ?? 0) ** (toNumber(ev(args[1] ?? "")) ?? 1));
    case "SQRT": {
      const n = toNumber(ev(args[0] ?? "")) ?? 0;
      return n < 0 ? "#NUM!" : String(Math.sqrt(n));
    }
    case "PI":
      return String(Math.PI);
    case "LEN":
      return String(ev(args[0] ?? "").length);
    case "TRIM":
      return ev(args[0] ?? "").replace(/\s+/g, " ").trim();
    case "UPPER":
      return ev(args[0] ?? "").toUpperCase();
    case "LOWER":
      return ev(args[0] ?? "").toLowerCase();
    case "PROPER":
      return ev(args[0] ?? "").replace(/\w\S*/g, (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
    case "LEFT":
      return ev(args[0] ?? "").slice(0, toNumber(ev(args[1] ?? "1")) ?? 1);
    case "RIGHT": {
      const s = ev(args[0] ?? "");
      const n = toNumber(ev(args[1] ?? "1")) ?? 1;
      return s.slice(-n);
    }
    case "MID": {
      const s = ev(args[0] ?? "");
      const start = (toNumber(ev(args[1] ?? "1")) ?? 1) - 1;
      const n = toNumber(ev(args[2] ?? String(s.length))) ?? s.length;
      return s.slice(start, start + n);
    }
    case "CONCAT":
    case "CONCATENATE":
      return args.map(ev).join("");
    case "TEXTJOIN": {
      const delim = ev(args[0] ?? ",");
      const skip = truthy(ev(args[1] ?? "TRUE"));
      const vals = args.slice(2).flatMap(rangeOrVals);
      return (skip ? vals.filter((v) => v !== "") : vals).join(delim);
    }
    case "VALUE":
      return String(toNumber(ev(args[0] ?? "")) ?? 0);
    case "NOW":
      return new Date().toLocaleString("en-IN");
    case "TODAY":
      return new Date().toLocaleDateString("en-IN");
    case "YEAR":
      return String(new Date(ev(args[0] ?? "")).getFullYear() || new Date().getFullYear());
    case "MONTH":
      return String((new Date(ev(args[0] ?? "")).getMonth() || new Date().getMonth()) + 1);
    case "DAY":
      return String(new Date(ev(args[0] ?? "")).getDate() || new Date().getDate());
    case "ISBLANK":
      return ev(args[0] ?? "") === "" ? "TRUE" : "FALSE";
    case "ISNUMBER":
      return toNumber(ev(args[0] ?? "")) != null ? "TRUE" : "FALSE";
    case "ISTEXT":
      return toNumber(ev(args[0] ?? "")) == null && ev(args[0] ?? "") !== "" ? "TRUE" : "FALSE";
    case "TRUE":
      return "TRUE";
    case "FALSE":
      return "FALSE";
    case "RAND":
      return String(Math.random());
    case "RANDBETWEEN": {
      const a = Math.ceil(toNumber(ev(args[0] ?? "1")) ?? 1);
      const b = Math.floor(toNumber(ev(args[1] ?? "10")) ?? 10);
      return String(Math.floor(Math.random() * (b - a + 1)) + a);
    }
    case "NA":
      return "#N/A";
    case "VLOOKUP": {
      const lookup = ev(args[0] ?? "");
      const range = parseRange(args[1] ?? "");
      const idx = (toNumber(ev(args[2] ?? "1")) ?? 1) - 1;
      const exact = String(ev(args[3] ?? "FALSE")).toUpperCase() === "FALSE" || ev(args[3] ?? "") === "0";
      if (!range) return "#N/A";
      let last = "";
      for (let r = range.r1; r <= range.r2; r++) {
        const key = displayRaw(grid, r, range.c1, stack);
        if (exact) {
          if (key.toLowerCase() === lookup.toLowerCase()) return displayRaw(grid, r, range.c1 + idx, stack);
        } else {
          const kn = toNumber(key);
          const ln = toNumber(lookup);
          if (kn != null && ln != null && kn <= ln) last = displayRaw(grid, r, range.c1 + idx, stack);
          else if (key <= lookup) last = displayRaw(grid, r, range.c1 + idx, stack);
        }
      }
      return exact ? "#N/A" : last || "#N/A";
    }
    case "INDEX": {
      const range = parseRange(args[0] ?? "");
      const rr = (toNumber(ev(args[1] ?? "1")) ?? 1) - 1;
      const cc = args[2] != null ? (toNumber(ev(args[2])) ?? 1) - 1 : 0;
      if (!range) return "#REF!";
      return displayRaw(grid, range.r1 + rr, range.c1 + cc, stack);
    }
    case "MATCH": {
      const lookup = ev(args[0] ?? "");
      const range = parseRange(args[1] ?? "");
      if (!range) return "#N/A";
      const vals = collect(grid, range, stack);
      const i = vals.findIndex((v) => v.toLowerCase() === lookup.toLowerCase());
      return i >= 0 ? String(i + 1) : "#N/A";
    }
    default:
      return "#NAME?";
  }
}

function evaluateExpr(expr: string, grid: string[][], stack: Set<string>): string {
  let s = expr.trim();
  if (s.startsWith("+")) s = s.slice(1);
  if (s.startsWith('"') && s.endsWith('"') && s.length >= 2) return s.slice(1, -1);

  const fn = s.match(/^([A-Za-z][A-Za-z0-9.]*)\((.*)\)\s*$/s);
  if (fn) {
    const inner = fn[2] ?? "";
    let depth = 0;
    let ok = true;
    for (const ch of inner) {
      if (ch === "(") depth += 1;
      if (ch === ")") depth -= 1;
      if (depth < 0) ok = false;
    }
    if (ok && depth === 0) return callFn((fn[1] ?? "").toUpperCase(), splitArgs(inner), grid, stack);
  }

  for (const op of ["<>", ">=", "<=", ">", "<", "="] as const) {
    const parts = splitOp(s, op);
    if (parts) {
      const l = evaluateExpr(parts[0], grid, stack);
      const r = evaluateExpr(parts[1], grid, stack);
      const ln = toNumber(l);
      const rn = toNumber(r);
      const cmp = ln != null && rn != null ? ln - rn : l.localeCompare(r);
      if (op === "=") return cmp === 0 ? "TRUE" : "FALSE";
      if (op === "<>") return cmp !== 0 ? "TRUE" : "FALSE";
      if (op === ">") return cmp > 0 ? "TRUE" : "FALSE";
      if (op === "<") return cmp < 0 ? "TRUE" : "FALSE";
      if (op === ">=") return cmp >= 0 ? "TRUE" : "FALSE";
      if (op === "<=") return cmp <= 0 ? "TRUE" : "FALSE";
    }
  }

  const amp = splitOp(s, "&");
  if (amp) return evaluateExpr(amp[0], grid, stack) + evaluateExpr(amp[1], grid, stack);

  let arith = s.replace(/\$?[A-Z]+\$?\d+/gi, (ref) => {
    const pos = parseRef(ref);
    if (!pos) return "0";
    const n = toNumber(displayRaw(grid, pos.r, pos.c, stack));
    return String(n ?? 0);
  });
  arith = arith.replace(/TRUE/gi, "1").replace(/FALSE/gi, "0");
  if (!/^[\d+\-*/().\s]+$/.test(arith)) return "#NAME?";
  try {
    const result = Function(`"use strict"; return (${arith})`)();
    return Number.isFinite(result) ? String(result) : "#VALUE!";
  } catch {
    return "#VALUE!";
  }
}

export function formatDisplay(value: string, style?: CellStyle) {
  if (value.startsWith("#")) return value;
  const fmt = style?.fmt ?? "g";
  const dec = style?.dec ?? (fmt === "c" || fmt === "n" ? 2 : 0);
  const n = toNumber(value);
  if (fmt === "t") return value;
  if (fmt === "d") {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString("en-IN");
  }
  if (n == null) return value;
  if (fmt === "p") return `${(n * (Math.abs(n) <= 1 ? 100 : 1)).toFixed(dec)}%`;
  if (fmt === "c") {
    return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: dec, maximumFractionDigits: dec }).format(n);
  }
  if (fmt === "n") {
    return n.toLocaleString("en-IN", { minimumFractionDigits: dec, maximumFractionDigits: dec });
  }
  return value;
}

export function evaluateGrid(grid: string[][], showFormulas: boolean, styles: Record<string, CellStyle> = {}): string[][] {
  return grid.map((row, r) =>
    row.map((raw, c) => {
      if (showFormulas) return raw;
      return formatDisplay(displayRaw(grid, r, c), styles[cellKey(r, c)]);
    }),
  );
}

export function normSel(a: { r: number; c: number }, b: { r: number; c: number }) {
  return {
    r1: Math.min(a.r, b.r),
    c1: Math.min(a.c, b.c),
    r2: Math.max(a.r, b.r),
    c2: Math.max(a.c, b.c),
  };
}

export function inSel(sel: { r1: number; c1: number; r2: number; c2: number }, r: number, c: number) {
  return r >= sel.r1 && r <= sel.r2 && c >= sel.c1 && c <= sel.c2;
}

export function mergeCovering(merges: Merge[], r: number, c: number) {
  return merges.find((m) => r >= m.r1 && r <= m.r2 && c >= m.c1 && c <= m.c2) ?? null;
}

export function emptyGrid(): string[][] {
  const header = ["Rotation", "Area (hectare)", "Maintenance Year", "Name of the Range", ...Array.from({ length: COLS - 4 }, () => "")];
  const grid = [header];
  for (let r = 1; r < ROWS; r++) grid.push(Array.from({ length: COLS }, () => ""));
  return grid;
}

export function newSheet(name: string, grid?: string[][]): ExcelSheetState {
  const g = grid ?? emptyGrid();
  return {
    name,
    grid: g,
    colWidths: Array.from({ length: g[0]?.length ?? COLS }, () => DEFAULT_COL_W),
    rowHeights: Array.from({ length: g.length }, () => DEFAULT_ROW_H),
    styles: {},
    merges: [],
    freezeR: 0,
    freezeC: 0,
    hiddenRows: [],
    hiddenCols: [],
    comments: {},
    filterOn: false,
    filters: {},
  };
}

export function cloneSheet(sheet: ExcelSheetState): ExcelSheetState {
  return {
    ...sheet,
    grid: sheet.grid.map((row) => row.slice()),
    colWidths: sheet.colWidths.slice(),
    rowHeights: sheet.rowHeights.slice(),
    styles: { ...sheet.styles },
    merges: sheet.merges.map((m) => ({ ...m })),
    hiddenRows: sheet.hiddenRows.slice(),
    hiddenCols: sheet.hiddenCols.slice(),
    comments: { ...sheet.comments },
    filters: { ...(sheet.filters ?? {}) },
  };
}

export function cloneBook(book: ExcelWorkbook): ExcelWorkbook {
  return {
    ...book,
    sheets: book.sheets.map(cloneSheet),
  };
}

export function defaultWorkbook(): ExcelWorkbook {
  return { sheets: [newSheet("Sheet1")], active: 0, zoom: 100, showFormulas: false, gridlines: true };
}
