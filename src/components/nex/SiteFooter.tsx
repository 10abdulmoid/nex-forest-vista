import { Link } from "@tanstack/react-router";
import { ArrowUpRight, Scale } from "lucide-react";

const TGFDC_LOGO = "/assets/TGFDC%20LOGO.png";

const footerCardBase =
  "flex w-full min-h-[6.5rem] items-center gap-4 rounded-xl px-4 py-4 shadow-sm";

function CreatedByCredit({ compact = false }: { compact?: boolean }) {
  if (compact) {
    return (
      <div className="inline-flex max-w-full items-center gap-3 rounded-xl bg-white px-3 py-2.5 shadow-sm ring-1 ring-black/5">
        <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-full">
          <img
            src={TGFDC_LOGO}
            alt="Telangana State Forest Development Corporation"
            className="absolute left-1/2 top-1/2 max-w-none -translate-x-1/2 -translate-y-1/2"
            style={{ height: "104%", width: "auto" }}
          />
        </div>
        <div className="min-w-0 leading-snug">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-black/55">Created by</p>
          <p className="mt-0.5 font-display text-sm font-semibold text-black">Office of the GM, Vigilance</p>
          <p className="text-[11px] text-black/70">Telangana Forest Development Corporation · TGFDC</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`${footerCardBase} bg-white ring-1 ring-black/5`}>
      <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-full">
        <img
          src={TGFDC_LOGO}
          alt="Telangana State Forest Development Corporation"
          className="absolute left-1/2 top-1/2 max-w-none -translate-x-1/2 -translate-y-1/2"
          style={{ height: "104%", width: "auto" }}
        />
      </div>
      <div className="min-w-0 flex-1 leading-snug">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-black/55">Created by</p>
        <p className="mt-0.5 font-display text-lg font-semibold text-black">Office of the GM, Vigilance</p>
        <p className="text-sm text-black/70">Telangana Forest Development Corporation · TGFDC</p>
      </div>
    </div>
  );
}

function TermsCredit({ forest = false }: { forest?: boolean }) {
  if (forest) {
    return (
      <Link
        to="/terms"
        className={`group relative ${footerCardBase} overflow-hidden border border-primary-foreground/20 bg-primary-foreground/10 backdrop-blur-sm transition-colors hover:border-accent/50 hover:bg-primary-foreground/15`}
      >
        <div className="pointer-events-none absolute -right-6 -top-8 h-24 w-24 rounded-full bg-accent/15" />
        <div className="grid h-16 w-16 shrink-0 place-items-center rounded-full bg-accent/20 text-accent ring-1 ring-accent/30">
          <Scale className="h-7 w-7" strokeWidth={1.75} />
        </div>
        <div className="min-w-0 flex-1 leading-snug">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-primary-foreground/55">
            Official use
          </p>
          <p className="mt-0.5 font-display text-lg font-semibold text-primary-foreground">
            Terms &amp; Conditions
          </p>
          <p className="mt-0.5 text-sm leading-relaxed text-primary-foreground/70">
            Departmental rules for signing in, reporting, and data use.
          </p>
        </div>
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-accent/25 text-accent transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5">
          <ArrowUpRight className="h-4 w-4" />
        </span>
      </Link>
    );
  }

  return (
    <Link
      to="/terms"
      className={`group relative ${footerCardBase} overflow-hidden bg-white ring-1 ring-black/5 transition-shadow hover:shadow-md hover:ring-primary/20`}
    >
      <div className="pointer-events-none absolute inset-y-0 left-0 w-1 bg-primary" />
      <div className="pointer-events-none absolute -right-8 -top-10 h-28 w-28 rounded-full bg-primary/5" />
      <div className="grid h-16 w-16 shrink-0 place-items-center rounded-full bg-primary/10 text-primary ring-1 ring-primary/15">
        <Scale className="h-7 w-7" strokeWidth={1.75} />
      </div>
      <div className="min-w-0 flex-1 leading-snug">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-black/55">Official use</p>
        <p className="mt-0.5 font-display text-lg font-semibold text-black">Terms &amp; Conditions</p>
        <p className="mt-0.5 text-sm leading-relaxed text-black/65">
          Departmental rules for signing in, reporting, and data use.
        </p>
      </div>
      <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-primary px-3 py-1.5 text-[11px] font-semibold text-primary-foreground transition-transform group-hover:translate-x-0.5">
        Read
        <ArrowUpRight className="h-3.5 w-3.5" />
      </span>
    </Link>
  );
}

export function SidebarCredit() {
  return (
    <div className="rounded-lg bg-white px-3 py-3 shadow-sm ring-1 ring-black/5">
      <div className="flex items-start gap-3">
        <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full">
          <img
            src={TGFDC_LOGO}
            alt="TGFDC"
            className="absolute left-1/2 top-1/2 max-w-none -translate-x-1/2 -translate-y-1/2"
            style={{ height: "108%", width: "auto" }}
          />
        </div>
        <div className="min-w-0 leading-snug">
          <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-black/50">Created by</p>
          <p className="mt-1 font-display text-[13px] font-semibold leading-tight text-black">
            Office of the GM, Vigilance
          </p>
          <p className="mt-1 text-[10px] leading-relaxed text-black/65">
            Telangana Forest Development Corporation · TGFDC
          </p>
        </div>
      </div>
    </div>
  );
}

export function SiteFooter({ variant = "light" }: { variant?: "light" | "forest" }) {
  const forest = variant === "forest";

  return (
    <footer
      className={
        forest
          ? "-mx-12 border-t border-primary-foreground/15 px-12 py-6"
          : "border-t border-border bg-card/80 px-6 py-5 sm:px-8"
      }
    >
      <div className="flex w-full flex-col gap-4">
        <TermsCredit forest={forest} />
        <CreatedByCredit />
      </div>
    </footer>
  );
}
