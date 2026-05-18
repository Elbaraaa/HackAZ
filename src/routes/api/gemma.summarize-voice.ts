import { createFileRoute } from "@tanstack/react-router";

const GEMMA_MODEL = "gemma-4-31b-it";

export const Route = createFileRoute("/api/gemma/summarize-voice")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const apiKey = process.env.GEMINI_API_KEY;
          if (!apiKey) {
            return Response.json({ error: "GEMINI_API_KEY is not configured" }, { status: 500 });
          }

          const body = (await request.json()) as {
            transcript?: string;
            species?: string;
            incident?: string;
            reportType?: string;
          };
          if (!body.transcript?.trim()) {
            return Response.json({ error: "Transcript is required" }, { status: 400 });
          }

          const prompt = [
            "Summarize this voice note for a community health incident report.",
            "Keep the summary concise, factual, and non-diagnostic.",
            "Return plain text only. Do not use markdown, headings, bold markers, bullets with asterisks, or placeholder fields.",
            `Report type: ${body.reportType || "animal"}. Subject: ${body.species || "unknown"}. Incident: ${(body.incident || "unknown").replace(/-/g, " ")}.`,
            `Transcript: ${body.transcript}`,
            "Include important signs or hazards, timing, number affected or vector density, location clues, and immediate next steps if mentioned.",
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
            return Response.json({ error: result?.error?.message || "Gemma voice summary failed" }, { status: response.status });
          }

          return Response.json({ summary: cleanGemmaText(extractText(result)) });
        } catch (error) {
          const message = error instanceof Error ? error.message : "Gemma voice summary failed";
          return Response.json({ error: message }, { status: 500 });
        }
      },
    },
  },
});

function extractText(result: any) {
  const text = result?.candidates?.[0]?.content?.parts
    ?.map((part: { text?: string }) => part.text)
    .filter(Boolean)
    .join("\n")
    .trim();
  return text || "Gemma did not return a summary.";
}

function cleanGemmaText(value: string) {
  return value
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/__(.*?)__/g, "$1")
    .replace(/^\s{0,3}#{1,6}\s+/gm, "")
    .replace(/^\s*[-*]\s+/gm, "- ")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
