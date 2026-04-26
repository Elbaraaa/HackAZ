import { createFileRoute } from "@tanstack/react-router";
import { isDatabaseConfigured } from "@/lib/server/auth-db";
import { listHealthCheckIns, saveHealthCheckIn, type HealthCheckInInput } from "@/lib/server/health-checkins";

export const Route = createFileRoute("/api/checkins")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        if (!isDatabaseConfigured()) {
          return Response.json({ success: true, configured: false, checkIns: [] });
        }

        try {
          const url = new URL(request.url);
          const limit = Number(url.searchParams.get("limit") ?? 50);
          const source = url.searchParams.get("source") ?? undefined;
          const checkIns = await listHealthCheckIns({ limit, source });
          return Response.json({ success: true, configured: true, checkIns });
        } catch (error) {
          console.error("Check-in list API error", error);
          const message = error instanceof Error ? error.message : "Could not load check-ins.";
          return Response.json({ success: false, error: message }, { status: 500 });
        }
      },
      POST: async ({ request }) => {
        if (!isDatabaseConfigured()) {
          return Response.json({ success: false, error: "DATABASE_URL is not configured." }, { status: 503 });
        }

        try {
          const body = (await request.json()) as Partial<HealthCheckInInput>;
          const checkIn = await saveHealthCheckIn({
            userId: body.userId || "demo-user",
            zip: body.zip,
            feeling: normalizeFeeling(body.feeling),
            symptoms: Array.isArray(body.symptoms) ? body.symptoms.map(String) : [],
            duration: body.duration,
            fever: normalizeUnknownBoolean(body.fever),
            massGathering: normalizeUnknownBoolean(body.massGathering),
            source: body.source || "web",
            dailyCheckInComplete: body.dailyCheckInComplete ?? true,
            summary: body.summary,
            nextSteps: body.nextSteps,
          });

          return Response.json({ success: true, checkIn });
        } catch (error) {
          console.error("Check-in API error", error);
          const message = error instanceof Error ? error.message : "Could not save check-in.";
          return Response.json({ success: false, error: message }, { status: 400 });
        }
      },
    },
  },
});

function normalizeFeeling(value: unknown): HealthCheckInInput["feeling"] {
  if (value === "good" || value === "sick" || value === "unsure") return value;
  if (value === "healthy") return "good";
  if (value === "symptoms") return "sick";
  return "unsure";
}

function normalizeUnknownBoolean(value: unknown): boolean | "unknown" | undefined {
  if (value === true || value === false || value === "unknown") return value;
  if (value === "true" || value === "yes") return true;
  if (value === "false" || value === "no") return false;
  return undefined;
}
