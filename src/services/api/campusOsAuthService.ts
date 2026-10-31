// CampusOS authentication service
import type { CampusRole } from "../../types/auth";
import { ApiError } from "./apiErrors";
import { campusOsClient } from "./campusOsClient";
import {
  clearStoredSession,
  getStoredSession,
  type SessionData,
} from "./sessionStore";

const TEAM8_ADMIN_EMAIL = "admin@team8.com";

export interface LoginResponsePayload {
  access_token: string;
  token_type?: string;
  expires_in?: number;
  profile?: {
    role: CampusRole;
    team_id: string;
    name: string;
    email_id: string;
    usn?: string;
    dept?: string;
    designation?: string;
    phone_number?: string;
    institution_name?: string;
  };
}

export interface AuthResult {
  role?: CampusRole;
  team_id?: string;
  name?: string;
  email_id?: string;
  usn?: string;
  dept?: string;
  designation?: string;
  phone_number?: string;
  institution_name?: string;
  profile: {
    role: CampusRole;
    team_id: string;
    name: string;
    email_id: string;
    usn?: string;
    dept?: string;
    designation?: string;
    phone_number?: string;
    institution_name?: string;
  } | null;
  token: string | null;
  expiresAt: number | null;
  error?: string;
}

function normalizeRole(raw: unknown): CampusRole | null {
  const value = typeof raw === "string" ? raw.trim().toLowerCase() : "";
  if (["student", "faculty", "office_staff", "admin"].includes(value)) {
    return value as CampusRole;
  }
  return null;
}

function extractProfile(raw: Record<string, unknown> | undefined): {
  role: CampusRole;
  team_id: string;
  name: string;
  email_id: string;
  usn?: string;
  dept?: string;
  designation?: string;
  phone_number?: string;
  institution_name?: string;
} | null {
  if (!raw) return null;

  const role = normalizeRole(raw.role);
  const teamId = String(raw.team_id ?? "").trim();
  const name = String(raw.name ?? "").trim();
  const emailId = String(raw.email_id ?? "").trim();

  if (!role || !teamId || !name || !emailId) {
    return null;
  }

  return {
    role,
    team_id: teamId,
    name,
    email_id: emailId,
    usn: raw.usn ? String(raw.usn).trim() : undefined,
    dept: raw.dept ? String(raw.dept).trim() : undefined,
    designation: raw.designation ? String(raw.designation).trim() : undefined,
    phone_number: raw.phone_number ? String(raw.phone_number).trim() : undefined,
    institution_name: raw.institution_name ? String(raw.institution_name).trim() : undefined,
  };
}

async function fetchProfileForRole(role: CampusRole, token: string) {
  const endpoint = role === "admin" ? "/admin/me" : "/users/me";
  const rawProfile = await campusOsClient.getWithToken<{ profile?: Record<string, unknown> }>(endpoint, token);
  const profileData = rawProfile?.profile ?? rawProfile;
  return extractProfile(profileData as Record<string, unknown> | undefined);
}

export const campusOsAuthService = {
  login,
  getCurrentProfile,
  getValidSession,
  logout,
};

async function postLogin(
  path: "/auth/login" | "/auth/admin/login",
  payload: { email_id: string; otp: string },
): Promise<LoginResponsePayload> {
  return campusOsClient.post<LoginResponsePayload>(path, payload);
}

/**
 * CampusOS has separate login endpoints for the admin and everyone else. We
 * start with the endpoint implied by the email, then follow the server's
 * USE_ADMIN_LOGIN / USE_USER_LOGIN hint so a renamed or unknown admin email
 * still signs in correctly.
 */
async function requestLogin(
  trimmedEmail: string,
  trimmedOtp: string,
): Promise<LoginResponsePayload> {
  const payload = { email_id: trimmedEmail, otp: trimmedOtp };
  const preferred: "/auth/login" | "/auth/admin/login" =
    trimmedEmail === TEAM8_ADMIN_EMAIL ? "/auth/admin/login" : "/auth/login";

  try {
    return await postLogin(preferred, payload);
  } catch (err) {
    if (
      err instanceof ApiError &&
      err.status === 400 &&
      (err.code === "USE_ADMIN_LOGIN" || err.code === "USE_USER_LOGIN")
    ) {
      const alternate: "/auth/login" | "/auth/admin/login" =
        preferred === "/auth/admin/login" ? "/auth/login" : "/auth/admin/login";
      return postLogin(alternate, payload);
    }
    throw err;
  }
}

