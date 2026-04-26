import { useCallback, useEffect, useMemo, useState } from "react";
import {
  authenticateLocalAccount,
  createLocalAccount,
  type AppRole,
  type AppUserProfile,
  type ReviewLane,
  type SignupProfileInput,
  updateLocalUserProfile,
  upsertLocalUserProfile,
} from "@/lib/app-data";

type LocalSession = {
  id: string;
  email: string;
  name: string;
  role: AppRole;
  workspaceId: string;
};

const SESSION_KEY = "bloomy.session.v2";
const SESSION_EVENT = "bloomy-session-change";

function readSession(): LocalSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeSession(session: LocalSession | null) {
  if (typeof window === "undefined") return;

  if (session) {
    window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } else {
    window.localStorage.removeItem(SESSION_KEY);
  }

  window.dispatchEvent(new Event(SESSION_EVENT));
}

function sessionFromProfile(profile: AppUserProfile): LocalSession {
  return {
    id: profile.id,
    email: profile.email ?? "",
    name: profile.name ?? "Bloomy user",
    role: profile.role,
    workspaceId: profile.workspaceId,
  };
}

export function useAppUser() {
  const [session, setSession] = useState<LocalSession | null>(() => readSession());
  const [profile, setProfile] = useState<AppUserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const sync = () => setSession(readSession());
    window.addEventListener("storage", sync);
    window.addEventListener(SESSION_EVENT, sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener(SESSION_EVENT, sync);
    };
  }, []);

  useEffect(() => {
    let active = true;

    async function loadServerSession() {
      try {
        const response = await fetch("/api/auth/session", { credentials: "include" });
        const data = await response.json().catch(() => ({}));

        if (!active) return;

        if (data.configured) {
          const nextProfile = data.profile as AppUserProfile | null;
          setProfile(nextProfile);
          setSession(nextProfile ? sessionFromProfile(nextProfile) : null);
          setIsLoading(false);
          return;
        }
      } catch {
        // Fall back to the local demo store below.
      }

      if (!active) return;
      const localSession = readSession();
      setSession(localSession);
      setProfile(localSession ? upsertLocalUserProfile(localSession) : null);
      setIsLoading(false);
    }

    void loadServerSession();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (isLoading) return;
    if (!session) {
      setProfile(null);
      return;
    }

    setProfile((current) => current ?? upsertLocalUserProfile(session));
  }, [isLoading, session]);

  const loginWithCredentials = useCallback(async (input: { role: AppRole; email: string; password: string; reviewLane?: ReviewLane }) => {
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const data = await response.json().catch(() => ({}));

      if (data.configured === false) {
        throw new Error("LOCAL_FALLBACK");
      }
      if (!response.ok) {
        throw new Error(data.error || "Could not sign in.");
      }

      const next = data.profile as AppUserProfile;
      setProfile(next);
      setSession(sessionFromProfile(next));
      return next;
    } catch (error) {
      if (error instanceof Error && error.message !== "LOCAL_FALLBACK") {
        throw error;
      }
    }

    const next = authenticateLocalAccount(input);
    writeSession(sessionFromProfile(next));
    setSession(sessionFromProfile(next));
    setProfile(next);
    return next;
  }, []);

  const signup = useCallback(async (input: SignupProfileInput) => {
    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const data = await response.json().catch(() => ({}));

      if (data.configured === false) {
        throw new Error("LOCAL_FALLBACK");
      }
      if (!response.ok) {
        throw new Error(data.error || "Could not create account.");
      }

      const next = data.profile as AppUserProfile;
      if (next.approvalStatus === "approved") {
        setSession(sessionFromProfile(next));
        setProfile(next);
      }
      return next;
    } catch (error) {
      if (error instanceof Error && error.message !== "LOCAL_FALLBACK") {
        throw error;
      }
    }

    const next = createLocalAccount(input);
    if (next.approvalStatus === "approved") {
      writeSession(sessionFromProfile(next));
      setSession(sessionFromProfile(next));
      setProfile(next);
    }
    return next;
  }, []);

  const updateProfile = useCallback(async (input: Partial<AppUserProfile>) => {
    if (!session) {
      throw new Error("Please sign in before updating your profile.");
    }

    try {
      const response = await fetch("/api/profile", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const data = await response.json().catch(() => ({}));

      if (data.configured === false) {
        throw new Error("LOCAL_FALLBACK");
      }
      if (!response.ok) {
        throw new Error(data.error || "Could not update profile.");
      }

      const next = data.profile as AppUserProfile;
      const nextSession = sessionFromProfile(next);
      writeSession(nextSession);
      setSession(nextSession);
      setProfile(next);
      return next;
    } catch (error) {
      if (error instanceof Error && error.message !== "LOCAL_FALLBACK") {
        throw error;
      }
    }

    const next = updateLocalUserProfile(session.id, input);
    const nextSession = sessionFromProfile(next);
    writeSession(nextSession);
    setSession(nextSession);
    setProfile(next);
    return next;
  }, [session]);

  const logout = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" }).catch(() => undefined);
    writeSession(null);
    setSession(null);
    setProfile(null);
  }, []);

  const getAccessTokenSilently = useCallback(async () => {
    return session ? `local-${session.role}-${session.id}` : "";
  }, [session]);

  return useMemo(
    () => ({
      isAuthenticated: Boolean(session),
      isLoading,
      user: session
        ? {
            sub: session.id,
            id: session.id,
            email: session.email,
            name: session.name,
            role: session.role,
          }
        : undefined,
      profile,
      role: profile?.role ?? session?.role ?? "patient",
      loginWithCredentials,
      signup,
      logout,
      updateProfile,
      getAccessTokenSilently,
    }),
    [getAccessTokenSilently, isLoading, loginWithCredentials, logout, profile, session, signup, updateProfile],
  );
}
