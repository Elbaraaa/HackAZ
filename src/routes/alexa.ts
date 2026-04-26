import { createFileRoute } from "@tanstack/react-router";
import { handleAlexaRequest, buildAlexaResponse } from "@/routes/api/alexa";

const FALLBACK_TEXT = "Sorry, I didn't catch that. How are you feeling today?";

export const Route = createFileRoute("/alexa")({
  server: {
    handlers: {
      GET: async () => {
        return Response.json({
          ok: true,
          service: "Bloomy Alexa webhook alias",
          canonicalEndpoint: "https://www.bloomy.health/api/alexa",
          acceptedAlias: "https://www.bloomy.health/alexa",
          gemmaConfigured: Boolean(process.env.GEMINI_API_KEY),
        });
      },
      POST: async ({ request }) => {
        try {
          const body = await request.json().catch(() => ({}));
          return Response.json(await handleAlexaRequest(body), { status: 200 });
        } catch (error) {
          console.error("Alexa alias endpoint error", error);
          return Response.json(buildAlexaResponse(FALLBACK_TEXT, false, { step: "ASK_FEELING" }), { status: 200 });
        }
      },
    },
  },
});
