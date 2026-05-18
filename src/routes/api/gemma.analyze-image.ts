import { createFileRoute } from "@tanstack/react-router";

const GEMMA_MODEL = "gemma-4-31b-it";

export const Route = createFileRoute("/api/gemma/analyze-image")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const apiKey = process.env.GEMINI_API_KEY;
          if (!apiKey) {
            return Response.json({ error: "GEMINI_API_KEY is not configured" }, { status: 500 });
          }

          const body = (await request.json()) as {
            imageDataUrl?: string;
            mimeType?: string;
            species?: string;
            incident?: string;
            reportType?: string;
            notes?: string;
            voiceSummary?: string;
          };
          const image = parseDataUrl(body.imageDataUrl, body.mimeType);
          if (!image) {
            return Response.json({ error: "Image data is required" }, { status: 400 });
          }

          const prompt = [
            "You are assisting with a community health incident report.",
            "Analyze the image for visible clues only. Do not diagnose disease or make certainty claims.",
            `Report type: ${body.reportType || "animal"}. Subject: ${body.species || "unknown"}. Incident: ${(body.incident || "unknown").replace(/-/g, " ")}.`,
            body.notes ? `Reporter notes: ${body.notes}` : "",
            body.voiceSummary ? `Voice summary: ${body.voiceSummary}` : "",
            "Return concise sections: Visible concerns, Urgency, Next steps, Who to contact, Safety notes, Limitations.",
            "Return plain text only. Do not use markdown, headings with #, bold markers, or asterisk bullets.",
          ].filter(Boolean).join("\n");

          const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${GEMMA_MODEL}:generateContent`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-goog-api-key": apiKey,
            },
            body: JSON.stringify({
              contents: [{
                parts: [
                  { inline_data: { mime_type: image.mimeType, data: image.data } },
                  { text: prompt },
                ],
              }],
            }),
          });

          const result = await response.json();
          if (!response.ok) {
            return Response.json({ error: result?.error?.message || "Gemma image analysis failed" }, { status: response.status });
          }

          return Response.json({ analysis: cleanGemmaText(extractText(result)) });
        } catch (error) {
          const message = error instanceof Error ? error.message : "Gemma image analysis failed";
          return Response.json({ error: message }, { status: 500 });
        }
      },
    },
  },
});

function parseDataUrl(dataUrl?: string, fallbackMimeType?: string) {
  if (!dataUrl) return null;
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (match) return { mimeType: match[1], data: match[2] };
  return { mimeType: fallbackMimeType || "image/jpeg", data: dataUrl };
}

function extractText(result: any) {
  const text = result?.candidates?.[0]?.content?.parts
    ?.map((part: { text?: string }) => part.text)
    .filter(Boolean)
    .join("\n")
    .trim();
  return text || "Gemma did not return an analysis.";
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
