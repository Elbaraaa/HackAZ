import { createFileRoute } from "@tanstack/react-router";
import { getSessionProfile, isDatabaseConfigured, listPendingAccounts } from "@/lib/server/auth-db";

export const Route = createFileRoute("/api/admin/pending-accounts")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        if (!isDatabaseConfigured()) {
          return Response.json({ configured: false, accounts: [] }, { status: 503 });
        }

        const profile = await getSessionProfile(request);
        if (profile?.role !== "admin") {
          return Response.json({ configured: true, error: "Admin access required." }, { status: 403 });
        }

        const accounts = await listPendingAccounts();
        return Response.json({ configured: true, accounts });
      },
    },
  },
});
