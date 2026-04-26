import { createFileRoute } from "@tanstack/react-router";
import { AppShell, StatusPill, TopBar } from "@/components/AppShell";
import { InteractiveRegionMap } from "@/components/InteractiveRegionMap";
import { activeSignals, type CommunitySignal, useStore } from "@/lib/store";
import { useMemo, useState } from "react";
import { AlertTriangle, Bug, Droplets, Flame, Heart, Hospital } from "lucide-react";

export const Route = createFileRoute("/map")({
  head: () => ({
    meta: [
      { title: "Community Map - OutbreakIQ" },
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

const TOKEN = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN as string | undefined;

function MapView() {
  const signals = useStore((s) => s.signals);
  const liveSignals = useMemo(() => activeSignals(signals), [signals]);
  const [filters, setFilters] = useState<Array<Exclude<typeof FILTERS[number]["id"], "all">>>([]);
  const filtered = useMemo(
    () => filters.length === 0 ? liveSignals : liveSignals.filter((s) => filters.includes(s.type as Exclude<typeof FILTERS[number]["id"], "all">)),
    [filters, liveSignals],
  );
  const illnesses = useMemo(() => {
    const scores = new Map<string, { illness: string; rank: number; count: number }>();
    for (const signal of liveSignals) {
      if (signal.illness === "baseline") continue;
      const current = scores.get(signal.illness) ?? { illness: signal.illness, rank: 0, count: 0 };
      scores.set(signal.illness, {
        illness: signal.illness,
        rank: Math.max(current.rank, signal.rank),
        count: current.count + (signal.count ?? 1),
      });
    }
    return Array.from(scores.values()).sort((a, b) => b.rank - a.rank);
  }, [liveSignals]);

  return (
    <AppShell>
      <TopBar title="Clinical Intel" back="/" pill={<StatusPill tone="live">Live</StatusPill>} />

      <section className="relative h-[calc(100vh-8.25rem)] min-h-[620px] overflow-hidden bg-navy">
        {TOKEN ? (
          <InteractiveRegionMap signals={filtered} token={TOKEN} className="h-full rounded-none" showBadge={false} />
        ) : (
          <div className="h-full bg-gradient-dark-card p-5">
            <FallbackRegionMap signals={filtered} />
          </div>
        )}

        <div className="pointer-events-none absolute inset-x-0 top-0 z-10 bg-gradient-to-b from-black/35 via-black/10 to-transparent p-4">
          <div className="pointer-events-auto flex gap-2 overflow-x-auto pb-1 no-scrollbar">
            {FILTERS.map((f) => (
              <button
                key={f.id}
                onClick={() => {
                  if (f.id === "all") {
                    setFilters([]);
                    return;
                  }
                  setFilters((current) =>
                    current.includes(f.id)
                      ? current.filter((item) => item !== f.id)
                      : [...current, f.id],
                  );
                }}
                className={`shrink-0 rounded-full px-3.5 py-2 text-[12px] font-semibold border shadow-soft backdrop-blur-md ${
                  (f.id === "all" ? filters.length === 0 : filters.includes(f.id)) ? "bg-teal text-white border-teal" : "bg-white/90 text-navy border-white/70"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {!TOKEN ? (
            <div className="pointer-events-auto mt-3 rounded-2xl bg-white/90 border border-white/70 p-3 text-navy shadow-soft">
              <p className="text-[12px] font-bold">Mapbox token needed</p>
              <p className="mt-1 text-[11px] text-muted-foreground leading-relaxed">Add VITE_MAPBOX_ACCESS_TOKEN to .env.local to switch this fallback into the real Mapbox map.</p>
            </div>
          ) : null}
        </div>

        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-black/35 via-black/5 to-transparent p-4 pb-5">
          <div className="pointer-events-auto rounded-2xl bg-card/92 border border-white/50 p-3 shadow-elevated backdrop-blur-xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[15px] font-extrabold text-navy">Live Regional Intelligence</p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">Regions are mile-radius outbreak ranges. Zoom in for 3D.</p>
              </div>
              <span className="shrink-0 rounded-full bg-danger/10 px-2.5 py-1 text-[11px] font-bold text-danger">{filtered.length} live</span>
            </div>

            <div className="mt-2 grid grid-cols-3 gap-2 text-[10px] text-muted-foreground">
              <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[oklch(0.62_0.22_25)]"/>High</div>
              <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[oklch(0.78_0.16_75)]"/>Moderate</div>
              <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[oklch(0.62_0.13_155)]"/>Low</div>
            </div>

            <div className="mt-2 flex gap-2 overflow-x-auto pb-1 no-scrollbar">
              {illnesses.slice(0, 3).map((item, index) => (
                <div key={item.illness} className="min-w-[122px] rounded-xl bg-surface border border-border p-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="w-6 h-6 rounded-lg bg-navy text-white grid place-items-center text-[10px] font-extrabold">{index + 1}</span>
                    <span className="text-[10px] font-bold text-danger">Rank {item.rank}</span>
                  </div>
                  <p className="mt-2 text-[12px] font-bold text-navy capitalize truncate">{item.illness.replace("-", " ")}</p>
                  <p className="text-[10px] text-muted-foreground">{item.count} report{item.count === 1 ? "" : "s"}</p>
                </div>
              ))}
            </div>

            <div className="mt-2 max-h-20 space-y-2 overflow-y-auto pr-1">
              {filtered.slice(0, 2).map((signal) => (
                <CompactSignalRow key={signal.id} signal={signal} />
              ))}
              {filtered.length > 2 ? (
                <p className="text-center text-[10px] font-semibold text-muted-foreground">Scroll map or change filter to inspect more live regions</p>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      <p className="px-5 mt-4 text-[10px] text-center text-muted-foreground">
        Resource pins are representative examples for demonstration. Doctor-reviewed resolved cases are removed from this live map.
      </p>
    </AppShell>
  );
}

function CompactSignalRow({ signal }: { signal: CommunitySignal }) {
  const tone = signal.severity === "high" ? "text-danger" : signal.severity === "moderate" ? "text-warning" : "text-success";
  return (
    <div className="flex items-center gap-2 rounded-xl bg-white border border-border px-3 py-2">
      <span className="w-7 h-7 rounded-lg bg-surface-2 grid place-items-center" style={{ color: colorFor(signal) }}>{iconFor(signal.type)}</span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[12px] font-bold text-navy">{signal.title}</p>
        <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[10px] font-bold uppercase tracking-wider">
          <span className="text-muted-foreground">ZIP {signal.zip}</span>
          <span className="text-muted-foreground">{formatCaseDate(signal.createdAt)}</span>
          <span className={tone}>{signal.severity}</span>
          <span className="text-danger">Rank {signal.rank}</span>
        </div>
      </div>
    </div>
  );
}

function FallbackRegionMap({ signals }: { signals: CommunitySignal[] }) {
  return (
    <svg viewBox="0 0 100 70" className="w-full h-full">
      <defs>
        {signals.filter((s) => s.type !== "clinic" && s.type !== "healthy-report").map((s) => (
          <radialGradient key={`g-${s.id}`} id={`g-${s.id}`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={colorFor(s)} stopOpacity="0.5"/>
            <stop offset="100%" stopColor={colorFor(s)} stopOpacity="0"/>
          </radialGradient>
        ))}
      </defs>
      {Array.from({length: 11}).map((_, i) => (
        <line key={`v${i}`} x1={i * 10} y1="0" x2={i * 10} y2="70" stroke="white" strokeOpacity="0.05"/>
      ))}
      {Array.from({length: 8}).map((_, i) => (
        <line key={`h${i}`} x1="0" y1={i * 10} x2="100" y2={i * 10} stroke="white" strokeOpacity="0.05"/>
      ))}
      {signals.filter((s) => s.type !== "clinic" && s.type !== "healthy-report").map((s) => (
        <circle key={`h-${s.id}`} cx={s.x} cy={s.y} r="14" fill={`url(#g-${s.id})`} />
      ))}
      {signals.map((s) => (
        <g key={s.id}>
          <circle cx={s.x} cy={s.y} r="2.1" fill={colorFor(s)} />
          <circle cx={s.x} cy={s.y} r="3.4" fill="none" stroke={colorFor(s)} strokeOpacity="0.6" strokeWidth="0.35"/>
          <text x={s.x + 3} y={s.y - 2} fontSize="2.1" fill="white" fontWeight="800">{s.rank}</text>
        </g>
      ))}
    </svg>
  );
}

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

function formatCaseDate(value: string) {
  return new Date(value).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
  });
}
