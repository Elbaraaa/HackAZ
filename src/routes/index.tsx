import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell, BloomyLogo, TopBar } from "@/components/AppShell";
import { Activity, AlertTriangle, Bug, ChevronRight, Gift, Heart, MapPin, Sparkles, Users } from "lucide-react";
import { activeSignals, useStore } from "@/lib/store";
import { InteractiveRegionMap } from "@/components/InteractiveRegionMap";
import { useMemo } from "react";
import { AuthStatus } from "@/components/AuthStatus";
import { useAppUser } from "@/hooks/use-app-user";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Bloomy - Early Health Intelligence" },
      { name: "description", content: "Turn everyday health signals into early outbreak warnings." },
      { property: "og:title", content: "Bloomy" },
      { property: "og:description", content: "Participatory outbreak intelligence platform." },
    ],
  }),
  component: Index,
});

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN as string | undefined;

function Index() {
  const { role } = useAppUser();
  const signals = useStore((s) => s.signals);
  const streak = useStore((s) => s.streak);
  const points = useStore((s) => s.points);
  const liveSignals = useMemo(() => activeSignals(signals), [signals]);
  const topSignal = liveSignals.find((s) => s.severity === "high") ?? liveSignals[0];
  const homeCopy = getRoleHomeCopy(role);

  return (
    <AppShell>
      <TopBar title="Bloomy" right={
        <div className="flex items-center gap-2">
          <AuthStatus />
          <Link to="/insights" className="w-9 h-9 rounded-full bg-gradient-teal grid place-items-center text-teal-foreground shadow-glow">
            <Sparkles className="w-4 h-4" />
          </Link>
        </div>
      }/>

      <section className="px-5 pt-4 pb-6">
        <div className="mb-4 flex items-center gap-3">
          <BloomyLogo className="h-14 w-14 shrink-0" />
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-teal">Bloomy</p>
            <p className="text-[12px] font-semibold text-muted-foreground">Community health signals</p>
          </div>
        </div>
        <h1 className="text-[34px] leading-[1.05] font-extrabold tracking-tight text-navy">
          {homeCopy.title}
        </h1>
        <p className="mt-4 text-[15px] leading-relaxed text-muted-foreground">
          {homeCopy.body}
        </p>

        <Link to={homeCopy.primaryTo} className="mt-6 flex items-center justify-center gap-2 w-full rounded-2xl bg-gradient-hero text-white py-4 font-semibold shadow-elevated active:scale-[0.99] transition-transform">
          <homeCopy.PrimaryIcon className="w-4 h-4" /> {homeCopy.primaryLabel}
        </Link>

        <div className="mt-3 grid grid-cols-2 gap-3">
          {homeCopy.secondary.map((item) => (
            <Link key={item.to} to={item.to} className="flex items-center justify-center gap-2 rounded-xl bg-card border border-border py-3 text-[13px] font-semibold text-navy shadow-soft">
              <item.Icon className={`w-4 h-4 ${item.tone}`} /> {item.label}
            </Link>
          ))}
        </div>
      </section>

      {/* Map preview card */}
      <section className="px-5">
        <div className="rounded-2xl bg-gradient-dark-card p-4 shadow-elevated relative overflow-hidden">
          <div className="flex items-center justify-between text-[10px] tracking-wider uppercase text-white/60 font-semibold">
            <span>Local Clusters</span>
            <span className="flex items-center gap-1 text-warning"><AlertTriangle className="w-3 h-3" /> High Anomaly</span>
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-5xl font-extrabold text-white">{topSignal?.count ?? 14}</span>
            <span className="text-white/70 text-sm">reports/h</span>
          </div>

          <div className="relative mt-3 h-32 rounded-xl bg-white/5 overflow-hidden">
            {MAPBOX_TOKEN ? (
              <InteractiveRegionMap signals={liveSignals} token={MAPBOX_TOKEN} className="h-32 rounded-xl" compact />
            ) : (
              <MiniMap />
            )}
          </div>
          <div className="mt-3 flex items-center justify-between">
            <span className="text-white/80 text-xs">Drag the preview or open the full map</span>
            <Link to="/map" className="inline-flex items-center gap-1 rounded-full bg-white/10 px-3 py-1.5 text-[11px] font-bold text-white">
              Open <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </section>

      {/* Streak / rewards */}
      <section className="px-5 mt-5">
        <Link to="/rewards" className="rounded-2xl bg-card border border-border p-4 shadow-soft flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-success grid place-items-center text-white">
            <Gift className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-navy">Rewards & partner benefits</p>
            <p className="text-xs text-muted-foreground">{streak}-day streak · {points} impact points · benefit paths unlocked</p>
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        </Link>
      </section>

      {/* Value props */}
      <section className="px-5 mt-6 space-y-3">
        <ValueCard icon={<Activity className="w-5 h-5" />} title="Report in seconds" body="Our streamlined triage flow lets you log symptoms or incidents effortlessly, feeding directly into the local intelligence grid." />
        <ValueCard icon={<Sparkles className="w-5 h-5" />} title="Get local insights back" body="Receive personalized risk assessments and actionable guidance based on verified outbreak data in your immediate vicinity." />
        <ValueCard icon={<Users className="w-5 h-5" />} title="Help detect outbreaks earlier" body="Your anonymous signals empower public health officials to deploy resources faster and contain threats before they spread." />
      </section>

      <p className="px-5 mt-6 text-[10px] text-center text-muted-foreground">
        Partners shown (HealthBridge, CarePoint, ValleyMed, AgriAssist, VetLink, DesertCare, WellSpring) are representative examples for demonstration only.
      </p>
    </AppShell>
  );
}

