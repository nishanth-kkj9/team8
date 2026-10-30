/** CampusOS role vocabulary (ARCHITECTURE.md §3, §6).
 * Do not rename these fields — they mirror the future API profile payloads.
 */
export type CampusRole = "student" | "faculty" | "office_staff" | "admin";

/** Non-admin roles are all requesters in DocDesk. */
export type RequesterRole = Exclude<CampusRole, "admin">;

/** Authenticated user profile returned by CampusOS API.
 * Contains only the fields that the API guarantees to provide.
 * Do not invent additional fields or fallback profiles.
 */
export interface CampusProfile {
  role: CampusRole;
  team_id: string;
  name: string;
  email_id: string;
  dept?: string;
  designation?: string;
  phone_number?: string;
  institution_name?: string;
}