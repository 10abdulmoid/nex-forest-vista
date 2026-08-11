import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Leaf, Lock, ShieldCheck, User } from "lucide-react";
import { LogoLockup } from "@/components/nex/Logo";
import { login, saveSession } from "@/lib/nex-data";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "NEX-FOREST Login · Plantation Reporting Portal" },
      {
        name: "description",
        content:
          "Secure sign-in for Forest Department District Managers and the General Manager to file and review plantation maintenance returns.",
      },
      { property: "og:title", content: "NEX-FOREST · Plantation Reporting Portal" },
      {
        property: "og:description",
        content: "Official plantation reporting portal for the State Forest Department.",
      },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("dm.nashik");
  const [password, setPassword] = useState("forest@123");
  const [error, setError] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const s = login(username, password);
    if (!s) {
      setError("Invalid credentials. Use a listed demo account with any password.");
      return;
    }
    saveSession(s);
    navigate({ to: s.role === "gm" ? "/gm" : "/dm" });
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
      <div className="relative hidden flex-col justify-center gap-16 p-12 text-primary-foreground lg:flex" style={{ background: "var(--gradient-forest)" }}>
        <div className="topo-texture absolute inset-0 opacity-70" />
        <div className="rings-bg absolute inset-0 opacity-40" />
        <div className="absolute -right-24 top-1/4 h-72 w-72 rounded-full bg-accent/15 blur-3xl" />
        <div className="relative">
          <div className="[&_.text-foreground]:text-primary-foreground [&_.text-primary]:text-accent [&_.text-muted-foreground]:text-primary-foreground/60">
            <LogoLockup />
          </div>
        </div>
        <div className="relative max-w-md rise">
          <h2 className="font-display text-4xl font-semibold leading-tight">
            Plantation returns, recorded with precision.
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-primary-foreground/75">
            A single register for rotation, area and maintenance-year reporting across all seven
            territorial divisions — filed by District Managers, consolidated for the General Manager.
          </p>
          <dl className="mt-10 grid grid-cols-3 gap-6 border-t border-primary-foreground/20 pt-6">
            {[
              ["07", "Divisions"],
              ["35", "Active entries"],
              ["4", "Rotations tracked"],
            ].map(([v, l], i) => (
              <div key={l} className="rise" style={{ animationDelay: `${120 + i * 90}ms` }}>
                <dt className="font-display text-2xl font-semibold text-accent">{v}</dt>
                <dd className="text-xs uppercase tracking-[0.16em] text-primary-foreground/60">{l}</dd>
              </div>
            ))}
          </dl>
        </div>
        <div className="relative flex items-center gap-2 text-xs text-primary-foreground/60">
          <ShieldCheck className="h-4 w-4" /> Restricted departmental access · Monitored sessions
        </div>
      </div>

      <div className="relative flex items-center justify-center bg-background px-5 py-14 sm:px-10">
        <div className="grid-fade pointer-events-none absolute inset-0 opacity-60" />
        <div className="relative w-full max-w-sm rise">
          <div className="lg:hidden">
            <LogoLockup />
          </div>
          <div className="mt-8 lg:mt-0">
            <div className="inline-flex items-center gap-2 rounded-full bg-secondary px-3 py-1 text-[11px] font-medium uppercase tracking-[0.16em] text-secondary-foreground">
              <Leaf className="h-3.5 w-3.5" /> Forest Department
            </div>
            <h1 className="text-gradient mt-4 font-display text-2xl font-semibold">Portal sign-in</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Enter your departmental username and password to continue.
            </p>
          </div>

          <form onSubmit={submit} className="mt-8 space-y-4">
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Username</span>
              <div className="mt-1.5 flex items-center gap-2 rounded-md border border-input bg-card px-3 transition-shadow focus-within:border-primary focus-within:ring-2 focus-within:ring-ring/25">
                <User className="h-4 w-4 text-muted-foreground" />
                <input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-transparent py-2.5 text-sm text-foreground outline-none"
                  placeholder="dm.district"
                  autoComplete="username"
                />
              </div>
            </label>
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Password</span>
              <div className="mt-1.5 flex items-center gap-2 rounded-md border border-input bg-card px-3 transition-shadow focus-within:border-primary focus-within:ring-2 focus-within:ring-ring/25">
                <Lock className="h-4 w-4 text-muted-foreground" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-transparent py-2.5 text-sm text-foreground outline-none"
                  placeholder="••••••••"
                  autoComplete="current-password"
                />
              </div>
            </label>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <button
              type="submit"
              className="sheen w-full rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-panel)] transition-all hover:bg-primary/90 hover:shadow-[var(--shadow-lift)] active:translate-y-px"
            >
              Sign in
            </button>
          </form>

          <div className="mt-8 rounded-md border border-border bg-sand/60 p-4 text-xs text-muted-foreground">
            <div className="font-semibold text-foreground">Demo accounts</div>
            <p className="mt-1">
              DM: <code>dm.nashik</code>, <code>dm.chandrapur</code>, <code>dm.gadchiroli</code> …
              <br />
              GM: <code>gm.forest</code> — any password works.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
