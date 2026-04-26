import { Link, useLocation } from "@tanstack/react-router";
import { Activity, Gift, Map as MapIcon, Stethoscope, Home, Shield, UserRound } from "lucide-react";
import { type ReactNode, useEffect, useId } from "react";
import { useAppUser } from "@/hooks/use-app-user";
import { store, type ServerHealthCheckIn } from "@/lib/store";

const tabs = [
  { to: "/", label: "Home", icon: Home },
  { to: "/checkin", label: "Check-In", icon: Activity },
  { to: "/map", label: "Map", icon: MapIcon },
  { to: "/rewards", label: "Rewards", icon: Gift },
  { to: "/doctor", label: "Review", icon: Stethoscope },
  { to: "/admin", label: "Admin", icon: Shield },
  { to: "/profile", label: "Profile", icon: UserRound },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  useServerCheckInSync();
  const loc = useLocation();
  const { role } = useAppUser();
  const visibleTabs = tabs.filter((tab) => {
    if (role === "patient") return tab.to !== "/doctor" && tab.to !== "/admin";
    if (role === "doctor" || role === "environmental") return tab.to !== "/checkin" && tab.to !== "/admin";
    return tab.to !== "/checkin";
  });
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto w-full max-w-md min-h-screen pb-24 relative">
        {children}
      </div>
      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-card/95 backdrop-blur-xl border-t border-border z-50">
        <div className="grid px-2 py-2" style={{ gridTemplateColumns: `repeat(${visibleTabs.length}, minmax(0, 1fr))` }}>
          {visibleTabs.map((t) => {
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

function useServerCheckInSync() {
  useEffect(() => {
    let stopped = false;

    const load = async () => {
      try {
        const response = await fetch("/api/checkins?limit=50", {
          headers: { Accept: "application/json" },
        });
        if (!response.ok) return;
        const data = await response.json();
        if (!stopped && data?.success && Array.isArray(data.checkIns)) {
          store.mergeServerCheckIns(data.checkIns as ServerHealthCheckIn[]);
        }
      } catch {
        // The app should keep working offline or before DATABASE_URL is configured.
      }
    };

    void load();
    const interval = window.setInterval(load, 15000);
    return () => {
      stopped = true;
      window.clearInterval(interval);
    };
  }, []);
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
        <BloomyLogo className="h-7 w-7 shrink-0" />
        <span className="text-sm font-semibold text-teal tracking-tight">{title}</span>
        {pill}
      </div>
      {right}
    </header>
  );
}

export function BloomyLogo({ className = "h-10 w-10" }: { className?: string }) {
  const id = useId().replace(/:/g, "");
  const tealId = `${id}-bloomy-teal`;
  const warmId = `${id}-bloomy-warm`;

  return (
    <svg className={className} viewBox="0 0 48 48" role="img" aria-label="Bloomy logo">
      <defs>
        <linearGradient id={tealId} x1="9" y1="8" x2="39" y2="40" gradientUnits="userSpaceOnUse">
          <stop stopColor="oklch(0.72 0.12 185)" />
          <stop offset="1" stopColor="oklch(0.55 0.12 195)" />
        </linearGradient>
        <linearGradient id={warmId} x1="15" y1="11" x2="35" y2="36" gradientUnits="userSpaceOnUse">
          <stop stopColor="oklch(0.86 0.15 82)" />
          <stop offset="1" stopColor="oklch(0.68 0.19 42)" />
        </linearGradient>
      </defs>
      <circle cx="24" cy="24" r="21" fill="white" />
      <circle cx="24" cy="24" r="20" fill="oklch(0.97 0.02 190)" stroke="oklch(0.82 0.04 195)" strokeWidth="1.5" />
      <path d="M24 9.5c4.7 3.9 7 8.1 7 12.5 0 4.5-2.6 7.4-7 7.4s-7-2.9-7-7.4c0-4.4 2.3-8.6 7-12.5Z" fill={`url(#${tealId})`} />
      <path d="M12.4 24.2c5.8-1.9 10.5-1.8 14.1.4 3.9 2.3 4.9 6.1 2.7 9.9-2.2 3.8-6 4.8-9.9 2.5-3.7-2.1-6-6.4-6.9-12.8Z" fill={`url(#${warmId})`} opacity="0.95" />
      <path d="M35.6 24.2c-.9 6.4-3.2 10.7-6.9 12.8-3.9 2.3-7.7 1.3-9.9-2.5-2.2-3.8-1.2-7.6 2.7-9.9 3.6-2.2 8.3-2.3 14.1-.4Z" fill={`url(#${warmId})`} opacity="0.78" />
      <circle cx="24" cy="24.2" r="5.2" fill="white" opacity="0.92" />
      <path d="M24 19.7a4.5 4.5 0 0 1 4.5 4.5c0 3.2-4.5 7.5-4.5 7.5s-4.5-4.3-4.5-7.5a4.5 4.5 0 0 1 4.5-4.5Z" fill="oklch(0.42 0.1 205)" />
      <circle cx="24" cy="24.1" r="1.7" fill="white" />
    </svg>
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
