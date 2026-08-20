import {
  DEFAULT_COL_W,
  DEFAULT_ROW_H,
  GUTTER_W,
  cellKey,
  colLetter,
  inSel,
  mergeCovering,
  type CellStyle,
  type ExcelSheetState,
  type ExcelWorkbook,
} from "./excel-engine";

export const HEADER_H = 24;
export const RESIZE_PX = 5;
export const FILL_HANDLE = 8;

export type Hit =
  | { kind: "corner" }
  | { kind: "col"; c: number }
  | { kind: "row"; r: number }
  | { kind: "cell"; r: number; c: number }
  | { kind: "colResize"; c: number }
  | { kind: "rowResize"; r: number }
  | { kind: "fill"; r: number; c: number }
  | { kind: "none" };

export type SheetLayout = {
  cols: number[];
  rows: number[];
  colX: number[];
  rowY: number[];
  totalW: number;
  totalH: number;
};

export function visibleCols(sheet: ExcelSheetState) {
  const hidden = new Set(sheet.hiddenCols);
  const n = sheet.grid[0]?.length ?? 0;
  const cols: number[] = [];
  for (let c = 0; c < n; c++) if (!hidden.has(c)) cols.push(c);
  return cols;
}

export function visibleRows(sheet: ExcelSheetState, rowVisible: (r: number) => boolean) {
  const rows: number[] = [];
  for (let r = 0; r < sheet.grid.length; r++) if (rowVisible(r)) rows.push(r);
  return rows;
}

export function buildLayout(sheet: ExcelSheetState, rowVisible: (r: number) => boolean): SheetLayout {
  const cols = visibleCols(sheet);
  const rows = visibleRows(sheet, rowVisible);
  const colX = [GUTTER_W];
  let x = GUTTER_W;
  for (const c of cols) {
    x += sheet.colWidths[c] ?? DEFAULT_COL_W;
    colX.push(x);
  }
  const rowY = [HEADER_H];
  let y = HEADER_H;
  for (const r of rows) {
    y += sheet.rowHeights[r] ?? DEFAULT_ROW_H;
    rowY.push(y);
  }
  return { cols, rows, colX, rowY, totalW: x, totalH: y };
}

export function colLeft(layout: SheetLayout, c: number) {
  const i = layout.cols.indexOf(c);
  return i < 0 ? 0 : layout.colX[i]!;
}

export function colWidth(layout: SheetLayout, sheet: ExcelSheetState, c: number) {
  return sheet.colWidths[c] ?? DEFAULT_COL_W;
}

export function rowTop(layout: SheetLayout, r: number) {
  const i = layout.rows.indexOf(r);
  return i < 0 ? 0 : layout.rowY[i]!;
}

export function rowHeight(sheet: ExcelSheetState, r: number) {
  return sheet.rowHeights[r] ?? DEFAULT_ROW_H;
}

export function cellBox(layout: SheetLayout, sheet: ExcelSheetState, r: number, c: number) {
  const cover = mergeCovering(sheet.merges, r, c);
  const r1 = cover?.r1 ?? r;
  const c1 = cover?.c1 ?? c;
  const r2 = cover?.r2 ?? r;
  const c2 = cover?.c2 ?? c;
  const x = colLeft(layout, c1);
  const y = rowTop(layout, r1);
  let w = 0;
  let h = 0;
  for (let cc = c1; cc <= c2; cc++) if (layout.cols.includes(cc)) w += colWidth(layout, sheet, cc);
  for (let rr = r1; rr <= r2; rr++) if (layout.rows.includes(rr)) h += rowHeight(sheet, rr);
  return { x, y, w, h, r1, c1 };
}

