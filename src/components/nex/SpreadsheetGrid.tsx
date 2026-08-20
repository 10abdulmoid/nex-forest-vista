import { forwardRef, startTransition, useEffect, useImperativeHandle, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  ArrowDownAZ,
  ArrowUpAZ,
  BarChart3,
  Bold,
  ClipboardPaste,
  Copy,
  Filter,
  Italic,
  MessageSquare,
  Palette,
  PaintBucket,
  Percent,
  Plus,
  Redo2,
  Scissors,
  Search,
  Snowflake,
  Trash2,
  Underline,
  Undo2,
  WrapText,
} from "lucide-react";
import {
  DEFAULT_COL_W,
  DEFAULT_ROW_H,
  MIN_COL_W,
  MIN_ROW_H,
  cellKey,
  cloneBook,
  colLetter,
  displayRaw,
  formatDisplay,
  newSheet,
  normSel,
  shiftFormula,
  toNumber,
  type CellStyle,
  type ExcelSheetState,
  type ExcelWorkbook,
  type NumberFmt,
} from "@/lib/excel-engine";
import { createFormulaClient } from "@/lib/formula-client";
import {
  buildLayout,
  cellBox,
  cursorForHit,
  hitTest,
  paintSheet,
  type Hit,
  type SheetLayout,
} from "@/lib/sheet-canvas";
import { bookFromDoc, bookToDoc, compactSheet, type SheetColumn, type SheetRow } from "@/lib/spreadsheet";

type Tab = "home" | "insert" | "formulas" | "data" | "view";
type Sel = { r1: number; c1: number; r2: number; c2: number };

const FUNCS = ["SUM", "AVERAGE", "MIN", "MAX", "COUNT", "IF", "IFERROR", "ROUND", "VLOOKUP", "CONCAT", "TODAY", "COUNTIF", "SUMIF"];

const COLOR_PALETTE = [
  "#000000", "#434343", "#666666", "#999999", "#b7b7b7", "#cccccc", "#d9d9d9", "#efefef", "#f3f3f3", "#ffffff",
  "#980000", "#ff0000", "#ff9900", "#ffff00", "#00ff00", "#00ffff", "#4a86e8", "#0000ff", "#9900ff", "#ff00ff",
  "#e6b8af", "#f4cccc", "#fce5cd", "#fff2cc", "#d9ead3", "#d0e0e3", "#c9daf8", "#cfe2f3", "#d9d2e9", "#ead1dc",
  "#dd7e6b", "#ea9999", "#f9cb9c", "#ffe599", "#b6d7a8", "#a2c4c9", "#a4c2f4", "#9fc5e8", "#b4a7d6", "#d5a6bd",
  "#cc4125", "#e06666", "#f6b26b", "#ffd966", "#93c47d", "#76a5af", "#6d9eeb", "#6fa8dc", "#8e7cc3", "#c27ba0",
  "#a61c00", "#cc0000", "#e69138", "#f1c232", "#6aa84f", "#45818e", "#3c78d8", "#3d85c6", "#674ea7", "#a64d79",
  "#85200c", "#990000", "#b45f06", "#bf9000", "#38761d", "#134f5c", "#1155cc", "#0b5394", "#351c75", "#741b47",
  "#5b0f00", "#660000", "#783f04", "#7f6000", "#274e13", "#0c343d", "#1c4587", "#073763", "#20124d", "#4c1130",
  "#217346", "#548235", "#c6efce", "#ffc7ce", "#bdd7ee", "#fff2cc", "#f4b183", "#ed7d31", "#7030a0", "#0070c0",
];

