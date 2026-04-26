import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell, StatusPill, TopBar } from "@/components/AppShell";
import { useStore, computeRisk } from "@/lib/store";
import { AlertTriangle, Award, ChevronRight, Cloud, Droplets, Flame, Gift, Heart, Hospital, Phone, ShieldCheck, Sparkles, Thermometer } from "lucide-react";

type InsightsSearch = { id?: string };

export const Route = createFileRoute("/insights")({
  validateSearch: (s: Record<string, unknown>): InsightsSearch => ({
    id: typeof s.id === "string" ? s.id : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Insight - Bloomy" },
      { name: "description", content: "Personalized AI-assisted triage and community insights." },
    ],
  }),
  component: Insights,
});

const RISK_META = {
  low: { label: "Low", grad: "bg-gradient-success", chip: "bg-success/15 text-success border-success/30" },
  moderate: { label: "Moderate", grad: "bg-gradient-warning", chip: "bg-warning/15 text-warning border-warning/40" },
  high: { label: "High", grad: "bg-gradient-warning", chip: "bg-danger/15 text-danger border-danger/40" },
} as const;

function Insights() {
  const { id } = Route.useSearch();
  const checkIn = useStore((s) => (id ? s.checkIns.find((c) => c.id === id) : s.checkIns[0]));
  const streak = useStore((s) => s.streak);
  const points = useStore((s) => s.points);
  const signals = useStore((s) => s.signals);
  const zip = checkIn?.zip ?? "85719";

  // Healthy path → community baseline value
  if (!checkIn || checkIn.feeling === "healthy") {
    return <HealthyView zip={zip} streak={streak} points={points} signals={signals} />;
  }

  const r = computeRisk({
    feeling: checkIn.feeling,
    symptoms: checkIn.symptoms,
    vitals: checkIn.vitals,
    zip: checkIn.zip,
  });
  const meta = RISK_META[r.level];

  return (
    <AppShell>
      <TopBar title="Insight" back="/checkin" pill={<StatusPill tone="warn">AI-Assisted Triage</StatusPill>} />

      <section className="px-5 pt-3">
        <div className={`rounded-3xl ${meta.grad} text-white p-5 shadow-elevated`}>
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-widest opacity-80">Risk Level</span>
            <span className="text-[10px] font-bold uppercase tracking-widest opacity-80">Score {r.score}</span>
          </div>
          <h1 className="mt-2 text-4xl font-extrabold tracking-tight">{meta.label} risk signal</h1>
          <p className="mt-2 text-sm opacity-90 leading-relaxed">
            {r.level === "high"
              ? "Your combined symptom + wearable signals match an active local pattern. Consider a clinician check-in soon."
              : "Your symptoms align with mild patterns currently observed in your area. Monitor and rest."}
          </p>
          <div className="mt-4 flex gap-2">
            <Link to="/map" className="flex-1 text-center rounded-xl bg-white/15 backdrop-blur py-2.5 text-[13px] font-semibold">View map</Link>
            <a href="#" className="flex-1 text-center rounded-xl bg-white text-navy py-2.5 text-[13px] font-semibold">Talk to clinician</a>
          </div>
        </div>
      </section>

      <section className="px-5 mt-5">
        <p className="text-[15px] font-bold text-navy">Why this score</p>
        <ul className="mt-2 space-y-2">
          {r.factors.map((f) => (
            <li key={f} className="flex items-start gap-2 text-[13px] text-navy">
              <span className="w-1.5 h-1.5 rounded-full bg-teal mt-1.5" /> {f}
            </li>
          ))}
        </ul>
      </section>

      <section className="px-5 mt-6">
        <p className="text-[15px] font-bold text-navy">Recommended actions</p>
        <div className="mt-2 space-y-2">
          <ActionRow icon={<Heart className="w-4 h-4" />} title="Hydrate & rest 24h" body="Reduce activity until vitals normalize." />
          <ActionRow icon={<Thermometer className="w-4 h-4" />} title="Re-check tomorrow" body="One more daily signal improves accuracy." />
          {r.level !== "low" && <ActionRow icon={<Phone className="w-4 h-4" />} title="CarePoint Telehealth available" body="Consultation under 15 min — covered for ZIP 85719." />}
        </div>
      </section>

      <section className="px-5 mt-6">
        <p className="text-[15px] font-bold text-navy">Nearby resources</p>
        <div className="mt-2 space-y-2">
          <Resource name="ValleyMed Clinic" detail="0.8 mi · open until 9pm" />
          <Resource name="HealthBridge Pharmacy" detail="OTC + at-home test kits" />
          <Resource name="DesertCare Response" detail="Mobile triage van — Tue/Thu" />
        </div>
      </section>

      <section className="px-5 mt-6 rounded-2xl bg-surface border border-border p-4">
        <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Disclaimer</p>
        <p className="mt-1 text-[12px] text-muted-foreground leading-relaxed">
          Bloomy provides AI-assisted triage based on community signals - this is a possible signal, not a diagnosis. Always consult a licensed clinician.
        </p>
      </section>
    </AppShell>
  );
}

