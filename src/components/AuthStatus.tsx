import { Link } from "@tanstack/react-router";
import { LogOut, Shield, UserRound } from "lucide-react";
import { useAppUser } from "@/hooks/use-app-user";

export function AuthStatus() {
  const { isAuthenticated, logout, user, profile } = useAppUser();

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="flex items-center gap-2">
      <div className="hidden min-w-0 sm:block">
        <p className="max-w-28 truncate text-right text-[11px] font-semibold text-navy">
          {user?.name || "Signed in"}
        </p>
        <p className="flex items-center justify-end gap-1 text-[10px] uppercase tracking-wide text-muted-foreground">
          <Shield className="h-3 w-3" />
          {profile?.role ?? "patient"}
        </p>
      </div>
      <Link to="/profile" className="grid h-9 w-9 place-items-center rounded-full bg-teal/10 text-teal" aria-label="Open profile">
        <UserRound className="h-4 w-4" />
      </Link>
      <button
        onClick={() => logout()}
        className="grid h-9 w-9 place-items-center rounded-full bg-muted text-muted-foreground"
        aria-label="Log out"
      >
        <LogOut className="h-4 w-4" />
      </button>
    </div>
  );
}
