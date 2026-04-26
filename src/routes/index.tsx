import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell, StatusPill, TopBar } from "@/components/AppShell";
import { Activity, AlertTriangle, ArrowRight, Bug, ChevronRight, Droplets, Heart, MapPin, Microscope, ShieldCheck, Sparkles, Stethoscope, Users } from "lucide-react";
import { useStore } from "@/lib/store";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "OutbreakIQ — Early Outbreak Intelligence" },
      { name: "description", content: "Turn everyday health signals into early outbreak warnings." },
      { property: "og:title", content: "OutbreakIQ" },
      { property: "og:description", content: "Participatory outbreak intelligence platform." },
    ],
  }),
  component: Index,
});

function Index() {
  const signals = useStore((s) => s.signals);
  const streak = useStore((s) => s.streak);
  const points = useStore((s) => s.points);
  const topSignal = signals.find((s) => s.severity === "high") ?? signals[0];

  return (
    <AppShell>
      <TopBar title="OutbreakIQ" pill={<StatusPill tone="live">AI Surveillance Active</StatusPill>} right={
        <Link to="/insights" className="w-9 h-9 rounded-full bg-gradient-teal grid place-items-center text-teal-foreground shadow-glow">
          <Sparkles className="w-4 h-4" />
        </Link>
      }/>

      <section className="px-5 pt-4 pb-6">
        <h1 className="text-[34px] leading-[1.05] font-extrabold tracking-tight text-navy">
          Turn everyday<br/>health signals<br/>into early<br/>outbreak warnings.
        </h1>
        <p className="mt-4 text-[15px] leading-relaxed text-muted-foreground">
          Aggregate community reports, wearable vitals, and AI-driven epidemiology to detect anomalies before they become critical.
        </p>

        <Link to="/checkin" className="mt-6 flex items-center justify-center gap-2 w-full rounded-2xl bg-gradient-hero text-white py-4 font-semibold shadow-elevated active:scale-[0.99] transition-transform">
          <Heart className="w-4 h-4" /> Start Daily Check-In
        </Link>

        <div className="mt-3 grid grid-cols-2 gap-3">
          <Link to="/report" className="flex items-center justify-center gap-2 rounded-xl bg-card border border-border py-3 text-[13px] font-semibold text-navy shadow-soft">
            <Bug className="w-4 h-4 text-warning" /> Report Animal Incident
          </Link>
          <Link to="/map" className="flex items-center justify-center gap-2 rounded-xl bg-card border border-border py-3 text-[13px] font-semibold text-navy shadow-soft">
            <MapPin className="w-4 h-4 text-teal" /> Community Signals
          </Link>
        </div>
      </section>

      {/* Map preview card */}
      <section className="px-5">
        <Link to="/map" className="block rounded-2xl bg-gradient-dark-card p-4 shadow-elevated relative overflow-hidden">
          <div className="flex items-center justify-between text-[10px] tracking-wider uppercase text-white/60 font-semibold">
            <span>Local Clusters</span>
            <span className="flex items-center gap-1 text-warning"><AlertTriangle className="w-3 h-3" /> High Anomaly</span>
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-5xl font-extrabold text-white">{topSignal?.count ?? 14}</span>
            <span className="text-white/70 text-sm">reports/h</span>
          </div>

          <div className="relative mt-3 h-32 rounded-xl bg-white/5 overflow-hidden">
            <MiniMap />
          </div>
          <div className="mt-3 flex items-center justify-between">
            <span className="text-white/80 text-xs">Open community map</span>
            <ChevronRight className="w-4 h-4 text-white/80" />
          </div>
        </Link>
      </section>

      {/* Streak / rewards */}
      <section className="px-5 mt-5">
        <div className="rounded-2xl bg-card border border-border p-4 shadow-soft flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-success grid place-items-center text-white">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-navy">{streak}-day check-in streak</p>
            <p className="text-xs text-muted-foreground">{points} community impact points · partner rewards unlocking</p>
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        </div>
      </section>

      {/* Value props */}
      <section className="px-5 mt-6 space-y-3">
        <ValueCard icon={<Activity className="w-5 h-5" />} title="Report in seconds" body="Our streamlined triage flow lets you log symptoms or incidents effortlessly, feeding directly into the local intelligence grid." />
        <ValueCard icon={<Sparkles className="w-5 h-5" />} title="Get local insights back" body="Receive personalized risk assessments and actionable guidance based on verified outbreak data in your immediate vicinity." />
        <ValueCard icon={<Users className="w-5 h-5" />} title="Help detect outbreaks earlier" body="Your anonymous signals empower public health officials to deploy resources faster and contain threats before they spread." />
      </section>

      {/* Roles */}
      <section className="px-5 mt-6 grid grid-cols-2 gap-3">
        <Link to="/doctor" className="rounded-2xl bg-gradient-hero p-4 text-white shadow-elevated">
          <Stethoscope className="w-5 h-5" />
          <p className="mt-2 text-sm font-bold">Doctor view</p>
          <p className="text-[11px] text-white/75 mt-0.5">Validate alerts in one tap</p>
        </Link>
        <Link to="/public-health" className="rounded-2xl bg-card border border-border p-4 text-navy shadow-soft">
          <Microscope className="w-5 h-5 text-teal" />
          <p className="mt-2 text-sm font-bold">Public health</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">Explainable risk scores</p>
        </Link>
      </section>

      <p className="px-5 mt-6 text-[10px] text-center text-muted-foreground">
        Partners shown (HealthBridge, CarePoint, ValleyMed, AgriAssist, VetLink, DesertCare, WellSpring) are representative examples for demonstration only.
      </p>
    </AppShell>
  );
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
      <text x="120" y="96" textAnchor="middle" fontSize="9" fill="white" fontWeight="700">Outbreak</text>
      <text x="220" y="100" textAnchor="middle" fontSize="9" fill="white" fontWeight="700">Mosquito Risk</text>
    </svg>
  );
}
