import { Auth0Provider } from "@auth0/auth0-react";
import { type ReactNode } from "react";
import { authConfig, isAuthConfigured } from "@/lib/auth-config";

export function AppAuthProvider({ children }: { children: ReactNode }) {
  if (!isAuthConfigured() || typeof window === "undefined") {
    return children;
  }

  const authorizationParams = {
    redirect_uri: authConfig.redirectUri,
    ...(authConfig.audience ? { audience: authConfig.audience } : {}),
  };

  return (
    <Auth0Provider
      domain={authConfig.domain}
      clientId={authConfig.clientId}
      cacheLocation="localstorage"
      useRefreshTokens={authConfig.useRefreshTokens}
      authorizationParams={authorizationParams}
      onRedirectCallback={(appState) => {
        window.history.replaceState({}, document.title, appState?.returnTo || window.location.pathname);
      }}
    >
      {children}
    </Auth0Provider>
  );
}
