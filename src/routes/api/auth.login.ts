import { createFileRoute } from "@tanstack/react-router";
import { authenticateUser, createSession, isDatabaseConfigured, sessionCookie } from "@/lib/server/auth-db";
import type { AppRole, ReviewLane } from "@/lib/app-data";

export const Route = createFileRoute("/api/auth/login")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!isDatabaseConfigured()) {
          return Response.json({ configured: false, error: "DATABASE_URL is not configured." }, { status: 503 });
        }

        try {
          const body = (await request.json()) as { role?: AppRole; email?: string; password?: string; reviewLane?: ReviewLane };
          const profile = await authenticateUser({
            role: body.role ?? "patient",
            email: body.email ?? "",
            password: body.password ?? "",
            reviewLane: body.reviewLane,
          });
          const session = await createSession(profile.id);

          return Response.json(
            { configured: true, profile },
            { headers: { "Set-Cookie": sessionCookie(session.id, session.expiresAt) } },
          );
        } catch (error) {
          const message = error instanceof Error ? error.message : "Could not sign in.";
          return Response.json({ configured: true, error: message }, { status: 401 });
        }
      },
    },
  },
});
