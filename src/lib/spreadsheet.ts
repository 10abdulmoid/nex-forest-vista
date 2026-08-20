import {
  COLS,
  DEFAULT_COL_W,
  DEFAULT_ROW_H,
  MIN_COL_W,
  MIN_ROW_H,
  ROWS,
  colLetter,
  defaultWorkbook,
  emptyGrid,
  newSheet,
  type ExcelSheetState,
  type ExcelWorkbook,
} from "./excel-engine";
import { supabase } from "./supabase";

export type { CellStyle, ExcelSheetState, ExcelWorkbook, Merge, NumberFmt } from "./excel-engine";

export type SheetColumn = {
  id: string;
  name: string;
  width?: number;
  rowHeights?: number[];
  excel?: ExcelWorkbook;
  hub?: ReportHub;
};
export type SheetRow = { id: string; cells: Record<string, string>; ri?: number };
export type ReportStatus = "draft" | "submitted";

export type SpreadsheetDoc = {
  id?: string;
  user_id?: string;
  username?: string | null;
  district?: string | null;
  title?: string | null;
  status?: ReportStatus;
  columns: SheetColumn[];
  rows: SheetRow[];
  created_at?: string;
  submitted_at?: string;
  updated_at?: string;
  includeAbstract?: boolean;
  abstract?: { columns: SheetColumn[]; rows: SheetRow[] } | null;
};

export function newId() {
  return crypto.randomUUID();
}

export function bookFromDoc(columns: SheetColumn[], rows: SheetRow[]): ExcelWorkbook {
  const stored = columns[0]?.excel;
  if (stored?.sheets?.length) {
    const base = defaultWorkbook();
    return {
      ...base,
      ...stored,
      sheets: stored.sheets.map((s, i) => ({
        ...newSheet(s.name || `Sheet${i + 1}`),
        ...s,
        grid: Array.isArray(s.grid) && s.grid.length ? s.grid : emptyGrid(),
      })),
      active: Math.min(stored.active ?? 0, stored.sheets.length - 1),
    };
  }
  const colCount = Math.max(COLS, columns.length || COLS);
  const indexed = rows.some((row) => typeof row.ri === "number");
  const rowCount = indexed
    ? Math.max(ROWS, ...rows.map((row) => (row.ri ?? 0) + 1), 2)
    : Math.max(ROWS, rows.length + 1);
  const grid = Array.from({ length: rowCount }, (_, r) =>
    Array.from({ length: colCount }, (_, c) => {
      if (r === 0) return columns[c]?.name ?? "";
      if (indexed) {
        const row = rows.find((item) => item.ri === r);
        const col = columns[c];
        return col && row ? (row.cells[col.id] ?? "") : "";
      }
      const row = rows[r - 1];
      const col = columns[c];
      return col && row ? (row.cells[col.id] ?? "") : "";
    }),
  );
  const sheet = newSheet("Sheet1", grid);
  sheet.colWidths = Array.from({ length: colCount }, (_, c) => {
    const w = columns[c]?.width;
    return typeof w === "number" && w >= MIN_COL_W ? w : DEFAULT_COL_W;
  });
  const storedHeights = columns.find((col) => Array.isArray(col.rowHeights))?.rowHeights;
  sheet.rowHeights = Array.from({ length: rowCount }, (_, r) => {
    const h = storedHeights?.[r];
    return typeof h === "number" && h >= MIN_ROW_H ? h : DEFAULT_ROW_H;
  });
  return { ...defaultWorkbook(), sheets: [sheet] };
}

export function bookToDoc(book: ExcelWorkbook): { columns: SheetColumn[]; rows: SheetRow[] } {
  const sheet = book.sheets[book.active] ?? book.sheets[0];
  if (!sheet) return defaultSpreadsheet();
  const colCount = sheet.grid[0]?.length ?? COLS;
  const columns: SheetColumn[] = Array.from({ length: colCount }, (_, c) => ({
    id: colLetter(c),
    name: sheet.grid[0]?.[c] || colLetter(c),
    width: sheet.colWidths[c] ?? DEFAULT_COL_W,
  }));
  const metaRows = new Set<number>();
  for (const key of Object.keys(sheet.styles)) {
    const r = Number(key.slice(0, key.indexOf(":")));
    if (r > 0) metaRows.add(r);
  }
  for (const key of Object.keys(sheet.comments)) {
    const r = Number(key.slice(0, key.indexOf(":")));
    if (r > 0) metaRows.add(r);
  }
  const rows: SheetRow[] = [];
  for (let r = 1; r < sheet.grid.length; r++) {
    const cells: Record<string, string> = {};
    let empty = true;
    for (let c = 0; c < colCount; c++) {
      const v = sheet.grid[r]?.[c] ?? "";
      if (v !== "") empty = false;
      cells[columns[c]!.id] = v;
    }
    if (!empty || metaRows.has(r)) rows.push({ id: `r${r}`, cells, ri: r });
  }
  if (!rows.length) rows.push({ id: "r1", cells: {}, ri: 1 });
  if (columns[0]) {
    columns[0].rowHeights = sheet.rowHeights;
    columns[0].excel = book;
  }
  return { columns, rows };
}

