const TGFDC_LOGO = "/assets/TGFDC%20LOGO.png";

function CreatedByCredit({ compact = false }: { compact?: boolean }) {
  return (
    <div
      className={
        compact
          ? "inline-flex max-w-full items-center gap-3 rounded-xl bg-white px-3 py-2.5 shadow-sm ring-1 ring-black/5"
          : "inline-flex max-w-full items-center gap-4 rounded-xl bg-white px-4 py-3 shadow-sm ring-1 ring-black/5"
      }
    >
      <div className={`relative shrink-0 overflow-hidden rounded-full ${compact ? "h-14 w-14" : "h-20 w-20"}`}>
        <img
          src={TGFDC_LOGO}
          alt="Telangana State Forest Development Corporation"
          className="absolute left-1/2 top-1/2 max-w-none -translate-x-1/2 -translate-y-1/2"
          style={{ height: "104%", width: "auto" }}
        />
      </div>
      <div className="min-w-0 leading-snug">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-black/55">Created by</p>
        <p className={`mt-0.5 font-display font-semibold text-black ${compact ? "text-sm" : "text-lg"}`}>
          Office of the GM, Vigilance
        </p>
        <p className={`text-black/70 ${compact ? "text-[11px]" : "text-sm"}`}>
          Telangana Forest Development Corporation · TGFDC
        </p>
      </div>
    </div>
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
      <CreatedByCredit />
    </footer>
  );
}
