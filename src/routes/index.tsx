import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Leaf, Lock, ShieldCheck, User } from "lucide-react";
import { LandingIntro, shouldPlayLandingIntro } from "@/components/nex/LandingIntro";
import { LogoLockup } from "@/components/nex/Logo";
import { SiteFooter } from "@/components/nex/SiteFooter";
import { saveSession, authEmailsFromUsername, sessionFromProfile } from "@/lib/nex-data";
import { recordLogin, detectSignInLocation } from "@/lib/login-activity";
import { supabase } from "@/lib/supabase";

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
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [booted, setBooted] = useState(false);
  const [playIntro, setPlayIntro] = useState(false);
  const [introDone, setIntroDone] = useState(false);

  useEffect(() => {
    const play = shouldPlayLandingIntro();
    setPlayIntro(play);
    if (!play) setIntroDone(true);
    setBooted(true);
  }, []);

  if (!booted) {
    return (
      <div
        className="fixed inset-0 min-h-screen"
        style={{ background: "var(--gradient-forest)" }}
        aria-busy="true"
        aria-label="Loading"
      />
    );
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      let signErrorMessage = "";
      let user: { id: string } | null = null;

      for (const email of authEmailsFromUsername(username)) {
        const { data, error: signError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (!signError && data.user) {
          user = data.user;
          break;
        }
        signErrorMessage = signError?.message || "Invalid credentials.";
      }

      if (!user) {
        const unreachable = /failed to fetch|networkerror|load failed/i.test(signErrorMessage);
        setError(
          unreachable
            ? "Cannot reach the login service. Restart npm run dev and try again (the app proxies Supabase in development)."
            : signErrorMessage,
        );
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("username, role, name, district")
        .eq("id", user.id)
        .single();
      if (profileError || !profile) {
        setError(profileError?.message || "Signed in, but this account has no portal profile.");
        return;
      }
      const session = sessionFromProfile(profile);
      saveSession(session);
      navigate({ to: session.role === "gm" ? "/gm" : "/dm" });
      void (async () => {
        try {
          const place = await detectSignInLocation();
          await recordLogin({
            userId: user.id,
            username: session.username,
            role: session.role,
            district: session.district,
            latitude: place.latitude,
            longitude: place.longitude,
            deviceLocation: place.deviceLocation,
          });
        } catch (logErr) {
          console.error("Could not record login activity", logErr);
        }
      })();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign-in failed. Check your credentials and try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      {playIntro && !introDone && (
        <LandingIntro onComplete={() => setIntroDone(true)} />
      )}
      <div
        className={`grid min-h-screen lg:grid-cols-[1.05fr_1fr] ${
          introDone ? "login-page--revealed" : "pointer-events-none fixed inset-0 opacity-0"
        }`}
        aria-hidden={!introDone}
      >
      <div className="relative hidden min-h-screen flex-col justify-between gap-12 p-12 text-primary-foreground lg:flex" style={{ background: "var(--gradient-forest)" }}>
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
          <p className="mt-10 border-t border-primary-foreground/20 pt-6 font-display text-lg font-semibold text-accent">
            7 divisions across Telangana
          </p>
        </div>
        <div className="relative mt-auto space-y-6">
          <div className="flex items-center gap-2 text-xs text-primary-foreground/60">
            <ShieldCheck className="h-4 w-4" /> Restricted departmental access · Monitored sessions
          </div>
          <SiteFooter variant="forest" />
        </div>
      </div>

      <div className="relative flex min-h-screen flex-col bg-background">
        <div className="relative flex flex-1 items-center justify-center px-5 py-14 sm:px-10">
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
                  autoComplete="current-password"
                />
              </div>
            </label>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <button
              type="submit"
              disabled={busy}
              className="sheen w-full rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-panel)] transition-all hover:bg-primary/90 hover:shadow-[var(--shadow-lift)] active:translate-y-px disabled:opacity-70"
            >
              {busy ? "Signing in…" : "Sign in"}
            </button>
          </form>

          <div className="mt-8 rounded-md border border-border bg-sand/60 p-4 text-xs text-muted-foreground">
            <p>
              Please use the credentials provided by the Office of the GM, Vigilance, to sign in.
            </p>
          </div>
        </div>
        </div>
        <div className="lg:hidden">
          <SiteFooter />
        </div>
      </div>
    </div>
    </>
  );
}
