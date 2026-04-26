import { createFileRoute } from "@tanstack/react-router";
import { createSession, createUser, isDatabaseConfigured, sessionCookie } from "@/lib/server/auth-db";
import type { SignupProfileInput } from "@/lib/app-data";

export const Route = createFileRoute("/api/auth/signup")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!isDatabaseConfigured()) {
          return Response.json({ configured: false, error: "DATABASE_URL is not configured." }, { status: 503 });
        }

        try {
          const body = (await request.json()) as SignupProfileInput;
          const profile = await createUser(body);
          const headers = new Headers();

          if (profile.approvalStatus === "approved") {
            const session = await createSession(profile.id);
            headers.set("Set-Cookie", sessionCookie(session.id, session.expiresAt));
          }

          return Response.json({ configured: true, profile }, { headers });
        } catch (error) {
          const message = error instanceof Error ? error.message : "Could not create account.";
          return Response.json({ configured: true, error: message }, { status: 400 });
        }
      },
    },
  },
});
