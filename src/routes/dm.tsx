import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  Download,
  Eye,
  FilePlus2,
  FileText,
  FileUp,
  MapPin,
  Save,
  Send,
  Trash2,
  UserCheck,
} from "lucide-react";
import { AppShell } from "@/components/nex/AppShell";
import { SpreadsheetGrid, type SpreadsheetHandle } from "@/components/nex/SpreadsheetGrid";
import { formatIst } from "@/lib/login-activity";
import { getSession, type Session } from "@/lib/nex-data";
import { downloadReportPdf, pickXlsxFile, spreadsheetFromXlsxFile } from "@/lib/report-export";
import {
  defaultSpreadsheet,
  deleteReport,
  loadMyReports,
  saveReport,
  type SheetColumn,
  type SheetRow,
  type SpreadsheetDoc,
} from "@/lib/spreadsheet";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/dm")({
  head: () => ({
    meta: [
      { title: "District Manager Desk · NEX-FOREST" },
      {
        name: "description",
        content: "Create plantation reports and review submissions for your division.",
      },
    ],
  }),
  component: DmDashboard,
});

type Screen = "home" | "editor" | "viewer";

function defaultTitle() {
  return `Plantation report · ${new Date().toLocaleDateString("en-IN")}`;
}

function DmDashboard() {
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [reports, setReports] = useState<SpreadsheetDoc[]>([]);
  const [screen, setScreen] = useState<Screen>("home");
  const [reportId, setReportId] = useState<string | undefined>();
  const [title, setTitle] = useState(defaultTitle);
  const [columns, setColumns] = useState<SheetColumn[]>(defaultSpreadsheet().columns);
  const [rows, setRows] = useState<SheetRow[]>(defaultSpreadsheet().rows);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [createdAt, setCreatedAt] = useState(new Date().toISOString());
  const [includeAbstract, setIncludeAbstract] = useState(false);
  const [abstractColumns, setAbstractColumns] = useState<SheetColumn[]>(defaultSpreadsheet().columns);
  const [abstractRows, setAbstractRows] = useState<SheetRow[]>(defaultSpreadsheet().rows);
  const columnsRef = useRef(columns);
  const rowsRef = useRef(rows);
  const abstractColumnsRef = useRef(abstractColumns);
  const abstractRowsRef = useRef(abstractRows);
  const mainGridRef = useRef<SpreadsheetHandle>(null);
  const abstractGridRef = useRef<SpreadsheetHandle>(null);
  columnsRef.current = columns;
  rowsRef.current = rows;
  abstractColumnsRef.current = abstractColumns;
  abstractRowsRef.current = abstractRows;

  useEffect(() => {
    const s = getSession();
    if (!s || s.role !== "dm") navigate({ to: "/" });
    else setSession(s);
  }, [navigate]);

  const refreshReports = async (uid: string) => {
    const docs = await loadMyReports(uid);
    setReports(docs);
  };

  useEffect(() => {
    if (!session) return;
    const load = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        navigate({ to: "/" });
        return;
      }
      setUserId(user.id);
      try {
        await refreshReports(user.id);
        setError("");
      } catch (err) {
        console.error(err);
        setError("Could not load your reports.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [session, navigate]);

  const drafts = useMemo(() => reports.filter((r) => r.status !== "submitted"), [reports]);
  const submitted = useMemo(() => reports.filter((r) => r.status === "submitted"), [reports]);

  if (!session) return null;

  const openNew = () => {
    const blank = defaultSpreadsheet();
    setReportId(undefined);
    setTitle(defaultTitle());
    setColumns(blank.columns);
    setRows(blank.rows);
    setStatus("");
    setError("");
    setCreatedAt(new Date().toISOString());
    setIncludeAbstract(false);
    const blankAbstract = defaultSpreadsheet();
    setAbstractColumns(blankAbstract.columns);
    setAbstractRows(blankAbstract.rows);
    setScreen("editor");
  };

  const openReport = (doc: SpreadsheetDoc, mode: Screen) => {
    setReportId(doc.id);
    setTitle(doc.title || "Plantation report");
    setColumns(Array.isArray(doc.columns) && doc.columns.length ? doc.columns : defaultSpreadsheet().columns);
    setRows(Array.isArray(doc.rows) && doc.rows.length ? doc.rows : defaultSpreadsheet().rows);
    setStatus("");
    setError("");
    setCreatedAt(doc.created_at || new Date().toISOString());
    setIncludeAbstract(Boolean(doc.includeAbstract && doc.abstract));
    const blankAbstract = defaultSpreadsheet();
    setAbstractColumns(doc.abstract?.columns?.length ? doc.abstract.columns : blankAbstract.columns);
    setAbstractRows(doc.abstract?.rows?.length ? doc.abstract.rows : blankAbstract.rows);
    setScreen(mode);
  };

  const persist = async (nextStatus: "draft" | "submitted") => {
    if (!userId || !session.district) {
      setError("You must be signed in to save.");
      return;
    }
    const main = mainGridRef.current?.snapshot() ?? { columns: columnsRef.current, rows: rowsRef.current };
    const abstractSnap = includeAbstract
      ? (abstractGridRef.current?.snapshot() ?? { columns: abstractColumnsRef.current, rows: abstractRowsRef.current })
      : null;
    columnsRef.current = main.columns;
    rowsRef.current = main.rows;
    if (abstractSnap) {
      abstractColumnsRef.current = abstractSnap.columns;
      abstractRowsRef.current = abstractSnap.rows;
    }
    setSaving(true);
    setError("");
    try {
      const saved = await saveReport({
        id: reportId,
        userId,
        username: session.username,
        district: session.district,
        title,
        status: nextStatus,
        columns: main.columns,
        rows: main.rows,
        createdAt,
        includeAbstract,
        abstract: includeAbstract && abstractSnap ? abstractSnap : null,
      });
      setReportId(saved.id);
      await refreshReports(userId);
      if (nextStatus === "submitted") {
        setStatus(`Submitted ${new Date().toLocaleTimeString("en-IN")}`);
        setScreen("home");
      } else {
        setStatus(`Progress saved ${new Date().toLocaleTimeString("en-IN")}. You can leave and continue this report later.`);
      }
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Could not save the report.");
    } finally {
      setSaving(false);
    }
  };

  const removeDraft = async (doc: SpreadsheetDoc) => {
    if (!userId || !doc.id) return;
    const label = doc.title || "Plantation report";
    if (!window.confirm(`Delete "${label}"? This draft cannot be recovered.`)) return;
    setDeletingId(doc.id);
    setError("");
    try {
      await deleteReport({ userId, reportId: doc.id });
      if (reportId === doc.id) {
        setReportId(undefined);
        setScreen("home");
      }
      await refreshReports(userId);
      setStatus(`Deleted "${label}"`);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Could not delete the report.");
    } finally {
      setDeletingId(null);
    }
  };

  const downloadPdf = (doc: SpreadsheetDoc) => {
    try {
      downloadReportPdf(doc);
      setError("");
      setStatus(`Downloaded PDF for "${doc.title || "Plantation report"}"`);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Could not download PDF.");
    }
  };

  const uploadXlsx = async () => {
    if (!userId || !session.district) {
      setError("You must be signed in to upload.");
      return;
    }
    setUploading(true);
    setError("");
    try {
      const file = await pickXlsxFile();
      const parsed = await spreadsheetFromXlsxFile(file);
      const saved = await saveReport({
        userId,
        username: session.username,
        district: session.district,
        title: parsed.title,
        status: "draft",
        columns: parsed.columns,
        rows: parsed.rows,
        createdAt: new Date().toISOString(),
        includeAbstract: false,
        abstract: null,
      });
      await refreshReports(userId);
      setStatus(`Uploaded "${saved.title || parsed.title}" — saved in progress. Open it to edit or submit.`);
    } catch (err) {
      console.error(err);
      const message = err instanceof Error ? err.message : "Could not upload the Excel file.";
      if (!/cancelled|No file selected/i.test(message)) {
        setError(message);
      }
    } finally {
      setUploading(false);
    }
  };

  if (screen === "editor" || screen === "viewer") {
    const readOnly = screen === "viewer";
    const viewingDoc =
      readOnly && reportId
        ? reports.find((r) => r.id === reportId) ?? null
        : null;
    return (
      <AppShell session={session} title="Plantation Register" subtitle={`${session.district} Division`}>
        <section className="rise overflow-hidden rounded-lg border border-border bg-card shadow-[var(--shadow-panel)]">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-5 py-4">
            <div className="min-w-0 flex-1">
              <button
                type="button"
                onClick={() => {
                  setScreen("home");
                  setStatus("");
                  setError("");
                }}
                className="mb-2 inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
              >
                <ArrowLeft className="h-3.5 w-3.5" /> Back to desk
              </button>
              {readOnly ? (
                <h2 className="font-display text-sm font-semibold text-foreground">{title}</h2>
              ) : (
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full max-w-xl rounded-md border border-input bg-background px-3 py-2 text-sm font-semibold text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-ring/25"
                  placeholder="Report title"
                />
              )}
              <p className="mt-1 text-xs text-muted-foreground">
                {readOnly
                  ? "Submitted report · read only"
                  : "Fill the sheet in parts. Save keeps your progress on this desk. Submit sends the report to the GM office."}
              </p>
              {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
              {status && !error && <p className="mt-1 text-xs text-muted-foreground">{status}</p>}
            </div>
            {!readOnly && (
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => persist("draft")}
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-xs font-semibold text-foreground hover:bg-secondary disabled:opacity-70"
                >
                  <Save className="h-3.5 w-3.5" /> {saving ? "Saving…" : "Save"}
                </button>
                <button
                  type="button"
                  onClick={() => persist("submitted")}
                  disabled={saving}
                  className="sheen inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-70"
                >
                  <Send className="h-3.5 w-3.5" /> Submit
                </button>
              </div>
            )}
            {readOnly && (
              <button
                type="button"
                onClick={() =>
                  downloadPdf(
                    viewingDoc ?? {
                      id: reportId,
                      title,
                      username: session.username,
                      district: session.district,
                      status: "submitted",
                      columns,
                      rows,
                      created_at: createdAt,
                      updated_at: createdAt,
                      submitted_at: createdAt,
                      includeAbstract,
                      abstract: includeAbstract
                        ? { columns: abstractColumns, rows: abstractRows }
                        : null,
                    },
                  )
                }
                className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-xs font-semibold text-foreground hover:bg-secondary"
              >
                <Download className="h-3.5 w-3.5" /> Download PDF
              </button>
            )}
          </div>
          <div className="border-b border-border bg-sand/40 px-5 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Main report
          </div>
          <SpreadsheetGrid
            ref={mainGridRef}
            key={`${reportId ?? "new"}-main`}
            readOnly={readOnly}
            usedOnly={readOnly}
            columns={columns}
            rows={rows}
            onChange={(next) => {
              columnsRef.current = next.columns;
              rowsRef.current = next.rows;
            }}
          />
        </section>

        <section className="rise mt-6 overflow-hidden rounded-lg border border-border bg-card shadow-[var(--shadow-panel)]">
          <div className="border-b border-border px-5 py-4">
            <h3 className="font-display text-sm font-semibold text-foreground">Create abstract report?</h3>
            <p className="mt-1 text-xs text-muted-foreground">If yes, a second spreadsheet (same layout as the main report) is added below and submitted together.</p>
            {!readOnly && (
              <div className="mt-3 flex gap-4 text-sm">
                <label className="inline-flex items-center gap-2">
                  <input
                    type="radio"
                    name="abstract"
                    checked={!includeAbstract}
                    onChange={() => setIncludeAbstract(false)}
                  />
                  No
                </label>
                <label className="inline-flex items-center gap-2">
                  <input
                    type="radio"
                    name="abstract"
                    checked={includeAbstract}
                    onChange={() => {
                      setIncludeAbstract(true);
                      if (!abstractColumns.length) {
                        const blank = defaultSpreadsheet();
                        setAbstractColumns(blank.columns);
                        setAbstractRows(blank.rows);
                      }
                    }}
                  />
                  Yes
                </label>
              </div>
            )}
            {readOnly && <p className="mt-2 text-sm text-foreground">{includeAbstract ? "Yes · abstract included" : "No"}</p>}
          </div>
          {includeAbstract && (
            <>
              <div className="border-b border-border bg-sand/40 px-5 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                Abstract report
              </div>
              <SpreadsheetGrid
                ref={abstractGridRef}
                key={`${reportId ?? "new"}-abstract`}
                readOnly={readOnly}
                usedOnly={readOnly}
                columns={abstractColumns}
                rows={abstractRows}
                onChange={(next) => {
                  abstractColumnsRef.current = next.columns;
                  abstractRowsRef.current = next.rows;
                }}
              />
            </>
          )}
        </section>

        {!readOnly && (
          <section className="rise mt-6 overflow-hidden rounded-lg border border-border bg-card shadow-[var(--shadow-panel)]">
            <div className="border-b border-border px-5 py-4">
              <h3 className="font-display text-sm font-semibold text-foreground">Save progress</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                Store this spreadsheet as an in-progress draft. It will appear on your desk so you can continue later and submit when the report is complete.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3 px-5 py-4">
              <button
                type="button"
                onClick={() => persist("draft")}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-4 py-2.5 text-sm font-semibold text-foreground hover:bg-secondary disabled:opacity-70"
              >
                <Save className="h-4 w-4" /> {saving ? "Saving…" : "Save progress"}
              </button>
              <button
                type="button"
                onClick={() => persist("submitted")}
                disabled={saving}
                className="sheen inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-70"
              >
                <Send className="h-4 w-4" /> Submit to GM
              </button>
              {status && !error && <span className="text-xs text-muted-foreground">{status}</span>}
              {error && <span className="text-xs text-destructive">{error}</span>}
            </div>
          </section>
        )}
      </AppShell>
    );
  }

  return (
    <AppShell session={session} title="Division desk" subtitle={`${session.district} Division`}>
      <section className="topo-texture rise relative overflow-hidden rounded-lg border border-border bg-card p-5 shadow-[var(--shadow-panel)] sm:p-6">
        <div className="relative grid gap-5 sm:grid-cols-2">
          <Identity icon={UserCheck} label="Assigned Account ID" value={session.username} />
          <Identity icon={MapPin} label="Location of Plantation" value={session.location ?? "—"} />
        </div>
      </section>

      {error && <p className="mt-4 text-sm text-destructive">{error}</p>}
      {status && !error && <p className="mt-4 text-sm text-muted-foreground">{status}</p>}

      <section className="rise mt-6 overflow-hidden rounded-lg border border-border bg-card shadow-[var(--shadow-panel)]">
        <div className="border-b border-border px-5 py-4">
          <h2 className="font-display text-sm font-semibold text-foreground">1. Create a report</h2>
          <p className="text-xs text-muted-foreground">
            Open a blank spreadsheet, or upload an Excel (.xlsx) file. Uploads are saved as in-progress drafts you can edit and submit.
          </p>
        </div>
        <div className="flex flex-wrap gap-3 p-5">
          <button
            type="button"
            onClick={openNew}
            className="sheen inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
          >
            <FilePlus2 className="h-4 w-4" /> Create report
          </button>
          <button
            type="button"
            onClick={uploadXlsx}
            disabled={uploading}
            className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-4 py-2.5 text-sm font-semibold text-foreground hover:bg-secondary disabled:opacity-70"
          >
            <FileUp className="h-4 w-4" /> {uploading ? "Uploading…" : "Upload Excel (.xlsx)"}
          </button>
        </div>
      </section>

      <section className="rise mt-6 overflow-hidden rounded-lg border border-border bg-card shadow-[var(--shadow-panel)]" style={{ animationDelay: "50ms" }}>
        <div className="border-b border-border px-5 py-4">
          <h2 className="font-display text-sm font-semibold text-foreground">2. Saved in progress</h2>
          <p className="text-xs text-muted-foreground">
            Drafts from Save or Excel upload. Continue any row to edit, then Submit when ready.
          </p>
        </div>
        {loading ? (
          <p className="px-5 py-8 text-sm text-muted-foreground">Loading drafts…</p>
        ) : (
          <ReportTable
            reports={drafts}
            empty="No saved drafts yet. Create a report, Save progress, or upload an Excel (.xlsx) file."
            actionLabel="Continue"
            onAction={(doc) => openReport(doc, "editor")}
            onDelete={removeDraft}
            deletingId={deletingId}
          />
        )}
      </section>

      <section className="rise mt-6 overflow-hidden rounded-lg border border-border bg-card shadow-[var(--shadow-panel)]" style={{ animationDelay: "80ms" }}>
        <div className="border-b border-border px-5 py-4">
          <h2 className="font-display text-sm font-semibold text-foreground">3. Submitted reports</h2>
          <p className="text-xs text-muted-foreground">Reports already sent from this division. Open any row to review the sheet.</p>
        </div>
        {loading ? (
          <p className="px-5 py-8 text-sm text-muted-foreground">Loading reports…</p>
        ) : (
          <ReportTable
            reports={submitted}
            empty="No reports submitted yet. Create a report and choose Submit."
            actionLabel="View"
            actionIcon={Eye}
            onAction={(doc) => openReport(doc, "viewer")}
            onDownloadPdf={downloadPdf}
          />
        )}
      </section>
    </AppShell>
  );
}

function ReportTable({
  reports,
  empty,
  actionLabel,
  actionIcon: ActionIcon = FileText,
  onAction,
  onDelete,
  onDownloadPdf,
  deletingId,
}: {
  reports: SpreadsheetDoc[];
  empty: string;
  actionLabel: string;
  actionIcon?: typeof Eye;
  onAction: (doc: SpreadsheetDoc) => void;
  onDelete?: (doc: SpreadsheetDoc) => void;
  onDownloadPdf?: (doc: SpreadsheetDoc) => void;
  deletingId?: string | null;
}) {
  if (!reports.length) {
    return empty ? <p className="px-5 py-8 text-sm text-muted-foreground">{empty}</p> : null;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[560px] border-collapse text-left">
        <thead>
          <tr className="bg-sand/70 text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
            <th className="w-14 border-b border-border px-3 py-3 font-semibold">S.No</th>
            <th className="border-b border-border px-3 py-3 font-semibold">Report</th>
            <th className="border-b border-border px-3 py-3 font-semibold">Last updated</th>
            <th className="border-b border-border px-3 py-3 font-semibold">Action</th>
          </tr>
        </thead>
        <tbody>
          {reports.map((doc, i) => (
            <tr key={doc.id ?? i} className="text-sm odd:bg-card even:bg-secondary/25">
              <td className="border-b border-border px-3 py-2.5 tabular-nums text-muted-foreground">{i + 1}</td>
              <td className="border-b border-border px-3 py-2.5 font-medium text-foreground">
                {doc.title || "Plantation report"}
                {doc.includeAbstract ? <span className="ml-2 text-[11px] font-semibold text-primary">+ Abstract</span> : null}
              </td>
              <td className="border-b border-border px-3 py-2.5 tabular-nums text-foreground">{formatIst(doc.updated_at)}</td>
              <td className="border-b border-border px-3 py-2.5">
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => onAction(doc)}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
                  >
                    <ActionIcon className="h-3.5 w-3.5" /> {actionLabel}
                  </button>
                  {onDownloadPdf && (
                    <button
                      type="button"
                      onClick={() => onDownloadPdf(doc)}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
                    >
                      <Download className="h-3.5 w-3.5" /> PDF
                    </button>
                  )}
                  {onDelete && doc.id && (
                    <button
                      type="button"
                      onClick={() => onDelete(doc)}
                      disabled={deletingId === doc.id}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-destructive hover:underline disabled:opacity-60"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> {deletingId === doc.id ? "Deleting…" : "Delete"}
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Identity({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof MapPin;
  label: string;
  value: string;
}) {
  return (
    <div className="flex gap-3">
      <div className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-md bg-primary/10 text-primary">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{label}</div>
        <div className="font-display text-base font-semibold text-foreground">{value}</div>
      </div>
    </div>
  );
}