export function compactSheet(sheet: ExcelSheetState): ExcelSheetState {
  const grid = sheet.grid;
  const usedCols = new Set<number>();
  const usedRows = new Set<number>();
  for (let r = 0; r < grid.length; r++) {
    for (let c = 0; c < (grid[r]?.length ?? 0); c++) {
      const filled = String(grid[r]?.[c] ?? "").trim() !== "";
      const styled = Boolean(sheet.styles[`${r}:${c}`] || sheet.comments[`${r}:${c}`]);
      if (filled || styled) {
        if (r > 0) usedRows.add(r);
        usedCols.add(c);
      }
    }
  }
  const bodyCols = new Set<number>();
  for (let r = 1; r < grid.length; r++) {
    for (let c = 0; c < (grid[r]?.length ?? 0); c++) {
      const filled = String(grid[r]?.[c] ?? "").trim() !== "";
      const styled = Boolean(sheet.styles[`${r}:${c}`] || sheet.comments[`${r}:${c}`]);
      if (filled || styled) bodyCols.add(c);
    }
  }
  if (bodyCols.size) {
    usedCols.clear();
    bodyCols.forEach((c) => usedCols.add(c));
    for (let r = 1; r < grid.length; r++) {
      for (const c of bodyCols) {
        const filled = String(grid[r]?.[c] ?? "").trim() !== "";
        const styled = Boolean(sheet.styles[`${r}:${c}`] || sheet.comments[`${r}:${c}`]);
        if (filled || styled) usedRows.add(r);
      }
    }
  }
  if (!usedCols.size) {
    return {
      ...sheet,
      grid: [[""]],
      colWidths: [sheet.colWidths[0] ?? DEFAULT_COL_W],
      rowHeights: [sheet.rowHeights[0] ?? DEFAULT_ROW_H],
      styles: {},
      merges: [],
      comments: {},
      hiddenRows: [],
      hiddenCols: [],
    };
  }
  if (!usedRows.has(0)) usedRows.add(0);
  const cols = [...usedCols].sort((a, b) => a - b);
  const rows = [...usedRows].sort((a, b) => a - b);
  const colMap = new Map(cols.map((c, i) => [c, i]));
  const rowMap = new Map(rows.map((r, i) => [r, i]));
  const styles: ExcelSheetState["styles"] = {};
  for (const [key, value] of Object.entries(sheet.styles)) {
    const [rs, cs] = key.split(":");
    const r = Number(rs);
    const c = Number(cs);
    if (rowMap.has(r) && colMap.has(c)) styles[`${rowMap.get(r)}:${colMap.get(c)}`] = value;
  }
  const comments: ExcelSheetState["comments"] = {};
  for (const [key, value] of Object.entries(sheet.comments)) {
    const [rs, cs] = key.split(":");
    const r = Number(rs);
    const c = Number(cs);
    if (rowMap.has(r) && colMap.has(c)) comments[`${rowMap.get(r)}:${colMap.get(c)}`] = value;
  }
  return {
    ...sheet,
    grid: rows.map((r) => cols.map((c) => grid[r]?.[c] ?? "")),
    colWidths: cols.map((c) => sheet.colWidths[c] ?? DEFAULT_COL_W),
    rowHeights: rows.map((r) => sheet.rowHeights[r] ?? DEFAULT_ROW_H),
    styles,
    comments,
    merges: sheet.merges
      .filter((m) => rowMap.has(m.r1) && colMap.has(m.c1) && rowMap.has(m.r2) && colMap.has(m.c2))
      .map((m) => ({
        r1: rowMap.get(m.r1)!,
        c1: colMap.get(m.c1)!,
        r2: rowMap.get(m.r2)!,
        c2: colMap.get(m.c2)!,
      })),
    hiddenRows: [],
    hiddenCols: [],
  };
}

export function compactDoc(columns: SheetColumn[], rows: SheetRow[]): { columns: SheetColumn[]; rows: SheetRow[] } {
  const book = bookFromDoc(columns, rows);
  book.sheets = book.sheets.map(compactSheet);
  book.sheets = book.sheets.length ? book.sheets : [compactSheet(newSheet("Sheet1"))];
  return bookToDoc(book);
}

export function defaultSpreadsheet(): Pick<SpreadsheetDoc, "columns" | "rows"> {
  const columns: SheetColumn[] = [
    { id: "rotation", name: "Rotation" },
    { id: "area", name: "Area (hectare)" },
    { id: "year", name: "Maintenance Year" },
    { id: "range", name: "Name of the Range" },
  ];
  return {
    columns,
    rows: [{ id: newId(), cells: {} }],
  };
}

export type ReportHub = { version: 1; reports: SpreadsheetDoc[] };

function stripHub(columns: SheetColumn[]): SheetColumn[] {
  return columns.map((col) => {
    const next = { ...col };
    delete next.hub;
    return next;
  });
}

