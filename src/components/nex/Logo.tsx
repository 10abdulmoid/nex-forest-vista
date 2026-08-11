export function NexMark({ className = "h-9 w-9" }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden="true">
      <circle cx="20" cy="20" r="19" fill="var(--primary)" />
      <path
        d="M20 8c4.4 3.1 6.8 7.2 6.8 11.4 0 3.9-2.6 7-6.8 8.2v4.6"
        fill="none"
        stroke="var(--primary-foreground)"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M20 8c-4.4 3.1-6.8 7.2-6.8 11.4 0 3.9 2.6 7 6.8 8.2"
        fill="none"
        stroke="var(--accent)"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path d="M20 15.5l4.2-3M20 20.5l-4.2-3" stroke="var(--primary-foreground)" strokeWidth="1.5" strokeLinecap="round" opacity="0.75" />
    </svg>
  );
}

export function LogoLockup({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <NexMark className={compact ? "h-8 w-8" : "h-10 w-10"} />
      <div className="leading-tight">
        <div className="font-display text-lg font-semibold tracking-[0.14em] text-foreground">
          NEX<span className="text-primary">-</span>FOREST
        </div>
        {!compact && (
          <div className="text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
            Plantation Reporting Portal
          </div>
        )}
      </div>
    </div>
  );
}
