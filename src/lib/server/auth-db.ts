import { neon } from "@neondatabase/serverless";
import { randomBytes, randomUUID, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import type { AccountRecord, AppRole, AppUserProfile, LocationType, ReviewLane, Sex, SignupProfileInput } from "@/lib/app-data";

const scrypt = promisify(scryptCallback);
const SESSION_COOKIE = "bloomy_session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

type SqlClient = ReturnType<typeof neon>;

export function isDatabaseConfigured() {
  return Boolean(process.env.DATABASE_URL);
}

function getSql() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL is not configured");
  return neon(databaseUrl);
}

export async function ensureAuthSchema() {
  const sql = getSql();
  await sql`
    CREATE TABLE IF NOT EXISTS bloomy_users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      age INTEGER,
      sex TEXT,
      unique_id TEXT UNIQUE NOT NULL,
      occupation TEXT NOT NULL,
      date_of_report TEXT NOT NULL,
      postal_code TEXT NOT NULL,
      phone_number TEXT NOT NULL,
      household_member_id TEXT NOT NULL,
      physical_location TEXT NOT NULL,
      location_type TEXT NOT NULL,
      organization TEXT,
      approval_note TEXT,
      review_lane TEXT,
      share_data_anonymously BOOLEAN NOT NULL DEFAULT TRUE,
      open_to_follow_up BOOLEAN NOT NULL DEFAULT FALSE,
      workspace_id TEXT NOT NULL,
      doctor_profile_id TEXT,
      patient_profile_id TEXT,
      backboard_thread_id TEXT,
      approved_at TEXT,
      approved_by TEXT,
      created_at TEXT NOT NULL
    )
  `;
  await sql`ALTER TABLE bloomy_users ADD COLUMN IF NOT EXISTS review_lane TEXT`;
  await sql`ALTER TABLE bloomy_users ADD COLUMN IF NOT EXISTS share_data_anonymously BOOLEAN NOT NULL DEFAULT TRUE`;
  await sql`ALTER TABLE bloomy_users ADD COLUMN IF NOT EXISTS open_to_follow_up BOOLEAN NOT NULL DEFAULT FALSE`;
  await sql`
    CREATE TABLE IF NOT EXISTS bloomy_sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES bloomy_users(id) ON DELETE CASCADE,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS bloomy_doctor_profiles (
      id TEXT PRIMARY KEY,
      user_id TEXT UNIQUE NOT NULL REFERENCES bloomy_users(id) ON DELETE CASCADE,
      display_name TEXT NOT NULL,
      specialty TEXT NOT NULL,
      organization TEXT NOT NULL,
      verified BOOLEAN NOT NULL DEFAULT FALSE,
      review_lane TEXT NOT NULL
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS bloomy_patient_profiles (
      id TEXT PRIMARY KEY,
      user_id TEXT UNIQUE NOT NULL REFERENCES bloomy_users(id) ON DELETE CASCADE,
      display_name TEXT NOT NULL,
      zip TEXT NOT NULL
    )
  `;

  await seedSystemAccounts(sql);
}

async function seedSystemAccounts(sql: SqlClient) {
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

  for (const account of seeded) {
    const existing = await sql`SELECT id FROM bloomy_users WHERE email = ${normalizeEmail(account.email)} LIMIT 1`;
    if (existing.length) {
      await sql`
        UPDATE bloomy_users
        SET
          share_data_anonymously = ${account.shareDataAnonymously ?? true},
          open_to_follow_up = ${account.openToFollowUp ?? false}
        WHERE email = ${normalizeEmail(account.email)}
      `;
      continue;
    }
    await insertUser(sql, account, { forceApproved: true, approvedBy: "system" });
  }
}

export async function createUser(input: SignupProfileInput, options?: { forceApproved?: boolean; approvedBy?: string }) {
  await ensureAuthSchemaOnce();
  return insertUser(getSql(), input, options);
}

