import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell, StatusPill, TopBar } from "@/components/AppShell";
import { activeSignals, store, useStore } from "@/lib/store";
import { formatRelativeTime } from "@/lib/utils";
import { rewardAudience } from "@/lib/rewards";
import { Activity, Bell, Check, ChevronRight, X, AlertTriangle, TrendingUp, ClipboardCheck, ShieldAlert, CalendarDays, Image as ImageIcon, Gift } from "lucide-react";
import { useMemo, useState } from "react";
import { LineChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { toast } from "sonner";

export const Route = createFileRoute("/doctor")({
  head: () => ({
    meta: [
      { title: "Review Hub - Bloomy" },
      { name: "description", content: "Validate community alerts with one tap." },
    ],
  }),
  component: ReviewHub,
});

const trend = Array.from({ length: 14 }).map((_, i) => ({
  day: `D${i + 1}`,
  symptoms: 12 + Math.round(Math.sin(i / 2) * 8 + i * 2.2),
  baseline: 18,
}));

type ReviewLane = "clinical" | "veterinary" | "environmental";

const REVIEW_LANES: { id: ReviewLane; label: string; role: string }[] = [
  { id: "clinical", label: "Clinical", role: "Clinical Reviewer" },
  { id: "veterinary", label: "Vet", role: "Veterinary Reviewer" },
  { id: "environmental", label: "Environment", role: "Environmental Health Officer" },
];

function ReviewHub() {
  const signals = useStore((s) => s.signals);
  const liveSignals = useMemo(() => activeSignals(signals), [signals]);
  const [reports, setReports] = useState<Record<string, string>>({});
  const [reviewLane, setReviewLane] = useState<ReviewLane>("clinical");
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  const clusters = liveSignals.filter((s) =>
    reviewLane === "veterinary"
      ? s.type === "animal"
      : reviewLane === "environmental"
        ? s.type === "environmental" || s.type === "mosquito" || s.type === "heat"
        : s.type === "symptom-cluster",
  );
  const highRisk = clusters.filter((s) => s.severity === "high").length;
  const activeLane = REVIEW_LANES.find((lane) => lane.id === reviewLane)!;
  const reviewerReward = rewardAudience("reviewer");
  const notifications = clusters
    .filter((signal) => signal.severity === "high" || signal.evidencePhoto || signal.voiceSummary)
    .slice(0, 4);

  const decide = (id: string, action: "monitor" | "resolved" | "dismissed", contagious: boolean) => {
    const summary = reports[id]?.trim() || defaultReport(action);
    store.doctorReviewSignal(id, { action, contagious, summary, reviewer: activeLane.role });
    toast.success(action === "monitor" ? "Case note saved" : "Case removed from live map");
  };

  return (
    <AppShell>
      <TopBar title="Bloomy" back="/" pill={<StatusPill tone="live">Review Hub</StatusPill>} right={
        <div className="relative">
          <button
            type="button"
            onClick={() => setNotificationsOpen((open) => !open)}
            className="w-9 h-9 rounded-full grid place-items-center bg-muted relative"
            aria-label="Notifications"
          >
            <Bell className="w-4 h-4"/>
            {notifications.length ? <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-danger"/> : null}
          </button>
          {notificationsOpen ? (
            <div className="absolute right-0 top-11 z-50 w-72 rounded-2xl border border-border bg-card p-3 shadow-elevated">
              <div className="flex items-center justify-between">
                <p className="text-[13px] font-bold text-navy">Notifications</p>
                <span className="rounded-full bg-danger/10 px-2 py-1 text-[10px] font-bold text-danger">{notifications.length}</span>
              </div>
              <div className="mt-2 space-y-2">
                {notifications.length ? notifications.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setReports((prev) => ({ ...prev, [item.id]: prev[item.id] ?? "" }));
                      setNotificationsOpen(false);
                    }}
                    className="w-full rounded-xl bg-surface p-2 text-left"
                  >
                    <p className="truncate text-[12px] font-bold text-navy">{item.title}</p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">{formatRelativeTime(item.createdAt)} · Rank {item.rank} · {item.severity} · ZIP {item.zip}</p>
                  </button>
                )) : (
                  <p className="rounded-xl bg-success/10 p-3 text-[12px] font-semibold text-success">No urgent notifications in this lane.</p>
                )}
              </div>
            </div>
          ) : null}
        </div>
      }/>

      <section className="px-5 pt-2">
        <h1 className="text-3xl font-extrabold tracking-tight text-navy">Review Hub</h1>
        <p className="text-[13px] text-muted-foreground mt-1">
          Select a review lane to see the right queue for clinical, veterinary, or environmental health follow-up.
        </p>
      </section>

      <section className="px-5 mt-4">
        <div className="grid grid-cols-3 gap-2 rounded-2xl bg-muted p-1">
          {REVIEW_LANES.map((option) => (
            <button
              key={option.id}
              onClick={() => setReviewLane(option.id)}
              className={`rounded-xl py-2.5 text-[12px] font-bold transition-colors ${
                reviewLane === option.id ? "bg-card text-navy shadow-soft" : "text-muted-foreground"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </section>

      <section className="px-5 mt-4">
        <div className="rounded-2xl border border-border bg-card p-4 shadow-soft">
          <div className="flex items-start gap-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-warning/10 text-warning">
              <Gift className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-bold text-navy">{reviewerReward.shortTitle}</p>
              <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">{reviewerReward.summary}</p>
            </div>
          </div>
          <Link to="/rewards" className="mt-3 flex items-center justify-between rounded-xl bg-surface px-3 py-2 text-[12px] font-bold text-navy">
            See reviewer benefits
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
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

      <section className="px-5 mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-gradient-dark-card text-white p-4 shadow-elevated">
          <p className="text-[10px] font-bold uppercase tracking-wider opacity-80">48h Demand Forecast</p>
          <p className="mt-1 text-3xl font-extrabold">{highRisk ? "High" : "Moderate"}</p>
          <p className="mt-1 text-[11px] opacity-80 leading-relaxed">Based on the selected {activeLane.role.toLowerCase()} queue.</p>
        </div>
        <div className="rounded-2xl bg-card border border-border p-4 shadow-soft">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Review Queue</p>
          <p className="mt-1 text-3xl font-extrabold text-navy">{clusters.length}</p>
          <p className="mt-1 text-[11px] text-muted-foreground">{highRisk} high-risk case{highRisk === 1 ? "" : "s"}</p>
        </div>
      </section>

      <section className="px-5 mt-5">
        <p className="text-[15px] font-bold text-navy">{activeLane.role} Case Review</p>
        <div className="mt-3 space-y-3">
          {clusters.length ? clusters.map((c) => (
            <div key={c.id} className="rounded-2xl bg-card border border-border p-4 shadow-soft">
              <div className="flex items-start gap-3">
                <span className={`w-9 h-9 rounded-lg grid place-items-center ${c.severity === "high" ? "bg-danger/10 text-danger" : "bg-warning/15 text-warning"}`}><AlertTriangle className="w-4 h-4"/></span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-[14px] font-bold text-navy">{c.title}</p>
                    <span className="shrink-0 rounded-full bg-danger/10 px-2 py-1 text-[10px] font-bold text-danger">Rank {c.rank}</span>
                  </div>
                  <p className="text-[12px] text-muted-foreground mt-0.5 leading-relaxed">{c.detail}</p>
                  <div className="mt-2 flex flex-wrap gap-2 text-[10px] font-bold uppercase tracking-wider">
                    <span className="rounded bg-muted px-1.5 py-0.5 text-navy">ZIP {c.zip}</span>
                    <span className="inline-flex items-center gap-1 rounded bg-teal/10 px-1.5 py-0.5 text-teal"><CalendarDays className="h-3 w-3" /> {formatRelativeTime(c.createdAt)}</span>
                    <span className="inline-flex items-center gap-1 rounded bg-muted px-1.5 py-0.5 text-navy"><CalendarDays className="h-3 w-3" /> {formatCaseDate(c.createdAt)}</span>
                    {c.affectedAnimals ? <span className="rounded bg-warning/10 px-1.5 py-0.5 text-warning">{c.affectedAnimals} affected</span> : null}
                    {c.vectorCount ? <span className="rounded bg-teal/10 px-1.5 py-0.5 text-teal">{c.vectorCount} vectors</span> : null}
                    <span className="text-teal">{c.illness.replace("-", " ")}</span>
                    <span className={c.severity === "high" ? "text-danger" : "text-warning"}>{c.severity}</span>
                  </div>
                </div>
              </div>

              {(c.evidencePhoto || c.photoAnalysis || c.voiceSummary) ? (
                <div className="mt-3 rounded-xl border border-border bg-surface p-3">
                  <p className="flex items-center gap-1.5 text-[12px] font-bold text-navy">
                    <ImageIcon className="h-3.5 w-3.5 text-teal" /> {c.type === "animal" ? "Vet case evidence" : "Incident evidence"}
                  </p>
                  {c.evidencePhoto?.previewUrl ? (
                    <img
                      src={c.evidencePhoto.previewUrl}
                      alt="Incident evidence"
                      className="mt-2 h-44 w-full rounded-lg object-cover"
                    />
                  ) : c.evidencePhoto ? (
                    <p className="mt-2 text-[12px] text-muted-foreground">{c.evidencePhoto.name} attached</p>
                  ) : null}
                  {c.photoAnalysis ? (
                    <div className="mt-2 rounded-lg bg-teal/5 p-2">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-teal">Gemma image analysis</p>
                      <p className="mt-1 text-[12px] leading-relaxed text-navy">{c.photoAnalysis}</p>
                    </div>
                  ) : null}
                  {c.voiceSummary ? (
                    <div className="mt-2 rounded-lg bg-warning/10 p-2">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-warning">Voice note summary</p>
                      <p className="mt-1 text-[12px] leading-relaxed text-navy">{c.voiceSummary}</p>
                    </div>
                  ) : null}
                </div>
              ) : null}

              <textarea
                value={reports[c.id] ?? ""}
                onChange={(e) => setReports((prev) => ({ ...prev, [c.id]: e.target.value }))}
                rows={3}
                placeholder="Write review note: risk assessment, follow-up plan, escalation details..."
                className="mt-3 w-full rounded-xl bg-surface border border-border p-3 text-[12px] focus:outline-none focus:border-teal"
              />

              {c.doctorReport ? (
                <div className="mt-3 rounded-xl bg-success/10 border border-success/20 p-3">
                  <p className="text-[12px] font-bold text-success flex items-center gap-1"><ClipboardCheck className="w-3.5 h-3.5"/> Latest review note</p>
                  <p className="mt-1 text-[12px] text-navy leading-relaxed">{c.doctorReport.summary}</p>
                </div>
              ) : null}

              <div className="mt-3 grid grid-cols-3 gap-2">
                <button onClick={() => decide(c.id, "monitor", true)} className="rounded-lg bg-warning/15 text-warning py-2 text-[12px] font-bold flex items-center justify-center gap-1"><ShieldAlert className="w-3 h-3"/> Monitor</button>
                <button onClick={() => decide(c.id, "resolved", false)} className="rounded-lg bg-success/10 text-success py-2 text-[12px] font-bold flex items-center justify-center gap-1"><Check className="w-3 h-3"/> Resolved</button>
                <button onClick={() => decide(c.id, "dismissed", false)} className="rounded-lg bg-muted text-muted-foreground py-2 text-[12px] font-bold flex items-center justify-center gap-1"><X className="w-3 h-3"/> Dismiss</button>
              </div>
            </div>
          )) : (
            <div className="rounded-2xl bg-success/10 border border-success/20 p-4">
              <p className="text-[13px] font-bold text-success">No active case reports</p>
            <p className="mt-1 text-[12px] text-navy">Resolved, dismissed, expired, or different-lane reports are not shown in this queue.</p>
            </div>
          )}
        </div>
      </section>

      <section className="px-5 mt-5">
        <p className="text-[15px] font-bold text-navy">Recommended Actions</p>
        <div className="mt-3 space-y-2">
          <div className="rounded-2xl bg-card border border-border p-4 shadow-soft">
            <p className="text-[13px] font-bold text-navy">{recommendedAction(reviewLane).title}</p>
            <p className="text-[12px] text-muted-foreground mt-1">{recommendedAction(reviewLane).body}</p>
            <button className="mt-3 rounded-lg bg-teal text-white px-3 py-2 text-[12px] font-semibold">Notify Inventory Team</button>
          </div>
          <div className="rounded-2xl bg-warning/10 border border-warning/30 p-4">
            <p className="text-[13px] font-bold text-warning flex items-center gap-1"><AlertTriangle className="w-4 h-4"/> Reports auto-expire</p>
            <p className="text-[12px] text-navy mt-1">High-risk cases stay live for 96h, moderate for 72h, and low for 36h unless a reviewer resolves or dismisses them sooner.</p>
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

function defaultReport(action: "monitor" | "resolved" | "dismissed") {
  if (action === "monitor") return "Case reviewed. Symptoms may be contagious; keep on live map for continued surveillance.";
  if (action === "resolved") return "Patient or region appears recovered and non-contagious. Removed from live outbreak map.";
  return "Reviewed as non-actionable or duplicate signal. Removed from live outbreak map.";
}

function recommendedAction(lane: ReviewLane) {
  if (lane === "veterinary") {
    return {
      title: "Coordinate veterinary follow-up",
      body: "Animal reports are routed separately for veterinary review and zoonotic monitoring.",
    };
  }
  if (lane === "environmental") {
    return {
      title: "Dispatch environmental health review",
      body: "Environmental Health Officers review water, flooding, and vector reports for exposure risk and local response.",
    };
  }
  return {
    title: "Prepare clinical follow-up",
    body: "Clinical reviewers see symptom signals and care-seeking patterns that may need health guidance or escalation.",
  };
}

function formatCaseDate(value: string) {
  return new Date(value).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
