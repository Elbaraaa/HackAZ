import { createFileRoute } from "@tanstack/react-router";
import { clearSessionCookie, deleteSession, isDatabaseConfigured } from "@/lib/server/auth-db";

export const Route = createFileRoute("/api/auth/logout")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (isDatabaseConfigured()) {
          await deleteSession(request).catch(() => undefined);
        }

        return Response.json({ ok: true }, { headers: { "Set-Cookie": clearSessionCookie() } });
      },
    },
  },
});
