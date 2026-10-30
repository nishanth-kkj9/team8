import type { CampusProfile } from "../types/auth";
import type { DocRequest } from "../types/request";

/** Centralized DocDesk authorization helpers (ARCHITECTURE.md §3.3).
 * Components must ask these helpers instead of comparing role strings inline.
 * Hidden/disabled controls are UX only — the future backend remains the
 * real authorization authority.
 */

/** Student Affairs is an office_staff profile with dept = "Student Affairs"
 * (case-insensitive; the guide permits a trailing "dept").
 */
export function normalizeDept(dept?: string): string {
  return (dept ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]*(dept|department)$/i, "")
    .trim();
}

/** Student Affairs is an office_staff profile with dept = "Student Affairs"
 * (case-insensitive; the guide permits a trailing "dept").
 */
export function isStudentAffairs(profile: CampusProfile | null | undefined): boolean {
  return !!profile && profile.role === "office_staff" && normalizeDept(profile.dept) === "student affairs";
}

/** Students, faculty and office staff are all requesters. Admin never is. */
export function isRequester(profile: CampusProfile | null | undefined): boolean {
  return !!profile && profile.role !== "admin";
}

/** Owns a request if the profile's email matches the request's requested_by. */
export function ownsRequest(
  profile: CampusProfile | null | undefined,
  request: DocRequest,
): boolean {
  return !!profile && request.requested_by === profile.email_id;
}

/** Student/faculty/office staff can create a request. */
export function canCreateRequest(profile: CampusProfile | null | undefined): boolean {
  return isRequester(profile);
}

/** Student Affairs and Admin see all requests; other requesters see their own. */
export function canViewAllRequests(profile: CampusProfile | null | undefined): boolean {
  return !!profile && (profile.role === "admin" || isStudentAffairs(profile));
}

/** Only Student Affairs can answer requests. */
export function canAnswerRequest(profile: CampusProfile | null | undefined): boolean {
  return isStudentAffairs(profile);
}

/** Only Student Affairs can manage document types. */
export function canManageDocumentTypes(profile: CampusProfile | null | undefined): boolean {
  return isStudentAffairs(profile);
}

/** Only Student Affairs can set TAT. */
export function canSetTat(profile: CampusProfile | null | undefined): boolean {
  return isStudentAffairs(profile);
}

/** Student/faculty/office staff can edit their own pending request. */
export function canEditOwnPendingRequest(
  profile: CampusProfile | null | undefined,
  request: DocRequest,
): boolean {
  return (
    isRequester(profile) &&
    ownsRequest(profile, request) &&
    request.status === "pending"
  );
}

/** Student/faculty/office staff can withdraw their own pending request. */
export function canWithdrawOwnPendingRequest(
  profile: CampusProfile | null | undefined,
  request: DocRequest,
): boolean {
  return canEditOwnPendingRequest(profile, request);
}

/** Student/faculty/office staff can acknowledge answered requests. */
export function canAcknowledge(
  profile: CampusProfile | null | undefined,
  request: DocRequest,
): boolean {
  return (
    isRequester(profile) &&
    ownsRequest(profile, request) &&
    request.status === "answered"
  );
}

/** Student/faculty/office staff can upload filled forms when request is answered + document exists + not acknowledged. */
export function canUploadFilledForm(
  profile: CampusProfile | null | undefined,
  request: DocRequest,
): boolean {
  return (
    isRequester(profile) &&
    ownsRequest(profile, request) &&
    request.status === "answered" &&
    !!request.document
  );
}

/** Student/faculty/office staff can remove filled forms when request is answered + filled form exists. */
export function canRemoveFilledForm(
  profile: CampusProfile | null | undefined,
  request: DocRequest,
): boolean {
  return (
    isRequester(profile) &&
    ownsRequest(profile, request) &&
    request.status === "answered" &&
    !!request.filled_form
  );
}

/** Student/faculty/office staff can download answer document. */
export function canDownloadAnswerDocument(
  profile: CampusProfile | null | undefined,
  request: DocRequest,
): boolean {
  return !!profile && !!request.document && (profile.role === "admin" || isStudentAffairs(profile) || ownsRequest(profile, request));
}

/** Student/faculty/office staff can download filled form. */
export function canDownloadFilledForm(
  profile: CampusProfile | null | undefined,
  request: DocRequest,
): boolean {
  return !!profile && !!request.filled_form && (profile.role === "admin" || isStudentAffairs(profile) || ownsRequest(profile, request));
}

/** Which app shell / navigation area a profile belongs to. */
export type AppArea = "requester" | "student-affairs" | "admin";

export function areaForProfile(profile: CampusProfile): AppArea {
  if (profile.role === "admin") return "admin";
  if (isStudentAffairs(profile)) return "student-affairs";
  return "requester";
}

/** Route-area access rules (§4.2–4.4):
 * - students/faculty/other office staff use /app; only SA uses /sa; only admin uses /admin.
 * - Student Affairs has requester capabilities, but its portal is /sa. */
export function canAccessArea(
  area: AppArea,
  profile: CampusProfile | null | undefined,
): boolean {
  if (!profile) return false;
  if (area === "admin") return profile.role === "admin";
  if (area === "student-affairs") return isStudentAffairs(profile);
  return isRequester(profile) && !isStudentAffairs(profile);
}

/** Route-area access rules for return-path protection.
 * A user cannot use a return path to access another role's area. */
export function canUseReturnPath(area: AppArea, profile: CampusProfile | null): boolean {
  if (!profile) return false;
  if (area === "admin") return profile.role === "admin";
  if (area === "student-affairs") return isStudentAffairs(profile);
  return isRequester(profile) && !isStudentAffairs(profile);
}

/** Route the user home based on their profile. */
export function homePathForProfile(profile: CampusProfile | null): string {
  if (!profile) return "/login";
  switch (areaForProfile(profile)) {
    case "admin":
      return "/admin/dashboard";
    case "student-affairs":
      return "/sa/dashboard";
    default:
      return "/app/dashboard";
  }
}

/** Labels for UI display. */
export const AREA_LABELS: Record<AppArea, string> = {
  requester: "Requester portal",
  "student-affairs": "Student Affairs portal",
  admin: "Admin portal (read-only)",
};