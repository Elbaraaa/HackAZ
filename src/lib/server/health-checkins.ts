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

export async function listHealthCheckIns(options: { limit?: number; source?: string } = {}) {
  if (!isDatabaseConfigured()) {
    throw new Error("DATABASE_URL is not configured");
  }

  await ensureHealthCheckInSchemaOnce();
  const sql = getSql();
  const limit = Math.min(Math.max(Math.round(options.limit ?? 50), 1), 100);
  const source = options.source?.trim();
  const rows = source
    ? await sql`
        SELECT
          id,
          user_id AS "userId",
          feeling,
          symptoms,
          duration,
          fever,
          mass_gathering AS "massGathering",
          source,
          daily_check_in_complete AS "dailyCheckInComplete",
          summary,
          next_steps AS "nextSteps",
          created_at AS "createdAt",
          updated_at AS "updatedAt"
        FROM health_checkins
        WHERE source = ${source}
        ORDER BY created_at DESC
        LIMIT ${limit}
      `
    : await sql`
        SELECT
          id,
          user_id AS "userId",
          feeling,
          symptoms,
          duration,
          fever,
          mass_gathering AS "massGathering",
          source,
          daily_check_in_complete AS "dailyCheckInComplete",
          summary,
          next_steps AS "nextSteps",
          created_at AS "createdAt",
          updated_at AS "updatedAt"
        FROM health_checkins
        ORDER BY created_at DESC
        LIMIT ${limit}
      `;

  return rows.map(rowToHealthCheckIn);
}

function serializeNullableAnswer(value: boolean | "unknown" | undefined) {
  if (value === undefined) return null;
  if (value === "unknown") return "unknown";
  return value ? "true" : "false";
}

function deserializeNullableAnswer(value: unknown): boolean | "unknown" | undefined {
  if (value === null || value === undefined) return undefined;
  if (value === true || value === false || value === "unknown") return value;
  if (value === "true") return true;
  if (value === "false") return false;
  return undefined;
}

function parseSymptoms(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String);
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed.map(String) : [];
    } catch {
      return [];
    }
  }
  return [];
}

function normalizeSavedFeeling(value: unknown): HealthCheckIn["feeling"] {
  if (value === "good" || value === "sick" || value === "unsure") return value;
  return "unsure";
}

function rowToHealthCheckIn(row: Record<string, unknown>): HealthCheckIn {
  return {
    id: String(row.id),
    userId: String(row.userId),
    feeling: normalizeSavedFeeling(row.feeling),
    symptoms: parseSymptoms(row.symptoms),
    duration: typeof row.duration === "string" ? row.duration : undefined,
    fever: deserializeNullableAnswer(row.fever),
    massGathering: deserializeNullableAnswer(row.massGathering),
    source: typeof row.source === "string" ? row.source : "web",
    dailyCheckInComplete: Boolean(row.dailyCheckInComplete),
    summary: typeof row.summary === "string" ? row.summary : undefined,
    nextSteps: typeof row.nextSteps === "string" ? row.nextSteps : undefined,
    createdAt: typeof row.createdAt === "string" ? row.createdAt : new Date().toISOString(),
    updatedAt: typeof row.updatedAt === "string" ? row.updatedAt : new Date().toISOString(),
  };
}

let schemaReady: Promise<void> | null = null;
function ensureHealthCheckInSchemaOnce() {
  if (!schemaReady) {
    schemaReady = ensureHealthCheckInSchema();
  }
  return schemaReady;
}
