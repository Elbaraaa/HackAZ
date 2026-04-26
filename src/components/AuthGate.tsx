import { Activity, LogIn, UserPlus } from "lucide-react";
import { type ReactNode } from "react";
import { isAuthConfigured } from "@/lib/auth-config";
import { useAppUser } from "@/hooks/use-app-user";

export function AuthGate({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading, loginWithRedirect } = useAppUser();

  if (isLoading) {
    return (
      <div className="grid min-h-screen place-items-center bg-background px-5">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-teal border-t-transparent" />
      </div>
    );
  }

  if (!isAuthConfigured() || !isAuthenticated) {
    return (
      <main className="min-h-screen bg-background px-5 py-8">
        <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-md flex-col justify-center">
          <div className="mb-8 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-teal text-teal-foreground shadow-glow">
            <Activity className="h-7 w-7" />
          </div>

          <p className="text-[11px] font-bold uppercase tracking-widest text-teal">OutbreakIQ</p>
          <h1 className="mt-3 text-[40px] font-extrabold leading-[1.02] tracking-tight text-navy">
            Sign in to continue.
          </h1>
          <p className="mt-4 text-[15px] leading-relaxed text-muted-foreground">
            Use your account to access patient check-ins, doctor review tools, or admin analytics.
          </p>

          <div className="mt-8 space-y-3">
            <button
              onClick={() => loginWithRedirect()}
              disabled={!isAuthConfigured()}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-hero py-4 text-sm font-semibold text-white shadow-elevated disabled:opacity-50"
            >
              <LogIn className="h-4 w-4" />
              Log in
            </button>
            <button
              onClick={() =>
                loginWithRedirect({
                  authorizationParams: { screen_hint: "signup" },
                })
              }
              disabled={!isAuthConfigured()}
              className="flex w-full items-center justify-center gap-2 rounded-2xl border border-border bg-card py-4 text-sm font-semibold text-navy shadow-soft disabled:opacity-50"
            >
              <UserPlus className="h-4 w-4 text-teal" />
              Sign up
            </button>
          </div>

          {!isAuthConfigured() ? (
            <div className="mt-5 rounded-2xl border border-warning/30 bg-warning/10 p-4">
              <p className="text-[13px] font-bold text-warning">Auth0 setup needed</p>
              <p className="mt-1 text-[12px] leading-relaxed text-navy">
                Fill in the Auth0 values from .env.example before these buttons can redirect.
              </p>
            </div>
          ) : null}
        </div>
      </main>
    );
  }

  return children;
}

