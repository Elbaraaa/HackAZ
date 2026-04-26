import { createFileRoute } from "@tanstack/react-router";
import { approvePendingAccount, getSessionProfile, isDatabaseConfigured } from "@/lib/server/auth-db";

export const Route = createFileRoute("/api/admin/approve-account")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!isDatabaseConfigured()) {
          return Response.json({ configured: false, profile: null }, { status: 503 });
        }

        const admin = await getSessionProfile(request);
        if (admin?.role !== "admin") {
          return Response.json({ configured: true, error: "Admin access required." }, { status: 403 });
        }

        const body = (await request.json()) as { email?: string };
        if (!body.email) {
          return Response.json({ configured: true, error: "Email is required." }, { status: 400 });
        }

        const profile = await approvePendingAccount(body.email, admin.email ?? admin.id);
        return Response.json({ configured: true, profile });
      },
    },
  },
});
