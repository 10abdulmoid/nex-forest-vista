import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { LogoLockup } from "@/components/nex/Logo";
import { TERMS_LAST_UPDATED, TERMS_SECTIONS } from "@/lib/terms";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms & Conditions · NEX-FOREST" },
      {
        name: "description",
        content: "Terms and conditions for use of the NEX-FOREST plantation reporting portal.",
      },
    ],
  }),
  component: TermsPage,
});

function TermsPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="border-b border-border bg-card/90 px-5 py-4 sm:px-8">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-3">
          <LogoLockup />
          <Link
            to="/"
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-panel)] transition-colors hover:bg-primary/90 sm:px-5 sm:py-3 sm:text-base"
          >
            <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" /> Back to sign-in
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-5 py-10 sm:px-8">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          NEX-FOREST · TGFDC
        </p>
        <h1 className="mt-2 font-display text-2xl font-semibold text-foreground sm:text-3xl">
          Terms &amp; Conditions
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">Last updated: {TERMS_LAST_UPDATED}</p>
        <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
          By signing in to or using the NEX-FOREST portal, you agree to follow these terms for
          official departmental use.
        </p>

        <div className="mt-10 space-y-8">
          {TERMS_SECTIONS.map((section) => (
            <section key={section.title}>
              <h2 className="font-display text-base font-semibold text-foreground">{section.title}</h2>
              <div className="mt-2 space-y-3 text-sm leading-relaxed text-foreground/90">
                {section.paragraphs.map((p) => (
                  <p key={p.slice(0, 48)}>{p}</p>
                ))}
              </div>
            </section>
          ))}
        </div>
      </main>
    </div>
  );
}
