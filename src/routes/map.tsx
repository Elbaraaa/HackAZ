import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell, StatusPill, TopBar } from "@/components/AppShell";
import { useStore, type CommunitySignal } from "@/lib/store";
import { useState } from "react";
import { AlertTriangle, Bug, Cloud, Droplets, Flame, Heart, Hospital, MapPin } from "lucide-react";

export const Route = createFileRoute("/map")({
  head: () => ({
    meta: [
      { title: "Community Map — OutbreakIQ" },
      { name: "description", content: "Live community signals, clusters, and environmental risks." },
    ],
  }),
  component: MapView,
});

const FILTERS = [
  { id: "all", label: "All Signals" },
  { id: "symptom-cluster", label: "Symptoms" },
  { id: "animal", label: "Animal" },
  { id: "mosquito", label: "Mosquito" },
  { id: "heat", label: "Heat" },
] as const;

function iconFor(t: CommunitySignal["type"]) {
  switch (t) {
    case "symptom-cluster": return <AlertTriangle className="w-3.5 h-3.5" />;
    case "animal": return <Bug className="w-3.5 h-3.5" />;
    case "mosquito": return <Droplets className="w-3.5 h-3.5" />;
    case "heat": return <Flame className="w-3.5 h-3.5" />;
    case "healthy-report": return <Heart className="w-3.5 h-3.5" />;
    case "clinic": return <Hospital className="w-3.5 h-3.5" />;
  }
}

function colorFor(s: CommunitySignal) {
  if (s.type === "healthy-report") return "oklch(0.62 0.13 155)";
  if (s.type === "clinic") return "oklch(0.55 0.12 195)";
  if (s.type === "mosquito") return "oklch(0.55 0.13 175)";
  if (s.type === "heat") return "oklch(0.78 0.16 75)";
  if (s.severity === "high") return "oklch(0.62 0.22 25)";
  return "oklch(0.78 0.16 75)";
}

function MapView() {
  const signals = useStore((s) => s.signals);
  const [filter, setFilter] = useState<typeof FILTERS[number]["id"]>("all");
  const filtered = filter === "all" ? signals : signals.filter((s) => s.type === filter);

  return (
    <AppShell>
      <TopBar title="Clinical Intel" back="/" pill={<StatusPill tone="live">Live</StatusPill>} />

      <section className="px-5 pt-2">
        <div className="flex gap-2 overflow-x-auto -mx-1 px-1 pb-1 no-scrollbar">
          {FILTERS.map((f) => (
            <button key={f.id} onClick={() => setFilter(f.id)} className={`shrink-0 rounded-full px-3.5 py-1.5 text-[12px] font-semibold border ${filter === f.id ? "bg-teal text-white border-teal" : "bg-card text-navy border-border"}`}>
              {f.label}
            </button>
          ))}
        </div>
      </section>

      <section className="px-5 mt-3">
        <div className="rounded-3xl bg-gradient-dark-card p-3 shadow-elevated overflow-hidden">
          <svg viewBox="0 0 100 70" className="w-full h-56">
            <defs>
              {filtered.filter(s => s.type !== "clinic" && s.type !== "healthy-report").map(s => (
                <radialGradient key={`g-${s.id}`} id={`g-${s.id}`} cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor={colorFor(s)} stopOpacity="0.5"/>
                  <stop offset="100%" stopColor={colorFor(s)} stopOpacity="0"/>
                </radialGradient>
              ))}
            </defs>
            {/* grid */}
            {Array.from({length: 11}).map((_,i)=>(
              <line key={`v${i}`} x1={i*10} y1="0" x2={i*10} y2="70" stroke="white" strokeOpacity="0.05"/>
            ))}
            {Array.from({length: 8}).map((_,i)=>(
              <line key={`h${i}`} x1="0" y1={i*10} x2="100" y2={i*10} stroke="white" strokeOpacity="0.05"/>
            ))}
            {/* zones */}
            {["85719","85721","85705","85641","85629"].map((z, i) => (
              <text key={z} x={20 + i*15} y={(i%2===0?12:62)} fontSize="2.2" fill="white" opacity="0.5" fontWeight="700">{z}</text>
            ))}
            {/* heat halos */}
            {filtered.filter(s => s.type !== "clinic" && s.type !== "healthy-report").map(s => (
              <circle key={`h-${s.id}`} cx={s.x} cy={s.y} r="14" fill={`url(#g-${s.id})`} />
            ))}
            {/* pins */}
            {filtered.map(s => (
              <g key={s.id}>
                <circle cx={s.x} cy={s.y} r="1.6" fill={colorFor(s)} />
                <circle cx={s.x} cy={s.y} r="2.6" fill="none" stroke={colorFor(s)} strokeOpacity="0.6" strokeWidth="0.3"/>
              </g>
            ))}
          </svg>
          <div className="px-2 pb-1 grid grid-cols-3 gap-2 text-[10px] text-white/80">
            <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[oklch(0.62_0.22_25)]"/>High</div>
            <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[oklch(0.78_0.16_75)]"/>Moderate</div>
            <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[oklch(0.62_0.13_155)]"/>Healthy / Resource</div>
          </div>
        </div>
      </section>

      <section className="px-5 mt-5">
        <div className="flex items-center justify-between">
          <p className="text-[16px] font-bold text-navy">Today's Signals</p>
          <span className="text-[11px] text-muted-foreground">Real-time alerts for your area</span>
        </div>
        <div className="mt-3 space-y-2">
          {filtered.map((s) => (
            <SignalRow key={s.id} s={s} />
          ))}
        </div>
      </section>

      <p className="px-5 mt-6 text-[10px] text-center text-muted-foreground">
        Resource pins (ValleyMed, HealthBridge, DesertCare) are representative examples for demonstration.
      </p>
    </AppShell>
  );
}

function SignalRow({ s }: { s: CommunitySignal }) {
  const tone = s.severity === "high" ? "text-danger" : s.severity === "moderate" ? "text-warning" : "text-success";
  return (
    <div className="rounded-xl bg-card border border-border p-3 shadow-soft flex gap-3">
      <span className="w-8 h-8 rounded-lg bg-surface-2 grid place-items-center" style={{ color: colorFor(s) }}>{iconFor(s.type)}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[13px] font-bold text-navy truncate">{s.title}</p>
          <span className="text-[10px] text-muted-foreground shrink-0">{s.ago}</span>
        </div>
        <p className="text-[11.5px] text-muted-foreground leading-relaxed mt-0.5">{s.detail}</p>
        <div className="mt-1.5 flex items-center gap-2">
          <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-muted text-navy">ZIP {s.zip}</span>
          <span className={`text-[10px] font-bold uppercase tracking-wider ${tone}`}>{s.severity}</span>
        </div>
      </div>
    </div>
  );
}
