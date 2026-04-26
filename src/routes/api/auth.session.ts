import { createFileRoute } from "@tanstack/react-router";
import { getSessionProfile, isDatabaseConfigured } from "@/lib/server/auth-db";

export const Route = createFileRoute("/api/auth/session")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        if (!isDatabaseConfigured()) {
          return Response.json({ configured: false, profile: null });
        }

        try {
          const profile = await getSessionProfile(request);
          return Response.json({ configured: true, profile });
        } catch (error) {
          const message = error instanceof Error ? error.message : "Could not load session.";
          return Response.json({ configured: true, error: message }, { status: 500 });
        }
      },
    },
  },
});
