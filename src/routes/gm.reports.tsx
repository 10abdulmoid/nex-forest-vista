import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Eye, Search } from "lucide-react";
import { AppShell } from "@/components/nex/AppShell";
import { SpreadsheetGrid } from "@/components/nex/SpreadsheetGrid";
import { formatIst } from "@/lib/login-activity";
import { districts, getSession, type Session } from "@/lib/nex-data";
import { loadAllSpreadsheets, type SpreadsheetDoc } from "@/lib/spreadsheet";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/gm/reports")({
  head: () => ({
    meta: [
      { title: "View reports · NEX-FOREST" },
      {
        name: "description",
        content: "Search and open plantation reports submitted by District Managers.",
      },
    ],
  }),
  component: GmReports,
});

function reportKey(doc: SpreadsheetDoc, index: number) {
  return doc.id || `${doc.username}-${doc.updated_at}-${index}`;
}

function dmLabel(doc: SpreadsheetDoc) {
  const match = districts.find(
    (d) =>
      d.username.toLowerCase() === (doc.username || "").toLowerCase() ||
      d.district.toLowerCase() === (doc.district || "").toLowerCase(),
  );
  return {
    username: doc.username || match?.username || "—",
    district: doc.district || match?.district || "—",
    location: match?.location || doc.district || "—",
  };
}

function submittedWhen(doc: SpreadsheetDoc) {
  const raw = doc.submitted_at || doc.updated_at;
  if (!raw) return null;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
}

function inSubmittedRange(d: Date, from: string, to: string) {
  if (from) {
    const start = new Date(`${from}T00:00:00`);
    if (d < start) return false;
  }
  if (to) {
    const end = new Date(`${to}T23:59:59.999`);
    if (d > end) return false;
  }
  return true;
}

function dmMatchesFilter(doc: SpreadsheetDoc, filter: string) {
  if (!filter) return true;
  const dm = dmLabel(doc);
  const key = filter.toLowerCase();
  return (
    dm.username.toLowerCase() === key ||
    dm.district.toLowerCase() === key ||
    (doc.username || "").toLowerCase() === key ||
    (doc.district || "").toLowerCase() === key
  );
}

