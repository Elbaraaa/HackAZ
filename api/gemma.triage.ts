const GEMMA_MODEL = "gemini-2.5-flash";

type VercelRequest = {
  method?: string;
  body?: TriageRequestBody;
};

type VercelResponse = {
  status: (code: number) => {
    json: (body: unknown) => void;
  };
};

type TriageRequestBody = {
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

type GeminiPart = {
  text?: string;
};

type GeminiResult = {
  candidates?: {
    content?: {
      parts?: GeminiPart[];
    };
  }[];
  error?: {
    message?: string;
  };
};

type ParsedGemmaResponse = {
  possibleMatch?: unknown;
  possibleConditions?: unknown;
  urgencyScore?: unknown;
  urgencyLabel?: unknown;
  level?: unknown;
  summary?: unknown;
  nextSteps?: unknown;
  redFlags?: unknown;
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return res.status(500).json({ error: "GEMINI_API_KEY is not configured" });
    }

    const body = req.body ?? {};

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

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMMA_MODEL}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
        }),
      }
    );

    const result = (await response.json()) as GeminiResult;

    if (!response.ok) {
      return res.status(response.status).json({
        error: result.error?.message || "Gemini triage failed",
      });
    }

    return res.status(200).json(parseGemmaJson(extractText(result)));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gemini triage failed";
    return res.status(500).json({ error: message });
  }
}

function extractText(result: GeminiResult) {
  return result.candidates?.[0]?.content?.parts
    ?.map((part) => part.text)
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

  let parsed: ParsedGemmaResponse;

  try {
    parsed = JSON.parse(jsonText) as ParsedGemmaResponse;
  } catch {
    parsed = { summary: cleaned, nextSteps: [] };
  }

  const urgencyScore = typeof parsed.urgencyScore === "number"
    ? Math.max(0, Math.min(100, Math.round(parsed.urgencyScore)))
    : undefined;

  const level = ["low", "moderate", "high", "critical"].includes(String(parsed.level))
    ? String(parsed.level)
    : undefined;

  return {
    possibleMatch: typeof parsed.possibleMatch === "string" ? parsed.possibleMatch : "",
    possibleConditions: Array.isArray(parsed.possibleConditions)
      ? parsed.possibleConditions.filter((item): item is string => typeof item === "string").slice(0, 4)
      : [],
    urgencyScore,
    urgencyLabel: typeof parsed.urgencyLabel === "string" ? parsed.urgencyLabel : "",
    level,
    summary: typeof parsed.summary === "string" ? parsed.summary : "",
    nextSteps: Array.isArray(parsed.nextSteps)
      ? parsed.nextSteps.filter((step): step is string => typeof step === "string").slice(0, 3)
      : [],
    redFlags: Array.isArray(parsed.redFlags)
      ? parsed.redFlags.filter((item): item is string => typeof item === "string").slice(0, 4)
      : [],
  };
}