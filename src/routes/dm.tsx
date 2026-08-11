import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { MapPin, Plus, Ruler, Trash2, UserCheck } from "lucide-react";
import { AppShell } from "@/components/nex/AppShell";
import {
  getSession,
  mockEntries,
  rangesFor,
  type Entry,
  type Session,
} from "@/lib/nex-data";

export const Route = createFileRoute("/dm")({
  head: () => ({
    meta: [
      { title: "District Manager Register · NEX-FOREST" },
      {
        name: "description",
        content:
          "District Manager plantation register: record rotation, area in hectares, maintenance year and range for your division.",
      },
      { property: "og:title", content: "District Manager Register · NEX-FOREST" },
      {
        property: "og:description",
        content: "Inline spreadsheet-style plantation reporting for Forest Department District Managers.",
      },
    ],
  }),
  component: DmDashboard,
});

const emptyDraft = { rotation: "", area: "", maintenanceYear: "", range: "" };

function DmDashboard() {
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    const s = getSession();
    if (!s || s.role !== "dm") navigate({ to: "/" });
    else setSession(s);
  }, [navigate]);

  const [rows, setRows] = useState<Entry[]>([]);
  const [draft, setDraft] = useState(emptyDraft);

  useEffect(() => {
    if (session?.district) setRows(mockEntries.filter((e) => e.district === session.district));
  }, [session]);

  const totalArea = useMemo(() => rows.reduce((a, r) => a + r.area, 0), [rows]);

  if (!session) return null;

  const update = (id: string, patch: Partial<Entry>) =>
    setRows((r) => r.map((row) => (row.id === id ? { ...row, ...patch } : row)));

  const commitDraft = () => {
    if (!draft.rotation && !draft.area && !draft.maintenanceYear && !draft.range) return;
    setRows((r) => [
      ...r,
      {
        id: `new-${Date.now()}`,
        rotation: Number(draft.rotation) || 1,
        area: Number(draft.area) || 0,
        maintenanceYear: draft.maintenanceYear || "2025-26",
        range: draft.range || rangesFor(session.district!)[0] || "—",
        dmName: session.name,
        district: session.district!,
      },
    ]);
    setDraft(emptyDraft);
  };

  const cellCls =
    "w-full bg-transparent px-3 py-2.5 text-sm text-foreground outline-none focus:bg-secondary/70 focus:ring-1 focus:ring-inset focus:ring-primary/40";

  return (
    <AppShell session={session} title="Plantation Register" subtitle={`Maintenance returns · ${session.district} Division`}>
      <section className="topo-texture rise relative overflow-hidden rounded-lg border border-border bg-card p-5 shadow-[var(--shadow-panel)] sm:p-6">
        <div className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-primary/5 blur-2xl" />
        <div className="relative grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <Identity icon={UserCheck} label="Area DM Name" value={session.name} />
          <Identity icon={MapPin} label="Location of Plantation" value={session.location ?? "—"} />
          <Identity
            icon={Ruler}
            label="Total reported area"
            value={`${totalArea.toFixed(1)} hectare · ${rows.length} entries`}
          />
        </div>
        <div className="relative mt-4 inline-flex rounded-full bg-secondary px-3 py-1 text-[11px] font-medium uppercase tracking-[0.14em] text-secondary-foreground">
          Read-only identity · Auto-filled from account
        </div>
      </section>

      <section className="rise mt-6 overflow-hidden rounded-lg border border-border bg-card shadow-[var(--shadow-panel)]" style={{ animationDelay: "90ms" }}>
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-5 py-4">
          <div>
            <h2 className="font-display text-sm font-semibold text-foreground">Plantation entries</h2>
            <p className="text-xs text-muted-foreground">Edit any cell directly. New rows are added at the bottom.</p>
          </div>
          <button
            onClick={commitDraft}
            className="sheen inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground transition-all hover:bg-primary/90 hover:shadow-[var(--shadow-lift)] active:translate-y-px"
          >
            <Plus className="h-3.5 w-3.5" /> Add row
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse text-left">
            <thead>
              <tr className="bg-sand/70 text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                <th className="w-16 border-b border-border px-3 py-3 font-semibold">S.No</th>
                <th className="border-b border-border px-3 py-3 font-semibold">Rotation</th>
                <th className="border-b border-border px-3 py-3 font-semibold">Area (hectare)</th>
                <th className="border-b border-border px-3 py-3 font-semibold">Maintenance Year</th>
                <th className="border-b border-border px-3 py-3 font-semibold">Name of the Range</th>
                <th className="w-12 border-b border-border px-3 py-3" />
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.id} className="group transition-colors odd:bg-card even:bg-secondary/25 hover:bg-accent/15">
                  <td className="border-b border-border px-3 py-2 text-sm tabular-nums text-muted-foreground">{i + 1}</td>
                  <td className="border-b border-border p-0">
                    <input
                      className={cellCls + " tabular-nums"}
                      value={r.rotation}
                      onChange={(e) => update(r.id, { rotation: Number(e.target.value) || 0 })}
                    />
                  </td>
                  <td className="border-b border-border p-0">
                    <input
                      className={cellCls + " tabular-nums"}
                      value={r.area}
                      onChange={(e) => update(r.id, { area: Number(e.target.value) || 0 })}
                    />
                  </td>
                  <td className="border-b border-border p-0">
                    <input
                      className={cellCls}
                      value={r.maintenanceYear}
                      onChange={(e) => update(r.id, { maintenanceYear: e.target.value })}
                    />
                  </td>
                  <td className="border-b border-border p-0">
                    <input
                      className={cellCls}
                      value={r.range}
                      onChange={(e) => update(r.id, { range: e.target.value })}
                    />
                  </td>
                  <td className="border-b border-border px-2 text-center">
                    <button
                      onClick={() => setRows((rr) => rr.filter((x) => x.id !== r.id))}
                      className="rounded p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                      aria-label={`Delete row ${i + 1}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
              <tr className="bg-secondary/40">
                <td className="px-3 py-2 text-sm text-muted-foreground">{rows.length + 1}</td>
                {(["rotation", "area", "maintenanceYear", "range"] as const).map((k) => (
                  <td key={k} className="p-0">
                    <input
                      className={cellCls + " placeholder:text-muted-foreground/60"}
                      placeholder={
                        k === "rotation"
                          ? "1-4"
                          : k === "area"
                            ? "e.g. 42.5"
                            : k === "maintenanceYear"
                              ? "2025-26"
                              : "Range name"
                      }
                      value={draft[k]}
                      onChange={(e) => setDraft({ ...draft, [k]: e.target.value })}
                      onKeyDown={(e) => e.key === "Enter" && commitDraft()}
                    />
                  </td>
                ))}
                <td className="px-2 text-center">
                  <button
                    onClick={commitDraft}
                    className="rounded p-1.5 text-primary hover:bg-primary/10"
                    aria-label="Commit new row"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            </tbody>
            <tfoot>
              <tr className="bg-sand/70 text-sm font-semibold text-foreground">
                <td className="px-3 py-3" colSpan={2}>
                  Total
                </td>
                <td className="px-3 py-3 tabular-nums">{totalArea.toFixed(1)} ha</td>
                <td className="px-3 py-3 text-muted-foreground" colSpan={3}>
                  {rows.length} entries recorded
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </section>
    </AppShell>
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
      <div className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-md bg-primary/10 text-primary transition-transform hover:scale-105">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{label}</div>
        <div className="font-display text-base font-semibold text-foreground">{value}</div>
      </div>
    </div>
  );
}