async function insertUser(sql: SqlClient, input: SignupProfileInput, options?: { forceApproved?: boolean; approvedBy?: string }) {
  if (input.role === "admin" && !options?.forceApproved) {
    throw new Error("Admin accounts must be provisioned by an existing admin.");
  }

  validateSignup(input);

  const id = cleanId(input.uniqueId || input.email);
  const status = options?.forceApproved || input.role === "patient" ? "approved" : "pending";
  const now = new Date().toISOString();
  const passwordHash = await hashPassword(input.password);
  const workspaceId = `${input.role}-${cleanId(id)}`;
  const doctorProfileId = input.role === "doctor" || input.role === "environmental" ? `doctor-${cleanId(id)}` : null;
  const patientProfileId = input.role === "patient" ? `patient-${cleanId(id)}` : null;

  try {
    await sql`
      INSERT INTO bloomy_users (
        id, email, password_hash, name, role, status, age, sex, unique_id, occupation,
        date_of_report, postal_code, phone_number, household_member_id, physical_location,
        location_type, organization, approval_note, review_lane, share_data_anonymously,
        open_to_follow_up, workspace_id, doctor_profile_id, patient_profile_id, approved_at,
        approved_by, created_at
      ) VALUES (
        ${id}, ${normalizeEmail(input.email)}, ${passwordHash}, ${input.name.trim()}, ${input.role},
        ${status}, ${input.age || null}, ${input.sex}, ${input.uniqueId.trim()}, ${input.occupation.trim()},
        ${input.dateOfReport}, ${input.postalCode.trim()}, ${input.phoneNumber.trim()},
        ${input.householdMemberId.trim()}, ${input.physicalLocation.trim()}, ${input.locationType},
        ${input.organization?.trim() || null}, ${input.approvalNote?.trim() || null},
        ${input.reviewLane ?? defaultReviewLane(input)}, ${input.shareDataAnonymously ?? true},
        ${input.openToFollowUp ?? false}, ${workspaceId}, ${doctorProfileId}, ${patientProfileId}, ${status === "approved" ? now : null},
        ${status === "approved" ? options?.approvedBy ?? "self-service" : null}, ${now}
      )
    `;
  } catch (error) {
    throw new Error(error instanceof Error && error.message.includes("duplicate") ? "An account with that email or ID already exists." : "Could not create account.");
  }

  const profile = await getUserById(id);
  if (!profile) throw new Error("Could not load created account.");

  if (profile.role === "patient") {
    await ensurePatientProfile(profile);
  }

  if (profile.role === "doctor" || profile.role === "environmental") {
    await ensureDoctorProfile(profile);
  }

  return profile;
}

export async function authenticateUser(input: { role: AppRole; email: string; password: string; reviewLane?: ReviewLane }) {
  await ensureAuthSchemaOnce();
  const sql = getSql();
  const rows = await sql`SELECT * FROM bloomy_users WHERE email = ${normalizeEmail(input.email)} LIMIT 1`;
  const row = rows[0];
  if (!row || !(await verifyPassword(input.password, String(row.password_hash)))) {
    throw new Error("Email or password is incorrect.");
  }
  if (row.role !== input.role) {
    throw new Error("This account belongs to a different workspace.");
  }
  if (input.reviewLane && defaultReviewLane({ role: row.role, occupation: row.occupation, uniqueId: row.unique_id, reviewLane: row.review_lane }) !== input.reviewLane) {
    throw new Error("This account belongs to a different review portal.");
  }
  if (row.status !== "approved") {
    throw new Error("This account is waiting for admin approval.");
  }

  const profile = rowToProfile(row);
  if (profile.role === "patient") await ensurePatientProfile(profile);
  if (profile.role === "doctor" || profile.role === "environmental") await ensureDoctorProfile(profile);
  return profile;
}

