import { createFileRoute } from "@tanstack/react-router";
import { ensureBackboardThread, getBackboardClient } from "@/lib/server/backboard";
import { verifyAuth0Request } from "@/lib/server/auth0";

export const Route = createFileRoute("/api/backboard/session")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const user = await verifyAuth0Request(request);
          const body = (await request.json().catch(() => ({}))) as {
            threadId?: string;
            message?: string;
          };
          const session = await ensureBackboardThread(body.threadId);

          if (!body.message) {
            return Response.json({
              user: { sub: user.sub, roles: user.roles },
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
              auth0Sub: user.sub,
              source: "outbreakiq",
            },
          });

          return Response.json({
            user: { sub: user.sub, roles: user.roles },
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

