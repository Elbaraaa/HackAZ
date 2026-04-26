import { neon } from "@neondatabase/serverless";
import { randomUUID } from "node:crypto";
import { isDatabaseConfigured } from "@/lib/server/auth-db";

type SqlClient = ReturnType<typeof neon>;

export type HealthCheckInInput = {
  userId: string;
  feeling: "good" | "sick" | "unsure";
  symptoms?: string[];
  duration?: string;
  fever?: boolean | "unknown";
  massGathering?: boolean | "unknown";
  source?: "alexa" | "web" | string;
  dailyCheckInComplete?: boolean;
  summary?: string;
  nextSteps?: string;
};

export type HealthCheckIn = Required<Omit<HealthCheckInInput, "duration" | "fever" | "massGathering" | "summary" | "nextSteps">> & {
  id: string;
  duration?: string;
  fever?: boolean | "unknown";
  massGathering?: boolean | "unknown";
  summary?: string;
  nextSteps?: string;
  createdAt: string;
  updatedAt: string;
};

function getSql() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL is not configured");
  return neon(databaseUrl);
}

export async function ensureHealthCheckInSchema() {
  const sql = getSql();
  await sql`
    CREATE TABLE IF NOT EXISTS health_checkins (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      feeling TEXT NOT NULL,
      symptoms JSONB NOT NULL DEFAULT '[]'::jsonb,
      duration TEXT,
      fever TEXT,
      mass_gathering TEXT,
      source TEXT NOT NULL,
      daily_check_in_complete BOOLEAN NOT NULL DEFAULT FALSE,
      summary TEXT,
      next_steps TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `;
}

export async function saveHealthCheckIn(input: HealthCheckInInput) {
  if (!isDatabaseConfigured()) {
    throw new Error("DATABASE_URL is not configured");
  }

  await ensureHealthCheckInSchemaOnce();
  const sql = getSql();
  const now = new Date().toISOString();
  const checkIn: HealthCheckIn = {
    id: randomUUID(),
    userId: input.userId,
    feeling: input.feeling,
    symptoms: input.symptoms ?? [],
    duration: input.duration?.trim() || undefined,
    fever: input.fever,
    massGathering: input.massGathering,
    source: input.source ?? "web",
    dailyCheckInComplete: input.dailyCheckInComplete ?? false,
    summary: input.summary?.trim() || undefined,
    nextSteps: input.nextSteps?.trim() || undefined,
    createdAt: now,
    updatedAt: now,
  };

  await sql`
    INSERT INTO health_checkins (
      id, user_id, feeling, symptoms, duration, fever, mass_gathering, source,
      daily_check_in_complete, summary, next_steps, created_at, updated_at
    ) VALUES (
      ${checkIn.id}, ${checkIn.userId}, ${checkIn.feeling}, ${JSON.stringify(checkIn.symptoms)}::jsonb,
      ${checkIn.duration ?? null}, ${serializeNullableAnswer(checkIn.fever)}, ${serializeNullableAnswer(checkIn.massGathering)},
      ${checkIn.source}, ${checkIn.dailyCheckInComplete}, ${checkIn.summary ?? null},
      ${checkIn.nextSteps ?? null}, ${checkIn.createdAt}, ${checkIn.updatedAt}
    )
  `;

  return checkIn;
}

function serializeNullableAnswer(value: boolean | "unknown" | undefined) {
  if (value === undefined) return null;
  if (value === "unknown") return "unknown";
  return value ? "true" : "false";
}

let schemaReady: Promise<void> | null = null;
function ensureHealthCheckInSchemaOnce() {
  if (!schemaReady) {
    schemaReady = ensureHealthCheckInSchema();
  }
  return schemaReady;
}
