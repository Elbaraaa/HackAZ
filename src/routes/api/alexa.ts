import { createFileRoute } from "@tanstack/react-router";
import { saveHealthCheckIn, type HealthCheckInInput } from "@/lib/server/health-checkins";

const DEMO_USER_ID = "demo-user";
const GEMMA_MODEL = "gemma-3-27b-it";
const FALLBACK_TEXT = "Sorry, I didn't catch that. How are you feeling today?";

type ConversationStep = "ASK_FEELING" | "ASK_SYMPTOMS" | "ASK_IMPACT" | "ASK_GATHERING";
type AlexaSessionAttributes = {
  step?: ConversationStep;
  feeling?: "well" | "not_well" | "unsure";
  symptoms?: string;
  impact?: string;
};

export const Route = createFileRoute("/api/alexa")({
  server: {
    handlers: {
      GET: async () => {
        return Response.json({
          ok: true,
          service: "Bloomy Alexa webhook",
          gemmaConfigured: Boolean(process.env.GEMINI_API_KEY),
          expectedEndpoint: "https://www.bloomy.health/api/alexa",
        });
      },
      POST: async ({ request }) => {
        // Alexa skill webhooks are called server-to-server and must remain publicly accessible:
        // do not require cookies, sessions, login, or CSRF tokens on this route.
        try {
          const body = await request.json().catch(() => ({}));
          console.log("Alexa request", JSON.stringify({
            type: body?.request?.type,
            intent: body?.request?.intent?.name,
            sessionAttributes: body?.session?.attributes,
          }));
          return Response.json(await handleAlexaRequest(body), { status: 200 });
        } catch (error) {
          console.error("Alexa endpoint error", error);
          return Response.json(buildAlexaResponse(FALLBACK_TEXT, false, { step: "ASK_FEELING" }), { status: 200 });
        }
      },
    },
  },
});

async function handleAlexaRequest(body: any) {
  const requestType = body?.request?.type;
  const sessionAttributes = readSessionAttributes(body);
  const intentName = getIntentName(body);
  const spokenText = getSpokenText(body);

  if (requestType === "LaunchRequest") {
    return buildAlexaResponse(
      "Good morning. Welcome to Bloomy. How are you feeling today?",
      false,
      { step: "ASK_FEELING" },
      "How are you feeling today?",
    );
  }

  if (requestType === "SessionEndedRequest") {
    return buildAlexaResponse("Goodbye.", true, {});
  }

  if (requestType !== "IntentRequest") {
    return buildAlexaResponse(FALLBACK_TEXT, false, { step: "ASK_FEELING" }, "How are you feeling today?");
  }

  if (intentName === "AMAZON.CancelIntent" || intentName === "AMAZON.StopIntent") {
    return buildAlexaResponse("Thanks for checking in with Bloomy. Goodbye.", true, {});
  }

  if (intentName === "AMAZON.HelpIntent") {
    return buildAlexaResponse(helpForStep(sessionAttributes.step), false, sessionAttributes);
  }

  if (intentName === "DebugIntent") {
    return handleDebugIntent();
  }

  if (intentName === "CheckInIntent" || intentName === "OneShotCheckInIntent") {
    return handleOneShotCheckIn(spokenText);
  }

  if (intentName === "FeelingIntent" || sessionAttributes.step === "ASK_FEELING") {
    return handleFeeling(spokenText);
  }

  if (intentName === "SymptomsIntent" || sessionAttributes.step === "ASK_SYMPTOMS") {
    return handleSymptoms(spokenText, sessionAttributes);
  }

  if (intentName === "ImpactIntent" || sessionAttributes.step === "ASK_IMPACT") {
    return handleImpact(spokenText, sessionAttributes);
  }

  if (intentName === "SocialGatheringIntent" || sessionAttributes.step === "ASK_GATHERING") {
    return handleGathering(spokenText, sessionAttributes, intentName);
  }

  return buildAlexaResponse(FALLBACK_TEXT, false, { step: "ASK_FEELING" }, "How are you feeling today?");
}

async function handleDebugIntent() {
  if (!process.env.GEMINI_API_KEY) {
    return buildAlexaResponse(
      "Bloomy is reachable, but Gemma is not configured on this deployment.",
      true,
      {},
    );
  }

  const ai = await getAiSummary({
    userId: DEMO_USER_ID,
    feeling: "sick",
    symptoms: ["debug cough"],
    source: "alexa",
    dailyCheckInComplete: false,
  });

  return buildAlexaResponse(
    ai ? "Bloomy is reachable and Gemma responded successfully." : "Bloomy is reachable, but Gemma did not respond successfully.",
    true,
    {},
  );
}

