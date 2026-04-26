import { createFileRoute } from "@tanstack/react-router";
import { ensureBackboardThread, getBackboardClient } from "@/lib/server/backboard";

export const Route = createFileRoute("/api/backboard/session")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = (await request.json().catch(() => ({}))) as {
            threadId?: string;
            message?: string;
            userId?: string;
            role?: string;
          };
          const session = await ensureBackboardThread(body.threadId);

          if (!body.message) {
            return Response.json({
              user: { id: body.userId ?? "local-user", role: body.role ?? "patient" },
              threadId: session.threadId,
              created: session.created,
            });
          }

          const client = getBackboardClient();
          const response = await client.addMessage(session.threadId, {
            content: body.message,
            memory: "Auto",
            llm_provider: process.env.BACKBOARD_MODEL_PROVIDER,
            model_name: process.env.BACKBOARD_MODEL_NAME,
            metadata: {
              userId: body.userId ?? "local-user",
              role: body.role ?? "patient",
              source: "bloomy",
            },
          });

          return Response.json({
            user: { id: body.userId ?? "local-user", role: body.role ?? "patient" },
            threadId: session.threadId,
            created: session.created,
            response: "content" in response ? response.content : null,
          });
        } catch (error) {
          if (error instanceof Response) return error;
          const message = error instanceof Error ? error.message : "Backboard request failed";
          return Response.json({ error: message }, { status: 500 });
        }
      },
    },
  },
});
