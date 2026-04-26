import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell, StatusPill, TopBar } from "@/components/AppShell";
import { useStore } from "@/lib/store";
import { Activity, Bell, Check, ChevronRight, X, AlertTriangle, TrendingUp } from "lucide-react";
import { useState } from "react";
import { LineChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { toast } from "sonner";

export const Route = createFileRoute("/doctor")({
  head: () => ({
    meta: [
      { title: "Doctor Dashboard — OutbreakIQ" },
      { name: "description", content: "Validate community alerts with one tap." },
    ],
  }),
  component: Doctor,
});

const trend = Array.from({ length: 14 }).map((_, i) => ({
  day: `D${i + 1}`,
  symptoms: 12 + Math.round(Math.sin(i / 2) * 8 + i * 2.2),
  baseline: 18,
}));

function Doctor() {
  const signals = useStore((s) => s.signals);
  const [decisions, setDecisions] = useState<Record<string, "confirm" | "review" | "dismiss">>({});

  const decide = (id: string, d: "confirm" | "review" | "dismiss") => {
    setDecisions((p) => ({ ...p, [id]: d }));
    toast.success(`Marked as ${d}`);
  };

  const clusters = signals.filter((s) => s.type === "symptom-cluster" || s.type === "animal");

  return (
    <AppShell>
      <TopBar title="Clinical Intel" back="/" pill={<StatusPill tone="live">Verified MD</StatusPill>} right={
        <button className="w-9 h-9 rounded-full grid place-items-center bg-muted relative">
          <Bell className="w-4 h-4"/>
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-danger"/>
        </button>
      }/>

      <section className="px-5 pt-2">
        <h1 className="text-3xl font-extrabold tracking-tight text-navy">Surveillance</h1>
        <p className="text-[13px] text-muted-foreground mt-1">Regional demographic health monitoring and predictive insights.</p>
      </section>

      <section className="px-5 mt-5">
        <div className="rounded-2xl bg-card border border-border p-4 shadow-soft">
          <div className="flex items-center justify-between">
            <p className="text-[13px] font-bold text-navy flex items-center gap-1.5"><Activity className="w-4 h-4 text-teal"/> Wearable Abnormality Trends</p>
            <span className="text-[11px] font-bold text-success flex items-center gap-1"><TrendingUp className="w-3 h-3"/> +14%</span>
          </div>
          <div className="h-32 mt-2">
            <ResponsiveContainer>
              <LineChart data={trend} margin={{ left: 0, right: 0, top: 8, bottom: 0 }}>
                <XAxis dataKey="day" hide/>
                <YAxis hide/>
                <Tooltip cursor={{ stroke: "oklch(0.62 0.11 195)", strokeOpacity: 0.2 }} contentStyle={{ borderRadius: 12, border: "1px solid var(--border)", fontSize: 11 }}/>
                <Line type="monotone" dataKey="baseline" stroke="oklch(0.7 0.02 240)" strokeWidth={1.5} strokeDasharray="3 3" dot={false}/>
                <Line type="monotone" dataKey="symptoms" stroke="oklch(0.62 0.11 195)" strokeWidth={2.5} dot={false}/>
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      <section className="px-5 mt-4">
        <div className="rounded-2xl bg-gradient-dark-card text-white p-5 shadow-elevated">
          <p className="text-[10px] font-bold uppercase tracking-wider opacity-80">48h Demand Forecast</p>
          <p className="mt-1 text-4xl font-extrabold">High</p>
          <p className="mt-1 text-[12px] opacity-80 leading-relaxed">Likely clinic demand based on current symptom clusters and historical data.</p>
          <p className="mt-2 text-[10px] uppercase tracking-wider opacity-60">Confidence Level <span className="text-success">92% Â· Wide</span></p>
        </div>
      </section>

      <section className="px-5 mt-5">
        <p className="text-[15px] font-bold text-navy">Active Intelligence Clusters</p>
        <div className="mt-3 space-y-3">
          {clusters.map((c) => {
            const d = decisions[c.id];
            return (
              <div key={c.id} className="rounded-2xl bg-card border border-border p-4 shadow-soft">
                <div className="flex items-start gap-3">
                  <span className="w-9 h-9 rounded-lg bg-danger/10 text-danger grid place-items-center"><AlertTriangle className="w-4 h-4"/></span>
                  <div className="flex-1">
                    <p className="text-[14px] font-bold text-navy">{c.title}</p>
                    <p className="text-[12px] text-muted-foreground mt-0.5 leading-relaxed">{c.detail}</p>
                  </div>
                </div>
                {d ? (
                  <div className={`mt-3 text-center text-[12px] font-semibold py-2 rounded-lg ${d === "confirm" ? "bg-success/10 text-success" : d === "review" ? "bg-warning/15 text-warning" : "bg-muted text-muted-foreground"}`}>
                    {d === "confirm" ? "Confirmed — escalated to public health" : d === "review" ? "Marked for review" : "Dismissed"}
                  </div>
                ) : (
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    <button onClick={()=>decide(c.id, "confirm")} className="rounded-lg bg-success/10 text-success py-2 text-[12px] font-bold flex items-center justify-center gap-1"><Check className="w-3 h-3"/> Confirm</button>
                    <button onClick={()=>decide(c.id, "review")} className="rounded-lg bg-warning/15 text-warning py-2 text-[12px] font-bold">Needs Review</button>
                    <button onClick={()=>decide(c.id, "dismiss")} className="rounded-lg bg-muted text-muted-foreground py-2 text-[12px] font-bold flex items-center justify-center gap-1"><X className="w-3 h-3"/> Dismiss</button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <section className="px-5 mt-5">
        <p className="text-[15px] font-bold text-navy">Recommended Actions</p>
        <div className="mt-3 space-y-2">
          <div className="rounded-2xl bg-card border border-border p-4 shadow-soft">
            <p className="text-[13px] font-bold text-navy">Prepare Flu/COVID testing resources</p>
            <p className="text-[12px] text-muted-foreground mt-1">Based on the respiratory cluster in 85719, ensure adequate rapid test stock for walk-ins.</p>
            <button className="mt-3 rounded-lg bg-teal text-white px-3 py-2 text-[12px] font-semibold">Notify Inventory Team</button>
          </div>
          <div className="rounded-2xl bg-warning/10 border border-warning/30 p-4">
            <p className="text-[13px] font-bold text-warning flex items-center gap-1"><AlertTriangle className="w-4 h-4"/> Heat illness risk elevated</p>
            <p className="text-[12px] text-navy mt-1">Local temperatures exceeding 105°F. Elderly demographic alerts have increased by 31% in the last 8 hours.</p>
          </div>
        </div>
        <Link to="/public-health" className="mt-4 w-full inline-flex items-center justify-between rounded-2xl bg-card border border-border p-4">
          <span className="text-[13px] font-bold text-navy">View public health dashboard</span>
          <ChevronRight className="w-4 h-4"/>
        </Link>
      </section>
    </AppShell>
  );
}