function ColorPicker({
  label,
  icon,
  value,
  onPick,
  onClear,
}: {
  label: string;
  icon: React.ReactNode;
  value?: string | undefined;
  onPick: (color: string) => void;
  onClear?: () => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        type="button"
        title={label}
        className="inline-flex items-center gap-1 rounded border border-[#c5c5c5] bg-white px-1.5 py-1 text-[11px] hover:bg-[#e6e6e6]"
        onPointerDown={(e) => {
          e.stopPropagation();
          e.preventDefault();
          setOpen((v) => !v);
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {icon}
        <span className="hidden sm:inline">{label}</span>
        <span className="h-2.5 w-6 rounded-sm border border-[#bbb]" style={{ background: value || "#ffffff" }} />
      </button>
      {open && (
        <div
          className="absolute left-0 top-full z-50 mt-1 w-[232px] rounded border border-[#c5c5c5] bg-white p-2 shadow-xl"
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="mb-1 text-[11px] font-semibold text-[#555]">{label}</div>
          {onClear && (
            <button
              type="button"
              className="mb-2 w-full rounded border border-[#c5c5c5] px-2 py-1 text-left text-[11px] hover:bg-[#f3f3f3]"
              onClick={() => {
                onClear();
                setOpen(false);
              }}
            >
              No color
            </button>
          )}
          <div className="grid grid-cols-10 gap-0.5">
            {COLOR_PALETTE.map((c) => (
              <button
                key={c}
                type="button"
                title={c}
                className={`h-5 w-5 rounded-sm border ${value?.toLowerCase() === c ? "border-[#217346] ring-1 ring-[#217346]" : "border-[#ccc]"}`}
                style={{ background: c }}
                onClick={() => {
                  onPick(c);
                  setOpen(false);
                }}
              />
            ))}
          </div>
          <label className="mt-2 flex items-center gap-2 text-[11px] text-[#555]">
            Custom
            <input
              type="color"
              value={value && /^#/.test(value) ? value : "#ffff00"}
              className="h-6 w-10 cursor-pointer rounded border border-[#c5c5c5] bg-white p-0"
              onChange={(e) => {
                onPick(e.target.value);
                setOpen(false);
              }}
            />
          </label>
        </div>
      )}
    </div>
  );
}

function Btn({
  onClick,
  title,
  active,
  children,
  disabled,
}: {
  onClick?: () => void;
  title: string;
  active?: boolean | undefined;
  children: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onPointerDown={(e) => {
        if (disabled || !onClick || e.button !== 0) return;
        e.preventDefault();
        e.stopPropagation();
        onClick();
      }}
      onClick={(e) => {
        if (disabled || !onClick || e.detail !== 0) return;
        e.preventDefault();
        onClick();
      }}
      className={`inline-flex items-center gap-1 rounded border px-1.5 py-1 text-[11px] disabled:opacity-40 ${
        active ? "border-[#217346] bg-[#d3f0e0] text-[#217346]" : "border-[#c5c5c5] bg-white hover:bg-[#e6e6e6]"
      }`}
    >
      {children}
    </button>
  );
}

function autofitWidth(grid: string[][], c: number, styles: Record<string, CellStyle>, showFormulas: boolean) {
  let max = 56;
  for (let r = 0; r < grid.length; r++) {
    const raw = grid[r]?.[c] ?? "";
    const text = showFormulas || !raw.startsWith("=") ? raw : formatDisplay(displayRaw(grid, r, c), styles[cellKey(r, c)]);
    max = Math.max(max, Math.min(420, 14 + text.length * 7));
  }
  return max;
}

export type SpreadsheetHandle = {
  snapshot: () => { columns: SheetColumn[]; rows: SheetRow[] };
};

export const SpreadsheetGrid = forwardRef<SpreadsheetHandle, {
  columns: SheetColumn[];
  rows: SheetRow[];
  readOnly?: boolean;
  usedOnly?: boolean;
  onChange?: (next: { columns: SheetColumn[]; rows: SheetRow[] }) => void;
}>(function SpreadsheetGrid({
  columns,
  rows,
  readOnly = false,
  usedOnly = false,
  onChange,
}, ref) {
  const [book, setBook] = useState<ExcelWorkbook>(() => {
    const next = bookFromDoc(columns, rows);
    if (usedOnly) next.sheets = next.sheets.map(compactSheet);
    return next;
  });
  const [tab, setTab] = useState<Tab>("home");
  const [active, setActive] = useState({ r: 1, c: 0 });
  const [anchor, setAnchor] = useState({ r: 1, c: 0 });
  const [editing, setEditing] = useState(false);
  const [findOpen, setFindOpen] = useState(false);
  const [findQ, setFindQ] = useState("");
  const [replaceQ, setReplaceQ] = useState("");
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null);
  const [chart, setChart] = useState(false);
  const [commentOpen, setCommentOpen] = useState(false);
  const [commentDraft, setCommentDraft] = useState("");
  const activeRef = useRef(active);
  const anchorRef = useRef(anchor);
  const draftRef = useRef("");
  const editingRef = useRef(editing);
  activeRef.current = active;
  anchorRef.current = anchor;
  editingRef.current = editing;
  const bookRef = useRef(book);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fxRef = useRef<HTMLInputElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const layoutRef = useRef<SheetLayout | null>(null);
  const displayCacheRef = useRef<string[][] | null>(null);
  const formulaClientRef = useRef<ReturnType<typeof createFormulaClient> | null>(null);
  const formulaSeqRef = useRef(0);
  const paintRaf = useRef<number | null>(null);
  const history = useRef<ExcelWorkbook[]>([]);
  const future = useRef<ExcelWorkbook[]>([]);
  const selecting = useRef(false);
  bookRef.current = book;

  useImperativeHandle(ref, () => ({
    snapshot() {
      const bookSnap = cloneBook(bookRef.current);
      const sheetSnap = bookSnap.sheets[bookSnap.active];
      if (sheetSnap && editingRef.current) {
        const r = activeRef.current.r;
        const c = activeRef.current.c;
        const value = inputRef.current?.value ?? fxRef.current?.value ?? draftRef.current;
        if (sheetSnap.grid[r]) sheetSnap.grid[r]![c] = value;
      }
      return bookToDoc(bookSnap);
    },
  }));

  const sheet = book.sheets[book.active] ?? book.sheets[0]!;
  const grid = sheet.grid;
  const sel = normSel(active, anchor);
  const colCount = grid[0]?.length ?? 1;
  const addr =
    sel.r1 === sel.r2 && sel.c1 === sel.c2
      ? `${colLetter(active.c)}${active.r + 1}`
      : `${colLetter(sel.c1)}${sel.r1 + 1}:${colLetter(sel.c2)}${sel.r2 + 1}`;
  const style = sheet.styles[cellKey(active.r, active.c)] ?? {};

  useEffect(() => {
    if (onChange) return;
    if (columns[0]?.excel === bookRef.current) return;
    const next = bookFromDoc(columns, rows);
    if (usedOnly) next.sheets = next.sheets.map(compactSheet);
    bookRef.current = next;
    setBook(next);
  }, [columns, rows, usedOnly, onChange]);

  const emit = (next: ExcelWorkbook, record = true) => {
    if (record) {
      history.current.push(cloneBook(bookRef.current));
      future.current = [];
      if (history.current.length > 50) history.current.shift();
    }
    bookRef.current = next;
    setBook(next);
    if (!onChange) return;
    startTransition(() => {
      onChange(bookToDoc(next));
    });
  };

  const patch = (fn: (s: ExcelSheetState, b: ExcelWorkbook) => void, record = true) => {
    const next = cloneBook(bookRef.current);
    fn(next.sheets[next.active]!, next);
    emit(next, record);
  };

  const undo = () => {
    const prev = history.current.pop();
    if (!prev) return;
    future.current.push(cloneBook(bookRef.current));
    bookRef.current = prev;
    setBook(prev);
    if (onChange) {
      startTransition(() => {
        onChange(bookToDoc(prev));
      });
    }
  };
  const redo = () => {
    const nxt = future.current.pop();
    if (!nxt) return;
    history.current.push(cloneBook(bookRef.current));
    bookRef.current = nxt;
    setBook(nxt);
    if (onChange) {
      startTransition(() => {
        onChange(bookToDoc(nxt));
      });
    }
  };

  const setCell = (r: number, c: number, value: string) => {
    const current = bookRef.current.sheets[bookRef.current.active]?.grid[r]?.[c] ?? "";
    if (current === value) return;
    patch((s) => {
      const row = s.grid[r];
      if (row) row[c] = value;
    });
  };

  const applyStyle = (partial: CellStyle) => {
    const target = normSel(activeRef.current, anchorRef.current);
    patch((s) => {
      for (let r = target.r1; r <= target.r2; r++) {
        for (let c = target.c1; c <= target.c2; c++) {
          const k = cellKey(r, c);
          s.styles[k] = { ...s.styles[k], ...partial };
        }
      }
    });
  };

  const applyFill = (bg: string | null) => {
    const target = normSel(activeRef.current, anchorRef.current);
    patch((s) => {
      for (let r = target.r1; r <= target.r2; r++) {
        for (let c = target.c1; c <= target.c2; c++) {
          const k = cellKey(r, c);
          const current = { ...(s.styles[k] ?? {}) };
          if (bg == null) delete current.bg;
          else current.bg = bg;
          s.styles[k] = current;
        }
      }
    });
  };

  const applyFontColor = (fc: string | null) => {
    const target = normSel(activeRef.current, anchorRef.current);
    patch((s) => {
      for (let r = target.r1; r <= target.r2; r++) {
        for (let c = target.c1; c <= target.c2; c++) {
          const k = cellKey(r, c);
          const current = { ...(s.styles[k] ?? {}) };
          if (fc == null) delete current.fc;
          else current.fc = fc;
          s.styles[k] = current;
        }
      }
    });
  };

  const syncFx = (value: string) => {
    draftRef.current = value;
    if (fxRef.current) fxRef.current.value = value;
    if (inputRef.current) inputRef.current.value = value;
  };

  const beginEdit = (r: number, c: number, replace = false) => {
    if (readOnly) return;
    const pos = { r, c };
    activeRef.current = pos;
    anchorRef.current = pos;
    setActive(pos);
    setAnchor(pos);
    editingRef.current = true;
    setEditing(true);
    const value = replace ? "" : (bookRef.current.sheets[bookRef.current.active]?.grid[r]?.[c] ?? "");
    syncFx(value);
    requestAnimationFrame(() => {
      const el = inputRef.current;
      if (!el || !editingRef.current) return;
      el.value = draftRef.current;
      const scrollX = window.scrollX;
      const scrollY = window.scrollY;
      const pane = scrollRef.current;
      const paneTop = pane?.scrollTop ?? 0;
      const paneLeft = pane?.scrollLeft ?? 0;
      el.focus({ preventScroll: true });
      el.setSelectionRange(el.value.length, el.value.length);
      window.scrollTo(scrollX, scrollY);
      if (pane) {
        pane.scrollTop = paneTop;
        pane.scrollLeft = paneLeft;
      }
    });
  };
  const finishEdit = (save = true) => {
    if (editingRef.current && save) setCell(activeRef.current.r, activeRef.current.c, draftRef.current);
    editingRef.current = false;
    setEditing(false);
  };

  useEffect(() => {
    if (readOnly) return;
    const scrollX = window.scrollX;
    const scrollY = window.scrollY;
    const pane = scrollRef.current;
    const paneTop = pane?.scrollTop ?? 0;
    const paneLeft = pane?.scrollLeft ?? 0;
    if (editing) inputRef.current?.focus({ preventScroll: true });
    else rootRef.current?.focus({ preventScroll: true });
    window.scrollTo(scrollX, scrollY);
    if (pane) {
      pane.scrollTop = paneTop;
      pane.scrollLeft = paneLeft;
    }
  }, [editing, readOnly]);

  const copySel = async () => {
    const target = normSel(activeRef.current, anchorRef.current);
    const lines: string[] = [];
    for (let r = target.r1; r <= target.r2; r++) {
      const cols: string[] = [];
      for (let c = target.c1; c <= target.c2; c++) cols.push(grid[r]?.[c] ?? "");
      lines.push(cols.join("\t"));
    }
    await navigator.clipboard.writeText(lines.join("\n"));
  };

  const pasteAt = async () => {
    const target = normSel(activeRef.current, anchorRef.current);
    const text = await navigator.clipboard.readText();
    const lines = text.replace(/\r/g, "").split("\n").filter((line, i, arr) => !(i === arr.length - 1 && line === ""));
    patch((s) => {
      const next = s.grid.map((row) => [...row]);
      lines.forEach((line, ri) => {
        line.split("\t").forEach((cell, ci) => {
          const r = target.r1 + ri;
          const c = target.c1 + ci;
          if (next[r] && c < next[r]!.length) next[r]![c] = cell.startsWith("=") ? shiftFormula(cell, ri, ci) : cell;
        });
      });
      s.grid = next;
    });
  };

  const fillDown = () => {
    const target = normSel(activeRef.current, anchorRef.current);
    patch((s) => {
      const next = s.grid.map((row) => [...row]);
      for (let c = target.c1; c <= target.c2; c++) {
        const src = next[target.r1]?.[c] ?? "";
        for (let r = target.r1 + 1; r <= target.r2; r++) next[r]![c] = src.startsWith("=") ? shiftFormula(src, r - target.r1, 0) : src;
      }
      s.grid = next;
    });
  };
  const fillRight = () => {
    const target = normSel(activeRef.current, anchorRef.current);
    patch((s) => {
      const next = s.grid.map((row) => [...row]);
      for (let r = target.r1; r <= target.r2; r++) {
        const src = next[r]?.[target.c1] ?? "";
        for (let c = target.c1 + 1; c <= target.c2; c++) next[r]![c] = src.startsWith("=") ? shiftFormula(src, 0, c - target.c1) : src;
      }
      s.grid = next;
    });
  };

  const clearSel = (contentsOnly = true) => {
    const target = normSel(activeRef.current, anchorRef.current);
    patch((s) => {
      for (let r = target.r1; r <= target.r2; r++) {
        for (let c = target.c1; c <= target.c2; c++) {
          s.grid[r]![c] = "";
          if (!contentsOnly) {
            delete s.styles[cellKey(r, c)];
            delete s.comments[cellKey(r, c)];
          }
        }
      }
    });
  };

  const addRow = (after = true) => {
    const at = after ? active.r + 1 : active.r;
    patch((s) => {
      s.grid.splice(at, 0, Array.from({ length: colCount }, () => ""));
      s.rowHeights.splice(at, 0, DEFAULT_ROW_H);
    });
  };
  const addCol = (after = true) => {
    const at = after ? active.c + 1 : active.c;
    patch((s) => {
      s.grid = s.grid.map((row) => {
        const next = [...row];
        next.splice(at, 0, "");
        return next;
      });
      s.colWidths.splice(at, 0, DEFAULT_COL_W);
    });
  };
  const deleteRow = () => {
    if (grid.length <= 2) return;
    patch((s) => {
      for (let r = sel.r2; r >= sel.r1; r--) {
        if (s.grid.length <= 2) break;
        s.grid.splice(r, 1);
        s.rowHeights.splice(r, 1);
      }
    });
  };
  const deleteCol = () => {
    if (colCount <= 1) return;
    patch((s) => {
      for (let c = sel.c2; c >= sel.c1; c--) {
        if ((s.grid[0]?.length ?? 0) <= 1) break;
        s.grid = s.grid.map((row) => row.filter((_, i) => i !== c));
        s.colWidths.splice(c, 1);
      }
    });
  };

  const mergeSel = () => {
    const target = normSel(activeRef.current, anchorRef.current);
    patch((s) => {
      s.merges = s.merges.filter((m) => m.r2 < target.r1 || m.r1 > target.r2 || m.c2 < target.c1 || m.c1 > target.c2);
      if (!(target.r1 === target.r2 && target.c1 === target.c2)) s.merges.push({ ...target });
    });
  };
  const unmergeSel = () => {
    const target = normSel(activeRef.current, anchorRef.current);
    patch((s) => {
      s.merges = s.merges.filter((m) => m.r2 < target.r1 || m.r1 > target.r2 || m.c2 < target.c1 || m.c1 > target.c2);
    });
  };

  const sortCol = (asc: boolean) => {
    patch((s) => {
      const head = s.grid[0] ?? [];
      const body = s.grid.slice(1);
      body.sort((a, b) => {
        const av = a[active.c] ?? "";
        const bv = b[active.c] ?? "";
        const an = toNumber(av);
        const bn = toNumber(bv);
        if (an != null && bn != null) return asc ? an - bn : bn - an;
        return asc ? av.localeCompare(bv) : bv.localeCompare(av);
      });
      s.grid = [head, ...body];
    });
  };

  const removeDupes = () => {
    patch((s) => {
      const seen = new Set<string>();
      const next = [s.grid[0]!];
      const heights = [s.rowHeights[0] ?? DEFAULT_ROW_H];
      for (let r = 1; r < s.grid.length; r++) {
        const key = (s.grid[r] ?? []).join("\t");
        if (seen.has(key)) continue;
        seen.add(key);
        next.push(s.grid[r]!);
        heights.push(s.rowHeights[r] ?? DEFAULT_ROW_H);
      }
      s.grid = next;
      s.rowHeights = heights;
    });
  };

  const zoomOf = () => Math.max(50, Math.min(200, bookRef.current.zoom || 100)) / 100;

  const rowVisibleFor = (s: ExcelSheetState, r: number) => {
    if (s.hiddenRows.includes(r)) return false;
    if (!s.filterOn || r === 0) return true;
    const filters = s.filters ?? {};
    return Object.entries(filters).every(([col, allowed]) => {
      if (!allowed.length) return true;
      const shown = displayCacheRef.current?.[r]?.[Number(col)] ?? s.grid[r]?.[Number(col)] ?? "";
      const v = shown || "(Blanks)";
      return allowed.includes(v);
    });
  };

  const paintNow = () => {
    const canvas = canvasRef.current;
    const current = bookRef.current;
    const currentSheet = current.sheets[current.active];
    if (!canvas || !currentSheet) return;
    const layout = buildLayout(currentSheet, (r) => rowVisibleFor(currentSheet, r));
    layoutRef.current = layout;
    const z = zoomOf();
    if (wrapRef.current) {
      wrapRef.current.style.width = `${layout.totalW * z}px`;
      wrapRef.current.style.height = `${layout.totalH * z}px`;
    }
    paintSheet(canvas, current, layout, normSel(activeRef.current, anchorRef.current), activeRef.current, displayCacheRef.current, {
      editing: editingRef.current,
      draft: draftRef.current,
      readOnly,
      zoom: z,
    });
    const editor = inputRef.current;
    if (editor) {
      const box = cellBox(layout, currentSheet, activeRef.current.r, activeRef.current.c);
      editor.style.left = `${box.x * z}px`;
      editor.style.top = `${box.y * z}px`;
      editor.style.width = `${Math.max(24, box.w * z)}px`;
      editor.style.height = `${Math.max(18, box.h * z)}px`;
    }
  };

  const scheduleCanvas = () => {
    if (paintRaf.current != null) return;
    paintRaf.current = requestAnimationFrame(() => {
      paintRaf.current = null;
      paintNow();
    });
  };

  const refreshFormulas = () => {
    const client = formulaClientRef.current;
    if (!client) return;
    const current = bookRef.current;
    const currentSheet = current.sheets[current.active];
    if (!currentSheet) return;
    formulaSeqRef.current = client.request(currentSheet.grid, current.showFormulas, currentSheet.styles);
  };

  useEffect(() => {
    const client = createFormulaClient((seq, display) => {
      if (seq !== formulaSeqRef.current) return;
      displayCacheRef.current = display;
      scheduleCanvas();
    });
    formulaClientRef.current = client;
    refreshFormulas();
    return () => {
      client.dispose();
      formulaClientRef.current = null;
    };
  }, []);

  useLayoutEffect(() => {
    if (!editing && fxRef.current) {
      fxRef.current.value = bookRef.current.sheets[bookRef.current.active]?.grid[active.r]?.[active.c] ?? "";
    }
    paintNow();
  }, [book, active, anchor, editing, readOnly]);

  useEffect(() => {
    refreshFormulas();
  }, [book]);

  const canvasPoint = (e: { clientX: number; clientY: number }) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const z = zoomOf();
    return { x: (e.clientX - rect.left) / z, y: (e.clientY - rect.top) / z };
  };

  const hitAt = (e: { clientX: number; clientY: number }): Hit => {
    const layout = layoutRef.current;
    const currentSheet = bookRef.current.sheets[bookRef.current.active];
    if (!layout || !currentSheet) return { kind: "none" };
    const pt = canvasPoint(e);
    return hitTest(layout, currentSheet, pt.x, pt.y, activeRef.current, editingRef.current, readOnly);
  };

  const startColResize = (index: number, clientX: number, autofit = false) => {
    if (autofit) {
      patch((s) => {
        s.colWidths[index] = autofitWidth(s.grid, index, s.styles, bookRef.current.showFormulas);
      });
      return;
    }
    const startW = bookRef.current.sheets[bookRef.current.active]!.colWidths[index] ?? DEFAULT_COL_W;
    const onMove = (ev: PointerEvent) => {
      const w = Math.max(MIN_COL_W, startW + (ev.clientX - clientX));
      const activeSheet = bookRef.current.sheets[bookRef.current.active]!;
      activeSheet.colWidths = activeSheet.colWidths.slice();
      activeSheet.colWidths[index] = w;
      scheduleCanvas();
    };
    const onUp = (ev: PointerEvent) => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      const w = Math.max(MIN_COL_W, startW + (ev.clientX - clientX));
      patch((s) => {
        s.colWidths[index] = w;
      });
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  const startRowResize = (index: number, clientY: number) => {
    const startH = bookRef.current.sheets[bookRef.current.active]!.rowHeights[index] ?? DEFAULT_ROW_H;
    const onMove = (ev: PointerEvent) => {
      const h = Math.max(MIN_ROW_H, startH + (ev.clientY - clientY));
      const activeSheet = bookRef.current.sheets[bookRef.current.active]!;
      activeSheet.rowHeights = activeSheet.rowHeights.slice();
      activeSheet.rowHeights[index] = h;
      scheduleCanvas();
    };
    const onUp = (ev: PointerEvent) => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      const h = Math.max(MIN_ROW_H, startH + (ev.clientY - clientY));
      patch((s) => {
        s.rowHeights[index] = h;
      });
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  const startFill = () => {
    const origin = normSel(activeRef.current, anchorRef.current);
    const onMove = (ev: PointerEvent) => {
      const hit = hitAt(ev);
      if (hit.kind === "cell") {
        activeRef.current = { r: hit.r, c: hit.c };
        scheduleCanvas();
      }
    };
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      const target = {
        r1: Math.min(origin.r1, activeRef.current.r),
        c1: Math.min(origin.c1, activeRef.current.c),
        r2: Math.max(origin.r2, activeRef.current.r),
        c2: Math.max(origin.c2, activeRef.current.c),
      };
      activeRef.current = { r: origin.r1, c: origin.c1 };
      anchorRef.current = { r: target.r2, c: target.c2 };
      setActive(activeRef.current);
      setAnchor(anchorRef.current);
      patch((s) => {
        const next = s.grid.map((row) => [...row]);
        const srcH = origin.r2 - origin.r1 + 1;
        const srcW = origin.c2 - origin.c1 + 1;
        for (let r = target.r1; r <= target.r2; r++) {
          for (let c = target.c1; c <= target.c2; c++) {
            if (r >= origin.r1 && r <= origin.r2 && c >= origin.c1 && c <= origin.c2) continue;
            const sr = origin.r1 + ((((r - origin.r1) % srcH) + srcH) % srcH);
            const sc = origin.c1 + ((((c - origin.c1) % srcW) + srcW) % srcW);
            const src = next[sr]?.[sc] ?? "";
            next[r]![c] = src.startsWith("=") ? shiftFormula(src, r - sr, c - sc) : src;
          }
        }
        s.grid = next;
      });
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  const navPaint = useRef<number | null>(null);
  const paintSelection = () => {
    const pos = activeRef.current;
    setActive(pos);
    setAnchor(anchorRef.current);
    if (!editingRef.current) {
      const value = bookRef.current.sheets[bookRef.current.active]?.grid[pos.r]?.[pos.c] ?? "";
      syncFx(value);
    }
    scheduleCanvas();
  };
  const schedulePaint = () => {
    if (navPaint.current != null) return;
    navPaint.current = requestAnimationFrame(() => {
      navPaint.current = null;
      paintSelection();
    });
  };

  const commitAndGo = (dr: number, dc: number) => {
    const from = activeRef.current;
    const typed = inputRef.current?.value ?? fxRef.current?.value ?? draftRef.current;
    draftRef.current = typed;
    setCell(from.r, from.c, typed);
    const sheet = bookRef.current.sheets[bookRef.current.active];
    const maxR = (sheet?.grid.length ?? 1) - 1;
    const maxC = (sheet?.grid[0]?.length ?? 1) - 1;
    const next = {
      r: Math.max(0, Math.min(maxR, from.r + dr)),
      c: Math.max(0, Math.min(maxC, from.c + dc)),
    };
    activeRef.current = next;
    anchorRef.current = next;
    editingRef.current = false;
    setEditing(false);
    const nextValue = from.r === next.r && from.c === next.c ? typed : (sheet?.grid[next.r]?.[next.c] ?? "");
    syncFx(nextValue);
    setActive(next);
    setAnchor(next);
    scheduleCanvas();
    queueMicrotask(() => rootRef.current?.focus({ preventScroll: true }));
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (findOpen) return;
    const ctrl = e.ctrlKey || e.metaKey;
    if (editingRef.current) {
      if (e.key === "Enter") {
        e.preventDefault();
        e.stopPropagation();
        commitAndGo(1, 0);
      } else if (e.key === "Tab") {
        e.preventDefault();
        e.stopPropagation();
        commitAndGo(0, e.shiftKey ? -1 : 1);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        e.stopPropagation();
        commitAndGo(-1, 0);
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        e.stopPropagation();
        commitAndGo(1, 0);
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        e.stopPropagation();
        commitAndGo(0, -1);
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        e.stopPropagation();
        commitAndGo(0, 1);
      } else if (e.key === "Escape") {
        e.preventDefault();
        editingRef.current = false;
        setEditing(false);
        const pos = activeRef.current;
        const original = bookRef.current.sheets[bookRef.current.active]?.grid[pos.r]?.[pos.c] ?? "";
        syncFx(original);
        queueMicrotask(() => rootRef.current?.focus({ preventScroll: true }));
      }
      return;
    }
    if (readOnly && !["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Tab"].includes(e.key) && !ctrl) return;
    const move = (dr: number, dc: number) => {
      const from = activeRef.current;
      const next = {
        r: Math.max(0, Math.min(grid.length - 1, from.r + dr)),
        c: Math.max(0, Math.min(colCount - 1, from.c + dc)),
      };
      activeRef.current = next;
      if (!e.shiftKey) anchorRef.current = next;
      schedulePaint();
    };
    if (e.key === "ArrowUp") {
      e.preventDefault();
      move(-1, 0);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      move(1, 0);
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      move(0, -1);
    } else if (e.key === "Tab") {
      e.preventDefault();
      const from = activeRef.current;
      const nextC = Math.max(0, Math.min(colCount - 1, from.c + (e.shiftKey ? -1 : 1)));
      beginEdit(from.r, nextC);
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      move(0, 1);
    } else if (e.key === "Enter" || e.key === "F2") {
      e.preventDefault();
      beginEdit(activeRef.current.r, activeRef.current.c);
    } else if (e.key === "Delete" || e.key === "Backspace") {
      e.preventDefault();
      clearSel(true);
    } else if (ctrl && e.key.toLowerCase() === "c") {
      e.preventDefault();
      void copySel();
    } else if (ctrl && e.key.toLowerCase() === "x") {
      e.preventDefault();
      void copySel().then(() => clearSel(true));
    } else if (ctrl && e.key.toLowerCase() === "v") {
      e.preventDefault();
      void pasteAt();
    } else if (ctrl && e.key.toLowerCase() === "z") {
      e.preventDefault();
      undo();
    } else if (ctrl && e.key.toLowerCase() === "y") {
      e.preventDefault();
      redo();
    } else if (ctrl && e.key.toLowerCase() === "b") {
      e.preventDefault();
      applyStyle({ b: !style.b });
    } else if (ctrl && e.key.toLowerCase() === "i") {
      e.preventDefault();
      applyStyle({ i: !style.i });
    } else if (ctrl && e.key.toLowerCase() === "u") {
      e.preventDefault();
      applyStyle({ u: !style.u });
    } else if (ctrl && e.key.toLowerCase() === "f") {
      e.preventDefault();
      setFindOpen(true);
    } else if (ctrl && e.key.toLowerCase() === "a") {
      e.preventDefault();
      setActive({ r: 0, c: 0 });
      setAnchor({ r: grid.length - 1, c: colCount - 1 });
    } else if (ctrl && e.key.toLowerCase() === "d") {
      e.preventDefault();
      fillDown();
    } else if (ctrl && e.key.toLowerCase() === "r") {
      e.preventDefault();
      fillRight();
    } else if (e.key.length === 1 && !ctrl) {
      e.preventDefault();
      e.stopPropagation();
      beginEdit(activeRef.current.r, activeRef.current.c, true);
      draftRef.current = e.key;
      if (inputRef.current) inputRef.current.value = e.key;
      if (fxRef.current) fxRef.current.value = e.key;
      scheduleCanvas();
    }
  };

  const stats = useMemo(() => {
    const nums: number[] = [];
    for (let r = sel.r1; r <= sel.r2; r++) {
      for (let c = sel.c1; c <= sel.c2; c++) {
        const n = toNumber(displayRaw(grid, r, c));
        if (n != null) nums.push(n);
      }
    }
    const sum = nums.reduce((a, b) => a + b, 0);
    return {
      count: (sel.r2 - sel.r1 + 1) * (sel.c2 - sel.c1 + 1),
      numeric: nums.length,
      sum,
      avg: nums.length ? sum / nums.length : 0,
      min: nums.length ? Math.min(...nums) : 0,
      max: nums.length ? Math.max(...nums) : 0,
    };
  }, [sel, grid]);

  const chartData = useMemo(() => {
    const points: { label: string; v: number }[] = [];
    for (let r = sel.r1; r <= sel.r2; r++) {
      for (let c = sel.c1; c <= sel.c2; c++) {
        const n = toNumber(displayRaw(grid, r, c));
        if (n != null) points.push({ label: `${colLetter(c)}${r + 1}`, v: n });
      }
    }
    return points.slice(0, 24);
  }, [sel, grid]);

  const zoom = Math.max(50, Math.min(200, book.zoom || 100)) / 100;

  const filterOptions = (c: number) => {
    const vals = new Set<string>();
    for (let r = 1; r < grid.length; r++) {
      const shown = displayCacheRef.current?.[r]?.[c] ?? displayRaw(grid, r, c);
      vals.add(shown || "(Blanks)");
    }
    return [...vals];
  };

  const onCanvasPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (e.button !== 0) return;
    const currentSheet = bookRef.current.sheets[bookRef.current.active];
    if (!currentSheet) return;
    const hit = hitAt(e);
    canvasRef.current!.style.cursor = cursorForHit(hit);
    if (hit.kind === "none") return;
    e.preventDefault();
    setMenu(null);
    if (editingRef.current && (hit.kind !== "cell" || hit.r !== activeRef.current.r || hit.c !== activeRef.current.c)) {
      finishEdit(true);
    }
    if (hit.kind === "corner") {
      activeRef.current = { r: 0, c: 0 };
      anchorRef.current = { r: currentSheet.grid.length - 1, c: (currentSheet.grid[0]?.length ?? 1) - 1 };
      setActive(activeRef.current);
      setAnchor(anchorRef.current);
      scheduleCanvas();
      return;
    }
    if (hit.kind === "col") {
      activeRef.current = { r: 0, c: hit.c };
      anchorRef.current = { r: currentSheet.grid.length - 1, c: hit.c };
      setActive(activeRef.current);
      setAnchor(anchorRef.current);
      scheduleCanvas();
      return;
    }
    if (hit.kind === "row") {
      activeRef.current = { r: hit.r, c: 0 };
      anchorRef.current = { r: hit.r, c: (currentSheet.grid[0]?.length ?? 1) - 1 };
      setActive(activeRef.current);
      setAnchor(anchorRef.current);
      scheduleCanvas();
      return;
    }
    if (hit.kind === "colResize") {
      startColResize(hit.c, e.clientX, e.detail === 2);
      return;
    }
    if (hit.kind === "rowResize") {
      startRowResize(hit.r, e.clientY);
      return;
    }
    if (hit.kind === "fill") {
      startFill();
      return;
    }
    if (hit.kind === "cell") {
      activeRef.current = { r: hit.r, c: hit.c };
      if (!e.shiftKey) anchorRef.current = { r: hit.r, c: hit.c };
      setActive(activeRef.current);
      if (!e.shiftKey) setAnchor(anchorRef.current);
      selecting.current = true;
      scheduleCanvas();
      const onMove = (ev: PointerEvent) => {
        const next = hitAt(ev);
        if (next.kind === "cell") {
          activeRef.current = { r: next.r, c: next.c };
          setActive(activeRef.current);
          scheduleCanvas();
        }
      };
      const onUp = () => {
        selecting.current = false;
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
        if (!readOnly) rootRef.current?.focus({ preventScroll: true });
      };
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
    }
  };

  return (
    <div
      ref={rootRef}
      className="relative overflow-hidden bg-white text-[#222] outline-none"
      style={{ overflowAnchor: "none" }}
      onKeyDown={onKeyDown}
      tabIndex={0}
      onClick={() => setMenu(null)}
    >
      <div className="flex gap-1 border-b border-[#c5c5c5] bg-[#e6e6e6] px-2 pt-1 text-[11px]">
        {(["home", "insert", "formulas", "data", "view"] as Tab[]).map((id) => (
          <button
            key={id}
            type="button"
            className={`rounded-t px-3 py-1 capitalize ${tab === id ? "bg-white font-semibold text-[#217346]" : "text-[#555]"}`}
            onClick={() => setTab(id)}
          >
            {id}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-1.5 border-b border-[#c5c5c5] bg-[#f3f3f3] px-2 py-1.5">
        {!readOnly && tab === "home" && (
          <>
            <Btn title="Undo (Ctrl+Z)" onClick={undo}><Undo2 className="h-3.5 w-3.5" /></Btn>
            <Btn title="Redo (Ctrl+Y)" onClick={redo}><Redo2 className="h-3.5 w-3.5" /></Btn>
            <Btn title="Copy" onClick={() => void copySel()}><Copy className="h-3.5 w-3.5" /></Btn>
            <Btn title="Cut" onClick={() => void copySel().then(() => clearSel(true))}><Scissors className="h-3.5 w-3.5" /></Btn>
            <Btn title="Paste" onClick={() => void pasteAt()}><ClipboardPaste className="h-3.5 w-3.5" /></Btn>
            <span className="mx-1 h-5 w-px bg-[#ccc]" />
            <Btn title="Bold (Ctrl+B)" active={style.b} onClick={() => applyStyle({ b: !style.b })}><Bold className="h-3.5 w-3.5" /></Btn>
            <Btn title="Italic (Ctrl+I)" active={style.i} onClick={() => applyStyle({ i: !style.i })}><Italic className="h-3.5 w-3.5" /></Btn>
            <Btn title="Underline (Ctrl+U)" active={style.u} onClick={() => applyStyle({ u: !style.u })}><Underline className="h-3.5 w-3.5" /></Btn>
            <select
              className="h-7 rounded border border-[#c5c5c5] bg-white px-1 text-[11px]"
              value={style.fs ?? 11}
              onChange={(e) => applyStyle({ fs: Number(e.target.value) })}
            >
              {[8, 9, 10, 11, 12, 14, 16, 18, 20, 24].map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
            <ColorPicker
              label="Fill"
              icon={<PaintBucket className="h-3.5 w-3.5" />}
              value={style.bg}
              onPick={(c) => applyFill(c)}
              onClear={() => applyFill(null)}
            />
            <ColorPicker
              label="Font"
              icon={<Palette className="h-3.5 w-3.5" />}
              value={style.fc}
              onPick={(c) => applyFontColor(c)}
              onClear={() => applyFontColor(null)}
            />
            <span className="mx-1 h-5 w-px bg-[#ccc]" />
            <Btn title="Align left" active={style.ha === "l"} onClick={() => applyStyle({ ha: "l" })}><AlignLeft className="h-3.5 w-3.5" /></Btn>
            <Btn title="Align center" active={style.ha === "c"} onClick={() => applyStyle({ ha: "c" })}><AlignCenter className="h-3.5 w-3.5" /></Btn>
            <Btn title="Align right" active={style.ha === "r"} onClick={() => applyStyle({ ha: "r" })}><AlignRight className="h-3.5 w-3.5" /></Btn>
            <Btn title="Wrap text" active={style.wrap} onClick={() => applyStyle({ wrap: !style.wrap })}><WrapText className="h-3.5 w-3.5" /></Btn>
            <Btn title="Merge cells" onClick={mergeSel}>Merge</Btn>
            <Btn title="Unmerge" onClick={unmergeSel}>Unmerge</Btn>
            <span className="mx-1 h-5 w-px bg-[#ccc]" />
            <select
              className="h-7 rounded border border-[#c5c5c5] bg-white px-1 text-[11px]"
              value={style.fmt ?? "g"}
              onChange={(e) => applyStyle({ fmt: e.target.value as NumberFmt })}
            >
              <option value="g">General</option>
              <option value="n">Number</option>
              <option value="c">Currency ₹</option>
              <option value="p">Percentage</option>
              <option value="d">Date</option>
              <option value="t">Text</option>
            </select>
            <Btn title="Percent" onClick={() => applyStyle({ fmt: "p", dec: 0 })}><Percent className="h-3.5 w-3.5" /></Btn>
            <Btn title="More decimals" onClick={() => applyStyle({ dec: (style.dec ?? 2) + 1 })}>.0</Btn>
            <Btn title="Fewer decimals" onClick={() => applyStyle({ dec: Math.max(0, (style.dec ?? 2) - 1) })}>.00</Btn>
            <Btn title="Clear contents" onClick={() => clearSel(true)}>Clear</Btn>
            <Btn title="Clear all" onClick={() => clearSel(false)}>Clear all</Btn>
          </>
        )}
        {!readOnly && tab === "insert" && (
          <>
            <Btn title="Insert row" onClick={() => addRow(true)}><Plus className="h-3.5 w-3.5" /> Row</Btn>
            <Btn title="Insert column" onClick={() => addCol(true)}><Plus className="h-3.5 w-3.5" /> Column</Btn>
            <Btn title="Delete row" onClick={deleteRow}><Trash2 className="h-3.5 w-3.5" /> Row</Btn>
            <Btn title="Delete column" onClick={deleteCol}><Trash2 className="h-3.5 w-3.5" /> Column</Btn>
            <Btn
              title="Comment"
              onClick={() => {
                setCommentDraft(sheet.comments[cellKey(active.r, active.c)] ?? "");
                setCommentOpen(true);
              }}
            >
              <MessageSquare className="h-3.5 w-3.5" /> Comment
            </Btn>
            <Btn title="Chart" onClick={() => setChart(true)}><BarChart3 className="h-3.5 w-3.5" /> Chart</Btn>
          </>
        )}
        {!readOnly && tab === "formulas" && (
          <>
            {FUNCS.map((fn) => (
              <Btn
                key={fn}
                title={fn}
                onClick={() => {
                  const range = `${colLetter(sel.c1)}${sel.r1 + 1}:${colLetter(sel.c2)}${sel.r2 + 1}`;
                  if (fn === "IF") setCell(active.r, active.c, `=IF(A2>0,"Yes","No")`);
                  else if (fn === "VLOOKUP") setCell(active.r, active.c, `=VLOOKUP(A2,A2:D40,2,FALSE)`);
                  else if (fn === "TODAY") setCell(active.r, active.c, `=TODAY()`);
                  else setCell(active.r, active.c, `=${fn}(${range})`);
                }}
              >
                {fn}
              </Btn>
            ))}
          </>
        )}
        {!readOnly && tab === "data" && (
          <>
            <Btn title="Sort A to Z" onClick={() => sortCol(true)}><ArrowUpAZ className="h-3.5 w-3.5" /> Sort A-Z</Btn>
            <Btn title="Sort Z to A" onClick={() => sortCol(false)}><ArrowDownAZ className="h-3.5 w-3.5" /> Sort Z-A</Btn>
            <Btn title="Filter" active={sheet.filterOn} onClick={() => patch((s) => { s.filterOn = !s.filterOn; s.filters = {}; })}>
              <Filter className="h-3.5 w-3.5" /> Filter
            </Btn>
            <Btn title="Remove duplicates" onClick={removeDupes}>Remove duplicates</Btn>
            <Btn title="Fill down (Ctrl+D)" onClick={fillDown}>Fill down</Btn>
            <Btn title="Fill right (Ctrl+R)" onClick={fillRight}>Fill right</Btn>
            <Btn title="Find (Ctrl+F)" onClick={() => setFindOpen(true)}><Search className="h-3.5 w-3.5" /> Find</Btn>
          </>
        )}
        {tab === "view" && (
          <>
            <Btn title="Freeze panes at active cell" onClick={() => patch((s) => { s.freezeR = active.r; s.freezeC = active.c; })}>
              <Snowflake className="h-3.5 w-3.5" /> Freeze panes
            </Btn>
            <Btn title="Unfreeze" onClick={() => patch((s) => { s.freezeR = 0; s.freezeC = 0; })}>Unfreeze</Btn>
            <Btn title="Show formulas" active={book.showFormulas} onClick={() => emit({ ...book, showFormulas: !book.showFormulas }, false)}>
              Show formulas
            </Btn>
            <Btn title="Gridlines" active={book.gridlines} onClick={() => emit({ ...book, gridlines: !book.gridlines }, false)}>
              Gridlines
            </Btn>
            <label className="ml-2 text-[11px] text-[#555]">
              Zoom
              <input
                type="range"
                min={50}
                max={150}
                value={book.zoom}
                className="ml-2 align-middle"
                onChange={(e) => emit({ ...book, zoom: Number(e.target.value) }, false)}
              />
              <span className="ml-1">{book.zoom}%</span>
            </label>
            {!readOnly && (
              <>
                <Btn title="Hide row" onClick={() => patch((s) => { s.hiddenRows = [...new Set([...s.hiddenRows, active.r])]; })}>Hide row</Btn>
                <Btn title="Hide column" onClick={() => patch((s) => { s.hiddenCols = [...new Set([...s.hiddenCols, active.c])]; })}>Hide column</Btn>
                <Btn title="Unhide all" onClick={() => patch((s) => { s.hiddenRows = []; s.hiddenCols = []; })}>Unhide</Btn>
              </>
            )}
          </>
        )}
        {readOnly && <span className="text-[11px] text-[#666]">Read only · formatting, freeze, zoom and formulas still apply</span>}
      </div>

      <div className="flex items-center gap-2 border-b border-[#c5c5c5] bg-[#f3f3f3] px-2 py-1 text-xs">
        <span className="min-w-20 rounded border border-[#c5c5c5] bg-white px-2 py-1 font-semibold text-[#217346]">{addr}</span>
        {!readOnly && (
          <>
            <ColorPicker
              label="Fill color"
              icon={<PaintBucket className="h-3.5 w-3.5" />}
              value={style.bg}
              onPick={(c) => applyFill(c)}
              onClear={() => applyFill(null)}
            />
            <ColorPicker
              label="Font color"
              icon={<Palette className="h-3.5 w-3.5" />}
              value={style.fc}
              onPick={(c) => applyFontColor(c)}
              onClear={() => applyFontColor(null)}
            />
          </>
        )}
        <span className="text-[#666]">fx</span>
        <input
          ref={fxRef}
          className="min-w-[200px] flex-1 rounded border border-[#c5c5c5] bg-white px-2 py-1 outline-none"
          defaultValue={grid[active.r]?.[active.c] ?? ""}
          readOnly={readOnly}
          onInput={(e) => {
            const value = e.currentTarget.value;
            draftRef.current = value;
            if (inputRef.current) inputRef.current.value = value;
            if (!editingRef.current) beginEdit(activeRef.current.r, activeRef.current.c);
            scheduleCanvas();
          }}
          onFocus={() => {
            if (!readOnly) beginEdit(activeRef.current.r, activeRef.current.c);
          }}
          onBlur={() => finishEdit()}
          onKeyDown={(e) => {
            if (["Enter", "Tab", "ArrowUp", "ArrowDown"].includes(e.key)) {
              e.preventDefault();
              e.stopPropagation();
              if (e.key === "Enter") commitAndGo(1, 0);
              else if (e.key === "Tab") commitAndGo(0, e.shiftKey ? -1 : 1);
              else if (e.key === "ArrowUp") commitAndGo(-1, 0);
              else commitAndGo(1, 0);
            }
          }}
        />
      </div>

      <div
        ref={scrollRef}
        className="max-h-[580px] overflow-auto"
        style={{ overflowAnchor: "none" }}
      >
          <div ref={wrapRef} className="relative overflow-hidden">
          <canvas
            ref={canvasRef}
            className="block cursor-cell select-none"
            onPointerDown={onCanvasPointerDown}
            onPointerMove={(e) => {
              if (selecting.current) return;
              canvasRef.current!.style.cursor = cursorForHit(hitAt(e));
            }}
            onDoubleClick={(e) => {
              const hit = hitAt(e);
              if (hit.kind === "cell") beginEdit(hit.r, hit.c);
              if (hit.kind === "colResize") startColResize(hit.c, e.clientX, true);
            }}
            onContextMenu={(e) => {
              e.preventDefault();
              e.stopPropagation();
              const hit = hitAt(e);
              if (hit.kind !== "cell") return;
              activeRef.current = { r: hit.r, c: hit.c };
              if (!e.shiftKey) anchorRef.current = { r: hit.r, c: hit.c };
              setActive(activeRef.current);
              if (!e.shiftKey) setAnchor(anchorRef.current);
              const width = 176;
              const height = 420;
              const x = Math.min(Math.max(8, e.clientX), window.innerWidth - width - 8);
              const y = Math.min(Math.max(8, e.clientY), window.innerHeight - height - 8);
              setMenu({ x, y });
            }}
          />
          <textarea
              ref={inputRef}
              rows={1}
              tabIndex={editing && !readOnly ? 0 : -1}
              readOnly={readOnly || !editing}
              className="absolute z-20 resize-none overflow-hidden px-1 py-0 outline-none"
              style={{
                left: 0,
                top: 0,
                width: 24,
                height: 18,
                fontFamily: "Calibri, Segoe UI, sans-serif",
                fontSize: 13,
                lineHeight: "22px",
                caretColor: "#111827",
                color: "#111827",
                background: "#ffffff",
                border: "2px solid #217346",
                visibility: editing && !readOnly ? "visible" : "hidden",
                pointerEvents: editing && !readOnly ? "auto" : "none",
              }}
              defaultValue={draftRef.current}
              onInput={(e) => {
                draftRef.current = e.currentTarget.value;
                if (fxRef.current) fxRef.current.value = draftRef.current;
                scheduleCanvas();
              }}
              onBlur={() => {
                window.setTimeout(() => {
                  if (document.activeElement !== inputRef.current && document.activeElement !== fxRef.current && document.activeElement !== rootRef.current) {
                    finishEdit();
                  }
                }, 0);
              }}
              onKeyDown={(e) => {
                if (["Tab", "Enter", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) {
                  e.preventDefault();
                  e.stopPropagation();
                  if (e.key === "Enter") commitAndGo(1, 0);
                  else if (e.key === "Tab") commitAndGo(0, e.shiftKey ? -1 : 1);
                  else if (e.key === "ArrowUp") commitAndGo(-1, 0);
                  else if (e.key === "ArrowDown") commitAndGo(1, 0);
                  else if (e.key === "ArrowLeft") commitAndGo(0, -1);
                  else commitAndGo(0, 1);
                } else if (e.key === "Escape") {
                  e.preventDefault();
                  e.stopPropagation();
                  editingRef.current = false;
                  setEditing(false);
                  const pos = activeRef.current;
                  const original = bookRef.current.sheets[bookRef.current.active]?.grid[pos.r]?.[pos.c] ?? "";
                  syncFx(original);
                  queueMicrotask(() => rootRef.current?.focus({ preventScroll: true }));
                }
              }}
            />
          {sheet.filterOn && layoutRef.current && layoutRef.current.cols.map((c, i) => (
            <select
              key={c}
              className="absolute z-10 max-w-[54px] text-[10px]"
              style={{
                left: (layoutRef.current!.colX[i]! + 4) * zoom,
                top: 2 * zoom,
              }}
              value=""
              onChange={(e) => {
                const v = e.target.value;
                patch((s) => {
                  const next = { ...(s.filters ?? {}) };
                  if (v) next[c] = [v];
                  else delete next[c];
                  s.filters = next;
                }, false);
              }}
            >
              <option value="">All</option>
              {filterOptions(c).map((v) => (
                <option key={v} value={v}>{v}</option>
              ))}
            </select>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 border-t border-[#c5c5c5] bg-[#f3f3f3] px-2 py-0.5">
        <div className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto py-1">
          {book.sheets.map((s, i) => (
            <button
              key={`${s.name}-${i}`}
              type="button"
              className={`rounded-t border px-3 py-0.5 text-[11px] ${
                i === book.active ? "border-[#c5c5c5] border-b-white bg-white font-semibold text-[#217346]" : "border-transparent text-[#555]"
              }`}
              onClick={() => emit({ ...book, active: i }, false)}
              onDoubleClick={() => {
                if (readOnly) return;
                const name = window.prompt("Sheet name", s.name);
                if (!name) return;
                patch((_, b) => {
                  b.sheets[i]!.name = name;
                });
              }}
            >
              {s.name}
            </button>
          ))}
          {!readOnly && (
            <button
              type="button"
              className="rounded px-2 py-0.5 text-[11px] text-[#217346] hover:bg-[#d3f0e0]"
              onClick={() => {
                const next = cloneBook(book);
                next.sheets.push(newSheet(`Sheet${next.sheets.length + 1}`));
                next.active = next.sheets.length - 1;
                emit(next);
              }}
            >
              +
            </button>
          )}
        </div>
        <div className="shrink-0 text-[11px] text-[#555]">
          Count {stats.count}
          {stats.numeric ? ` · Sum ${stats.sum} · Avg ${Number(stats.avg.toFixed(2))} · Min ${stats.min} · Max ${stats.max}` : ""}
        </div>
      </div>

      {menu && !readOnly && createPortal(
        <div
          className="fixed z-[9999] min-w-44 rounded border border-[#c5c5c5] bg-white py-1 text-[12px] shadow-lg"
          style={{ left: menu.x, top: menu.y }}
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
        >
          {[
            ["Copy", () => void copySel()],
            ["Cut", () => void copySel().then(() => clearSel(true))],
            ["Paste", () => void pasteAt()],
            ["Fill down", fillDown],
            ["Insert row", () => addRow(true)],
            ["Insert column", () => addCol(true)],
            ["Delete row", deleteRow],
            ["Delete column", deleteCol],
            ["Clear", () => clearSel(true)],
            ["Merge", mergeSel],
            ["Fill yellow", () => applyFill("#ffff00")],
            ["Fill green", () => applyFill("#c6efce")],
            ["Fill red", () => applyFill("#ffc7ce")],
            ["Fill blue", () => applyFill("#bdd7ee")],
            ["No fill", () => applyFill(null)],
          ].map(([label, fn]) => (
            <button
              key={String(label)}
              type="button"
              className="block w-full px-3 py-1 text-left hover:bg-[#e7f5ee]"
              onClick={() => {
                (fn as () => void)();
                setMenu(null);
              }}
            >
              {label as string}
            </button>
          ))}
        </div>,
        document.body,
      )}

      {findOpen && (
        <div className="absolute right-3 top-12 z-50 w-72 rounded border border-[#c5c5c5] bg-white p-3 shadow-xl">
          <div className="mb-2 text-xs font-semibold">Find and replace</div>
          <input className="mb-2 w-full rounded border px-2 py-1 text-xs" placeholder="Find" value={findQ} onChange={(e) => setFindQ(e.target.value)} />
          {!readOnly && (
            <input className="mb-2 w-full rounded border px-2 py-1 text-xs" placeholder="Replace with" value={replaceQ} onChange={(e) => setReplaceQ(e.target.value)} />
          )}
          <div className="flex gap-1">
            <Btn
              title="Find next"
              onClick={() => {
                const q = findQ.toLowerCase();
                if (!q) return;
                for (let i = 0; i < grid.length * colCount; i++) {
                  const idx = (active.r * colCount + active.c + 1 + i) % (grid.length * colCount);
                  const r = Math.floor(idx / colCount);
                  const c = idx % colCount;
                  const text = `${grid[r]?.[c] ?? ""} ${displayCacheRef.current?.[r]?.[c] ?? ""}`.toLowerCase();
                  if (text.includes(q)) {
                    setActive({ r, c });
                    setAnchor({ r, c });
                    break;
                  }
                }
              }}
            >
              Find next
            </Btn>
            {!readOnly && (
              <Btn
                title="Replace all"
                onClick={() => {
                  const q = findQ;
                  if (!q) return;
                  patch((s) => {
                    s.grid = s.grid.map((row) => row.map((cell) => cell.split(q).join(replaceQ)));
                  });
                }}
              >
                Replace all
              </Btn>
            )}
            <Btn title="Close" onClick={() => setFindOpen(false)}>Close</Btn>
          </div>
        </div>
      )}

      {commentOpen && !readOnly && (
        <div className="absolute right-3 top-12 z-50 w-72 rounded border border-[#c5c5c5] bg-white p-3 shadow-xl">
          <div className="mb-2 text-xs font-semibold">Comment · {addr}</div>
          <textarea
            className="mb-2 h-24 w-full rounded border px-2 py-1 text-xs"
            value={commentDraft}
            onChange={(e) => setCommentDraft(e.target.value)}
          />
          <div className="flex gap-1">
            <Btn
              title="Save comment"
              onClick={() => {
                patch((s) => {
                  const k = cellKey(active.r, active.c);
                  if (commentDraft.trim()) s.comments[k] = commentDraft.trim();
                  else delete s.comments[k];
                });
                setCommentOpen(false);
              }}
            >
              Save
            </Btn>
            <Btn
              title="Delete comment"
              onClick={() => {
                patch((s) => {
                  delete s.comments[cellKey(active.r, active.c)];
                });
                setCommentOpen(false);
                setCommentDraft("");
              }}
            >
              Delete
            </Btn>
            <Btn title="Close" onClick={() => setCommentOpen(false)}>Close</Btn>
          </div>
        </div>
      )}

      {chart && (
        <div className="absolute inset-6 z-50 overflow-auto rounded border border-[#c5c5c5] bg-white p-4 shadow-xl">
          <div className="mb-2 flex items-center justify-between text-sm font-semibold">
            Column chart
            <button type="button" className="text-xs" onClick={() => setChart(false)}>Close</button>
          </div>
          {chartData.length === 0 ? (
            <p className="text-xs text-[#666]">Select numeric cells, then insert a chart.</p>
          ) : (
            <svg viewBox={`0 0 ${Math.max(320, chartData.length * 28)} 180`} className="w-full">
              {chartData.map((p, i) => {
                const max = Math.max(...chartData.map((d) => d.v), 1);
                const h = (p.v / max) * 140;
                return (
                  <g key={p.label}>
                    <rect x={i * 28 + 8} y={150 - h} width={18} height={h} fill="#217346" />
                    <text x={i * 28 + 17} y={168} textAnchor="middle" fontSize="8">{p.label}</text>
                  </g>
                );
              })}
            </svg>
          )}
        </div>
      )}
    </div>
  );
});
