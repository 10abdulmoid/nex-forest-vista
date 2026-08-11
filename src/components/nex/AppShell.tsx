import { Link, useNavigate } from "@tanstack/react-router";
import { LayoutGrid, LogOut, Menu, Table2, X } from "lucide-react";
import { useState, type ReactNode } from "react";
import { LogoLockup } from "./Logo";
import { clearSession, type Session } from "@/lib/nex-data";

export function AppShell({
  session,
  children,
  title,
  subtitle,
}: {
  session: Session;
  children: ReactNode;
  title: string;
  subtitle: string;
}) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const nav =
    session.role === "gm"
      ? [{ to: "/gm", label: "Oversight Dashboard", icon: LayoutGrid }]
      : [{ to: "/dm", label: "Plantation Register", icon: Table2 }];

  const logout = () => {
    clearSession();
    navigate({ to: "/" });
  };

  const sidebar = (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      <div className="border-b border-sidebar-border px-5 py-5">
        <div className="[&_.text-foreground]:text-sidebar-foreground [&_.text-primary]:text-sidebar-primary [&_.text-muted-foreground]:text-sidebar-foreground/60">
          <LogoLockup />
        </div>
      </div>
      <nav className="flex-1 space-y-1 p-3">
        {nav.map((n) => (
          <Link
            key={n.to}
            to={n.to}
            onClick={() => setOpen(false)}
            className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            activeProps={{ className: "bg-sidebar-accent text-sidebar-accent-foreground" }}
          >
            <n.icon className="h-4 w-4" />
            {n.label}
          </Link>
        ))}
      </nav>
      <div className="border-t border-sidebar-border p-4">
        <div className="text-xs uppercase tracking-[0.16em] text-sidebar-foreground/50">
          {session.role === "gm" ? "General Manager" : "District Manager"}
        </div>
        <div className="mt-1 text-sm font-semibold">{session.name}</div>
        <div className="text-xs text-sidebar-foreground/60">{session.district ?? "All Districts"}</div>
        <button
          onClick={logout}
          className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-md border border-sidebar-border px-3 py-2 text-sm font-medium transition-colors hover:bg-sidebar-accent"
        >
          <LogOut className="h-4 w-4" /> Sign out
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="hidden w-64 shrink-0 lg:block">{sidebar}</aside>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-foreground/40" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-72 shadow-xl">
            <button
              onClick={() => setOpen(false)}
              className="absolute right-3 top-4 z-10 rounded-md p-1.5 text-sidebar-foreground/70 hover:bg-sidebar-accent"
              aria-label="Close menu"
            >
              <X className="h-5 w-5" />
            </button>
            {sidebar}
          </div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 border-b border-border bg-card/90 backdrop-blur">
          <div className="flex items-center gap-3 px-4 py-3 sm:px-6">
            <button
              onClick={() => setOpen(true)}
              className="rounded-md border border-border p-2 lg:hidden"
              aria-label="Open menu"
            >
              <Menu className="h-4 w-4" />
            </button>
            <div className="min-w-0">
              <h1 className="truncate font-display text-base font-semibold text-foreground sm:text-lg">{title}</h1>
              <p className="truncate text-xs text-muted-foreground">{subtitle}</p>
            </div>
            <div className="ml-auto hidden items-center gap-3 sm:flex">
              <div className="text-right">
                <div className="text-sm font-medium text-foreground">{session.name}</div>
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
                  {session.role === "gm" ? "GM · Plantation Wing" : `DM · ${session.district}`}
                </div>
              </div>
              <div className="grid h-9 w-9 place-items-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                {session.name.split(" ").pop()?.[0]}
              </div>
            </div>
          </div>
        </header>
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</main>
        <footer className="border-t border-border px-4 py-4 text-xs text-muted-foreground sm:px-6">
          Government of Maharashtra · Forest Department · NEX-FOREST v1.0 · Demo data
        </footer>
      </div>
    </div>
  );
}
