import { Link, useNavigate } from "@tanstack/react-router";
import { FileText, LayoutGrid, LogOut, Menu, Table2, X } from "lucide-react";
import { useState, type ReactNode } from "react";
import { LogoLockup } from "./Logo";
import { SidebarCredit } from "./SiteFooter";
import { clearSession, type Session } from "@/lib/nex-data";
import { supabase } from "@/lib/supabase";

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
      ? [
          { to: "/gm" as const, label: "Oversight Dashboard", icon: LayoutGrid, exact: true },
          { to: "/gm/reports" as const, label: "View reports", icon: FileText, exact: false },
        ]
      : [{ to: "/dm" as const, label: "Division desk", icon: Table2, exact: false }];

  const logout = async () => {
    await supabase.auth.signOut();
    clearSession();
    navigate({ to: "/" });
  };

  const initial = session.role === "gm" ? "G" : "D";

  const sidebar = (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      <div className="shrink-0 border-b border-sidebar-border/70 px-6 py-6">
        <div className="[&_.text-foreground]:text-sidebar-foreground [&_.text-primary]:text-sidebar-primary [&_.text-muted-foreground]:text-sidebar-foreground/55">
          <LogoLockup />
        </div>
      </div>

      <div className="px-4 py-5">
        <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.22em] text-sidebar-foreground/40">Menu</p>
        <nav className="space-y-1">
          {nav.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-sidebar-foreground/75 transition-colors hover:bg-sidebar-accent/80 hover:text-sidebar-accent-foreground"
              activeOptions={{ exact: n.exact }}
              activeProps={{
                className:
                  "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm ring-1 ring-sidebar-border/40",
              }}
            >
              <n.icon className="h-4 w-4 shrink-0 opacity-90" />
              <span className="truncate">{n.label}</span>
            </Link>
          ))}
        </nav>
      </div>

      <div className="flex-1" />

      <div className="shrink-0 space-y-3 border-t border-sidebar-border/70 px-4 py-4">
        <button
          type="button"
          onClick={logout}
          className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-sidebar-border/60 bg-sidebar-accent/30 px-3 py-2.5 text-sm font-medium text-sidebar-foreground/90 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        >
          <LogOut className="h-4 w-4" /> Sign out
        </button>

        <SidebarCredit />
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-72 border-r border-sidebar-border/40 lg:block">
        {sidebar}
      </aside>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-foreground/40" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-[min(20rem,88vw)] shadow-2xl">
            <button
              type="button"
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

      <div className="flex min-h-screen flex-col lg:pl-72">
        <header className="sticky top-0 z-30 border-b border-border bg-card/90 backdrop-blur">
          <div className="flex items-center gap-3 px-4 py-3 sm:px-6">
            <button
              type="button"
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
                <div className="text-sm font-medium text-foreground">{session.username}</div>
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
                  {session.role === "gm" ? "GM · Plantation Wing" : `DM · ${session.district}`}
                </div>
              </div>
              <div className="grid h-9 w-9 place-items-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                {initial}
              </div>
            </div>
          </div>
        </header>
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