function GmReports() {
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  const [reports, setReports] = useState<SpreadsheetDoc[]>([]);
  const [query, setQuery] = useState("");
  const [dmFilter, setDmFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [openKey, setOpenKey] = useState<string | null>(null);
  const [loadError, setLoadError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const s = getSession();
    if (!s || s.role !== "gm") navigate({ to: "/" });
    else setSession(s);
  }, [navigate]);

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
      try {
        setReports(await loadAllSpreadsheets());
        setLoadError("");
      } catch (err) {
        console.error(err);
        setReports([]);
        setLoadError("Could not load submitted reports.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [session, navigate]);

  const dmOptions = useMemo(() => {
    const seen = new Set<string>();
    const opts: { value: string; label: string }[] = [];
    for (const doc of reports) {
      const dm = dmLabel(doc);
      const value = (doc.username || dm.username).toLowerCase();
      if (seen.has(value)) continue;
      seen.add(value);
      opts.push({ value, label: `${dm.district} · ${dm.username}` });
    }
    for (const d of districts) {
      const value = d.username.toLowerCase();
      if (seen.has(value)) continue;
      seen.add(value);
      opts.push({ value, label: `${d.district} · ${d.username}` });
    }
    return opts.sort((a, b) => a.label.localeCompare(b.label));
  }, [reports]);

  const filtersActive = Boolean(dmFilter || dateFrom || dateTo || query.trim());

  const clearFilters = () => {
    setQuery("");
    setDmFilter("");
    setDateFrom("");
    setDateTo("");
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return reports.filter((doc) => {
      if (!dmMatchesFilter(doc, dmFilter)) return false;
      const when = submittedWhen(doc);
      if ((dateFrom || dateTo) && (!when || !inSubmittedRange(when, dateFrom, dateTo))) return false;
      if (!q) return true;
      const dm = dmLabel(doc);
      const hay = [
        doc.title,
        doc.username,
        doc.district,
        dm.username,
        dm.district,
        dm.location,
        formatIst(doc.updated_at, { seconds: true }),
        formatIst(doc.created_at, { seconds: true }),
        formatIst(doc.submitted_at, { seconds: true }),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [query, reports, dmFilter, dateFrom, dateTo]);

  const openReport = reports.find((r, i) => reportKey(r, i) === openKey) ?? null;

  if (!session) return null;

  if (openReport) {
    const dm = dmLabel(openReport);
    return (
      <AppShell session={session} title="View reports" subtitle={`${openReport.title || "Plantation report"} · ${dm.district}`}>
        <section className="rise overflow-hidden rounded-lg border border-border bg-card shadow-[var(--shadow-panel)]">
          <div className="border-b border-border px-5 py-4">
            <button
              type="button"
              onClick={() => setOpenKey(null)}
              className="mb-2 inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Back to report list
            </button>
            <h2 className="font-display text-sm font-semibold text-foreground">{openReport.title || "Plantation report"}</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              {dm.username} · {dm.district} Division · Submitted {formatIst(openReport.submitted_at || openReport.updated_at, { seconds: true })}
              {openReport.includeAbstract ? " · Main + abstract" : ""}
            </p>
          </div>
          <div className="border-b border-border bg-sand/40 px-5 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Main report
          </div>
          <SpreadsheetGrid
            readOnly
            usedOnly
            columns={Array.isArray(openReport.columns) ? openReport.columns : []}
            rows={Array.isArray(openReport.rows) ? openReport.rows : []}
          />
        </section>
        {openReport.includeAbstract && openReport.abstract && (
          <section className="rise mt-6 overflow-hidden rounded-lg border border-border bg-card shadow-[var(--shadow-panel)]">
            <div className="border-b border-border bg-sand/40 px-5 py-3 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              Abstract report
            </div>
            <SpreadsheetGrid
              readOnly
              usedOnly
              columns={Array.isArray(openReport.abstract.columns) ? openReport.abstract.columns : []}
              rows={Array.isArray(openReport.abstract.rows) ? openReport.abstract.rows : []}
            />
          </section>
        )}
      </AppShell>
    );
  }

  return (
    <AppShell session={session} title="View reports" subtitle="Submitted plantation returns from all divisions">
      <section className="rise overflow-hidden rounded-lg border border-border bg-card shadow-[var(--shadow-panel)]">
        <div className="border-b border-border px-5 py-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="font-display text-sm font-semibold text-foreground">Submitted division reports</h2>
              <p className="text-xs text-muted-foreground">Filter by District Manager or submission date, search by name, then open a sheet with View.</p>
            </div>
            <label className="relative block w-full max-w-sm">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search reports…"
                className="w-full rounded-md border border-input bg-background py-2 pl-9 pr-3 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-ring/25"
              />
            </label>
          </div>
          <div className="mt-4 flex flex-wrap items-end gap-3">
            <label className="block min-w-[200px] flex-1">
              <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">District Manager</span>
              <select
                value={dmFilter}
                onChange={(e) => setDmFilter(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-ring/25"
              >
                <option value="">All divisions</option>
                {dmOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Submitted from</span>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-ring/25"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Submitted to</span>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-ring/25"
              />
            </label>
            {filtersActive && (
              <button
                type="button"
                onClick={clearFilters}
                className="rounded-md border border-border px-3 py-2 text-xs font-semibold text-foreground hover:bg-secondary"
              >
                Clear filters
              </button>
            )}
          </div>
          {!loading && (
            <p className="mt-3 text-xs text-muted-foreground">
              Showing {filtered.length} of {reports.length} submitted report{reports.length === 1 ? "" : "s"}
            </p>
          )}
        </div>
        {loadError && <p className="px-5 pt-4 text-sm text-destructive">{loadError}</p>}
        {loading ? (
          <p className="px-5 py-8 text-sm text-muted-foreground">Loading submitted reports…</p>
        ) : filtered.length === 0 ? (
          <p className="px-5 py-8 text-sm text-muted-foreground">
            {reports.length === 0
              ? "No reports have been submitted yet."
              : filtersActive
                ? "No reports match the current filters."
                : "No reports match that search."}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] border-collapse text-left">
              <thead>
                <tr className="bg-sand/70 text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                  <th className="w-14 border-b border-border px-3 py-3 font-semibold">S.No</th>
                  <th className="border-b border-border px-3 py-3 font-semibold">Report name</th>
                  <th className="border-b border-border px-3 py-3 font-semibold">Division</th>
                  <th className="border-b border-border px-3 py-3 font-semibold">District Manager</th>
                  <th className="border-b border-border px-3 py-3 font-semibold">Created</th>
                  <th className="border-b border-border px-3 py-3 font-semibold">Submitted</th>
                  <th className="border-b border-border px-3 py-3 font-semibold">Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((doc, i) => {
                  const dm = dmLabel(doc);
                  return (
                    <tr key={reportKey(doc, i)} className="text-sm odd:bg-card even:bg-secondary/25">
                      <td className="border-b border-border px-3 py-2.5 tabular-nums text-muted-foreground">{i + 1}</td>
                      <td className="border-b border-border px-3 py-2.5 font-medium text-foreground">
                        {doc.title || "Plantation report"}
                        {doc.includeAbstract ? <span className="ml-2 text-[11px] font-semibold text-primary">+ Abstract</span> : null}
                      </td>
                      <td className="border-b border-border px-3 py-2.5 text-foreground">
                        <div>{dm.district}</div>
                        <div className="text-xs text-muted-foreground">{dm.location}</div>
                      </td>
                      <td className="border-b border-border px-3 py-2.5 text-foreground">{dm.username}</td>
                      <td className="border-b border-border px-3 py-2.5 tabular-nums text-foreground">{formatIst(doc.created_at, { seconds: true })}</td>
                      <td className="border-b border-border px-3 py-2.5 tabular-nums text-foreground">{formatIst(doc.submitted_at || doc.updated_at, { seconds: true })}</td>
                      <td className="border-b border-border px-3 py-2.5">
                        <button
                          type="button"
                          onClick={() => setOpenKey(reportKey(doc, i))}
                          className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-2.5 py-1.5 text-xs font-semibold text-primary hover:bg-secondary"
                        >
                          <Eye className="h-3.5 w-3.5" /> View
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </AppShell>
  );
}
