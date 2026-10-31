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

/** CampusOS grants answer and TAT mutations to Student Affairs staff only. */
export function actsAsStudentAffairs(
  profile: DemoProfile | null | undefined,
): boolean {
  return isStudentAffairs(profile);
}

/**
 * Admin and Student Affairs can review the institution-wide request queue.
 * Other office staff and faculty have requester access only.
 */
export function isCollegeAdmin(
  profile: DemoProfile | null | undefined,
): boolean {
  return !!profile && (profile.role === "admin" || isStudentAffairs(profile));
}

/** CampusOS treats every non-admin account as a requester. */
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

/** College Main Admin sees all requests; students see their own. */
export function canViewAllRequests(
  profile: DemoProfile | null | undefined,
): boolean {
  return isCollegeAdmin(profile);
}

export function canAnswerRequest(
  profile: DemoProfile | null | undefined,
): boolean {
  return actsAsStudentAffairs(profile);
}

/** Only Student Affairs maintains the document types students can request. */
export function canManageDocumentTypes(
  profile: DemoProfile | null | undefined,
): boolean {
  return isStudentAffairs(profile);
}

export function canSetTat(profile: DemoProfile | null | undefined): boolean {
  return actsAsStudentAffairs(profile);
}

/**
 * College Main Faculty (Admin) reviews every request and records an
 * approve/reject decision. This decision is a frontend-only overlay: the
 * CampusOS API keeps the request's own pending/answered/acknowledged status.
 */
export function canDecideRequest(
  profile: DemoProfile | null | undefined,
  request: DocRequest,
): boolean {
  return !!profile && profile.role === "admin" && request.status !== "acknowledged";
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
    (isCollegeAdmin(profile) || ownsRequest(profile, request))
  );
}

export function canDownloadFilledForm(
  profile: DemoProfile | null | undefined,
  request: DocRequest,
): boolean {
  return (
    !!profile &&
    !!request.filled_form &&
    (isCollegeAdmin(profile) || ownsRequest(profile, request))
  );
}

/** DocDesk exposes a Student portal and one shared Admin portal. */
export type AppArea = "requester" | "admin";

export function areaForProfile(profile: DemoProfile): AppArea {
  if (isCollegeAdmin(profile)) return "admin";
  return "requester";
}

export function canAccessArea(
  area: AppArea,
  profile: DemoProfile | null | undefined,
): boolean {
  if (!profile) return false;
  if (area === "admin") return isCollegeAdmin(profile);
  return profile.role !== "admin";
}

export function homePathForProfile(profile: DemoProfile | null): string {
  if (!profile) return "/login";
  return areaForProfile(profile) === "admin"
    ? "/admin/dashboard"
    : "/app/dashboard";
}

export const AREA_LABELS: Record<AppArea, string> = {
  requester: "Student portal",
  admin: "Admin portal",
};