export async function createSession(userId: string) {
  await ensureAuthSchemaOnce();
  const sql = getSql();
  const id = randomUUID();
  const now = new Date();
  const expires = new Date(now.getTime() + SESSION_MAX_AGE_SECONDS * 1000);
  await sql`
    INSERT INTO bloomy_sessions (id, user_id, expires_at, created_at)
    VALUES (${id}, ${userId}, ${expires.toISOString()}, ${now.toISOString()})
  `;
  return { id, expiresAt: expires };
}

export async function getSessionProfile(request: Request) {
  await ensureAuthSchemaOnce();
  const sessionId = readCookie(request, SESSION_COOKIE);
  if (!sessionId) return null;

  const sql = getSql();
  const rows = await sql`
    SELECT u.*
    FROM bloomy_sessions s
    JOIN bloomy_users u ON u.id = s.user_id
    WHERE s.id = ${sessionId}
      AND s.expires_at > ${new Date().toISOString()}
      AND u.status = 'approved'
    LIMIT 1
  `;

  return rows[0] ? rowToProfile(rows[0]) : null;
}

export async function deleteSession(request: Request) {
  await ensureAuthSchemaOnce();
  const sessionId = readCookie(request, SESSION_COOKIE);
  if (!sessionId) return;
  const sql = getSql();
  await sql`DELETE FROM bloomy_sessions WHERE id = ${sessionId}`;
}

export async function listPendingAccounts() {
  await ensureAuthSchemaOnce();
  const sql = getSql();
  const rows = await sql`
    SELECT * FROM bloomy_users
    WHERE status = 'pending'
    ORDER BY created_at DESC
  `;
  return rows.map(rowToAccountRecord);
}

export async function listAdminUsers() {
  await ensureAuthSchemaOnce();
  const sql = getSql();
  const rows = await sql`
    SELECT * FROM bloomy_users
    ORDER BY created_at DESC
  `;
  return rows.map(rowToAccountRecord);
}

export async function approvePendingAccount(email: string, approvedBy: string) {
  await ensureAuthSchemaOnce();
  const sql = getSql();
  const now = new Date().toISOString();
  await sql`
    UPDATE bloomy_users
    SET status = 'approved', approved_at = ${now}, approved_by = ${approvedBy}
    WHERE email = ${normalizeEmail(email)}
  `;
  const rows = await sql`SELECT * FROM bloomy_users WHERE email = ${normalizeEmail(email)} LIMIT 1`;
  if (!rows[0]) return null;
  const profile = rowToProfile(rows[0]);
  if (profile.role === "doctor" || profile.role === "environmental") await ensureDoctorProfile(profile);
  if (profile.role === "patient") await ensurePatientProfile(profile);
  return profile;
}

export async function updateSessionProfile(
  request: Request,
  input: Partial<Pick<AppUserProfile,
    "name" | "age" | "sex" | "occupation" | "postalCode" | "phoneNumber" |
    "householdMemberId" | "physicalLocation" | "locationType" | "organization" |
    "shareDataAnonymously" | "openToFollowUp"
  >>,
) {
  await ensureAuthSchemaOnce();
  const current = await getSessionProfile(request);
  if (!current) {
    throw new Error("You need to be signed in to update your profile.");
  }

  const sql = getSql();
  await sql`
    UPDATE bloomy_users
    SET
      name = ${input.name?.trim() || current.name || "Bloomy user"},
      age = ${input.age ?? current.age ?? null},
      sex = ${input.sex ?? current.sex ?? "prefer-not-to-say"},
      occupation = ${input.occupation?.trim() || current.occupation || "Community member"},
      postal_code = ${input.postalCode?.trim() || current.postalCode || "85719"},
      phone_number = ${input.phoneNumber?.trim() || current.phoneNumber || ""},
      household_member_id = ${input.householdMemberId?.trim() || current.householdMemberId || ""},
      physical_location = ${input.physicalLocation?.trim() || current.physicalLocation || ""},
      location_type = ${input.locationType ?? current.locationType ?? "home"},
      organization = ${input.organization?.trim() || current.organization || null},
      share_data_anonymously = ${input.shareDataAnonymously ?? current.shareDataAnonymously ?? true},
      open_to_follow_up = ${input.openToFollowUp ?? current.openToFollowUp ?? false}
    WHERE id = ${current.id}
  `;

  const rows = await sql`SELECT * FROM bloomy_users WHERE id = ${current.id} LIMIT 1`;
  const profile = rows[0] ? rowToProfile(rows[0]) : current;
  if (profile.role === "patient") await ensurePatientProfile(profile);
  if (profile.role === "doctor" || profile.role === "environmental") await ensureDoctorProfile(profile);
  return profile;
}