function HealthyView({ zip, streak, points, signals }: { zip: string; streak: number; points: number; signals: ReturnType<typeof useStore<any>> }) {
  const local = (signals as any[]).filter((s) => s.zip === zip || s.severity !== "low");
  return (
    <AppShell>
      <TopBar title="Insight" back="/" pill={<StatusPill tone="ok">Healthy Baseline</StatusPill>} />

      <section className="px-5 pt-3">
        <div className="rounded-3xl bg-gradient-dark-card text-white p-6 shadow-elevated">
          <div className="w-11 h-11 rounded-full bg-success/30 grid place-items-center">
            <ShieldCheck className="w-5 h-5 text-success" />
          </div>
          <h1 className="mt-4 text-[34px] leading-[1.05] font-extrabold tracking-tight">
            Thanks —<br/>your healthy<br/>report matters.
          </h1>
          <p className="mt-3 text-sm opacity-80 leading-relaxed">
            Healthy check-ins help us distinguish normal community patterns from outbreak signals.
          </p>

          <div className="mt-5 grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-white/10 backdrop-blur p-3">
              <div className="flex items-center gap-2 text-[10px] uppercase font-bold tracking-wider opacity-80"><Flame className="w-3 h-3" /> Streak</div>
              <p className="mt-1 text-xl font-extrabold">{streak}-Day</p>
              <p className="text-[10px] opacity-70">Consistent reporter</p>
            </div>
            <div className="rounded-2xl bg-white/10 backdrop-blur p-3">
              <div className="flex items-center gap-2 text-[10px] uppercase font-bold tracking-wider opacity-80"><Sparkles className="w-3 h-3" /> Impact</div>
              <p className="mt-1 text-xl font-extrabold">{points} pts</p>
              <p className="text-[10px] opacity-70">Improved community vigor</p>
            </div>
          </div>
        </div>
      </section>

      <section className="px-5 mt-6">
        <div className="flex items-center justify-between">
          <p className="text-[16px] font-bold text-navy">Your area health radar</p>
          <span className="text-[10px] uppercase tracking-wider font-bold text-danger">Live</span>
        </div>

        <div className="mt-3 space-y-2.5">
          <RadarRow icon={<Droplets className="w-4 h-4 text-teal" />} kicker="Local Trend" tone="text-danger" badge="+18%" title="Flu-like symptoms up near your ZIP" body={`Compared to the 7-day historical average in your immediate area (${zip}).`} />
          <RadarRow icon={<Cloud className="w-4 h-4 text-teal" />} kicker="Environmental" tone="text-warning" badge="Elevated" title="Mosquito risk after rainfall" body="Standing water detected in nearby parks." />
          <RadarRow icon={<Flame className="w-4 h-4 text-warning" />} kicker="Heat Watch" tone="text-warning" badge="Rising" title="Heat-related symptoms increasing near campus" body="Hydration warnings active for the next 48h." />
        </div>
      </section>

      <section className="px-5 mt-6">
        <p className="text-[16px] font-bold text-navy">What to watch for this week</p>
        <ul className="mt-2 space-y-1.5 text-[13px] text-navy">
          <li className="flex items-start gap-2"><span className="w-1.5 h-1.5 rounded-full bg-warning mt-1.5"/> Sudden onset fatigue — early indicator of circulating strain</li>
          <li className="flex items-start gap-2"><span className="w-1.5 h-1.5 rounded-full bg-danger mt-1.5"/> Persistent dry cough — atypical respiratory pattern in your area</li>
        </ul>
      </section>

      <section className="px-5 mt-6">
        <div className="rounded-2xl bg-gradient-warning text-white p-4 shadow-elevated">
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider opacity-90">
            <Gift className="w-3 h-3"/> HealthBridge Partner Reward
          </div>
          <p className="mt-2 text-[15px] font-bold leading-snug">
            Thanks to your {streak}-day reporting streak, you've earned 20% off wellness items at your local HealthBridge.
          </p>
          <button className="mt-3 w-full rounded-xl bg-white text-navy py-2.5 text-sm font-semibold">Claim Reward</button>
        </div>
        <p className="mt-2 text-[10px] text-center text-muted-foreground">Representative partner for demonstration purposes.</p>
      </section>

      <section className="px-5 mt-6">
        <Link to="/checkin" className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-navy text-white py-4 font-semibold">
          Log tomorrow's check-in <ChevronRight className="w-4 h-4" />
        </Link>
      </section>
    </AppShell>
  );
}

function ActionRow({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="rounded-xl bg-card border border-border p-3 flex items-start gap-3">
      <span className="w-8 h-8 rounded-lg bg-teal/10 text-teal grid place-items-center">{icon}</span>
      <div className="flex-1">
        <p className="text-[13px] font-semibold text-navy">{title}</p>
        <p className="text-[12px] text-muted-foreground">{body}</p>
      </div>
    </div>
  );
}

function Resource({ name, detail }: { name: string; detail: string }) {
  return (
    <div className="rounded-xl bg-card border border-border p-3 flex items-center gap-3">
      <span className="w-8 h-8 rounded-lg bg-success/10 text-success grid place-items-center"><Hospital className="w-4 h-4"/></span>
      <div className="flex-1">
        <p className="text-[13px] font-semibold text-navy">{name}</p>
        <p className="text-[11px] text-muted-foreground">{detail}</p>
      </div>
      <ChevronRight className="w-4 h-4 text-muted-foreground"/>
    </div>
  );
}

function RadarRow({ icon, kicker, tone, badge, title, body }: { icon: React.ReactNode; kicker: string; tone: string; badge: string; title: string; body: string }) {
  return (
    <div className="rounded-2xl bg-card border border-border p-4 shadow-soft">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{icon}{kicker}</span>
        <span className={`text-[11px] font-extrabold ${tone}`}>{badge}</span>
      </div>
      <p className="mt-1.5 text-[14px] font-bold text-navy">{title}</p>
      <p className="text-[12px] text-muted-foreground mt-0.5 leading-relaxed">{body}</p>
    </div>
  );
}
