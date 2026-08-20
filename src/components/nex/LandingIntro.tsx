import { useCallback, useEffect, useState } from "react";
import { Leaf } from "lucide-react";

const INTRO_KEY = "nex-forest-intro-seen";
const INTRO_MS = 4200;

const LOGO_SRC = "/assets/animation-image.png";
type Props = {
  onComplete: () => void;
};

function getPrefersReducedMotion() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(getPrefersReducedMotion);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return reduced;
}

export function LandingIntro({ onComplete }: Props) {
  const reducedMotion = usePrefersReducedMotion();
  const [phase, setPhase] = useState<"enter" | "hold" | "exit">("enter");
  const [visible, setVisible] = useState(true);

  const finish = useCallback(() => {
    sessionStorage.setItem(INTRO_KEY, "1");
    setVisible(false);
    onComplete();
  }, [onComplete]);

  useEffect(() => {
    if (reducedMotion) {
      finish();
      return;
    }
    const holdTimer = window.setTimeout(() => setPhase("hold"), 2400);
    const exitTimer = window.setTimeout(() => setPhase("exit"), 3400);
    const doneTimer = window.setTimeout(finish, INTRO_MS);
    return () => {
      window.clearTimeout(holdTimer);
      window.clearTimeout(exitTimer);
      window.clearTimeout(doneTimer);
    };
  }, [reducedMotion, finish]);

  if (!visible) return null;

  return (
    <div
      className={`landing-intro fixed inset-0 z-[100] flex flex-col items-center justify-center overflow-hidden text-primary-foreground ${phase}`}
      aria-hidden={phase === "exit"}
      role="presentation"
    >
      <div className="landing-intro__bg absolute inset-0" style={{ background: "var(--gradient-forest)" }} />
      <div className="topo-texture absolute inset-0 opacity-50" />
      <div className="rings-bg absolute inset-0 opacity-30" />

      {/* Ambient orbs */}
      <div className="landing-intro__orb landing-intro__orb--a absolute h-64 w-64 rounded-full bg-accent/20 blur-3xl" />
      <div className="landing-intro__orb landing-intro__orb--b absolute h-80 w-80 rounded-full bg-primary-foreground/10 blur-3xl" />

      {/* Floating leaves */}
      <div className="landing-intro__leaves pointer-events-none absolute inset-0">
        {LEAVES.map((leaf, i) => (
          <Leaf
            key={i}
            className="landing-intro__leaf absolute text-accent/40"
            style={
              {
                left: leaf.x,
                top: leaf.y,
                width: leaf.size,
                height: leaf.size,
                animationDelay: `${leaf.delay}ms`,
                "--leaf-drift": `${leaf.drift}px`,
              } as React.CSSProperties
            }
            strokeWidth={1.5}
          />
        ))}
      </div>

      <button
        type="button"
        onClick={finish}
        className="landing-intro__skip absolute right-5 top-5 z-10 rounded-full border border-primary-foreground/25 bg-primary-foreground/10 px-3 py-1.5 text-[11px] font-medium uppercase tracking-[0.14em] text-primary-foreground/80 backdrop-blur-sm transition-colors hover:bg-primary-foreground/20 hover:text-primary-foreground"
      >
        Skip
      </button>

      <div className="landing-intro__content relative flex flex-col items-center px-6 text-center">
        {/* Logo */}
        <div className="landing-intro__emblem relative size-44 sm:size-52">
          <div className="landing-intro__logo-shell absolute inset-0 flex items-center justify-center overflow-hidden rounded-full">
            <img
              src={LOGO_SRC}
              alt="Telangana State Forest Development Corporation"
              className="landing-intro__logo-img size-full object-cover"
            />
          </div>

          <span
            className="landing-intro__pulse pointer-events-none absolute inset-0 rounded-full border border-accent/40"
            aria-hidden
          />
        </div>
        {/* Title block */}
        <div className="landing-intro__copy mt-10 max-w-md">
          <p className="landing-intro__eyebrow text-[11px] font-semibold uppercase tracking-[0.28em] text-accent">
            Telangana State Forest Department
          </p>
          <h1 className="landing-intro__title mt-3 font-display text-3xl font-semibold tracking-[0.06em] sm:text-4xl">
            NEX<span className="text-accent">-</span>FOREST
          </h1>
          <p className="landing-intro__subtitle mt-3 text-sm leading-relaxed text-primary-foreground/75">
            Plantation reporting portal — secure access for District Managers and the General Manager.
          </p>
        </div>

        {/* Progress bar */}
        <div className="landing-intro__progress mt-10 h-0.5 w-40 overflow-hidden rounded-full bg-primary-foreground/15 sm:w-48">
          <div className="landing-intro__progress-bar h-full rounded-full bg-accent" />
        </div>
      </div>
    </div>
  );
}

export function shouldPlayLandingIntro(): boolean {
  if (typeof window === "undefined") return false;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return false;
  return sessionStorage.getItem(INTRO_KEY) !== "1";
}

const LEAVES = [
  { x: "8%", y: "18%", size: 18, delay: 0, drift: 28 },
  { x: "82%", y: "12%", size: 22, delay: 400, drift: -22 },
  { x: "14%", y: "72%", size: 16, delay: 800, drift: 18 },
  { x: "88%", y: "68%", size: 20, delay: 200, drift: -30 },
  { x: "48%", y: "8%", size: 14, delay: 600, drift: 12 },
  { x: "72%", y: "84%", size: 17, delay: 1000, drift: -16 },
];
