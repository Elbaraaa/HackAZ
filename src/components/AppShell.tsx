import { Link, useLocation } from "@tanstack/react-router";
import { Activity, Map as MapIcon, Stethoscope, Sparkles, Home } from "lucide-react";
import { type ReactNode } from "react";

const tabs = [
  { to: "/", label: "Home", icon: Home },
  { to: "/checkin", label: "Check-In", icon: Activity },
  { to: "/map", label: "Map", icon: MapIcon },
  { to: "/insights", label: "Insights", icon: Sparkles },
  { to: "/doctor", label: "Doctor", icon: Stethoscope },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const loc = useLocation();
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto w-full max-w-md min-h-screen pb-24 relative">
        {children}
      </div>
      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-card/95 backdrop-blur-xl border-t border-border z-50">
        <div className="grid grid-cols-5 px-2 py-2">
          {tabs.map((t) => {
            const active = loc.pathname === t.to;
            const Icon = t.icon;
            return (
              <Link
                key={t.to}
                to={t.to}
                className={`flex flex-col items-center gap-1 py-1.5 rounded-xl transition-colors ${
                  active ? "text-teal" : "text-muted-foreground"
                }`}
              >
                <Icon className="w-5 h-5" strokeWidth={active ? 2.4 : 2} />
                <span className="text-[10px] font-medium tracking-wide">{t.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

export function TopBar({
  title,
  back,
  right,
  pill,
}: { title: string; back?: string; right?: ReactNode; pill?: ReactNode }) {
  return (
    <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl px-4 py-3 flex items-center gap-3 border-b border-border/60">
      {back ? (
        <Link to={back} className="w-9 h-9 rounded-full grid place-items-center hover:bg-muted">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
        </Link>
      ) : null}
      <div className="flex items-center gap-2 flex-1">
        <span className="text-sm font-semibold text-teal tracking-tight">{title}</span>
        {pill}
      </div>
      {right}
    </header>
  );
}

export function StatusPill({ tone, children }: { tone: "live" | "warn" | "ok"; children: ReactNode }) {
  const map = {
    live: "bg-teal/10 text-teal border-teal/20",
    warn: "bg-warning/15 text-warning-foreground border-warning/30",
    ok: "bg-success/10 text-success border-success/20",
  } as const;
  return (
    <span className={`inline-flex items-center gap-1.5 text-[10px] font-semibold tracking-wider uppercase px-2 py-1 rounded-full border ${map[tone]}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current" /> {children}
    </span>
  );
}
