import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { evaluateGrid } from "./excel-engine";
import { formatIst } from "./login-activity";
import { bookFromDoc, bookToDoc, compactDoc, type SheetColumn, type SheetRow, type SpreadsheetDoc } from "./spreadsheet";

function safeFileName(title: string | null | undefined, ext: string) {
  const base = (title || "plantation-report")
    .replace(/[<>:"/\\|?*\u0000-\u001f]+/g, " ")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
  return `${base || "plantation-report"}.${ext}`;
}

function usedGrid(grid: string[][]): string[][] {
  let maxR = 0;
  let maxC = 0;
  for (let r = 0; r < grid.length; r++) {
    for (let c = 0; c < (grid[r]?.length ?? 0); c++) {
      if (String(grid[r]?.[c] ?? "").trim() !== "") {
        maxR = Math.max(maxR, r);
        maxC = Math.max(maxC, c);
      }
    }
  }
  if (maxR === 0 && maxC === 0 && !String(grid[0]?.[0] ?? "").trim()) {
    return [["(empty)"]];
  }
  return Array.from({ length: maxR + 1 }, (_, r) =>
    Array.from({ length: maxC + 1 }, (_, c) => String(grid[r]?.[c] ?? "")),
  );
}

function sheetTable(columns: SheetColumn[], rows: SheetRow[]): string[][] {
  const book = bookFromDoc(columns, rows);
  const sheet = book.sheets[book.active] ?? book.sheets[0];
  if (!sheet) return [["(empty)"]];
  const display = evaluateGrid(sheet.grid, false, sheet.styles);
  return usedGrid(display);
}

function addPdfSection(
  doc: jsPDF,
  title: string,
  meta: string[],
  table: string[][],
  startY?: number,
) {
  const pageW = doc.internal.pageSize.getWidth();
  let y = startY ?? 16;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(40, 70, 45);
  doc.text(title, 14, y);
  y += 7;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(80, 90, 80);
  for (const line of meta) {
    doc.text(line, 14, y);
    y += 5;
  }
  y += 2;
  const head = table[0] ?? [""];
  const body = table.slice(1);
  autoTable(doc, {
    startY: y,
    head: [head],
    body: body.length ? body : [["—"]],
    styles: {
      fontSize: 8,
      cellPadding: 2,
      overflow: "linebreak",
      valign: "middle",
    },
    headStyles: {
      fillColor: [56, 105, 70],
      textColor: 255,
      fontStyle: "bold",
    },
    alternateRowStyles: { fillColor: [245, 247, 242] },
    margin: { left: 14, right: 14 },
    tableWidth: pageW - 28,
  });
  const finalY = (doc as jsPDF & { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY;
  return finalY ?? y + 20;
}

/** Download a submitted report as a PDF (main + optional abstract). */
export function downloadReportPdf(report: SpreadsheetDoc) {
  const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const title = report.title || "Plantation report";
  const meta = [
    `Division: ${report.district || "—"}`,
    `District Manager: ${report.username || "—"}`,
    `Submitted: ${formatIst(report.submitted_at || report.updated_at, { seconds: true })}`,
    `Status: ${report.status || "submitted"}`,
  ];

  const main = sheetTable(
    Array.isArray(report.columns) ? report.columns : [],
    Array.isArray(report.rows) ? report.rows : [],
  );
  let y = addPdfSection(pdf, title, meta, main);

  if (report.includeAbstract && report.abstract) {
    pdf.addPage();
    const abstract = sheetTable(
      Array.isArray(report.abstract.columns) ? report.abstract.columns : [],
      Array.isArray(report.abstract.rows) ? report.abstract.rows : [],
    );
    addPdfSection(pdf, `${title} · Abstract`, meta, abstract, 16);
  } else {
    void y;
  }

  pdf.save(safeFileName(title, "pdf"));
}

function aoaFromSheet(sheet: XLSX.WorkSheet): string[][] {
  const aoa = XLSX.utils.sheet_to_json<string[]>(sheet, {
    header: 1,
    defval: "",
    raw: false,
  }) as unknown as string[][];
  return aoa.map((row) => (Array.isArray(row) ? row.map((c) => String(c ?? "")) : []));
}

function docFromAoa(aoa: string[][]): { columns: SheetColumn[]; rows: SheetRow[] } {
  const maxCols = Math.max(1, ...aoa.map((r) => r.length));
  const grid = aoa.length
    ? aoa.map((row) => {
        const next = [...row];
        while (next.length < maxCols) next.push("");
        return next;
      })
    : [[""]];
  const book = bookFromDoc([], []);
  const base = book.sheets[0]!;
  book.sheets[0] = {
    ...base,
    name: "Sheet1",
    grid,
    colWidths: Array.from({ length: maxCols }, () => base.colWidths[0] ?? 96),
    rowHeights: Array.from({ length: grid.length }, () => base.rowHeights[0] ?? 22),
  };
  const { columns, rows } = bookToDoc(book);
  return compactDoc(columns, rows);
}

/** Parse an uploaded .xlsx into a SpreadsheetDoc-ready main sheet (first workbook sheet). */
export async function spreadsheetFromXlsxFile(file: File): Promise<{
  title: string;
  columns: SheetColumn[];
  rows: SheetRow[];
}> {
  const buffer = await file.arrayBuffer();
  const wb = XLSX.read(buffer, { type: "array", cellDates: true });
  const first = wb.SheetNames[0];
  if (!first) throw new Error("The Excel file has no sheets.");
  const sheet = wb.Sheets[first];
  if (!sheet) throw new Error("Could not read the first sheet.");
  const aoa = aoaFromSheet(sheet);
  if (!aoa.some((row) => row.some((c) => String(c).trim() !== ""))) {
    throw new Error("The Excel file is empty.");
  }
  const { columns, rows } = docFromAoa(aoa);
  const baseName = file.name.replace(/\.xlsx$/i, "").trim();
  return {
    title: baseName || `Uploaded report · ${new Date().toLocaleDateString("en-IN")}`,
    columns,
    rows,
  };
}

/** Convenience: trigger a file picker for .xlsx and return the parsed sheet. */
export function pickXlsxFile(): Promise<File> {
  return new Promise((resolve, reject) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
    input.style.display = "none";
    input.onchange = () => {
      const file = input.files?.[0];
      input.remove();
      if (!file) {
        reject(new Error("No file selected."));
        return;
      }
      if (!/\.xlsx$/i.test(file.name)) {
        reject(new Error("Please choose an .xlsx Excel file."));
        return;
      }
      resolve(file);
    };
    input.oncancel = () => {
      input.remove();
      reject(new Error("Upload cancelled."));
    };
    document.body.appendChild(input);
    input.click();
  });
}

export { safeFileName };
