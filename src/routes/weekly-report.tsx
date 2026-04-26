import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell, StatusPill, TopBar } from "@/components/AppShell";
import { useAppUser } from "@/hooks/use-app-user";
import { activeSignals, useStore } from "@/lib/store";
import { generateWeeklyReport, inferWeeklyAudience, WEEKLY_AUDIENCES, type WeeklyAudience, type WeeklyReport } from "@/lib/weekly-report";
import { AlertTriangle, CalendarDays, CheckCircle2, ChevronRight, FileText, Loader2, MapPin, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";

export const Route = createFileRoute("/weekly-report")({
  head: () => ({
    meta: [
      { title: "Weekly Report - Bloomy" },
      { name: "description", content: "Generate weekly local intelligence reports for community, farm, clinical, veterinary, and environmental needs." },
    ],
  }),
  component: WeeklyReportPage,
});

function WeeklyReportPage() {
  const { role, profile } = useAppUser();
  const signals = useStore((s) => s.signals);
  const checkIns = useStore((s) => s.checkIns);
  const zip = useStore((s) => s.zip);
  const defaultAudience = inferWeeklyAudience(role, profile?.reviewLane);
  const [audience, setAudience] = useState<WeeklyAudience>(defaultAudience);
  const [generating, setGenerating] = useState(false);
  const [report, setReport] = useState<WeeklyReport | null>(() =>
    generateWeeklyReport({ audience: defaultAudience, signals, checkIns, zip }),
  );
  const liveSignals = useMemo(() => activeSignals(signals), [signals]);

  const generate = () => {
    setGenerating(true);
    window.setTimeout(() => {
      setReport(generateWeeklyReport({ audience, signals, checkIns, zip }));
      setGenerating(false);
    }, 450);
  };

  return (
    <AppShell>
      <TopBar title="Weekly" back="/" pill={<StatusPill tone="live">Report</StatusPill>} />

      <section className="px-5 pt-4">
        <div className="rounded-3xl bg-gradient-dark-card p-5 text-white shadow-elevated">
          <div className="flex items-center justify-between">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-white/10">
              <FileText className="h-5 w-5" />
            </span>
            <span className="rounded-full bg-white/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white/75">
              {liveSignals.length} live signals
            </span>
          </div>
          <h1 className="mt-5 text-[32px] font-extrabold leading-[1.02] tracking-tight">
            Generate a weekly local intelligence report.
          </h1>
          <p className="mt-3 text-[13px] leading-relaxed text-white/75">
            Pick the audience and Bloomy turns community, animal, and environmental signals into practical next steps.
          </p>
          <button
            type="button"
            onClick={generate}
            disabled={generating}
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-white py-3.5 text-[13px] font-extrabold text-navy disabled:opacity-70"
          >
            {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {generating ? "Generating report..." : "Generate weekly report"}
          </button>
        </div>
      </section>

      <section className="px-5 mt-5">
        <p className="text-[15px] font-bold text-navy">Audience</p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {WEEKLY_AUDIENCES.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => {
                setAudience(option.id);
                setReport(generateWeeklyReport({ audience: option.id, signals, checkIns, zip }));
              }}
              className={`rounded-2xl border p-3 text-left transition-colors ${
                audience === option.id ? "border-teal bg-teal/10 text-navy" : "border-border bg-card text-muted-foreground"
              }`}
            >
              <span className="block text-[12px] font-extrabold">{option.label}</span>
              <span className="mt-1 block text-[10px] leading-relaxed">{option.description}</span>
            </button>
          ))}
        </div>
      </section>

      {report ? <ReportView report={report} /> : null}
    </AppShell>
  );
}

function ReportView({ report }: { report: WeeklyReport }) {
  const riskTone =
    report.riskLabel === "High"
      ? "bg-danger/15 text-danger border-danger/30"
      : report.riskLabel === "Moderate"
        ? "bg-warning/15 text-warning border-warning/30"
        : "bg-success/10 text-success border-success/20";

  return (
    <>
      <section className="px-5 mt-5">
        <div className="rounded-2xl border border-border bg-card p-4 shadow-soft">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[18px] font-extrabold leading-tight text-navy">{report.title}</p>
              <p className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-muted-foreground">
                <CalendarDays className="h-3.5 w-3.5" />
                {report.subtitle}
              </p>
            </div>
            <span className={`shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-bold ${riskTone}`}>
              {report.riskLabel}
            </span>
          </div>
          <p className="mt-3 text-[13px] leading-relaxed text-navy">{report.overview}</p>
        </div>
      </section>

      <section className="px-5 mt-4 grid grid-cols-2 gap-3">
        {report.metrics.map((metric) => (
          <Metric key={metric.label} {...metric} />
        ))}
      </section>

      <Section title="Key signals" icon={<AlertTriangle className="h-4 w-4" />}>
        {report.highlights.map((item) => (
          <li key={item} className="rounded-xl bg-surface p-3 text-[12px] leading-relaxed text-navy">
            {item}
          </li>
        ))}
      </Section>

      <Section title="Recommended actions" icon={<CheckCircle2 className="h-4 w-4" />}>
        {report.actions.map((item) => (
          <li key={item} className="flex gap-2 rounded-xl bg-card p-3 text-[12px] leading-relaxed text-navy">
            <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success" />
            {item}
          </li>
        ))}
      </Section>

      <Section title="Watchlist" icon={<MapPin className="h-4 w-4" />}>
        {report.watchlist.map((item) => (
          <li key={item} className="rounded-xl bg-warning/10 p-3 text-[12px] font-semibold leading-relaxed text-navy">
            {item}
          </li>
        ))}
      </Section>

      <section className="px-5 mt-5">
        <Link to="/map" className="flex items-center justify-between rounded-2xl border border-border bg-card p-4 text-[13px] font-bold text-navy shadow-soft">
          Open the live map behind this report
          <ChevronRight className="h-4 w-4" />
        </Link>
      </section>
    </>
  );
}

function Metric({ label, value, tone }: { label: string; value: string; tone: "ok" | "warn" | "danger" | "neutral" }) {
  const color = {
    ok: "text-success",
    warn: "text-warning",
    danger: "text-danger",
    neutral: "text-navy",
  }[tone];

  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-soft">
      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={`mt-1 text-3xl font-extrabold ${color}`}>{value}</p>
    </div>
  );
}

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="px-5 mt-5">
      <p className="flex items-center gap-1.5 text-[15px] font-bold text-navy">
        <span className="text-teal">{icon}</span>
        {title}
      </p>
      <ul className="mt-3 space-y-2">{children}</ul>
    </section>
  );
}
