import { Loader2 } from "lucide-react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useDemoAuth } from "../context/DemoAuthContext";
import { AppShell } from "../components/layout/AppShell";
import { canAccessArea, type AppArea } from "../lib/permissions";
import { AccessDeniedPage } from "./AccessDeniedPage";
import { DocDeskDataProvider } from "../context/DocDeskDataContext";

/**
 * Protected route wrapper for demo roles (ARCHITECTURE.md ??11 route plan).
 * - Not signed in ??? redirect to /login (remembering where the user wanted to go).
 * - Signed in without access to this area ??? Access Denied page.
 * - Signed in with access ??? render the role-aware AppShell around the outlet.
 */
export function ProtectedRoute({ area }: { area: AppArea }) {
  const { profile, status } = useDemoAuth();
  const location = useLocation();

  if (status === "restoring") {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background">
        <Loader2
          aria-label="Loading DocDesk"
          className="h-6 w-6 animate-spin text-primary-600"
        />
      </div>
    );
  }

  if (!profile) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location.pathname + location.search }}
      />
    );
  }

  if (!canAccessArea(area, profile)) {
    return <AccessDeniedPage />;
  }

  return (
    <DocDeskDataProvider>
      <AppShell>
        <Outlet />
      </AppShell>
    </DocDeskDataProvider>
  );
}
