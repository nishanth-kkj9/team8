import type { DemoProfile } from "../types/auth";
import type { DocRequest } from "../types/request";

/**
 * Centralized DocDesk authorization helpers (ARCHITECTURE.md ??3.3).
 * Components must ask these helpers instead of comparing role strings inline.
 * Hidden/disabled controls are UX only ??? the future backend remains the
 * real authorization authority.
 */

/**
 * Student Affairs is an office_staff profile with dept = "Student Affairs"
 * (case-insensitive; the guide permits a trailing "dept").
 */
export function normalizeDept(dept?: string): string {
  return (dept ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]*dept$/, "")
    .trim();
}

export function isStudentAffairs(
  profile: DemoProfile | null | undefined,
): boolean {
  return (
    !!profile &&
    profile.role === "office_staff" &&
    normalizeDept(profile.dept) === "student affairs"
  );
}

/** Students, faculty and office staff are all requesters. Admin never is. */
export function isRequester(profile: DemoProfile | null | undefined): boolean {
  return !!profile && profile.role !== "admin";
}

export function ownsRequest(
  profile: DemoProfile | null | undefined,
  request: DocRequest,
): boolean {
  return !!profile && request.requested_by === profile.email_id;
}

export function canCreateRequest(
  profile: DemoProfile | null | undefined,
): boolean {
  return isRequester(profile);
}

/** Student Affairs and Admin see all requests; other requesters see their own. */
export function canViewAllRequests(
  profile: DemoProfile | null | undefined,
): boolean {
  return !!profile && (profile.role === "admin" || isStudentAffairs(profile));
}

export function canAnswerRequest(
  profile: DemoProfile | null | undefined,
): boolean {
  return isStudentAffairs(profile);
}

export function canManageDocumentTypes(
  profile: DemoProfile | null | undefined,
): boolean {
  return isStudentAffairs(profile);
}

export function canSetTat(profile: DemoProfile | null | undefined): boolean {
  return isStudentAffairs(profile);
}

export function canEditOwnPendingRequest(
  profile: DemoProfile | null | undefined,
  request: DocRequest,
): boolean {
  return (
    isRequester(profile) &&
    ownsRequest(profile, request) &&
    request.status === "pending"
  );
}

export function canWithdrawOwnPendingRequest(
  profile: DemoProfile | null | undefined,
  request: DocRequest,
): boolean {
  return canEditOwnPendingRequest(profile, request);
}

export function canAcknowledge(
  profile: DemoProfile | null | undefined,
  request: DocRequest,
): boolean {
  return (
    isRequester(profile) &&
    ownsRequest(profile, request) &&
    request.status === "answered"
  );
}

export function canUploadFilledForm(
  profile: DemoProfile | null | undefined,
  request: DocRequest,
): boolean {
  return (
    isRequester(profile) &&
    ownsRequest(profile, request) &&
    request.status === "answered" &&
    !!request.document
  );
}

export function canRemoveFilledForm(
  profile: DemoProfile | null | undefined,
  request: DocRequest,
): boolean {
  return (
    isRequester(profile) &&
    ownsRequest(profile, request) &&
    request.status === "answered" &&
    !!request.filled_form
  );
}

export function canDownloadAnswerDocument(
  profile: DemoProfile | null | undefined,
  request: DocRequest,
): boolean {
  return (
    !!profile &&
    !!request.document &&
    (profile.role === "admin" ||
      isStudentAffairs(profile) ||
      ownsRequest(profile, request))
  );
}

export function canDownloadFilledForm(
  profile: DemoProfile | null | undefined,
  request: DocRequest,
): boolean {
  return (
    !!profile &&
    !!request.filled_form &&
    (profile.role === "admin" ||
      isStudentAffairs(profile) ||
      ownsRequest(profile, request))
  );
}

/** Which app shell / navigation area a profile belongs to. */
export type AppArea = "requester" | "student-affairs" | "admin";

export function areaForProfile(profile: DemoProfile): AppArea {
  if (profile.role === "admin") return "admin";
  if (isStudentAffairs(profile)) return "student-affairs";
  return "requester";
}

/** Route-area access rules (??4.2???4.4): students/faculty/other office staff use /app; only SA uses /sa; only admin uses /admin. Student Affairs has requester capabilities, but its portal is /sa. */
export function canAccessArea(
  area: AppArea,
  profile: DemoProfile | null | undefined,
): boolean {
  if (!profile) return false;
  if (area === "admin") return profile.role === "admin";
  if (area === "student-affairs") return isStudentAffairs(profile);
  return isRequester(profile) && !isStudentAffairs(profile);
}

export function homePathForProfile(profile: DemoProfile | null): string {
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

export const AREA_LABELS: Record<AppArea, string> = {
  requester: "Requester portal",
  "student-affairs": "Student Affairs portal",
  admin: "Admin portal (read-only)",
};
