import { createRemoteJWKSet, jwtVerify } from "jose";

type VerifiedAuth0User = {
  sub: string;
  email?: string;
  name?: string;
  roles: string[];
};

let jwks: ReturnType<typeof createRemoteJWKSet> | null = null;

function getIssuer() {
  const issuer = process.env.AUTH0_ISSUER_BASE_URL || process.env.VITE_AUTH0_DOMAIN;
  if (!issuer) return null;
  const normalized = issuer.startsWith("http") ? issuer : `https://${issuer}`;
  return normalized.endsWith("/") ? normalized : `${normalized}/`;
}

function getAudience() {
  return process.env.AUTH0_AUDIENCE || process.env.VITE_AUTH0_AUDIENCE;
}

export async function verifyAuth0Request(request: Request): Promise<VerifiedAuth0User> {
  const issuer = getIssuer();
  const audience = getAudience();
  const header = request.headers.get("authorization");
  const token = header?.startsWith("Bearer ") ? header.slice("Bearer ".length) : null;

  if (!issuer || !audience) {
    throw new Response("Auth0 server env vars are not configured", { status: 501 });
  }

  if (!token) {
    throw new Response("Missing bearer token", { status: 401 });
  }

  jwks ??= createRemoteJWKSet(new URL(".well-known/jwks.json", issuer));

  const { payload } = await jwtVerify(token, jwks, {
    issuer,
    audience,
  });

  if (!payload.sub) {
    throw new Response("Token is missing a subject", { status: 401 });
  }

  return {
    sub: payload.sub,
    email: typeof payload.email === "string" ? payload.email : undefined,
    name: typeof payload.name === "string" ? payload.name : undefined,
    roles: Array.isArray(payload["https://outbreakiq.app/roles"])
      ? (payload["https://outbreakiq.app/roles"] as string[])
      : [],
  };
}

