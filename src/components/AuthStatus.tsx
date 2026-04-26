import { LogIn, LogOut, Shield, UserRound } from "lucide-react";
import { isAuthConfigured } from "@/lib/auth-config";
import { useAppUser } from "@/hooks/use-app-user";

export function AuthStatus() {
  const { isAuthenticated, isLoading, loginWithRedirect, logout, user, profile } = useAppUser();

  if (!isAuthConfigured()) {
    return (
      <span className="inline-flex h-9 items-center rounded-full bg-warning/15 px-3 text-[11px] font-semibold text-warning">
        Auth setup needed
      </span>
    );
  }

  if (isLoading) {
    return <span className="h-9 w-20 animate-pulse rounded-full bg-muted" />;
  }

  if (!isAuthenticated) {
    return (
      <button
        onClick={() => loginWithRedirect()}
        className="inline-flex h-9 items-center gap-1.5 rounded-full bg-navy px-3 text-[12px] font-semibold text-white"
      >
        <LogIn className="h-3.5 w-3.5" />
        Log in
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <div className="hidden min-w-0 sm:block">
        <p className="max-w-28 truncate text-right text-[11px] font-semibold text-navy">
          {user?.name || user?.email || "Signed in"}
        </p>
        <p className="flex items-center justify-end gap-1 text-[10px] uppercase tracking-wide text-muted-foreground">
          <Shield className="h-3 w-3" />
          {profile?.role ?? "patient"}
        </p>
      </div>
      <span className="grid h-9 w-9 place-items-center rounded-full bg-teal/10 text-teal">
        <UserRound className="h-4 w-4" />
      </span>
      <button
        onClick={() => logout({ logoutParams: { returnTo: window.location.origin } })}
        className="grid h-9 w-9 place-items-center rounded-full bg-muted text-muted-foreground"
        aria-label="Log out"
      >
        <LogOut className="h-4 w-4" />
      </button>
    </div>
  );
}

