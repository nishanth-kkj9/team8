/**
 * CampusOS role vocabulary (ARCHITECTURE.md §3, §6).
 * Do not rename these fields — they mirror the future API profile payloads.
 */
export type CampusRole = "student" | "faculty" | "office_staff" | "admin";

/** Non-admin roles are all requesters in DocDesk. */
export type RequesterRole = Exclude<CampusRole, "admin">;

export interface DemoProfile {
  role: CampusRole;
  team_id: string;
  name: string;
  email_id: string;
  phone_number?: string;
  /** Student only. */
  usn?: string;
  /** Student and office staff. */
  dept?: string;
  /** Faculty and office staff. */
  designation?: string;
  /** May appear on admin profiles. */
  institution_name?: string;
}

/** Demo login shortcut key — NOT an API role (the API only has CampusRole). */
export type DemoRoleKey =
  | "student"
  | "faculty"
  | "office_staff"
  | "student_affairs"
  | "admin";

export const ROLE_LABELS: Record<CampusRole, string> = {
  student: "Student",
  faculty: "Faculty",
  office_staff: "Office Staff",
  admin: "Admin",
};