async function handleOneShotCheckIn(spokenText: string) {
  const feeling = classifyFeeling(spokenText);
  const symptoms = extractSymptomsFromText(spokenText);
  const impact = extractImpactFromText(spokenText);
  const gathering = /gathering|party|event|meeting|crowd|crowded|school|work|class/i.test(spokenText)
    ? true
    : classifyYesNo(spokenText);

  const checkIn: HealthCheckInInput = {
    userId: DEMO_USER_ID,
    feeling: feeling === "well" ? "good" : symptoms.length || feeling === "not_well" ? "sick" : "unsure",
    symptoms,
    massGathering: gathering,
    source: "alexa",
    dailyCheckInComplete: true,
    summary: impact ? `Impact reported: ${impact}` : undefined,
  };

  const ai = await getAiSummary(checkIn);
  await persistCheckIn({
    ...checkIn,
    summary: ai?.summary ?? checkIn.summary,
    nextSteps: ai?.nextSteps,
  });

  if (ai?.summary && ai.nextSteps) {
    return buildAlexaResponse(
      `Checked in with Bloomy. ${ai.summary}. Next steps: ${ai.nextSteps}.`,
      true,
      {},
    );
  }

  return buildAlexaResponse(
    "Checked in with Bloomy. I saved your report, but Gemma did not return guidance this time.",
    true,
    {},
  );
}

function handleFeeling(spokenText: string) {
  const feeling = classifyFeeling(spokenText);

  if (feeling === "well") {
    return buildAlexaResponse(
      "Glad to hear that. Have you been around any social gatherings recently?",
      false,
      { step: "ASK_GATHERING", feeling },
      "Have you been around any social gatherings recently?",
    );
  }

  if (feeling === "not_well" || feeling === "unsure") {
    return buildAlexaResponse(
      "I'm sorry to hear that. What symptoms are you experiencing?",
      false,
      { step: "ASK_SYMPTOMS", feeling },
      "What symptoms are you experiencing?",
    );
  }

  return buildAlexaResponse(FALLBACK_TEXT, false, { step: "ASK_FEELING" }, "How are you feeling today?");
}

function handleSymptoms(spokenText: string, sessionAttributes: AlexaSessionAttributes) {
  const symptoms = spokenText.trim() || "unspecified symptoms";
  return buildAlexaResponse(
    "Were you absent from work or school, or did you seek healthcare or treatment?",
    false,
    {
      ...sessionAttributes,
      step: "ASK_IMPACT",
      symptoms,
    },
    "Were you absent from work or school, or did you seek healthcare or treatment?",
  );
}

function handleImpact(spokenText: string, sessionAttributes: AlexaSessionAttributes) {
  return buildAlexaResponse(
    "Have you been around any social gatherings recently?",
    false,
    {
      ...sessionAttributes,
      step: "ASK_GATHERING",
      impact: spokenText.trim() || "unknown",
    },
    "Have you been around any social gatherings recently?",
  );
}

async function handleGathering(spokenText: string, sessionAttributes: AlexaSessionAttributes, intentName?: string) {
  const gathering =
    intentName === "AMAZON.YesIntent" ? true :
    intentName === "AMAZON.NoIntent" ? false :
    classifyYesNo(spokenText);
  const checkIn = buildCheckIn(sessionAttributes, gathering);
  const ai = await getAiSummary(checkIn);

  await persistCheckIn({
    ...checkIn,
    summary: ai?.summary,
    nextSteps: ai?.nextSteps,
  });

  if (ai?.summary && ai.nextSteps) {
    return buildAlexaResponse(
      `Based on what you shared, ${ai.summary}. Your next steps are: ${ai.nextSteps}.`,
      true,
      {},
    );
  }

  return buildAlexaResponse(
    "Based on what you shared, please rest, hydrate, monitor your symptoms, and follow the Bloomy app for next steps.",
    true,
    {},
  );
}