export function hitTest(
  layout: SheetLayout,
  sheet: ExcelSheetState,
  x: number,
  y: number,
  active: { r: number; c: number },
  editing: boolean,
  readOnly: boolean,
): Hit {
  if (x < 0 || y < 0 || x > layout.totalW || y > layout.totalH) return { kind: "none" };
  if (x < GUTTER_W && y < HEADER_H) return { kind: "corner" };

  if (!readOnly && !editing && y < HEADER_H) {
    for (let i = 0; i < layout.cols.length; i++) {
      const right = layout.colX[i + 1]!;
      if (Math.abs(x - right) <= RESIZE_PX) return { kind: "colResize", c: layout.cols[i]! };
    }
  }
  if (!readOnly && !editing && x < GUTTER_W) {
    for (let i = 0; i < layout.rows.length; i++) {
      const bottom = layout.rowY[i + 1]!;
      if (Math.abs(y - bottom) <= RESIZE_PX) return { kind: "rowResize", r: layout.rows[i]! };
    }
  }

  if (!readOnly && !editing) {
    const box = cellBox(layout, sheet, active.r, active.c);
    if (x >= box.x + box.w - FILL_HANDLE && x <= box.x + box.w + 2 && y >= box.y + box.h - FILL_HANDLE && y <= box.y + box.h + 2) {
      return { kind: "fill", r: active.r, c: active.c };
    }
  }

  if (y < HEADER_H) {
    for (let i = 0; i < layout.cols.length; i++) {
      if (x >= layout.colX[i]! && x < layout.colX[i + 1]!) return { kind: "col", c: layout.cols[i]! };
    }
  }
  if (x < GUTTER_W) {
    for (let i = 0; i < layout.rows.length; i++) {
      if (y >= layout.rowY[i]! && y < layout.rowY[i + 1]!) return { kind: "row", r: layout.rows[i]! };
    }
  }

  let c = layout.cols[0] ?? 0;
  let r = layout.rows[0] ?? 0;
  for (let i = 0; i < layout.cols.length; i++) {
    if (x >= layout.colX[i]! && x < layout.colX[i + 1]!) c = layout.cols[i]!;
  }
  for (let i = 0; i < layout.rows.length; i++) {
    if (y >= layout.rowY[i]! && y < layout.rowY[i + 1]!) r = layout.rows[i]!;
  }
  const cover = mergeCovering(sheet.merges, r, c);
  return { kind: "cell", r: cover?.r1 ?? r, c: cover?.c1 ?? c };
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  ctx.fillRect(x, y, w, h);
}

