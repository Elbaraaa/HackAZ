import { neon } from "@neondatabase/serverless";
import { randomUUID } from "node:crypto";
import { isDatabaseConfigured } from "@/lib/server/auth-db";

type SqlClient = ReturnType<typeof neon>;

export type HealthCheckInInput = {
  userId: string;
  zip?: string;
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

export type HealthCheckIn = Required<Omit<HealthCheckInInput, "zip" | "duration" | "fever" | "massGathering" | "summary" | "nextSteps">> & {
  id: string;
  zip: string;
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
      zip TEXT NOT NULL DEFAULT '85719',
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
  await sql`ALTER TABLE health_checkins ADD COLUMN IF NOT EXISTS zip TEXT NOT NULL DEFAULT '85719'`;
  await seedDemoHealthCheckIns(sql);
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
    zip: normalizeZip(input.zip),
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
      id, user_id, zip, feeling, symptoms, duration, fever, mass_gathering, source,
      daily_check_in_complete, summary, next_steps, created_at, updated_at
    ) VALUES (
      ${checkIn.id}, ${checkIn.userId}, ${checkIn.zip}, ${checkIn.feeling}, ${JSON.stringify(checkIn.symptoms)}::jsonb,
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
          zip,
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
          zip,
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

async function seedDemoHealthCheckIns(sql: SqlClient) {
  const seeded = buildSeedCheckIns();

  for (const checkIn of seeded) {
    await sql`
      INSERT INTO health_checkins (
        id, user_id, zip, feeling, symptoms, duration, fever, mass_gathering, source,
        daily_check_in_complete, summary, next_steps, created_at, updated_at
      ) VALUES (
        ${checkIn.id}, ${checkIn.userId}, ${checkIn.zip}, ${checkIn.feeling}, ${JSON.stringify(checkIn.symptoms)}::jsonb,
        ${checkIn.duration ?? null}, ${serializeNullableAnswer(checkIn.fever)}, ${serializeNullableAnswer(checkIn.massGathering)},
        ${checkIn.source}, ${checkIn.dailyCheckInComplete}, ${checkIn.summary ?? null}, ${checkIn.nextSteps ?? null},
        ${checkIn.createdAt}, ${checkIn.updatedAt}
      )
      ON CONFLICT (id) DO NOTHING
    `;
  }
}

function buildSeedCheckIns(): HealthCheckIn[] {
  const base = Date.now();
  const hours = (n: number) => n * 60 * 60 * 1000;
  const rows: Array<Omit<HealthCheckIn, "createdAt" | "updatedAt"> & { ageHours: number }> = [
    { id: "seed-case-001", userId: "seed-person-001", zip: "85719", feeling: "sick", symptoms: ["fever", "cough congestion", "body aches"], duration: "two days", fever: true, massGathering: true, source: "seed-web", dailyCheckInComplete: true, summary: "Student reported fever, cough, and missed class after a crowded event.", nextSteps: "Rest, mask around others, monitor fever, and consider testing or clinical care if symptoms worsen.", ageHours: 5 },
    { id: "seed-case-002", userId: "seed-person-002", zip: "85719", feeling: "sick", symptoms: ["sore throat", "cough", "fatigue"], duration: "one day", fever: "unknown", massGathering: false, source: "seed-web", dailyCheckInComplete: true, summary: "Respiratory symptoms without known gathering exposure.", nextSteps: "Hydrate, reduce exposure, and re-check tomorrow.", ageHours: 9 },
    { id: "seed-case-003", userId: "seed-person-003", zip: "85721", feeling: "sick", symptoms: ["difficulty breathing", "cough congestion"], duration: "three days", fever: true, massGathering: true, source: "seed-alexa", dailyCheckInComplete: true, summary: "Higher-priority respiratory report with breathing difficulty.", nextSteps: "Seek clinical advice promptly, especially if breathing worsens.", ageHours: 12 },
    { id: "seed-case-004", userId: "seed-person-004", zip: "85705", feeling: "sick", symptoms: ["nausea vomiting", "diarrhea"], duration: "one day", fever: false, massGathering: false, source: "seed-web", dailyCheckInComplete: true, summary: "Gastrointestinal symptoms near recent water quality reports.", nextSteps: "Use safe fluids, avoid shared food prep, and seek care if dehydration appears.", ageHours: 18 },
    { id: "seed-case-005", userId: "seed-person-005", zip: "85705", feeling: "unsure", symptoms: ["red eyes", "rash"], duration: "two days", fever: false, massGathering: "unknown", source: "seed-web", dailyCheckInComplete: true, summary: "Possible irritation or vector/environment exposure signal.", nextSteps: "Avoid suspected exposure and document any spread or fever.", ageHours: 23 },
    { id: "seed-case-006", userId: "seed-person-006", zip: "85629", feeling: "sick", symptoms: ["fever", "body aches", "chills"], duration: "two days", fever: true, massGathering: false, source: "seed-web", dailyCheckInComplete: true, summary: "Farm-area flu-like symptoms alongside veterinary watch signals.", nextSteps: "Limit close animal handling while symptomatic and monitor household symptoms.", ageHours: 28 },
    { id: "seed-case-007", userId: "seed-person-007", zip: "85629", feeling: "good", symptoms: [], duration: undefined, fever: false, massGathering: false, source: "seed-web", dailyCheckInComplete: true, summary: "Healthy farm-area baseline check-in.", nextSteps: "Keep weekly reporting active to improve early detection.", ageHours: 31 },
    { id: "seed-case-008", userId: "seed-person-008", zip: "85641", feeling: "unsure", symptoms: ["headache", "fatigue"], duration: "one day", fever: false, massGathering: true, source: "seed-alexa", dailyCheckInComplete: true, summary: "Mild symptoms during heat watch period.", nextSteps: "Hydrate, cool down, and watch for worsening dizziness or fever.", ageHours: 36 },
    { id: "seed-case-009", userId: "seed-person-009", zip: "85641", feeling: "sick", symptoms: ["fever", "headache", "body aches"], duration: "three days", fever: true, massGathering: false, source: "seed-web", dailyCheckInComplete: true, summary: "Fever and aches near environmental heat signal.", nextSteps: "Rest and consider care if fever persists or confusion appears.", ageHours: 42 },
    { id: "seed-case-010", userId: "seed-person-010", zip: "85721", feeling: "good", symptoms: [], duration: undefined, fever: false, massGathering: false, source: "seed-web", dailyCheckInComplete: true, summary: "Healthy baseline from campus area.", nextSteps: "Continue check-ins this week.", ageHours: 47 },
    { id: "seed-case-011", userId: "seed-person-011", zip: "85719", feeling: "sick", symptoms: ["loss smell taste", "cough congestion"], duration: "two days", fever: "unknown", massGathering: true, source: "seed-web", dailyCheckInComplete: true, summary: "Respiratory report with taste/smell change after group exposure.", nextSteps: "Consider testing, mask, and avoid high-risk contacts.", ageHours: 55 },
    { id: "seed-case-012", userId: "seed-person-012", zip: "85705", feeling: "sick", symptoms: ["diarrhea", "stomach pain"], duration: "two days", fever: false, massGathering: false, source: "seed-alexa", dailyCheckInComplete: true, summary: "Second gastrointestinal report in 85705 this week.", nextSteps: "Track water/food exposures and seek care for dehydration.", ageHours: 62 },
    { id: "seed-case-013", userId: "seed-person-013", zip: "85629", feeling: "unsure", symptoms: ["rash", "red eyes"], duration: "four days", fever: false, massGathering: "unknown", source: "seed-web", dailyCheckInComplete: true, summary: "Skin/eye irritation near animal and vector watch area.", nextSteps: "Use protective gear outdoors and report animal illness changes.", ageHours: 70 },
    { id: "seed-case-014", userId: "seed-person-014", zip: "85719", feeling: "good", symptoms: [], duration: undefined, fever: false, massGathering: true, source: "seed-web", dailyCheckInComplete: true, summary: "Healthy report after social exposure.", nextSteps: "Re-check if symptoms begin.", ageHours: 79 },
    { id: "seed-case-015", userId: "seed-person-015", zip: "85721", feeling: "sick", symptoms: ["sore throat", "fever", "chills"], duration: "one day", fever: true, massGathering: true, source: "seed-web", dailyCheckInComplete: true, summary: "Campus-area flu-like symptoms after gathering.", nextSteps: "Stay home while feverish and consider testing.", ageHours: 86 },
    { id: "seed-case-016", userId: "seed-person-016", zip: "85641", feeling: "good", symptoms: [], duration: undefined, fever: false, massGathering: false, source: "seed-web", dailyCheckInComplete: true, summary: "Healthy baseline during heat watch.", nextSteps: "Maintain hydration and check in again this week.", ageHours: 95 },
    { id: "seed-case-017", userId: "seed-person-017", zip: "85705", feeling: "sick", symptoms: ["nausea vomiting", "fever"], duration: "one day", fever: true, massGathering: false, source: "seed-web", dailyCheckInComplete: true, summary: "Gastrointestinal illness with fever near water/vector reports.", nextSteps: "Avoid shared food prep and seek care if fever persists.", ageHours: 110 },
    { id: "seed-case-018", userId: "seed-person-018", zip: "85629", feeling: "sick", symptoms: ["body aches", "fatigue", "fever"], duration: "three days", fever: true, massGathering: false, source: "seed-alexa", dailyCheckInComplete: true, summary: "Rural-area fever and aches, useful for zoonotic monitoring.", nextSteps: "Limit close herd contact while symptomatic and call a clinician if worsening.", ageHours: 126 },
    { id: "seed-case-019", userId: "seed-person-019", zip: "85719", feeling: "unsure", symptoms: ["headache", "fatigue"], duration: "one day", fever: false, massGathering: false, source: "seed-web", dailyCheckInComplete: true, summary: "Mild nonspecific report that helps trend analysis.", nextSteps: "Monitor sleep, hydration, and new symptoms.", ageHours: 142 },
    { id: "seed-case-020", userId: "seed-person-020", zip: "85721", feeling: "good", symptoms: [], duration: undefined, fever: false, massGathering: false, source: "seed-web", dailyCheckInComplete: true, summary: "Healthy baseline check-in from campus area.", nextSteps: "Keep reporting weekly.", ageHours: 158 },
  ];

  return rows.map((row) => {
    const timestamp = new Date(base - hours(row.ageHours)).toISOString();
    const { ageHours, ...checkIn } = row;
    return {
      ...checkIn,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
  });
}

function normalizeZip(value: string | undefined) {
  const digits = value?.replace(/[^\d]/g, "").slice(0, 5);
  return digits && digits.length >= 5 ? digits : "85719";
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
    zip: normalizeZip(typeof row.zip === "string" ? row.zip : undefined),
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