function reportsFromEnvelope(doc: SpreadsheetDoc): SpreadsheetDoc[] {
  const hub = doc.columns?.[0]?.hub;
  if (hub?.reports?.length) {
    return hub.reports.map((report) => ({
      ...report,
      user_id: doc.user_id,
      username: doc.username,
      district: doc.district,
    }));
  }
  if (!doc.columns?.length) return [];
  return [
    {
      id: doc.id || newId(),
      user_id: doc.user_id,
      username: doc.username,
      district: doc.district,
      title: "Plantation report",
      status: "submitted",
      columns: stripHub(doc.columns),
      rows: Array.isArray(doc.rows) ? doc.rows : [],
      created_at: doc.updated_at,
      submitted_at: doc.updated_at,
      updated_at: doc.updated_at,
    },
  ];
}

export async function loadMyReports(userId: string) {
  const envelope = await loadMySpreadsheet(userId);
  if (!envelope) return [];
  return reportsFromEnvelope(envelope).sort((a, b) => (b.updated_at || "").localeCompare(a.updated_at || ""));
}

export async function loadMySpreadsheet(userId: string) {
  const { data, error } = await supabase
    .from("spreadsheets")
    .select("id, user_id, username, district, columns, rows, updated_at")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return data as SpreadsheetDoc | null;
}

export async function loadAllSpreadsheets() {
  const { data, error } = await supabase
    .from("spreadsheets")
    .select("id, user_id, username, district, columns, rows, updated_at")
    .order("district", { ascending: true });
  if (error) throw error;
  return (data ?? []).flatMap((doc) =>
    reportsFromEnvelope(doc as SpreadsheetDoc).filter((report) => report.status === "submitted"),
  );
}

export async function saveReport(input: {
  id?: string;
  userId: string;
  username: string;
  district: string;
  title: string;
  status: ReportStatus;
  columns: SheetColumn[];
  rows: SheetRow[];
  createdAt?: string;
  includeAbstract?: boolean;
  abstract?: { columns: SheetColumn[]; rows: SheetRow[] } | null;
}) {
  const envelope = await loadMySpreadsheet(input.userId);
  const reports = envelope ? reportsFromEnvelope(envelope) : [];
  const now = new Date().toISOString();
  const id = input.id || newId();
  const existing = reports.find((r) => r.id === id);
  const createdAt = existing?.created_at || input.createdAt || now;
  const submittedAt =
    input.status === "submitted" ? existing?.submitted_at || now : existing?.submitted_at;
  const main = input.status === "submitted" ? compactDoc(input.columns, input.rows) : { columns: stripHub(input.columns), rows: input.rows };
  const abstract =
    input.includeAbstract && input.abstract
      ? input.status === "submitted"
        ? compactDoc(input.abstract.columns, input.abstract.rows)
        : { columns: stripHub(input.abstract.columns), rows: input.abstract.rows }
      : null;
  const next: SpreadsheetDoc = {
    id,
    user_id: input.userId,
    username: input.username,
    district: input.district,
    title: input.title.trim() || "Plantation report",
    status: input.status,
    columns: main.columns,
    rows: main.rows,
    created_at: createdAt,
    submitted_at: submittedAt,
    updated_at: now,
    includeAbstract: Boolean(input.includeAbstract && abstract),
    abstract,
  };
  const idx = reports.findIndex((r) => r.id === id);
  if (idx >= 0) reports[idx] = next;
  else reports.unshift(next);

  const columns: SheetColumn[] = [
    {
      id: "hub",
      name: "Reports",
      hub: { version: 1, reports },
    },
  ];
  const { data, error } = await supabase
    .from("spreadsheets")
    .upsert(
      {
        user_id: input.userId,
        username: input.username,
        district: input.district,
        columns,
        rows: [],
        updated_at: now,
      },
      { onConflict: "user_id" },
    )
    .select("id, updated_at")
    .single();
  if (error) throw error;
  return { id, updated_at: data.updated_at, status: input.status, title: next.title };
}

export async function deleteReport(input: { userId: string; reportId: string }) {
  const envelope = await loadMySpreadsheet(input.userId);
  if (!envelope) return;
  const reports = reportsFromEnvelope(envelope);
  const target = reports.find((r) => r.id === input.reportId);
  if (!target) return;
  if (target.status === "submitted") throw new Error("Submitted reports cannot be deleted.");
  const remaining = reports.filter((r) => r.id !== input.reportId);
  const now = new Date().toISOString();
  const columns: SheetColumn[] = [
    {
      id: "hub",
      name: "Reports",
      hub: { version: 1, reports: remaining },
    },
  ];
  const { error } = await supabase
    .from("spreadsheets")
    .upsert(
      {
        user_id: input.userId,
        username: envelope.username,
        district: envelope.district,
        columns,
        rows: [],
        updated_at: now,
      },
      { onConflict: "user_id" },
    );
  if (error) throw error;
}

export async function saveSpreadsheet(input: {
  userId: string;
  username: string;
  district: string;
  columns: SheetColumn[];
  rows: SheetRow[];
  id?: string;
  title?: string;
  status?: ReportStatus;
}) {
  return saveReport({
    id: input.id,
    userId: input.userId,
    username: input.username,
    district: input.district,
    title: input.title ?? "Plantation report",
    status: input.status ?? "submitted",
    columns: input.columns,
    rows: input.rows,
  });
}
