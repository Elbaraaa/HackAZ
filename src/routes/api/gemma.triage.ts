import { createFileRoute } from "@tanstack/react-router";

const GEMMA_MODEL = "gemma-3-27b-it";

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
          };

          const prompt = [
            "You are helping Bloomy create a safe health check-in summary.",
            "Do not diagnose. Do not name a disease as certain. Use summary and next steps language only.",
            "Return compact JSON only with keys summary and nextSteps. nextSteps must be an array of 3 short strings.",
            "Include escalation language if symptoms worsen or the user feels unsafe.",
            `Feeling: ${body.feeling ?? "unknown"}`,
            `Symptoms: ${(body.symptoms ?? []).join(", ") || body.otherSymptom || "none provided"}`,
            `Rule-based urgency: ${body.urgencyLabel ?? "unknown"} (${body.riskScore ?? "unknown"})`,
            `Rule factors: ${(body.factors ?? []).join("; ") || "none"}`,
            `ZIP/context: ${body.zip ?? "unknown"}`,
          ].join("\n");

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
  const cleaned = text.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```$/i, "").trim();
  const parsed = JSON.parse(cleaned) as { summary?: unknown; nextSteps?: unknown };
  return {
    summary: typeof parsed.summary === "string" ? parsed.summary : "",
    nextSteps: Array.isArray(parsed.nextSteps) ? parsed.nextSteps.filter((step): step is string => typeof step === "string").slice(0, 3) : [],
  };
}
