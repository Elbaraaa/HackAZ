export type AppRole = "patient" | "doctor" | "environmental" | "admin";
export type AccountStatus = "approved" | "pending" | "rejected";
export type ReviewLane = "clinical" | "veterinary" | "environmental";

export type Sex = "female" | "male" | "intersex" | "prefer-not-to-say" | "other";

export type LocationType = "home" | "workplace" | "school" | "farm" | "clinic" | "public-space" | "other";

export type SignupProfileInput = {
  name: string;
  email: string;
  password: string;
  role: AppRole;
  age: number;
  sex: Sex;
  uniqueId: string;
  occupation: string;
  dateOfReport: string;
  postalCode: string;
  phoneNumber: string;
  householdMemberId: string;
  physicalLocation: string;
  locationType: LocationType;
  organization?: string;
  approvalNote?: string;
  reviewLane?: ReviewLane;
  shareDataAnonymously?: boolean;
  openToFollowUp?: boolean;
};

export type AccountRecord = Omit<SignupProfileInput, "password" | "dateOfReport"> & {
  id: string;
  password: string;
  dateOfReport: string;
  createdAt: string;
  workspaceId: string;
  status: AccountStatus;
  approvedAt?: string;
  approvedBy?: string;
};

export type AppUserProfile = {
  id: string;
  email?: string;
  name?: string;
  role: AppRole;
  workspaceId: string;
  doctorProfileId?: string;
  patientProfileId?: string;
  backboardThreadId?: string;
  age?: number;
  sex?: Sex;
  uniqueId?: string;
  occupation?: string;
  dateOfReport?: string;
  postalCode?: string;
  phoneNumber?: string;
  householdMemberId?: string;
  physicalLocation?: string;
  locationType?: LocationType;
  organization?: string;
  approvalNote?: string;
  approvalStatus?: AccountStatus;
  reviewLane?: ReviewLane;
  shareDataAnonymously?: boolean;
  openToFollowUp?: boolean;
};

export type DoctorProfile = {
  id: string;
  userId: string;
  displayName: string;
  specialty: string;
  organization: string;
  verified: boolean;
  reviewLane: ReviewLane;
};

