import { Loader2 } from "lucide-react";
import { Navigate } from "react-router-dom";
import { useDemoAuth } from "../context/DemoAuthContext";
import { homePathForProfile } from "../lib/permissions";

/** "/" → the signed-in profile's own dashboard (or the login page). */
export function HomeRedirect() {
  const { profile, status } = useDemoAuth();

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

  return <Navigate to={homePathForProfile(profile)} replace />;
}