export async function login(email: string, otp: string): Promise<AuthResult> {
  const trimmedEmail = email.trim().toLowerCase();
  const trimmedOtp = otp.trim();

  try {
    const responseData = await requestLogin(trimmedEmail, trimmedOtp);

    const token = typeof responseData.access_token === "string" ? responseData.access_token.trim() : "";
    const expiresIn = responseData.expires_in;
    const tokenType = typeof responseData.token_type === "string" ? responseData.token_type.toLowerCase() : "";
    if (!token || tokenType !== "bearer" || typeof expiresIn !== "number" || !Number.isFinite(expiresIn) || expiresIn <= 0) {
      clearStoredSession();
      return { profile: null, token: null, expiresAt: null, error: "CampusOS returned an invalid token, token type, or expiry." };
    }

    const loginProfile = responseData.profile ? extractProfile(responseData.profile as Record<string, unknown>) : null;
    if (!loginProfile) {
      clearStoredSession();
      return { profile: null, token: null, expiresAt: null, error: "CampusOS did not return a valid profile." };
    }
    const roleToFetch = loginProfile.role;
    const authoritativeProfile = await fetchProfileForRole(roleToFetch, token);
    if (!authoritativeProfile) {
      clearStoredSession();
      return { profile: null, token: null, expiresAt: null, error: "Could not retrieve authenticated user profile from CampusOS." };
    }
    if (authoritativeProfile.role !== loginProfile.role) {
      clearStoredSession();
      return { profile: null, token: null, expiresAt: null, error: "CampusOS profile validation failed after login." };
    }

    const authenticated = Object.assign({ ...authoritativeProfile }, {
      profile: authoritativeProfile,
      token,
      expiresAt: Date.now() + expiresIn * 1000,
      error: undefined,
    });
    return authenticated as AuthResult & typeof authoritativeProfile;
  } catch (err) {
    const error = err instanceof ApiError ? err : undefined;
    if (error) {
      clearStoredSession();
      return { profile: null, token: null, expiresAt: null, error: loginErrorMessage(error) };
    }

    return {
      profile: null,
      token: null,
      expiresAt: null,
      error: "Unable to sign in.",
    };
  }
}

function loginErrorMessage(error: ApiError): string {
  switch (error.code) {
    case "INVALID_CREDENTIALS":
      return "Wrong email or OTP. Check both and try again.";
    case "UNKNOWN_INSTITUTION":
      return "That email domain is not registered with CampusOS.";
    case "USE_ADMIN_LOGIN":
      return "This is an admin account. Sign in with the admin email and team OTP.";
    case "USE_USER_LOGIN":
      return "This account is not an admin. Use the normal sign-in form.";
    case "RATE_LIMITED":
      return error.retryAfterSeconds
        ? `Too many attempts. Try again in ${error.retryAfterSeconds} seconds.`
        : "Too many attempts. Please wait and try again.";
    case "TOKEN_EXPIRED":
      return "Your session expired. Please sign in again.";
    default:
      return error.message || "Unable to sign in.";
  }
}

export async function getCurrentProfile(role?: string): Promise<{
  profile: {
    role: CampusRole;
    team_id: string;
    name: string;
    email_id: string;
    usn?: string;
    dept?: string;
    designation?: string;
    phone_number?: string;
    institution_name?: string;
  } | null;
  error?: string;
}> {
  const session = getStoredSession();
  if (!session) {
    return { profile: null, error: undefined };
  }

  if (Date.now() >= session.expiresAt) {
    clearStoredSession();
    return { profile: null, error: undefined };
  }

  try {
    const endpoint = role === "admin" || session.profile.role === "admin" ? "/admin/me" : "/users/me";
    const rawProfile = await campusOsClient.get<{ profile?: Record<string, unknown> }>(endpoint);
    const profileData = rawProfile?.profile ?? rawProfile;
    const extracted = extractProfile(profileData as Record<string, unknown> | undefined);
    if (!extracted || extracted.role !== session.profile.role || (role && extracted.role !== role)) {
      clearStoredSession();
      return { profile: null, error: undefined };
    }
    return { profile: extracted, error: undefined };
  } catch (err) {
    if (err instanceof ApiError && (err.status === 401 || err.status === 403 || err.code === "UNAUTHORIZED" || err.code === "INVALID_TOKEN" || err.code === "TOKEN_EXPIRED")) {
      clearStoredSession();
      return { profile: null, error: err.message };
    }
    return { profile: null, error: err instanceof Error ? err.message : "Request failed" };
  }
}

export function getValidSession(): SessionData | null {
  const session = getStoredSession();
  if (!session) return null;
  if (Date.now() >= session.expiresAt) {
    clearStoredSession();
    return null;
  }
  return session;
}

export function logout(): void {
  clearStoredSession();
}
