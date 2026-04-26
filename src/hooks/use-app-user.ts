import { useAuth0 } from "@auth0/auth0-react";
import { useEffect, useMemo, useState } from "react";
import { type AppUserProfile, upsertUserProfile } from "@/lib/app-data";

export function useAppUser() {
  const auth = useAuth0();
  const [profile, setProfile] = useState<AppUserProfile | null>(null);

  useEffect(() => {
    if (!auth.isAuthenticated || !auth.user) {
      setProfile(null);
      return;
    }

    setProfile(upsertUserProfile(auth.user));
  }, [auth.isAuthenticated, auth.user]);

  return useMemo(
    () => ({
      ...auth,
      profile,
      role: profile?.role ?? "patient",
    }),
    [auth, profile],
  );
}

