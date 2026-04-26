import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell, StatusPill, TopBar } from "@/components/AppShell";
import { useStore } from "@/lib/store";
import { Bug, ChevronRight, Cloud, Gift, Heart, Microscope, ShieldCheck, Stethoscope, Watch } from "lucide-react";
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts";

export const Route = createFileRoute("/public-health")({
  head: () => ({
    meta: [
      { title: "Public Health - Bloomy" },
      { name: "description", content: "Explainable risk scores by area, with model card and oversight." },
    ],
  }),
  component: PublicHealth,
});

const ZIP_RISK = [
  { zip: "85719", score: 78, label: "High" },
  { zip: "85705", score: 54, label: "Moderate" },
  { zip: "85721", score: 49, label: "Moderate" },
  { zip: "85629", score: 41, label: "Moderate" },
  { zip: "85641", score: 28, label: "Low" },
];

const SOURCES = [
  { icon: Heart, label: "Human reports", weight: 28, color: "oklch(0.62 0.22 25)" },
  { icon: ShieldCheck, label: "Healthy reports", weight: 18, color: "oklch(0.62 0.13 155)" },
  { icon: Watch, label: "Wearable trends", weight: 22, color: "oklch(0.62 0.11 195)" },
  { icon: Bug, label: "Animal incidents", weight: 14, color: "oklch(0.78 0.16 75)" },
  { icon: Cloud, label: "Weather / mosquito", weight: 10, color: "oklch(0.55 0.13 175)" },
  { icon: Stethoscope, label: "Reviewer validation", weight: 8, color: "oklch(0.32 0.09 220)" },
];

function PublicHealth() {
  const signals = useStore((s) => s.signals);

  return (
    <AppShell>
      <TopBar title="Public Health" back="/doctor" pill={<StatusPill tone="live">Region: Pima County</StatusPill>}/>

      <section className="px-5 pt-2">
        <h1 className="text-3xl font-extrabold tracking-tight text-navy">Health Intelligence</h1>
        <p className="text-[13px] text-muted-foreground mt-1">Explainable risk by ZIP — with full source breakdown and model oversight.</p>
      </section>

      <section className="px-5 mt-5">
        <p className="text-[15px] font-bold text-navy">Risk score by area</p>
        <div className="mt-3 rounded-2xl bg-card border border-border p-3 shadow-soft">
          <div className="h-44">
            <ResponsiveContainer>
              <BarChart data={ZIP_RISK} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
                <XAxis dataKey="zip" tickLine={false} axisLine={false} fontSize={11}/>
                <YAxis hide domain={[0, 100]}/>
                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid var(--border)", fontSize: 11 }}/>
                <Bar dataKey="score" radius={[8,8,0,0]} fill="oklch(0.55 0.12 195)"/>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      <section className="px-5 mt-5">
        <p className="text-[15px] font-bold text-navy">Why this score (explainability)</p>
        <div className="mt-3 space-y-2">
          {SOURCES.map((s) => (
            <div key={s.label} className="rounded-xl bg-card border border-border p-3 flex items-center gap-3">
              <span className="w-8 h-8 rounded-lg grid place-items-center" style={{ backgroundColor: `color-mix(in oklab, ${s.color} 14%, transparent)`, color: s.color }}>
                <s.icon className="w-4 h-4"/>
              </span>
              <div className="flex-1">
                <p className="text-[13px] font-semibold text-navy">{s.label}</p>
                <div className="mt-1.5 h-1.5 rounded-full bg-muted overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${s.weight * 3}%`, backgroundColor: s.color }}/>
                </div>
              </div>
              <span className="text-[12px] font-bold text-navy">{s.weight}%</span>
            </div>
          ))}
        </div>
      </section>

      <section className="px-5 mt-5">
        <p className="text-[15px] font-bold text-navy">Model Card</p>
        <div className="mt-3 rounded-2xl bg-gradient-dark-card text-white p-5 shadow-elevated space-y-3">
          <ModelRow k="Purpose" v="Detect early community outbreak signals using multi-source participatory data."/>
          <ModelRow k="Inputs" v="Symptom reports, healthy check-ins, wearable vitals, animal incidents, environmental incidents, weather, and reviewer validation."/>
          <ModelRow k="Limitations" v="Not a diagnosis; ZIP-level granularity; relies on opt-in reporting."/>
          <ModelRow k="Bias & Privacy" v="Anonymous reports, ZIP-only location, opt-in wearable data, farmer-controlled sharing."/>
          <ModelRow k="Human Oversight" v="Alerts can be validated by clinical, veterinary, or environmental health reviewers before escalation."/>

          <div className="grid grid-cols-3 gap-2 pt-2 border-t border-white/10">
            <Metric label="Retention" v="74%"/>
            <Metric label="Detection lead" v="3.2 days"/>
            <Metric label="Cluster acc." v="88%"/>
          </div>
        </div>
      </section>

      <section className="px-5 mt-5">
        <div className="rounded-2xl border border-border bg-card p-4 shadow-soft">
          <div className="flex items-start gap-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-warning/10 text-warning">
              <Gift className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-bold text-navy">Participation incentives</p>
              <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">
                Rewards help keep healthy baselines, symptom reports, animal incidents, and environmental signals flowing into the model.
              </p>
            </div>
          </div>
          <Link to="/rewards" className="mt-3 flex items-center justify-between rounded-xl bg-surface px-3 py-2 text-[12px] font-bold text-navy">
            View incentive model
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      <section className="px-5 mt-5">
        <p className="text-[15px] font-bold text-navy">Recent escalations</p>
        <div className="mt-3 space-y-2">
          {signals.slice(0, 4).map((s) => (
            <div key={s.id} className="rounded-xl bg-card border border-border p-3 flex items-center gap-3">
              <Microscope className="w-4 h-4 text-teal shrink-0"/>
              <div className="flex-1">
                <p className="text-[13px] font-semibold text-navy">{s.title}</p>
                <p className="text-[11px] text-muted-foreground">{s.zip} · {s.ago}</p>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground"/>
            </div>
          ))}
        </div>
      </section>

      <p className="px-5 mt-6 text-[10px] text-center text-muted-foreground">
        WellSpring Community Health, DesertCare Response & VetLink Network are representative partners for demonstration only.
      </p>
    </AppShell>
  );
}

function ModelRow({ k, v }: { k: string; v: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider font-bold opacity-70">{k}</p>
      <p className="text-[12.5px] mt-0.5 leading-relaxed opacity-95">{v}</p>
    </div>
  );
}

function Metric({ label, v }: { label: string; v: string }) {
  return (
    <div>
      <p className="text-[9px] uppercase tracking-wider opacity-60 font-bold">{label}</p>
      <p className="mt-0.5 text-base font-extrabold">{v}</p>
    </div>
  );
}
