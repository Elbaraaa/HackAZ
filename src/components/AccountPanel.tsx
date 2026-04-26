import { Brain, Database, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useAppUser } from "@/hooks/use-app-user";
import { getCurrentProfile, saveBackboardThread } from "@/lib/app-data";
import { isAuthConfigured } from "@/lib/auth-config";

export function AccountPanel() {
  const { isAuthenticated, loginWithRedirect, getAccessTokenSilently, user, profile } = useAppUser();
  const [loading, setLoading] = useState(false);
  const [threadId, setThreadId] = useState(profile?.backboardThreadId);

  const connectBackboard = async () => {
    if (!isAuthenticated || !user?.sub) {
      await loginWithRedirect();
      return;
    }

    setLoading(true);
    try {
      const current = getCurrentProfile(user.sub);
      const token = await getAccessTokenSilently();
      const response = await fetch("/api/backboard/session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ threadId: current?.backboardThreadId }),
      });

      const data = (await response.json()) as { threadId?: string; error?: string };
      if (!response.ok || !data.threadId) {
        throw new Error(data.error || "Could not connect Backboard");
      }

      saveBackboardThread(user.sub, data.threadId);
      setThreadId(data.threadId);
      toast.success("Backboard session connected");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Backboard setup failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="px-5 mt-5">
      <div className="rounded-2xl bg-card border border-border p-4 shadow-soft">
        <div className="flex items-start gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-teal/10 text-teal">
            <ShieldCheck className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[14px] font-bold text-navy">
              {isAuthenticated ? profile?.name || user?.email || "Signed in" : "Personal account"}
            </p>
            <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">
              {isAuthenticated
                ? `Role: ${profile?.role ?? "patient"}. Auth0 keeps the login session, and Backboard can persist the AI thread.`
                : "Log in with Auth0 to keep your own check-ins, role, and AI session separate."}
            </p>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <button
            onClick={() => (isAuthenticated ? connectBackboard() : loginWithRedirect())}
            disabled={!isAuthConfigured() || loading}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-navy px-3 py-3 text-[12px] font-semibold text-white disabled:opacity-50"
          >
            <Brain className="h-4 w-4" />
            {threadId ? "Backboard linked" : loading ? "Linking..." : "Link Backboard"}
          </button>
          <div className="inline-flex items-center justify-center gap-2 rounded-xl bg-muted px-3 py-3 text-[12px] font-semibold text-muted-foreground">
            <Database className="h-4 w-4" />
            DB layer ready
          </div>
        </div>
      </div>
    </section>
  );
}