export function classifyFeeling(text: string): "well" | "not_well" | "unsure" | "unknown" {
  const value = normalize(text);
  if (/\b(good|great|well|healthy|fine|okay|ok|all good|doing well|pretty good)\b/.test(value)) return "well";
  if (/\b(not sure|unsure|maybe|i don't know|dont know|uncertain)\b/.test(value)) return "unsure";
  if (/\b(sick|bad|unwell|ill|not well|not good|terrible|awful|symptoms|tired|fever|cough|pain)\b/.test(value)) return "not_well";
  return "unknown";
}

export function classifyYesNo(text: string): boolean | "unknown" {
  const value = normalize(text);
  if (/\b(no|nope|nah|not|never|i did not|i didn't|i have not|i haven't)\b/.test(value)) return false;
  if (/\b(yes|yeah|yep|sure|i did|i have|recently|affirmative)\b/.test(value)) return true;
  return "unknown";
}

export function buildAlexaResponse(
  text: string,
  shouldEndSession: boolean,
  sessionAttributes: Record<string, unknown> = {},
  repromptText = text,
) {
  return {
    version: "1.0",
    sessionAttributes,
    response: {
      outputSpeech: {
        type: "PlainText",
        text,
      },
      reprompt: {
        outputSpeech: {
          type: "PlainText",
          text: repromptText,
        },
      },
      shouldEndSession,
    },
  };
}

function buildCheckIn(
  sessionAttributes: AlexaSessionAttributes,
  gathering: boolean | "unknown",
): HealthCheckInInput {
  const feeling = sessionAttributes.feeling ?? "unsure";
  const symptoms = sessionAttributes.symptoms ? [sessionAttributes.symptoms] : [];
  return {
    userId: DEMO_USER_ID,
    feeling: feeling === "well" ? "good" : feeling === "not_well" ? "sick" : "unsure",
    symptoms,
    massGathering: gathering,
    source: "alexa",
    dailyCheckInComplete: true,
    summary: sessionAttributes.impact ? `Impact reported: ${sessionAttributes.impact}` : undefined,
  };
}

async function persistCheckIn(checkIn: HealthCheckInInput) {
  try {
    await saveHealthCheckIn(checkIn);
  } catch (error) {
    console.error("Could not save Alexa check-in", error);
  }
}

async function getAiSummary(checkIn: HealthCheckInInput): Promise<{ summary: string; nextSteps: string } | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  try {
    const prompt = [
      "You are Bloomy, summarizing a daily health check-in for Alexa.",
      "Do not diagnose. Use summary and next steps language only.",
      "Return compact JSON only with string keys summary and nextSteps.",
      "Keep nextSteps one short spoken sentence.",
      `Feeling: ${checkIn.feeling}`,
      `Symptoms: ${checkIn.symptoms?.join(", ") || "none reported"}`,
      `Social gathering: ${String(checkIn.massGathering ?? "unknown")}`,
      `Impact: ${checkIn.summary ?? "unknown"}`,
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
    if (!response.ok) return null;

    const result = await response.json();
    const parsed = parseAiJson(extractText(result));
    return parsed.summary && parsed.nextSteps ? parsed : null;
  } catch (error) {
    console.error("Alexa AI summary failed", error);
    return null;
  }
}

function parseAiJson(text: string) {
  try {
    const cleaned = text.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```$/i, "").trim();
    const parsed = JSON.parse(cleaned) as { summary?: unknown; nextSteps?: unknown };
    return {
      summary: typeof parsed.summary === "string" ? parsed.summary : "",
      nextSteps: Array.isArray(parsed.nextSteps)
        ? parsed.nextSteps.filter((step): step is string => typeof step === "string").join(" ")
        : typeof parsed.nextSteps === "string" ? parsed.nextSteps : "",
    };
  } catch {
    return { summary: "", nextSteps: "" };
  }
}

function extractText(result: any) {
  return result?.candidates?.[0]?.content?.parts
    ?.map((part: { text?: string }) => part.text)
    .filter(Boolean)
    .join("\n")
    .trim() || "";
}

function getIntentName(body: any) {
  return body?.request?.intent?.name ?? "";
}

function getSpokenText(body: any) {
  const slots = body?.request?.intent?.slots ?? {};
  const slotValues = Object.values(slots)
    .map((slot: any) => slot?.resolutions?.resolutionsPerAuthority?.[0]?.values?.[0]?.value?.name ?? slot?.value)
    .filter((value): value is string => typeof value === "string" && value.trim().length > 0);

  return [
    body?.request?.inputTranscript,
    ...slotValues,
  ]
    .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
    .join(" ")
    .trim();
}

function extractSymptomsFromText(text: string) {
  const value = normalize(text);
  const symptoms = [
    "cough",
    "congestion",
    "fever",
    "chills",
    "nausea",
    "vomiting",
    "diarrhea",
    "rash",
    "sore throat",
    "difficulty breathing",
    "shortness of breath",
    "body aches",
    "headache",
    "red eyes",
    "loss of smell",
    "loss of taste",
    "yellow skin",
    "yellow eyes",
  ].filter((symptom) => value.includes(symptom));

  if (symptoms.length) return symptoms;
  if (classifyFeeling(text) === "not_well") return [text.trim() || "unspecified symptoms"];
  return [];
}

function extractImpactFromText(text: string) {
  const impacts = [
    /\babsent from work\b/i.test(text) ? "absent from work" : "",
    /\babsent from school\b/i.test(text) ? "absent from school" : "",
    /\b(seek|sought|visited|went to).*(doctor|clinic|care|treatment)\b/i.test(text) ? "sought healthcare or treatment" : "",
  ].filter(Boolean);
  return impacts.join(", ");
}

function readSessionAttributes(body: any): AlexaSessionAttributes {
  return body?.session?.attributes && typeof body.session.attributes === "object" ? body.session.attributes : {};
}

function helpForStep(step?: ConversationStep) {
  if (step === "ASK_SYMPTOMS") return "Tell me the symptoms you are experiencing.";
  if (step === "ASK_IMPACT") return "Tell me whether you were absent from work or school, or sought healthcare or treatment.";
  if (step === "ASK_GATHERING") return "Tell me whether you have been around any social gatherings recently.";
  return "Tell me how you are feeling today.";
}

function normalize(text: string) {
  return text.toLowerCase().replace(/[^\w\s']/g, " ").replace(/\s+/g, " ").trim();
}
