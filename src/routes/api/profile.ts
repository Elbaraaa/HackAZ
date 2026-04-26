import { createFileRoute } from "@tanstack/react-router";
import { isDatabaseConfigured, updateSessionProfile } from "@/lib/server/auth-db";
import type { AppUserProfile } from "@/lib/app-data";

export const Route = createFileRoute("/api/profile")({
  server: {
    handlers: {
      PATCH: async ({ request }) => {
        if (!isDatabaseConfigured()) {
          return Response.json({ configured: false, profile: null }, { status: 503 });
        }

        try {
          const body = (await request.json()) as Partial<AppUserProfile>;
          const profile = await updateSessionProfile(request, body);
          return Response.json({ configured: true, profile });
        } catch (error) {
          const message = error instanceof Error ? error.message : "Could not update profile.";
          return Response.json({ configured: true, error: message }, { status: 400 });
        }
      },
    },
  },
});