export function sessionCookie(sessionId: string, expiresAt: Date) {
  return serializeCookie(SESSION_COOKIE, sessionId, {
    httpOnly: true,
    maxAge: SESSION_MAX_AGE_SECONDS,
    expires: expiresAt,
    sameSite: "Lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });
}

export function clearSessionCookie() {
  return serializeCookie(SESSION_COOKIE, "", {
    httpOnly: true,
    maxAge: 0,
    expires: new Date(0),
    sameSite: "Lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });
}

async function getUserById(id: string) {
  const sql = getSql();
  const rows = await sql`SELECT * FROM bloomy_users WHERE id = ${id} LIMIT 1`;
  return rows[0] ? rowToProfile(rows[0]) : null;
}

async function ensurePatientProfile(profile: AppUserProfile) {
  const sql = getSql();
  const id = profile.patientProfileId ?? `patient-${cleanId(profile.id)}`;
  await sql`
    INSERT INTO bloomy_patient_profiles (id, user_id, display_name, zip)
    VALUES (${id}, ${profile.id}, ${profile.name ?? "Community reporter"}, ${profile.postalCode ?? "85719"})
    ON CONFLICT (user_id) DO NOTHING
  `;
}

async function ensureDoctorProfile(profile: AppUserProfile) {
  const sql = getSql();
  const id = profile.doctorProfileId ?? `doctor-${cleanId(profile.id)}`;
  const lane = profile.role === "environmental" ? "environmental" : defaultReviewLane(profile);
  await sql`
    INSERT INTO bloomy_doctor_profiles (id, user_id, display_name, specialty, organization, verified, review_lane)
    VALUES (${id}, ${profile.id}, ${profile.name ?? "Reviewer"}, ${profile.occupation ?? "Community health review"}, ${profile.organization ?? "Bloomy Review Network"}, true, ${lane})
    ON CONFLICT (user_id) DO UPDATE SET
      display_name = EXCLUDED.display_name,
      specialty = EXCLUDED.specialty,
      organization = EXCLUDED.organization,
      verified = EXCLUDED.verified,
      review_lane = EXCLUDED.review_lane
  `;
}

function rowToProfile(row: any): AppUserProfile {
  return {
    id: String(row.id),
    email: row.email,
    name: row.name,
    role: row.role,
    workspaceId: row.workspace_id,
    doctorProfileId: row.doctor_profile_id ?? undefined,
    patientProfileId: row.patient_profile_id ?? undefined,
    backboardThreadId: row.backboard_thread_id ?? undefined,
    age: row.age ?? undefined,
    sex: row.sex,
    uniqueId: row.unique_id,
    occupation: row.occupation,
    dateOfReport: row.date_of_report,
    postalCode: row.postal_code,
    phoneNumber: row.phone_number,
    householdMemberId: row.household_member_id,
    physicalLocation: row.physical_location,
    locationType: row.location_type,
    organization: row.organization ?? undefined,
    approvalNote: row.approval_note ?? undefined,
    approvalStatus: row.status,
    reviewLane: row.review_lane ?? undefined,
    shareDataAnonymously: row.share_data_anonymously ?? true,
    openToFollowUp: row.open_to_follow_up ?? false,
  };
}

function rowToAccountRecord(row: any): AccountRecord {
  return {
    id: String(row.id),
    email: row.email,
    password: "",
    name: row.name,
    role: row.role,
    age: row.age ?? 0,
    sex: row.sex as Sex,
    uniqueId: row.unique_id,
    occupation: row.occupation,
    dateOfReport: row.date_of_report,
    postalCode: row.postal_code,
    phoneNumber: row.phone_number,
    householdMemberId: row.household_member_id,
    physicalLocation: row.physical_location,
    locationType: row.location_type as LocationType,
    organization: row.organization ?? undefined,
    approvalNote: row.approval_note ?? undefined,
    reviewLane: row.review_lane ?? undefined,
    shareDataAnonymously: row.share_data_anonymously ?? true,
    openToFollowUp: row.open_to_follow_up ?? false,
    workspaceId: row.workspace_id,
    status: row.status,
    approvedAt: row.approved_at ?? undefined,
    approvedBy: row.approved_by ?? undefined,
    createdAt: row.created_at,
  };
}

function validateSignup(input: SignupProfileInput) {
  if (!normalizeEmail(input.email) || !input.password || !input.name.trim() || !input.uniqueId.trim()) {
    throw new Error("Please complete the required account fields.");
  }
  if (input.password.length < 6) throw new Error("Password must be at least 6 characters.");
  if (!input.postalCode.trim() || !input.phoneNumber.trim() || !input.householdMemberId.trim()) {
    throw new Error("Please add postal code, phone number, and household member ID.");
  }
  if (!input.physicalLocation.trim() || !input.locationType) {
    throw new Error("Please add the physical location and type of location.");
  }
  if (input.role === "patient" && (!Number.isFinite(input.age) || input.age < 0)) {
    throw new Error("Please enter a valid age.");
  }
}

function defaultReviewLane(input: { role: AppRole; occupation?: string; uniqueId?: string; reviewLane?: ReviewLane | null }) {
  if (input.reviewLane) return input.reviewLane;
  if (input.role === "environmental") return "environmental";
  const haystack = `${input.occupation ?? ""} ${input.uniqueId ?? ""}`.toLowerCase();
  if (haystack.includes("vet") || haystack.includes("animal")) return "veterinary";
  if (haystack.includes("environment") || haystack.includes("public health") || haystack.includes("water")) return "environmental";
  return "clinical";
}

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const key = (await scrypt(password, salt, 32)) as Buffer;
  return `scrypt$${salt}$${key.toString("hex")}`;
}

async function verifyPassword(password: string, hash: string) {
  const [, salt, expectedHex] = hash.split("$");
  if (!salt || !expectedHex) return false;
  const actual = (await scrypt(password, salt, 32)) as Buffer;
  const expected = Buffer.from(expectedHex, "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function cleanId(value: string) {
  return value.replace(/[^a-z0-9]/gi, "-").toLowerCase();
}

function readCookie(request: Request, name: string) {
  const cookie = request.headers.get("cookie") ?? "";
  return cookie
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`))
    ?.slice(name.length + 1);
}

function serializeCookie(name: string, value: string, options: {
  httpOnly?: boolean;
  maxAge?: number;
  expires?: Date;
  sameSite?: "Lax" | "Strict" | "None";
  secure?: boolean;
  path?: string;
}) {
  const parts = [`${name}=${value}`];
  if (options.maxAge !== undefined) parts.push(`Max-Age=${options.maxAge}`);
  if (options.expires) parts.push(`Expires=${options.expires.toUTCString()}`);
  if (options.path) parts.push(`Path=${options.path}`);
  if (options.httpOnly) parts.push("HttpOnly");
  if (options.secure) parts.push("Secure");
  if (options.sameSite) parts.push(`SameSite=${options.sameSite}`);
  return parts.join("; ");
}

let schemaReady: Promise<void> | null = null;
async function ensureAuthSchemaOnce() {
  if (!schemaReady) {
    schemaReady = ensureAuthSchema();
  }
  return schemaReady;
}
