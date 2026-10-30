import { Loader2 } from "lucide-react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { AppArea, canAccessArea, canUseReturnPath } from "../lib/permissions";
import { AccessDeniedPage } from "./AccessDeniedPage";

/** Protected route wrapper for demo roles (ARCHITECTURE.md §11 route plan).
 * - Not signed in → redirect to /login (remembering where the user wanted to go).
 * - Signed in without access to this area → Access Denied page.
 * - Signed in with access → render the role-aware AppShell around the outlet.
 * - Validates return paths to prevent cross-role access.
 */
export function ProtectedRoute({ area }: { area: AppArea }) {
  const {
    profile,
    status,
  } = useAuth();
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

  // Validate return path - prevent cross-role access
  const from = (location.state as { from?: string } | null)?.from;
  if (from && !canUseReturnPath(area, profile)) {
    // Invalid return path - go home instead
  }

  if (!canAccessArea(area, profile)) {
    return <AccessDeniedPage />;
  }

  return (
    <div className="relative">
      <AppShell>
        <Outlet />
      </AppShell>
    </div>
  );
}