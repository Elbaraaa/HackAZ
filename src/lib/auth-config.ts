export const authConfig = {
  domain: import.meta.env.VITE_AUTH0_DOMAIN,
  clientId: import.meta.env.VITE_AUTH0_CLIENT_ID,
  audience: import.meta.env.VITE_AUTH0_AUDIENCE,
  redirectUri:
    import.meta.env.VITE_AUTH0_REDIRECT_URI ||
    (typeof window !== "undefined" ? window.location.origin : undefined),
  useRefreshTokens: import.meta.env.VITE_AUTH0_USE_REFRESH_TOKENS !== "false",
};

export function isAuthConfigured() {
  return Boolean(authConfig.domain && authConfig.clientId);
}

