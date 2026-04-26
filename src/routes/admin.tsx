import { createFileRoute } from "@tanstack/react-router";
import { AppShell, StatusPill, TopBar } from "@/components/AppShell";
import { useAppUser } from "@/hooks/use-app-user";
import { approveAccount, type AccountRecord, getAdminAnalyticsSnapshot, getPendingAccounts } from "@/lib/app-data";
import { useStore } from "@/lib/store";
import { Activity, Check, ShieldAlert, Stethoscope, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

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
  const { isAuthenticated, role } = useAppUser();
  const [pendingAccounts, setPendingAccounts] = useState<AccountRecord[]>([]);
  const [approvalQueueLoading, setApprovalQueueLoading] = useState(false);
  const signals = useStore((s) => s.signals);
  const snapshot = getAdminAnalyticsSnapshot(signals.length);
  const highRiskClusters = signals.filter((s) => s.severity === "high").length;
  const allowed = role === "admin";

  useEffect(() => {
    let active = true;

    async function loadPendingAccounts() {
      if (!allowed) {
        setPendingAccounts([]);
        return;
      }

      setApprovalQueueLoading(true);
      try {
        const response = await fetch("/api/admin/pending-accounts", { credentials: "include" });
        const data = await response.json().catch(() => ({}));

        if (!active) return;

        if (data.configured === false) {
          setPendingAccounts(getPendingAccounts());
        } else if (response.ok) {
          setPendingAccounts(data.accounts ?? []);
        } else {
          toast.error(data.error || "Could not load pending accounts.");
        }
      } catch {
        if (active) setPendingAccounts(getPendingAccounts());
      } finally {
        if (active) setApprovalQueueLoading(false);
      }
    }

    void loadPendingAccounts();
    return () => {
      active = false;
    };
  }, [allowed]);

  if (!isAuthenticated) {
    return (
      <AppShell>
        <TopBar title="Admin" back="/" pill={<StatusPill tone="warn">Login Required</StatusPill>} />
        <section className="px-5 pt-8">
          <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
            <ShieldAlert className="h-8 w-8 text-warning" />
            <h1 className="mt-4 text-2xl font-extrabold text-navy">Admin access</h1>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Choose the admin workspace to view analytics and system controls.
            </p>
          </div>
        </section>
      </AppShell>
    );
  }

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
            <p className="text-sm font-bold text-warning">This workspace is not admin.</p>
            <p className="mt-1 text-[12px] leading-relaxed text-navy">
              This workspace is scoped away from admin tools. Log out and choose Admin console.
            </p>
          </div>
        </section>
      ) : null}

      <section className="px-5 mt-5 grid grid-cols-2 gap-3">
        <Metric icon={<Users className="h-4 w-4" />} label="Known users" value={snapshot.activeUsers} />
        <Metric icon={<Stethoscope className="h-4 w-4" />} label="Reviewers" value={snapshot.activeDoctors} />
        <Metric icon={<Activity className="h-4 w-4" />} label="Signals" value={snapshot.activeSignals} />
        <Metric icon={<ShieldAlert className="h-4 w-4" />} label="High risk" value={highRiskClusters} />
      </section>

      {allowed ? (
        <section className="px-5 mt-5">
          <div className="rounded-2xl border border-border bg-card p-4 shadow-soft">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[14px] font-bold text-navy">Reviewer approval queue</p>
                <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">
                  Doctor and environmental accounts require admin approval before login.
                </p>
              </div>
              <span className="rounded-full bg-warning/10 px-2.5 py-1 text-[11px] font-bold text-warning">
                {approvalQueueLoading ? "..." : pendingAccounts.length}
              </span>
            </div>
            <div className="mt-3 space-y-2">
              {approvalQueueLoading ? (
                <p className="rounded-xl bg-surface p-3 text-[12px] font-semibold text-muted-foreground">
                  Loading reviewer requests...
                </p>
              ) : pendingAccounts.length ? (
                pendingAccounts.map((account) => (
                  <PendingAccount
                    key={account.email}
                    account={account}
                    onApprove={async () => {
                      try {
                        const response = await fetch("/api/admin/approve-account", {
                          method: "POST",
                          credentials: "include",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ email: account.email }),
                        });
                        const data = await response.json().catch(() => ({}));

                        if (data.configured === false) {
                          approveAccount(account.email, "admin");
                        } else if (!response.ok) {
                          throw new Error(data.error || "Could not approve account.");
                        }

                        setPendingAccounts((current) => current.filter((item) => item.email !== account.email));
                        toast.success("Reviewer account approved");
                      } catch (error) {
                        toast.error(error instanceof Error ? error.message : "Could not approve account.");
                      }
                    }}
                  />
                ))
              ) : (
                <p className="rounded-xl bg-success/10 p-3 text-[12px] font-semibold text-success">
                  No reviewer accounts are waiting for approval.
                </p>
              )}
            </div>
          </div>
        </section>
      ) : null}

      <section className="px-5 mt-5">
        <div className="rounded-2xl border border-border bg-card p-4 shadow-soft">
          <p className="text-[14px] font-bold text-navy">Next database-backed views</p>
          <div className="mt-3 space-y-2 text-[12px] text-muted-foreground">
            <p>Role management: users, reviewers, admins.</p>
            <p>Review access: clinical, veterinary, and environmental queues.</p>
            <p>Analytics: check-ins, risk scores, clusters, and usage trends.</p>
          </div>
        </div>
      </section>
    </AppShell>
  );
}

function PendingAccount({ account, onApprove }: { account: AccountRecord; onApprove: () => void }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-[13px] font-bold text-navy">{account.name}</p>
          <p className="mt-0.5 text-[11px] font-semibold text-teal capitalize">
            {account.role === "environmental" ? "Environmental reviewer" : "Doctor reviewer"}
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">{account.email}</p>
        </div>
        <button
          type="button"
          onClick={onApprove}
          className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-teal px-2.5 py-1.5 text-[11px] font-bold text-white"
        >
          <Check className="h-3.5 w-3.5" />
          Approve
        </button>
      </div>
      <div className="mt-2 grid grid-cols-2 gap-2 text-[11px] text-muted-foreground">
        <p><span className="font-bold text-navy">ID:</span> {account.uniqueId}</p>
        <p><span className="font-bold text-navy">ZIP:</span> {account.postalCode}</p>
        <p className="col-span-2"><span className="font-bold text-navy">Org:</span> {account.organization || account.householdMemberId}</p>
        <p className="col-span-2"><span className="font-bold text-navy">Location:</span> {account.physicalLocation}</p>
      </div>
      {account.approvalNote ? (
        <p className="mt-2 rounded-lg bg-card p-2 text-[11px] leading-relaxed text-navy">{account.approvalNote}</p>
      ) : null}
    </div>
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
