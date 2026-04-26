import { Outlet, Link, createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";
import { Toaster } from "sonner";
import { AppAuthProvider } from "@/components/AuthProvider";
import { AuthGate } from "@/components/AuthGate";
import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { title: "Bloomy - Early Health Intelligence" },
      { name: "description", content: "Participatory health intelligence - combine symptom reports, wearable signals, and animal incidents to detect risks earlier." },
      { property: "og:title", content: "Bloomy - Early Health Intelligence" },
      { property: "og:description", content: "Participatory health intelligence - combine symptom reports, wearable signals, and animal incidents to detect risks earlier." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:title", content: "Bloomy - Early Health Intelligence" },
      { name: "twitter:description", content: "Participatory health intelligence - combine symptom reports, wearable signals, and animal incidents to detect risks earlier." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/b5153f40-291f-4baf-888c-bac78528a9f1/id-preview-e4c84805--f7451845-e120-4cae-87fa-d08bf8be392a.lovable.app-1777156853039.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/b5153f40-291f-4baf-888c-bac78528a9f1/id-preview-e4c84805--f7451845-e120-4cae-87fa-d08bf8be392a.lovable.app-1777156853039.png" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@600;700;800&display=swap" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  return (
    <AppAuthProvider>
      <AuthGate>
        <Outlet />
      </AuthGate>
      <Toaster position="top-center" richColors closeButton />
    </AppAuthProvider>
  );
}
