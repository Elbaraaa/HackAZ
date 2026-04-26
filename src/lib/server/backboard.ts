import { BackboardClient } from "backboard-sdk";

export function getBackboardClient() {
  const apiKey = process.env.BACKBOARD_API_KEY;

  if (!apiKey) {
    throw new Response("BACKBOARD_API_KEY is not configured", { status: 501 });
  }

  return new BackboardClient({ apiKey });
}

export async function ensureBackboardThread(threadId?: string) {
  if (threadId) {
    return { threadId, created: false };
  }

  const assistantId = process.env.BACKBOARD_ASSISTANT_ID;
  if (!assistantId) {
    throw new Response("BACKBOARD_ASSISTANT_ID is not configured", { status: 501 });
  }

  const client = getBackboardClient();
  const thread = await client.createThread(assistantId);

  return { threadId: thread.threadId as string, created: true };
}