export function paintSheet(
  canvas: HTMLCanvasElement,
  book: ExcelWorkbook,
  layout: SheetLayout,
  sel: { r1: number; c1: number; r2: number; c2: number },
  active: { r: number; c: number },
  display: string[][] | null,
  opts: {
    editing: boolean;
    draft: string;
    readOnly: boolean;
    zoom: number;
  },
) {
  const sheet = book.sheets[book.active] ?? book.sheets[0];
  if (!sheet) return;
  const dpr = Math.max(1, window.devicePixelRatio || 1);
  const cssW = Math.max(1, Math.ceil(layout.totalW * opts.zoom));
  const cssH = Math.max(1, Math.ceil(layout.totalH * opts.zoom));
  if (canvas.width !== Math.ceil(cssW * dpr) || canvas.height !== Math.ceil(cssH * dpr)) {
    canvas.width = Math.ceil(cssW * dpr);
    canvas.height = Math.ceil(cssH * dpr);
  }
  canvas.style.width = `${cssW}px`;
  canvas.style.height = `${cssH}px`;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.setTransform(dpr * opts.zoom, 0, 0, dpr * opts.zoom, 0, 0);
  ctx.clearRect(0, 0, layout.totalW, layout.totalH);

  ctx.fillStyle = "#ffffff";
  roundRect(ctx, 0, 0, layout.totalW, layout.totalH);

  const line = book.gridlines ? "#d4d4d4" : "transparent";

  for (let i = 0; i < layout.rows.length; i++) {
    const r = layout.rows[i]!;
    const y = layout.rowY[i]!;
    const h = rowHeight(sheet, r);
    for (let j = 0; j < layout.cols.length; j++) {
      const c = layout.cols[j]!;
      const cover = mergeCovering(sheet.merges, r, c);
      if (cover && (cover.r1 !== r || cover.c1 !== c)) continue;
      const box = cellBox(layout, sheet, r, c);
      const cs: CellStyle = sheet.styles[cellKey(r, c)] ?? {};
      const selected = inSel(sel, r, c);
      const isActive = r === active.r && c === active.c;
      ctx.fillStyle = cs.bg || (r === 0 ? "#f8f8f8" : "#ffffff");
      ctx.fillRect(box.x, box.y, box.w, box.h);
      if (selected && !isActive) {
        ctx.fillStyle = "rgba(33,115,70,0.14)";
        ctx.fillRect(box.x, box.y, box.w, box.h);
      }
      if (book.gridlines) {
        ctx.strokeStyle = line;
        ctx.lineWidth = 1;
        ctx.strokeRect(box.x + 0.5, box.y + 0.5, box.w, box.h);
      }
      if (opts.editing && isActive) continue;
      const raw = sheet.grid[r]?.[c] ?? "";
      let text = display?.[r]?.[c] ?? raw;
      if (opts.editing && isActive) text = opts.draft;
      ctx.save();
      ctx.beginPath();
      ctx.rect(box.x + 1, box.y + 1, Math.max(0, box.w - 2), Math.max(0, box.h - 2));
      ctx.clip();
      ctx.fillStyle = cs.fc || (raw.startsWith("=") && !book.showFormulas ? "#217346" : "#222222");
      ctx.font = `${cs.i ? "italic " : ""}${cs.b || r === 0 ? "700" : "400"} ${cs.fs ? cs.fs : 13}px Calibri, Segoe UI, sans-serif`;
      ctx.textBaseline = "middle";
      ctx.textAlign = cs.ha === "c" ? "center" : cs.ha === "r" ? "right" : "left";
      const tx = cs.ha === "c" ? box.x + box.w / 2 : cs.ha === "r" ? box.x + box.w - 4 : box.x + 4;
      const ty = box.y + box.h / 2;
      if (cs.u) {
        const w = ctx.measureText(text).width;
        const lx = cs.ha === "c" ? tx - w / 2 : cs.ha === "r" ? tx - w : tx;
        ctx.fillText(text, tx, ty);
        ctx.strokeStyle = ctx.fillStyle;
        ctx.beginPath();
        ctx.moveTo(lx, ty + 7);
        ctx.lineTo(lx + w, ty + 7);
        ctx.stroke();
      } else {
        ctx.fillText(text, tx, ty);
      }
      ctx.restore();
      if (sheet.comments[cellKey(r, c)]) {
        ctx.fillStyle = "#ed7d31";
        ctx.beginPath();
        ctx.moveTo(box.x + box.w - 8, box.y);
        ctx.lineTo(box.x + box.w, box.y);
        ctx.lineTo(box.x + box.w, box.y + 8);
        ctx.closePath();
        ctx.fill();
      }
    }
  }

  ctx.fillStyle = "#f3f3f3";
  ctx.fillRect(0, 0, layout.totalW, HEADER_H);
  ctx.fillRect(0, 0, GUTTER_W, layout.totalH);
  ctx.strokeStyle = book.gridlines ? "#d4d4d4" : "#e5e5e5";
  ctx.strokeRect(0.5, 0.5, GUTTER_W, HEADER_H);

  ctx.font = "600 11px Segoe UI, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  for (let j = 0; j < layout.cols.length; j++) {
    const c = layout.cols[j]!;
    const x = layout.colX[j]!;
    const w = colWidth(layout, sheet, c);
    const hot = c >= sel.c1 && c <= sel.c2;
    ctx.fillStyle = hot ? "#d3f0e0" : "#f3f3f3";
    ctx.fillRect(x, 0, w, HEADER_H);
    ctx.strokeStyle = "#d4d4d4";
    ctx.strokeRect(x + 0.5, 0.5, w, HEADER_H);
    ctx.fillStyle = hot ? "#217346" : "#666666";
    ctx.fillText(colLetter(c), x + w / 2, HEADER_H / 2);
  }
  for (let i = 0; i < layout.rows.length; i++) {
    const r = layout.rows[i]!;
    const y = layout.rowY[i]!;
    const h = rowHeight(sheet, r);
    const hot = r >= sel.r1 && r <= sel.r2;
    ctx.fillStyle = hot ? "#d3f0e0" : "#f3f3f3";
    ctx.fillRect(0, y, GUTTER_W, h);
    ctx.strokeStyle = "#d4d4d4";
    ctx.strokeRect(0.5, y + 0.5, GUTTER_W, h);
    ctx.fillStyle = hot ? "#217346" : "#666666";
    ctx.fillText(String(r + 1), GUTTER_W / 2, y + h / 2);
  }

  const activeBox = cellBox(layout, sheet, active.r, active.c);
  ctx.strokeStyle = "#217346";
  ctx.lineWidth = 2;
  ctx.strokeRect(activeBox.x + 1, activeBox.y + 1, activeBox.w - 2, activeBox.h - 2);

  if (!opts.readOnly && !opts.editing) {
    ctx.fillStyle = "#217346";
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 1;
    ctx.fillRect(activeBox.x + activeBox.w - FILL_HANDLE + 1, activeBox.y + activeBox.h - FILL_HANDLE + 1, FILL_HANDLE, FILL_HANDLE);
    ctx.strokeRect(activeBox.x + activeBox.w - FILL_HANDLE + 1.5, activeBox.y + activeBox.h - FILL_HANDLE + 1.5, FILL_HANDLE - 1, FILL_HANDLE - 1);
  }
}

export function cursorForHit(hit: Hit): string {
  if (hit.kind === "colResize") return "col-resize";
  if (hit.kind === "rowResize") return "row-resize";
  if (hit.kind === "fill") return "crosshair";
  return "cell";
}
