import { useDemoAuth } from "../../../context/DemoAuthContext";
import { PageHeader } from "../../../components/layout/PageHeader";
import { Card } from "../../../components/ui/Card";
import { ShieldCheck } from "lucide-react";
import { ROLE_LABELS } from "../../../types/auth";

/**
 * Read-only profile (§5B R7): users can read their profile but cannot edit it.
 * Fields render conditionally per role — only students have a USN, etc.
 */
export function ProfilePage() {
  const { profile } = useDemoAuth();

  const rows: Array<{ label: string; value: string }> = [];
  if (profile) {
    rows.push({ label: "Name", value: profile.name });
    rows.push({ label: "Email", value: profile.email_id });
    if (profile.phone_number) rows.push({ label: "Phone", value: profile.phone_number });
    rows.push({ label: "Role", value: ROLE_LABELS[profile.role] });
    if (profile.role === "student" && profile.usn) {
      rows.push({ label: "USN", value: profile.usn });
    }
    if ((profile.role === "student" || profile.role === "office_staff") && profile.dept) {
      rows.push({ label: "Department", value: profile.dept });
    }
    if ((profile.role === "faculty" || profile.role === "office_staff") && profile.designation) {
      rows.push({ label: "Designation", value: profile.designation });
    }
    if (profile.role === "admin" && profile.institution_name) {
      rows.push({ label: "Institution", value: profile.institution_name });
    }
    rows.push({ label: "Team ID", value: profile.team_id });
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Profile"
        description="Authoritative read-only profile details from CampusOS."
        crumbs={[{ label: "Requester portal" }, { label: "My Profile" }]}
      />
      <Card className="max-w-2xl p-6">
        <dl className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
          {rows.map((row) => (
            <div key={row.label} className="min-w-0">
              <dt className="text-xs font-medium uppercase tracking-wide text-ink-400">
                {row.label}
              </dt>
              <dd className="mt-0.5 truncate text-sm font-medium text-ink-800">
                {row.value}
              </dd>
            </div>
          ))}
        </dl>
        <p className="mt-6 flex items-start gap-2 border-t border-line pt-4 text-xs text-ink-500">
          <ShieldCheck aria-hidden className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary-600" />
          Authoritative profile retrieved from the official CampusOS identity service.
        </p>
      </Card>
    </div>
  );
}