export type PatientProfile = {
  id: string;
  userId: string;
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

const STORAGE_KEY = "bloomy.appData.v2";

type AppDataState = {
  users: Record<string, AppUserProfile>;
  accounts: Record<string, AccountRecord>;
  doctors: Record<string, DoctorProfile>;
  patients: Record<string, PatientProfile>;
};

const initialState: AppDataState = {
  users: {},
  accounts: {},
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

function cleanId(value: string) {
  return value.replace(/[^a-z0-9]/gi, "-").toLowerCase();
}

function accountKey(email: string) {
  return email.trim().toLowerCase();
}

function workspaceFor(role: AppRole, id: string) {
  return `${role}-${cleanId(id)}`;
}

function defaultReviewLane(input: { role: AppRole; occupation?: string; uniqueId?: string; reviewLane?: ReviewLane }) {
  if (input.reviewLane) return input.reviewLane;
  if (input.role === "environmental") return "environmental";
  const haystack = `${input.occupation ?? ""} ${input.uniqueId ?? ""}`.toLowerCase();
  if (haystack.includes("vet") || haystack.includes("animal")) return "veterinary";
  if (haystack.includes("environment") || haystack.includes("public health") || haystack.includes("water")) return "environmental";
  return "clinical";
}

function seedAccounts(state: AppDataState) {
  const seeded: SignupProfileInput[] = [
    {
      role: "patient",
      name: "Community user",
      email: "patient@bloomy.local",
      password: "bloomy123",
      age: 28,
      sex: "prefer-not-to-say",
      uniqueId: "patient-demo",
      occupation: "Student",
      dateOfReport: new Date().toISOString().slice(0, 10),
      postalCode: "85719",
      phoneNumber: "555-0101",
      householdMemberId: "HH-001",
      physicalLocation: "Tucson, AZ",
      locationType: "home",
      organization: "",
      shareDataAnonymously: true,
      openToFollowUp: false,
    },
    {
      role: "doctor",
      name: "Clinical reviewer",
      email: "doctor@bloomy.local",
      password: "bloomy123",
      age: 41,
      sex: "prefer-not-to-say",
      uniqueId: "doctor-demo",
      occupation: "Doctor",
      dateOfReport: new Date().toISOString().slice(0, 10),
      postalCode: "85719",
      phoneNumber: "555-0202",
      householdMemberId: "CLINIC-001",
      physicalLocation: "Bloomy Review Clinic, Tucson, AZ",
      locationType: "clinic",
      organization: "Bloomy Review Clinic",
      reviewLane: "clinical",
      shareDataAnonymously: false,
      openToFollowUp: true,
    },
    {
      role: "doctor",
      name: "Veterinary reviewer",
      email: "vet@bloomy.local",
      password: "bloomy123",
      age: 39,
      sex: "prefer-not-to-say",
      uniqueId: "vet-demo",
      occupation: "Veterinarian",
      dateOfReport: new Date().toISOString().slice(0, 10),
      postalCode: "85629",
      phoneNumber: "555-0215",
      householdMemberId: "VET-001",
      physicalLocation: "Bloomy Veterinary Network, Tucson, AZ",
      locationType: "clinic",
      organization: "Bloomy Veterinary Network",
      reviewLane: "veterinary",
      shareDataAnonymously: false,
      openToFollowUp: true,
    },
    {
      role: "environmental",
      name: "Environmental health officer",
      email: "environmental@bloomy.local",
      password: "bloomy123",
      age: 38,
      sex: "prefer-not-to-say",
      uniqueId: "environmental-demo",
      occupation: "Environmental health officer",
      dateOfReport: new Date().toISOString().slice(0, 10),
      postalCode: "85705",
      phoneNumber: "555-0250",
      householdMemberId: "ENV-001",
      physicalLocation: "Pima County Environmental Health",
      locationType: "workplace",
      organization: "Pima County Environmental Health",
      shareDataAnonymously: false,
      openToFollowUp: true,
    },
    {
      role: "admin",
      name: "Admin operator",
      email: "admin@bloomy.local",
      password: "bloomy123",
      age: 35,
      sex: "prefer-not-to-say",
      uniqueId: "admin-demo",
      occupation: "Public health admin",
      dateOfReport: new Date().toISOString().slice(0, 10),
      postalCode: "85719",
      phoneNumber: "555-0303",
      householdMemberId: "ADMIN-001",
      physicalLocation: "Pima County Operations Center",
      locationType: "workplace",
      organization: "Bloomy",
      shareDataAnonymously: false,
      openToFollowUp: true,
    },
  ];

  seeded.forEach((account) => {
    const key = accountKey(account.email);
    if (state.accounts[key]) {
      if (!state.accounts[key].status) {
        state.accounts[key] = {
          ...state.accounts[key],
          status: "approved",
          approvedAt: state.accounts[key].approvedAt ?? new Date().toISOString(),
          approvedBy: state.accounts[key].approvedBy ?? "system",
        };
      }
      state.accounts[key] = {
        ...state.accounts[key],
        shareDataAnonymously: state.accounts[key].shareDataAnonymously ?? account.shareDataAnonymously ?? true,
        openToFollowUp: state.accounts[key].openToFollowUp ?? account.openToFollowUp ?? false,
      };
      return;
    }

    const id = cleanId(account.uniqueId || account.email);
    const record: AccountRecord = {
      ...account,
      id,
      email: accountKey(account.email),
      workspaceId: workspaceFor(account.role, id),
      createdAt: new Date().toISOString(),
      status: "approved",
      approvedAt: new Date().toISOString(),
      approvedBy: "system",
    };
    state.accounts[key] = record;
    state.users[id] = profileFromAccount(record, state.users[id]);
  });

  return state;
}

function profileFromAccount(account: AccountRecord, existing?: AppUserProfile): AppUserProfile {
  return {
    id: account.id,
    email: account.email,
    name: account.name,
    role: account.role,
    workspaceId: account.workspaceId,
    doctorProfileId: existing?.doctorProfileId,
    patientProfileId: existing?.patientProfileId,
    backboardThreadId: existing?.backboardThreadId,
    age: account.age,
    sex: account.sex,
    uniqueId: account.uniqueId,
    occupation: account.occupation,
    dateOfReport: account.dateOfReport,
    postalCode: account.postalCode,
    phoneNumber: account.phoneNumber,
    householdMemberId: account.householdMemberId,
    physicalLocation: account.physicalLocation,
    locationType: account.locationType,
    organization: account.organization,
    approvalNote: account.approvalNote,
    approvalStatus: account.status,
    reviewLane: account.reviewLane,
    shareDataAnonymously: account.shareDataAnonymously ?? true,
    openToFollowUp: account.openToFollowUp ?? false,
  };
}

function ensureRoleProfile(state: AppDataState, profile: AppUserProfile) {
  const next = { ...profile };

  if ((next.role === "doctor" || next.role === "environmental") && !next.doctorProfileId) {
    const id = `doctor-${cleanId(next.id)}`;
    state.doctors[id] = {
      id,
      userId: next.id,
      displayName: next.name || "Clinical reviewer",
      specialty: next.occupation || "Community health review",
      organization: "Bloomy Review Network",
      verified: true,
      reviewLane: defaultReviewLane({
        role: next.role,
        occupation: next.occupation,
        uniqueId: next.uniqueId,
        reviewLane: next.reviewLane,
      }),
    };
    next.doctorProfileId = id;
  } else if ((next.role === "doctor" || next.role === "environmental") && next.doctorProfileId && state.doctors[next.doctorProfileId]) {
    state.doctors[next.doctorProfileId] = {
      ...state.doctors[next.doctorProfileId],
      reviewLane:
        state.doctors[next.doctorProfileId].reviewLane ??
        defaultReviewLane({
          role: next.role,
          occupation: next.occupation,
          uniqueId: next.uniqueId,
          reviewLane: next.reviewLane,
        }),
    };
  }

  if (next.role === "patient" && !next.patientProfileId) {
    const id = `patient-${cleanId(next.id)}`;
    state.patients[id] = {
      id,
      userId: next.id,
      displayName: next.name || "Community reporter",
      zip: next.postalCode || "85719",
      assignedDoctorIds: [],
    };
    next.patientProfileId = id;
  }

  state.users[next.id] = next;
  return next;
}

export function createLocalAccount(input: SignupProfileInput): AppUserProfile {
  const state = seedAccounts(readState());
  const email = accountKey(input.email);

  if (input.role === "admin") {
    throw new Error("Admin accounts must be provisioned by an existing admin.");
  }

  if (!email || !input.password || !input.name.trim() || !input.uniqueId.trim()) {
    throw new Error("Please complete the required account fields.");
  }

  if (input.password.length < 6) {
    throw new Error("Password must be at least 6 characters.");
  }

  if (!input.postalCode.trim() || !input.phoneNumber.trim() || !input.householdMemberId.trim()) {
    throw new Error("Please add postal code, phone number, and household member ID.");
  }

  if (!input.physicalLocation.trim() || !input.locationType) {
    throw new Error("Please add the physical location and type of location.");
  }

  if (!Number.isFinite(input.age) || input.age < 0) {
    throw new Error("Please enter a valid age.");
  }

  if (state.accounts[email]) {
    throw new Error("An account already exists for that email.");
  }

  const id = cleanId(input.uniqueId || input.email);
  if (state.users[id]) {
    throw new Error("That unique ID is already in use.");
  }

  const account: AccountRecord = {
    ...input,
    id,
    email,
    postalCode: input.postalCode.trim(),
    phoneNumber: input.phoneNumber.trim(),
    householdMemberId: input.householdMemberId.trim(),
    physicalLocation: input.physicalLocation.trim(),
    locationType: input.locationType,
    organization: input.organization?.trim(),
    approvalNote: input.approvalNote?.trim(),
    reviewLane: input.reviewLane ?? defaultReviewLane(input),
    shareDataAnonymously: input.shareDataAnonymously ?? true,
    openToFollowUp: input.openToFollowUp ?? false,
    uniqueId: input.uniqueId.trim(),
    occupation: input.occupation.trim(),
    name: input.name.trim(),
    workspaceId: workspaceFor(input.role, id),
    createdAt: new Date().toISOString(),
    status: input.role === "patient" ? "approved" : "pending",
    approvedAt: input.role === "patient" ? new Date().toISOString() : undefined,
    approvedBy: input.role === "patient" ? "self-service" : undefined,
  };

  state.accounts[email] = account;
  const profile = ensureRoleProfile(state, profileFromAccount(account));
  writeState(state);
  return profile;
}

export function authenticateLocalAccount(input: {
  role: AppRole;
  email: string;
  password: string;
  reviewLane?: ReviewLane;
}): AppUserProfile {
  const state = seedAccounts(readState());
  const account = state.accounts[accountKey(input.email)];

  if (!account || account.password !== input.password) {
    writeState(state);
    throw new Error("Email or password is incorrect.");
  }

  if (account.role !== input.role) {
    writeState(state);
    throw new Error("This account belongs to a different workspace.");
  }

  if (input.reviewLane && defaultReviewLane(account) !== input.reviewLane) {
    writeState(state);
    throw new Error("This account belongs to a different review portal.");
  }

  if (account.status !== "approved") {
    writeState(state);
    throw new Error("This account is waiting for admin approval.");
  }

  const profile = ensureRoleProfile(state, profileFromAccount(account, state.users[account.id]));
  writeState(state);
  return profile;
}

export function upsertLocalUserProfile(user: {
  id: string;
  email?: string;
  name?: string;
  role: AppRole;
}): AppUserProfile {
  const state = seedAccounts(readState());
  const existing = state.users[user.id];
  const account = user.email ? state.accounts[accountKey(user.email)] : undefined;
  const workspaceId = account?.workspaceId ?? workspaceFor(user.role, user.id);
  const next: AppUserProfile = {
    id: user.id,
    email: account?.email ?? user.email,
    name: account?.name ?? user.name,
    role: user.role,
    workspaceId,
    doctorProfileId: existing?.doctorProfileId,
    patientProfileId: existing?.patientProfileId,
    backboardThreadId: existing?.backboardThreadId,
    age: account?.age ?? existing?.age,
    sex: account?.sex ?? existing?.sex,
    uniqueId: account?.uniqueId ?? existing?.uniqueId,
    occupation: account?.occupation ?? existing?.occupation,
    dateOfReport: account?.dateOfReport ?? existing?.dateOfReport,
    postalCode: account?.postalCode ?? existing?.postalCode,
    phoneNumber: account?.phoneNumber ?? existing?.phoneNumber,
    householdMemberId: account?.householdMemberId ?? existing?.householdMemberId,
    physicalLocation: account?.physicalLocation ?? existing?.physicalLocation,
    locationType: account?.locationType ?? existing?.locationType,
    organization: account?.organization ?? existing?.organization,
    approvalNote: account?.approvalNote ?? existing?.approvalNote,
    approvalStatus: account?.status ?? existing?.approvalStatus,
    reviewLane: account?.reviewLane ?? existing?.reviewLane,
    shareDataAnonymously: account?.shareDataAnonymously ?? existing?.shareDataAnonymously ?? true,
    openToFollowUp: account?.openToFollowUp ?? existing?.openToFollowUp ?? false,
  };

  const profile = ensureRoleProfile(state, next);
  writeState(state);
  return profile;
}

export function updateLocalUserProfile(
  userId: string,
  input: Partial<Pick<AppUserProfile,
    "name" | "age" | "sex" | "occupation" | "postalCode" | "phoneNumber" |
    "householdMemberId" | "physicalLocation" | "locationType" | "organization" |
    "shareDataAnonymously" | "openToFollowUp"
  >>,
): AppUserProfile {
  const state = seedAccounts(readState());
  const current = state.users[userId];
  if (!current) {
    throw new Error("Could not find your profile.");
  }

  const next: AppUserProfile = {
    ...current,
    ...input,
    name: input.name?.trim() || current.name,
    occupation: input.occupation?.trim() || current.occupation,
    postalCode: input.postalCode?.trim() || current.postalCode,
    phoneNumber: input.phoneNumber?.trim() || current.phoneNumber,
    householdMemberId: input.householdMemberId?.trim() || current.householdMemberId,
    physicalLocation: input.physicalLocation?.trim() || current.physicalLocation,
    organization: input.organization?.trim() ?? current.organization,
    shareDataAnonymously: input.shareDataAnonymously ?? current.shareDataAnonymously ?? true,
    openToFollowUp: input.openToFollowUp ?? current.openToFollowUp ?? false,
  };

  state.users[userId] = next;
  const account = next.email ? state.accounts[accountKey(next.email)] : undefined;
  if (account) {
    state.accounts[accountKey(next.email)] = {
      ...account,
      name: next.name ?? account.name,
      age: next.age ?? account.age,
      sex: next.sex ?? account.sex,
      occupation: next.occupation ?? account.occupation,
      postalCode: next.postalCode ?? account.postalCode,
      phoneNumber: next.phoneNumber ?? account.phoneNumber,
      householdMemberId: next.householdMemberId ?? account.householdMemberId,
      physicalLocation: next.physicalLocation ?? account.physicalLocation,
      locationType: next.locationType ?? account.locationType,
      organization: next.organization ?? account.organization,
      reviewLane: next.reviewLane ?? account.reviewLane,
      shareDataAnonymously: next.shareDataAnonymously ?? account.shareDataAnonymously ?? true,
      openToFollowUp: next.openToFollowUp ?? account.openToFollowUp ?? false,
    };
  }

  writeState(state);
  return next;
}

export function saveBackboardThread(userId: string, threadId: string) {
  const state = readState();
  const user = state.users[userId];
  if (!user) return;
  state.users[userId] = { ...user, backboardThreadId: threadId };
  writeState(state);
}

export function getCurrentProfile(userId?: string) {
  if (!userId) return null;
  return readState().users[userId] ?? null;
}

export function getDoctorProfile(id?: string) {
  if (!id) return null;
  return seedAccounts(readState()).doctors[id] ?? null;
}

export function getPendingAccounts() {
  const state = seedAccounts(readState());
  writeState(state);
  return Object.values(state.accounts)
    .filter((account) => account.status === "pending")
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
}

export function getAdminUserDirectory() {
  const state = seedAccounts(readState());
  writeState(state);
  return Object.values(state.accounts).sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
}

export function approveAccount(email: string, approvedBy = "admin") {
  const state = seedAccounts(readState());
  const key = accountKey(email);
  const account = state.accounts[key];
  if (!account) return null;

  const next: AccountRecord = {
    ...account,
    status: "approved",
    approvedAt: new Date().toISOString(),
    approvedBy,
  };
  state.accounts[key] = next;
  const profile = ensureRoleProfile(state, profileFromAccount(next, state.users[next.id]));
  writeState(state);
  return profile;
}

export function getAdminAnalyticsSnapshot(activeSignals: number): AdminAnalyticsSnapshot {
  const state = readState();
  return {
    activeUsers: Object.keys(state.users).length,
    activeDoctors: Object.values(state.users).filter((u) => u.role === "doctor" || u.role === "environmental").length,
    activeSignals,
    highRiskClusters: 0,
  };
}
