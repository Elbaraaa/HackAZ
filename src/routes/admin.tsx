import { createFileRoute } from "@tanstack/react-router";
import { AppShell, StatusPill, TopBar } from "@/components/AppShell";
import { useAppUser } from "@/hooks/use-app-user";
import { getAdminAnalyticsSnapshot } from "@/lib/app-data";
import { useStore } from "@/lib/store";
import { Activity, ShieldAlert, Stethoscope, Users } from "lucide-react";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Admin Analytics - Bloomy" },
      { name: "description", content: "Administrative analytics and role management." },
    ],
  }),
  component: Admin,
});

function Admin() {
  const { isAuthenticated, loginWithRedirect, role } = useAppUser();
  const signals = useStore((s) => s.signals);
  const snapshot = getAdminAnalyticsSnapshot(signals.length);
  const highRiskClusters = signals.filter((s) => s.severity === "high").length;

  if (!isAuthenticated) {
    return (
      <AppShell>
        <TopBar title="Admin" back="/" pill={<StatusPill tone="warn">Login Required</StatusPill>} />
        <section className="px-5 pt-8">
          <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
            <ShieldAlert className="h-8 w-8 text-warning" />
            <h1 className="mt-4 text-2xl font-extrabold text-navy">Admin access</h1>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Sign in with an Auth0 account that has the admin role claim to view analytics.
            </p>
            <button
              onClick={() => loginWithRedirect()}
              className="mt-4 w-full rounded-xl bg-navy py-3 text-sm font-semibold text-white"
            >
              Log in
            </button>
          </div>
        </section>
      </AppShell>
    );
  }

  const allowed = role === "admin";

  return (
    <AppShell>
      <TopBar title="Admin" back="/" pill={<StatusPill tone={allowed ? "live" : "warn"}>{allowed ? "Admin" : "Restricted"}</StatusPill>} />

      <section className="px-5 pt-4">
        <h1 className="text-3xl font-extrabold tracking-tight text-navy">Analytics control room</h1>
        <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
          This is wired to the app data layer now and ready to switch from mock/local data to database reads.
        </p>
      </section>

      {!allowed ? (
        <section className="px-5 mt-5">
          <div className="rounded-2xl border border-warning/30 bg-warning/10 p-4">
            <p className="text-sm font-bold text-warning">Your Auth0 user is not marked as admin.</p>
            <p className="mt-1 text-[12px] leading-relaxed text-navy">
              Add an Auth0 role/custom claim for this user before exposing production analytics.
            </p>
          </div>
        </section>
      ) : null}

      <section className="px-5 mt-5 grid grid-cols-2 gap-3">
        <Metric icon={<Users className="h-4 w-4" />} label="Known users" value={snapshot.activeUsers} />
        <Metric icon={<Stethoscope className="h-4 w-4" />} label="Doctors" value={snapshot.activeDoctors} />
        <Metric icon={<Activity className="h-4 w-4" />} label="Signals" value={snapshot.activeSignals} />
        <Metric icon={<ShieldAlert className="h-4 w-4" />} label="High risk" value={highRiskClusters} />
      </section>

      <section className="px-5 mt-5">
        <div className="rounded-2xl border border-border bg-card p-4 shadow-soft">
          <p className="text-[14px] font-bold text-navy">Next database-backed views</p>
          <div className="mt-3 space-y-2 text-[12px] text-muted-foreground">
            <p>Role management: users, doctors, admins.</p>
            <p>Clinical access: doctor-to-patient assignments.</p>
            <p>Analytics: check-ins, risk scores, clusters, and usage trends.</p>
          </div>
        </div>
      </section>
    </AppShell>
  );
}

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-soft">
      <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
        <span className="text-teal">{icon}</span>
        {label}
      </div>
      <p className="mt-2 text-3xl font-extrabold text-navy">{value}</p>
    </div>
  );
}
