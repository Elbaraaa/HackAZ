export type AppRole = "patient" | "doctor" | "admin";

export type AppUserProfile = {
  auth0Sub: string;
  email?: string;
  name?: string;
  role: AppRole;
  doctorProfileId?: string;
  patientProfileId?: string;
  backboardThreadId?: string;
};

export type DoctorProfile = {
  id: string;
  userAuth0Sub: string;
  displayName: string;
  specialty: string;
  organization: string;
  verified: boolean;
};

export type PatientProfile = {
  id: string;
  userAuth0Sub: string;
  displayName: string;
  zip: string;
  assignedDoctorIds: string[];
};

export type AdminAnalyticsSnapshot = {
  activeUsers: number;
  activeDoctors: number;
  activeSignals: number;
  highRiskClusters: number;
};

const STORAGE_KEY = "outbreakiq.appData.v1";

type AppDataState = {
  users: Record<string, AppUserProfile>;
  doctors: Record<string, DoctorProfile>;
  patients: Record<string, PatientProfile>;
};

const initialState: AppDataState = {
  users: {},
  doctors: {},
  patients: {},
};

function readState(): AppDataState {
  if (typeof window === "undefined") return initialState;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? { ...initialState, ...JSON.parse(raw) } : initialState;
  } catch {
    return initialState;
  }
}

function writeState(state: AppDataState) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function inferRole(user: { [key: string]: unknown }): AppRole {
  const roles =
    (user["https://outbreakiq.app/roles"] as string[] | undefined) ||
    (user["https://sentinel-health.app/roles"] as string[] | undefined) ||
    (user.roles as string[] | undefined) ||
    [];

  if (roles.includes("admin")) return "admin";
  if (roles.includes("doctor")) return "doctor";
  return "patient";
}

export function upsertUserProfile(user: {
  sub?: string;
  email?: string;
  name?: string;
  [key: string]: unknown;
}): AppUserProfile | null {
  if (!user.sub) return null;

  const state = readState();
  const existing = state.users[user.sub];
  const role = existing?.role ?? inferRole(user);
  const next: AppUserProfile = {
    auth0Sub: user.sub,
    email: user.email,
    name: user.name,
    role,
    doctorProfileId: existing?.doctorProfileId,
    patientProfileId: existing?.patientProfileId,
    backboardThreadId: existing?.backboardThreadId,
  };

  state.users[user.sub] = next;

  if (role === "doctor" && !next.doctorProfileId) {
    const id = `doctor-${user.sub.replace(/[^a-z0-9]/gi, "-")}`;
    state.doctors[id] = {
      id,
      userAuth0Sub: user.sub,
      displayName: user.name || "Clinical reviewer",
      specialty: "Family medicine",
      organization: "Bloomy Partner Network",
      verified: true,
    };
    next.doctorProfileId = id;
    state.users[user.sub] = next;
  }

  if (role === "patient" && !next.patientProfileId) {
    const id = `patient-${user.sub.replace(/[^a-z0-9]/gi, "-")}`;
    state.patients[id] = {
      id,
      userAuth0Sub: user.sub,
      displayName: user.name || "Community reporter",
      zip: "85719",
      assignedDoctorIds: [],
    };
    next.patientProfileId = id;
    state.users[user.sub] = next;
  }

  writeState(state);
  return next;
}

export function saveBackboardThread(auth0Sub: string, threadId: string) {
  const state = readState();
  const user = state.users[auth0Sub];
  if (!user) return;
  state.users[auth0Sub] = { ...user, backboardThreadId: threadId };
  writeState(state);
}

export function getCurrentProfile(auth0Sub?: string) {
  if (!auth0Sub) return null;
  return readState().users[auth0Sub] ?? null;
}

export function getDoctorProfile(id?: string) {
  if (!id) return null;
  return readState().doctors[id] ?? null;
}

export function getAdminAnalyticsSnapshot(activeSignals: number): AdminAnalyticsSnapshot {
  const state = readState();
  return {
    activeUsers: Object.keys(state.users).length,
    activeDoctors: Object.values(state.users).filter((u) => u.role === "doctor").length,
    activeSignals,
    highRiskClusters: 0,
  };
}
