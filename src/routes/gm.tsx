import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Building2, Layers, Ruler, TrendingUp } from "lucide-react";
import { AppShell } from "@/components/nex/AppShell";
import { districts, getSession, mockEntries, type Session } from "@/lib/nex-data";

export const Route = createFileRoute("/gm")({
  head: () => ({
    meta: [
      { title: "General Manager Oversight · NEX-FOREST" },
      {
        name: "description",
        content:
          "Consolidated plantation reporting across all seven forest divisions: area totals, entries per district and range-level detail.",
      },
      { property: "og:title", content: "General Manager Oversight · NEX-FOREST" },
      {
        property: "og:description",
        content: "Command-centre view of plantation maintenance returns from every District Manager.",
      },
    ],
  }),
  component: GmDashboard,
});

function GmDashboard() {
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    const s = getSession();
    if (!s || s.role !== "gm") navigate({ to: "/" });
    else setSession(s);
  }, [navigate]);

  const rows = useMemo(
    () => (filter === "all" ? mockEntries : mockEntries.filter((e) => e.district === filter)),
    [filter],
  );
  const totalArea = rows.reduce((a, r) => a + r.area, 0);
  const perDistrict = useMemo(
    () =>
      districts.map((d) => ({
        district: d.district,
        area: mockEntries.filter((e) => e.district === d.district).reduce((a, e) => a + e.area, 0),
      })),
    [],
  );
  const maxArea = Math.max(...perDistrict.map((p) => p.area));

  if (!session) return null;

  return (
    <AppShell session={session} title="Oversight Dashboard" subtitle="Consolidated plantation returns · All divisions">
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat icon={Building2} label="Districts reporting" value={`${districts.length} / 7`} note="All divisions filed" />
        <Stat icon={Ruler} label="Total area" value={`${totalArea.toFixed(1)} ha`} note={filter === "all" ? "Across all districts" : filter} />
        <Stat icon={Layers} label="Entries" value={String(rows.length)} note="Rotation-wise records" />
        <Stat
          icon={TrendingUp}
          label="Avg. area / entry"
          value={`${(totalArea / Math.max(rows.length, 1)).toFixed(1)} ha`}
          note="Current selection"
        />
      </section>

      <section className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="overflow-hidden rounded-lg border border-border bg-card shadow-[var(--shadow-panel)]">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
            <div>
              <h2 className="font-display text-sm font-semibold text-foreground">Combined register</h2>
              <p className="text-xs text-muted-foreground">Entries submitted by all District Managers</p>
            </div>
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              District
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="rounded-md border border-input bg-card px-3 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-ring/25"
              >
                <option value="all">All districts</option>
                {districts.map((d) => (
                  <option key={d.district} value={d.district}>
                    {d.district}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] border-collapse text-left">
              <thead>
                <tr className="bg-sand/70 text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                  <th className="w-14 border-b border-border px-3 py-3 font-semibold">S.No</th>
                  <th className="border-b border-border px-3 py-3 font-semibold">District / Range DM Name</th>
                  <th className="border-b border-border px-3 py-3 font-semibold">Rotation</th>
                  <th className="border-b border-border px-3 py-3 font-semibold">Area (hectare)</th>
                  <th className="border-b border-border px-3 py-3 font-semibold">Maintenance Year</th>
                  <th className="border-b border-border px-3 py-3 font-semibold">Name of the Range</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={r.id} className="text-sm odd:bg-card even:bg-secondary/25 hover:bg-accent/15">
                    <td className="border-b border-border px-3 py-2.5 tabular-nums text-muted-foreground">{i + 1}</td>
                    <td className="border-b border-border px-3 py-2.5">
                      <div className="font-medium text-foreground">{r.dmName}</div>
                      <div className="text-xs text-muted-foreground">{r.district} Division</div>
                    </td>
                    <td className="border-b border-border px-3 py-2.5">
                      <span className="inline-flex h-6 min-w-6 items-center justify-center rounded bg-primary/10 px-1.5 text-xs font-semibold text-primary">
                        {r.rotation}
                      </span>
                    </td>
                    <td className="border-b border-border px-3 py-2.5 tabular-nums text-foreground">{r.area.toFixed(1)}</td>
                    <td className="border-b border-border px-3 py-2.5 text-foreground">{r.maintenanceYear}</td>
                    <td className="border-b border-border px-3 py-2.5 text-foreground">{r.range}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-sand/70 text-sm font-semibold text-foreground">
                  <td className="px-3 py-3" colSpan={3}>
                    Total ({rows.length} entries)
                  </td>
                  <td className="px-3 py-3 tabular-nums">{totalArea.toFixed(1)} ha</td>
                  <td className="px-3 py-3" colSpan={2} />
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        <aside className="rounded-lg border border-border bg-card p-5 shadow-[var(--shadow-panel)]">
          <h2 className="font-display text-sm font-semibold text-foreground">Area by district</h2>
          <p className="text-xs text-muted-foreground">Hectares reported, 2023–2026</p>
          <ul className="mt-5 space-y-4">
            {perDistrict.map((p) => (
              <li key={p.district}>
                <div className="flex items-baseline justify-between text-xs">
                  <button
                    onClick={() => setFilter(p.district)}
                    className={`font-medium transition-colors hover:text-primary ${filter === p.district ? "text-primary" : "text-foreground"}`}
                  >
                    {p.district}
                  </button>
                  <span className="tabular-nums text-muted-foreground">{p.area.toFixed(1)} ha</span>
                </div>
                <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-secondary">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${(p.area / maxArea) * 100}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
          <button
            onClick={() => setFilter("all")}
            className="mt-6 w-full rounded-md border border-border px-3 py-2 text-xs font-semibold text-foreground transition-colors hover:bg-secondary"
          >
            Reset to all districts
          </button>
        </aside>
      </section>
    </AppShell>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  note,
}: {
  icon: typeof Ruler;
  label: string;
  value: string;
  note: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-5 shadow-[var(--shadow-panel)]">
      <div className="flex items-center justify-between">
        <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{label}</div>
        <div className="grid h-8 w-8 place-items-center rounded-md bg-primary/10 text-primary">
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <div className="mt-3 font-display text-2xl font-semibold text-foreground">{value}</div>
      <div className="mt-1 text-xs text-muted-foreground">{note}</div>
    </div>
  );
}
