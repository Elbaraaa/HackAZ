import { createFileRoute } from "@tanstack/react-router";

const GEMMA_MODEL = "gemma-4-27b-it";

export const Route = createFileRoute("/api/gemma/triage")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const apiKey = process.env.GEMINI_API_KEY;
          if (!apiKey) {
            return Response.json({ error: "GEMINI_API_KEY is not configured" }, { status: 500 });
          }

          const body = (await request.json()) as {
            feeling?: string;
            symptoms?: string[];
            otherSymptom?: string;
            riskScore?: number;
            urgencyLabel?: string;
            zip?: string;
            factors?: string[];
            followUps?: string[];
            vitals?: Record<string, unknown>;
          };

          const prompt = [
            "You are Bloomy's cautious symptom triage assistant for a community health app.",
            "Use the symptom combination to suggest possible conditions, a practical urgency score, and next actions.",
            "Do not claim a confirmed diagnosis. Use wording like possible, may fit, or consider.",
            "Avoid extreme urgency scores for one or two mild symptoms. Keep mild cold/allergy/stomach patterns low or moderate unless red flags are present.",
            "Urgency score guide: 0-25 mild self-care, 26-45 monitor/consider care, 46-69 medical advice soon, 70-85 urgent care if persistent/severe, 86-100 emergency red flags.",
            "Red flags that can justify high scores: difficulty breathing, bleeding from body openings, confusion/fainting, severe dehydration, blue lips, chest pain, rapidly worsening symptoms, yellow skin/eyes, bloody urine.",
            "Return compact JSON only with keys possibleMatch, possibleConditions, urgencyScore, urgencyLabel, level, summary, nextSteps, redFlags.",
            "possibleConditions must be 2-4 short strings. nextSteps must be 3 short strings. redFlags must be selected red flags only.",
            `Feeling: ${body.feeling ?? "unknown"}`,
            `Symptoms: ${(body.symptoms ?? []).join(", ") || body.otherSymptom || "none provided"}`,
            body.otherSymptom ? `Other symptom text: ${body.otherSymptom}` : "",
            `Current fallback urgency: ${body.urgencyLabel ?? "unknown"} (${body.riskScore ?? "unknown"})`,
            `Fallback factors: ${(body.factors ?? []).join("; ") || "none"}`,
            `Follow-up context: ${(body.followUps ?? []).join("; ") || "none"}`,
            `Vitals/context: ${JSON.stringify(body.vitals ?? {})}`,
            `ZIP/context: ${body.zip ?? "unknown"}`,
          ].filter(Boolean).join("\n");

          const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${GEMMA_MODEL}:generateContent`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-goog-api-key": apiKey,
            },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
            }),
          });

          const result = await response.json();
          if (!response.ok) {
            return Response.json({ error: result?.error?.message || "Gemma triage failed" }, { status: response.status });
          }

          return Response.json(parseGemmaJson(extractText(result)));
        } catch (error) {
          const message = error instanceof Error ? error.message : "Gemma triage failed";
          return Response.json({ error: message }, { status: 500 });
        }
      },
    },
  },
});

function extractText(result: any) {
  return result?.candidates?.[0]?.content?.parts
    ?.map((part: { text?: string }) => part.text)
    .filter(Boolean)
    .join("\n")
    .trim() || "{}";
}

function parseGemmaJson(text: string) {
  const cleaned = text
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```$/i, "")
    .trim();
  const jsonText = cleaned.match(/\{[\s\S]*\}/)?.[0] ?? cleaned;
  let parsed: {
    possibleMatch?: unknown;
    possibleConditions?: unknown;
    urgencyScore?: unknown;
    urgencyLabel?: unknown;
    level?: unknown;
    summary?: unknown;
    nextSteps?: unknown;
    redFlags?: unknown;
  };

  try {
    parsed = JSON.parse(jsonText);
  } catch {
    parsed = { summary: cleaned, nextSteps: [] };
  }
  const urgencyScore = typeof parsed.urgencyScore === "number"
    ? Math.max(0, Math.min(100, Math.round(parsed.urgencyScore)))
    : undefined;
  const level = ["low", "moderate", "high", "critical"].includes(String(parsed.level)) ? String(parsed.level) : undefined;

  return {
    possibleMatch: typeof parsed.possibleMatch === "string" ? parsed.possibleMatch : "",
    possibleConditions: Array.isArray(parsed.possibleConditions) ? parsed.possibleConditions.filter((item): item is string => typeof item === "string").slice(0, 4) : [],
    urgencyScore,
    urgencyLabel: typeof parsed.urgencyLabel === "string" ? parsed.urgencyLabel : "",
    level,
    summary: typeof parsed.summary === "string" ? parsed.summary : "",
    nextSteps: Array.isArray(parsed.nextSteps) ? parsed.nextSteps.filter((step): step is string => typeof step === "string").slice(0, 3) : [],
    redFlags: Array.isArray(parsed.redFlags) ? parsed.redFlags.filter((item): item is string => typeof item === "string").slice(0, 4) : [],
  };
}