function getRoleHomeCopy(role: "patient" | "doctor" | "environmental" | "admin") {
  if (role === "doctor") {
    return {
      title: <>Review your<br/>assigned<br/>health signals.</>,
      body: "Your workspace only shows the review lanes and cases tied to your doctor account.",
      primaryTo: "/doctor" as const,
      primaryLabel: "Open Review Hub",
      PrimaryIcon: Sparkles,
      secondary: [
        { to: "/map" as const, label: "Assigned Signals", Icon: MapPin, tone: "text-teal" },
        { to: "/rewards" as const, label: "Reviewer Rewards", Icon: Gift, tone: "text-warning" },
      ],
    };
  }

  if (role === "environmental") {
    return {
      title: <>Review local<br/>environmental<br/>health signals.</>,
      body: "Your workspace only shows environmental cases assigned to your account.",
      primaryTo: "/doctor" as const,
      primaryLabel: "Open Environmental Hub",
      PrimaryIcon: Sparkles,
      secondary: [
        { to: "/map" as const, label: "Assigned Signals", Icon: MapPin, tone: "text-teal" },
        { to: "/rewards" as const, label: "Reviewer Rewards", Icon: Gift, tone: "text-warning" },
      ],
    };
  }

  if (role === "admin") {
    return {
      title: <>Operate the<br/>Bloomy public<br/>health console.</>,
      body: "Admin tools stay separated from patient and reviewer workspaces while keeping the system view available.",
      primaryTo: "/admin" as const,
      primaryLabel: "Open Admin Console",
      PrimaryIcon: Sparkles,
      secondary: [
        { to: "/map" as const, label: "System Map", Icon: MapPin, tone: "text-teal" },
        { to: "/doctor" as const, label: "All Review Queues", Icon: Bug, tone: "text-warning" },
      ],
    };
  }

  return {
    title: <>Turn everyday<br/>health signals<br/>into early<br/>outbreak warnings.</>,
    body: "Aggregate community reports, wearable vitals, and AI-driven epidemiology to detect anomalies before they become critical.",
    primaryTo: "/checkin" as const,
    primaryLabel: "Start Daily Check-In",
    PrimaryIcon: Heart,
    secondary: [
      { to: "/report" as const, label: "Report Incident", Icon: Bug, tone: "text-warning" },
      { to: "/map" as const, label: "Community Signals", Icon: MapPin, tone: "text-teal" },
    ],
  };
}

function ValueCard({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="rounded-2xl bg-card border border-border p-4 shadow-soft">
      <div className="w-9 h-9 rounded-lg bg-teal/10 text-teal grid place-items-center">{icon}</div>
      <p className="mt-3 text-[15px] font-semibold text-navy">{title}</p>
      <p className="mt-1 text-[13px] text-muted-foreground leading-relaxed">{body}</p>
    </div>
  );
}

function MiniMap() {
  return (
    <svg viewBox="0 0 320 130" className="w-full h-full">
      <defs>
        <radialGradient id="g1" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="oklch(0.62 0.22 25)" stopOpacity="0.55"/>
          <stop offset="100%" stopColor="oklch(0.62 0.22 25)" stopOpacity="0"/>
        </radialGradient>
        <radialGradient id="g2" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="oklch(0.78 0.16 75)" stopOpacity="0.5"/>
          <stop offset="100%" stopColor="oklch(0.78 0.16 75)" stopOpacity="0"/>
        </radialGradient>
      </defs>
      {/* grid */}
      {Array.from({length: 8}).map((_,i)=>(
        <line key={`v${i}`} x1={i*40} y1="0" x2={i*40} y2="130" stroke="white" strokeOpacity="0.06"/>
      ))}
      {Array.from({length: 4}).map((_,i)=>(
        <line key={`h${i}`} x1="0" y1={i*40} x2="320" y2={i*40} stroke="white" strokeOpacity="0.06"/>
      ))}
      <circle cx="120" cy="55" r="55" fill="url(#g1)"/>
      <circle cx="220" cy="70" r="45" fill="url(#g2)"/>
      <circle cx="120" cy="55" r="6" fill="oklch(0.62 0.22 25)" />
      <circle cx="120" cy="55" r="10" fill="none" stroke="oklch(0.62 0.22 25)" strokeOpacity="0.6"/>
      <circle cx="220" cy="70" r="5" fill="oklch(0.78 0.16 75)" />
      <text x="120" y="96" textAnchor="middle" fontSize="9" fill="white" fontWeight="700">Cluster</text>
      <text x="220" y="100" textAnchor="middle" fontSize="9" fill="white" fontWeight="700">Mosquito Risk</text>
    </svg>
  );
}
