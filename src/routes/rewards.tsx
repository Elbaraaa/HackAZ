import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell, StatusPill, TopBar } from "@/components/AppShell";
import { REWARD_AUDIENCES, REWARD_MILESTONES, rewardProgress, type RewardAudience, type RewardAudienceId } from "@/lib/rewards";
import { useStore } from "@/lib/store";
import { Activity, Award, BadgeCheck, ChevronRight, Droplets, Gift, Heart, ShieldCheck, Stethoscope } from "lucide-react";

export const Route = createFileRoute("/rewards")({
  head: () => ({
    meta: [
      { title: "Rewards - Bloomy" },
      { name: "description", content: "Benefits for people who help Bloomy keep the community healthier." },
    ],
  }),
  component: Rewards,
});

const iconByAudience: Record<RewardAudienceId, React.ReactNode> = {
  healthy: <Heart className="h-4 w-4" />,
  symptom: <ShieldCheck className="h-4 w-4" />,
  farmer: <Activity className="h-4 w-4" />,
  reviewer: <Stethoscope className="h-4 w-4" />,
  environmental: <Droplets className="h-4 w-4" />,
};

function Rewards() {
  const points = useStore((s) => s.points);
  const streak = useStore((s) => s.streak);
  const rewards = rewardProgress(points);
  const progress = Math.round(rewards.progress);

  return (
    <AppShell>
      <TopBar title="Bloomy" back="/" pill={<StatusPill tone="ok">Rewards</StatusPill>} />

      <section className="px-5 pt-3">
        <div className="rounded-3xl bg-gradient-dark-card p-5 text-white shadow-elevated">
          <div className="flex items-center justify-between">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-white/12 text-warning">
              <Gift className="h-5 w-5" />
            </span>
            <span className="rounded-full bg-white/12 px-3 py-1 text-[10px] font-bold uppercase tracking-wider">
              Community benefits
            </span>
          </div>
          <h1 className="mt-4 text-[32px] font-extrabold leading-[1.05] tracking-tight">
            Rewards for helping the community stay ahead.
          </h1>
          <p className="mt-3 text-[13px] leading-relaxed text-white/78">
            Bloomy gives each person a useful reason to participate: wellness discounts, care support, farm protection, or faster expert triage.
          </p>

          <div className="mt-5 grid grid-cols-2 gap-3">
            <Metric icon={<Award className="h-3.5 w-3.5" />} label="Impact points" value={String(points)} />
            <Metric icon={<BadgeCheck className="h-3.5 w-3.5" />} label="Check-in streak" value={`${streak} days`} />
          </div>

          <div className="mt-4">
            <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-white/65">
              <span>{rewards.next ? `Next: ${rewards.next.title}` : "All demo rewards unlocked"}</span>
              <span>{progress}%</span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/12">
              <div className="h-full rounded-full bg-warning" style={{ width: `${progress}%` }} />
            </div>
            {rewards.next ? (
              <p className="mt-2 text-[11px] font-semibold text-white/72">
                {rewards.pointsToNext} points until {rewards.next.incentive.toLowerCase()}.
              </p>
            ) : null}
          </div>
        </div>
      </section>

      <section className="px-5 mt-5">
        <div className="rounded-2xl border border-border bg-card p-4 shadow-soft">
          <div className="flex items-center justify-between">
            <p className="text-[15px] font-bold text-navy">Progress map</p>
            <span className="rounded-full bg-teal/10 px-2 py-1 text-[10px] font-bold text-teal">{points} pts</span>
          </div>
          <div className="mt-4 space-y-3">
            {REWARD_MILESTONES.map((milestone) => (
              <MilestoneRow key={milestone.points} milestone={milestone} points={points} />
            ))}
          </div>
        </div>
      </section>

      <section className="px-5 mt-5">
        <p className="text-[15px] font-bold text-navy">Next incentives</p>
        <div className="mt-3 grid grid-cols-1 gap-2">
          {(rewards.upcoming.length ? rewards.upcoming : REWARD_MILESTONES.slice(-2)).map((milestone) => (
            <div key={`next-${milestone.points}`} className="rounded-2xl border border-border bg-card p-4 shadow-soft">
              <div className="flex items-start gap-3">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-warning/10 text-warning">
                  {iconByAudience[milestone.audience]}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-bold text-navy">{milestone.title}</p>
                  <p className="mt-0.5 text-[12px] leading-relaxed text-muted-foreground">{milestone.incentive}</p>
                  <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-teal">{milestone.partner}</p>
                </div>
                <span className="shrink-0 rounded-full bg-surface px-2 py-1 text-[10px] font-bold text-navy">{milestone.points} pts</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="px-5 mt-5">
        <p className="text-[15px] font-bold text-navy">Benefit paths</p>
        <div className="mt-3 space-y-3">
          {REWARD_AUDIENCES.map((audience) => (
            <RewardPath key={audience.id} audience={audience} />
          ))}
        </div>
      </section>

      <section className="px-5 mt-5">
        <div className="rounded-2xl border border-teal/20 bg-teal/5 p-4">
          <p className="text-[13px] font-bold text-navy">Partner model</p>
          <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">
            Partner examples are placeholders for the demo. The real model would connect offers from pharmacies, gyms, clinics, veterinarians, and environmental partners to verified participation.
          </p>
        </div>
      </section>
    </AppShell>
  );
}

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white/10 p-3 backdrop-blur">
      <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-white/70">
        {icon}
        {label}
      </div>
      <p className="mt-1 text-xl font-extrabold">{value}</p>
    </div>
  );
}

function MilestoneRow({ milestone, points }: { milestone: typeof REWARD_MILESTONES[number]; points: number }) {
  const unlocked = points >= milestone.points;
  const next = !unlocked && milestone === REWARD_MILESTONES.find((item) => item.points > points);

  return (
    <div className="relative flex items-start gap-3">
      <span className={`mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full border-2 ${
        unlocked ? "border-teal bg-teal text-white" : next ? "border-warning bg-warning/10 text-warning" : "border-border bg-surface text-muted-foreground"
      }`}>
        {iconByAudience[milestone.audience]}
      </span>
      <div className={`min-w-0 flex-1 rounded-xl border p-3 ${
        unlocked ? "border-teal/20 bg-teal/5" : next ? "border-warning/30 bg-warning/10" : "border-border bg-surface"
      }`}>
        <div className="flex items-center justify-between gap-2">
          <p className="text-[13px] font-bold text-navy">{milestone.title}</p>
          <span className="text-[10px] font-bold text-muted-foreground">{milestone.points} pts</span>
        </div>
        <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">{milestone.incentive}</p>
        <p className={`mt-1 text-[10px] font-bold uppercase tracking-wider ${unlocked ? "text-teal" : next ? "text-warning" : "text-muted-foreground"}`}>
          {unlocked ? "Unlocked" : next ? `${milestone.points - points} points away` : "Upcoming"}
        </p>
      </div>
    </div>
  );
}

function RewardPath({ audience }: { audience: RewardAudience }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-soft">
      <div className="flex items-start gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-teal/10 text-teal">
          {iconByAudience[audience.id]}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[14px] font-bold text-navy">{audience.title}</p>
          <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">{audience.summary}</p>
        </div>
      </div>

      <div className="mt-3 rounded-xl bg-surface p-3">
        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">What they receive</p>
        <ul className="mt-2 space-y-1.5">
          {audience.benefits.map((benefit) => (
            <li key={benefit} className="flex items-start gap-2 text-[12px] leading-relaxed text-navy">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-teal" />
              <span>{benefit}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {audience.partnerExamples.map((partner) => (
          <span key={partner} className="rounded-full bg-warning/10 px-2 py-1 text-[10px] font-bold text-warning">
            {partner}
          </span>
        ))}
      </div>

      <Link to={audience.to} className="mt-3 flex w-full items-center justify-between rounded-xl bg-navy px-3 py-2.5 text-[12px] font-bold text-white">
        <span>{audience.cta}</span>
        <ChevronRight className="h-4 w-4" />
      </Link>
    </div>
  );
}
