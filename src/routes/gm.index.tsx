import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Building2, Clock, Layers, LogIn, Ruler } from "lucide-react";
import { AppShell } from "@/components/nex/AppShell";
import {
  fetchLoginActivity,
  formatIst,
  summarizeLoginsByDm,
  type LoginEvent,
} from "@/lib/login-activity";
import { getSession, type Session } from "@/lib/nex-data";
import { loadAllSpreadsheets } from "@/lib/spreadsheet";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/gm/")({
  head: () => ({
    meta: [
      { title: "General Manager Oversight · NEX-FOREST" },
      {
        name: "description",
        content:
          "District Manager sign-in activity and consolidated plantation reporting across all seven forest divisions.",
      },
      { property: "og:title", content: "General Manager Oversight · NEX-FOREST" },
      {
        property: "og:description",
        content: "Login activity by District Manager and plantation returns from every division.",
      },
    ],
  }),
  component: GmDashboard,
});

function GmDashboard() {
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  const [logins, setLogins] = useState<LoginEvent[]>([]);
  const [sheetsCount, setSheetsCount] = useState(0);
  const [loadError, setLoadError] = useState("");

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
        const [activity, allSheets] = await Promise.all([fetchLoginActivity(), loadAllSpreadsheets()]);
        setLogins(activity);
        setSheetsCount(allSheets.length);
        setLoadError("");
      } catch (err) {
        console.error(err);
        setLogins([]);
        setSheetsCount(0);
        setLoadError("Could not load oversight data from the database.");
      }
    };
    load();
  }, [session, navigate]);

  const byDm = useMemo(() => summarizeLoginsByDm(logins), [logins]);
  const signedInToday = byDm.filter((d) => d.signedInToday).length;
  const everSignedIn = byDm.filter((d) => d.loginCount > 0).length;

  if (!session) return null;

  return (
    <AppShell session={session} title="Oversight Dashboard" subtitle="District Manager sign-in activity · All divisions">
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat icon={Building2} label="Divisions" value="7 / 7" note={loadError || "Telangana TGFDC"} delay={0} />
        <Stat icon={LogIn} label="DMs signed in today" value={`${signedInToday} / 7`} note="India Standard Time" delay={70} />
        <Stat icon={Clock} label="DMs with any login" value={`${everSignedIn} / 7`} note="Since tracking began" delay={140} />
        <Stat icon={Layers} label="Submitted reports" value={String(sheetsCount)} note="Open View reports in the sidebar" delay={210} />
      </section>

      <section className="rise mt-6 overflow-hidden rounded-lg border border-border bg-card shadow-[var(--shadow-panel)]">
        <div className="border-b border-border px-5 py-4">
          <h2 className="font-display text-sm font-semibold text-foreground">Login activity by District Manager</h2>
          <p className="text-xs text-muted-foreground">Last sign-in, device location and total visits for each division</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse text-left">
            <thead>
              <tr className="bg-sand/70 text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                <th className="w-14 border-b border-border px-3 py-3 font-semibold">S.No</th>
                <th className="border-b border-border px-3 py-3 font-semibold">District Manager</th>
                <th className="border-b border-border px-3 py-3 font-semibold">Division</th>
                <th className="border-b border-border px-3 py-3 font-semibold">Last sign-in</th>
                <th className="border-b border-border px-3 py-3 font-semibold">Sign-in location</th>
                <th className="border-b border-border px-3 py-3 font-semibold">Sign-ins</th>
                <th className="border-b border-border px-3 py-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {byDm.map((d, i) => (
                <tr key={d.username} className="text-sm transition-colors odd:bg-card even:bg-secondary/25">
                  <td className="border-b border-border px-3 py-2.5 tabular-nums text-muted-foreground">{i + 1}</td>
                  <td className="border-b border-border px-3 py-2.5 font-medium text-foreground">{d.username}</td>
                  <td className="border-b border-border px-3 py-2.5 text-foreground">{d.district}</td>
                  <td className="border-b border-border px-3 py-2.5 tabular-nums text-foreground">{formatIst(d.lastLoginAt)}</td>
                  <td className="border-b border-border px-3 py-2.5 text-foreground">{d.lastDeviceLocation || "—"}</td>
                  <td className="border-b border-border px-3 py-2.5 tabular-nums text-foreground">{d.loginCount}</td>
                  <td className="border-b border-border px-3 py-2.5">
                    <span
                      className={
                        d.signedInToday
                          ? "inline-flex rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary"
                          : d.loginCount > 0
                            ? "inline-flex rounded-full bg-secondary px-2 py-0.5 text-[11px] font-semibold text-secondary-foreground"
                            : "inline-flex rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground"
                      }
                    >
                      {d.signedInToday ? "Signed in today" : d.loginCount > 0 ? "Inactive today" : "No login yet"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rise mt-6 overflow-hidden rounded-lg border border-border bg-card shadow-[var(--shadow-panel)]" style={{ animationDelay: "80ms" }}>
        <div className="border-b border-border px-5 py-4">
          <h2 className="font-display text-sm font-semibold text-foreground">Recent DM sign-ins</h2>
          <p className="text-xs text-muted-foreground">Newest first · timestamps in IST</p>
        </div>
        {logins.length === 0 ? (
          <p className="px-5 py-8 text-sm text-muted-foreground">No District Manager sign-ins recorded yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse text-left">
              <thead>
                <tr className="bg-sand/70 text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                  <th className="w-14 border-b border-border px-3 py-3 font-semibold">S.No</th>
                  <th className="border-b border-border px-3 py-3 font-semibold">Username</th>
                  <th className="border-b border-border px-3 py-3 font-semibold">Division</th>
                  <th className="border-b border-border px-3 py-3 font-semibold">Signed in at</th>
                  <th className="border-b border-border px-3 py-3 font-semibold">Device location</th>
                </tr>
              </thead>
              <tbody>
                {logins.slice(0, 50).map((e, i) => (
                  <tr key={e.id} className="text-sm odd:bg-card even:bg-secondary/25">
                    <td className="border-b border-border px-3 py-2.5 tabular-nums text-muted-foreground">{i + 1}</td>
                    <td className="border-b border-border px-3 py-2.5 font-medium text-foreground">{e.username}</td>
                    <td className="border-b border-border px-3 py-2.5 text-foreground">{e.district || "—"}</td>
                    <td className="border-b border-border px-3 py-2.5 tabular-nums text-foreground">{formatIst(e.logged_in_at)}</td>
                    <td className="border-b border-border px-3 py-2.5 text-foreground">{e.device_location || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </AppShell>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  note,
  delay = 0,
}: {
  icon: typeof Ruler;
  label: string;
  value: string;
  note: string;
  delay?: number;
}) {
  return (
    <div
      className="card-lift rise relative overflow-hidden rounded-lg border border-border bg-card p-5 shadow-[var(--shadow-panel)]"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="pointer-events-none absolute -right-10 -top-10 h-24 w-24 rounded-full bg-primary/5" />
      <div className="flex items-center justify-between">
        <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{label}</div>
        <div className="grid h-8 w-8 place-items-center rounded-md bg-primary/10 text-primary">
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <div className="text-gradient mt-3 font-display text-2xl font-semibold">{value}</div>
      <div className="mt-1 text-xs text-muted-foreground">{note}</div>
    </div>
  );
}
