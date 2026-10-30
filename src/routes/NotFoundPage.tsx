import { FileQuestion } from "lucide-react";
import { Link } from "react-router-dom";
import { useDemoAuth } from "../context/DemoAuthContext";
import { homePathForProfile } from "../lib/permissions";

export function NotFoundPage() {
  const { profile } = useDemoAuth();

  return (
    <div className="flex min-h-dvh items-center justify-center bg-background p-6">
      <div className="w-full max-w-md rounded-card border border-line bg-surface p-8 text-center shadow-card">
        <span
          aria-hidden
          className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary-50 text-primary-600"
        >
          <FileQuestion className="h-6 w-6" />
        </span>
        <h1 className="text-lg font-semibold text-ink-900">Page not found</h1>
        <p className="mt-2 text-sm text-ink-500">
          The page you were looking for does not exist in DocDesk.
        </p>
        <Link
          to={profile ? homePathForProfile(profile) : "/login"}
          className="mt-6 inline-flex h-10 items-center rounded-control bg-primary-700 px-4 text-sm font-medium text-white transition-colors hover:bg-primary-800"
        >
          {profile ? "Go to your dashboard" : "Go to sign in"}
        </Link>
      </div>
    </div>
  );
}
