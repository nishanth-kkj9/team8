import { ShieldAlert } from "lucide-react";
import { Link } from "react-router-dom";
import { useDemoAuth } from "../context/DemoAuthContext";
import { homePathForProfile } from "../lib/permissions";
import { ROLE_LABELS } from "../types/auth";

/** Shown when a signed-in user manually opens a route outside their role's portal. */
export function AccessDeniedPage() {
  const { profile } = useDemoAuth();

  return (
    <div className="flex min-h-dvh items-center justify-center bg-background p-6">
      <div className="w-full max-w-md rounded-card border border-line bg-surface p-8 text-center shadow-card">
        <span
          aria-hidden
          className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-600"
        >
          <ShieldAlert className="h-6 w-6" />
        </span>
        <h1 className="text-lg font-semibold text-ink-900">Access denied</h1>
        <p className="mt-2 text-sm leading-6 text-ink-500">
          You are signed in as{" "}
          <span className="font-medium text-ink-700">
            {profile?.name}
            {profile ? ` (${ROLE_LABELS[profile.role]})` : ""}
          </span>
          . This DocDesk area is not part of your role&apos;s portal.
        </p>
        <Link
          to={homePathForProfile(profile)}
          className="mt-6 inline-flex h-10 items-center rounded-control bg-primary-700 px-4 text-sm font-medium text-white transition-colors hover:bg-primary-800"
        >
          Go to your dashboard
        </Link>
      </div>
    </div>
  );
}
