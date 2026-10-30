// CampusOS authentication service
import type { CampusRole } from "../../types/auth";
import { ApiError } from "./apiErrors";
import { campusOsClient } from "./campusOsClient";
import {
  clearStoredSession,
  getStoredSession,
  saveSession,
  type SessionData,
  getValidToken,
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
    dept?: string;
    designation?: string;
    phone_number?: string;
    institution_name?: string;
  };
}

export interface AuthResult {
  profile:
    | {
        role: CampusRole;
        team_id: string;
        name: string;
        email_id: string;
        dept?: string;
        designation?: string;
        phone_number?: string;
        institution_name?: string;
      } | null;
  token: string | null;
  expiresAt: number | null;
  error?: string;
}

/** Performs authentication via official CampusOS auth endpoints.
 * - Admin uses POST /api/v1/auth/admin/login
 * - Requester/Staff uses POST /api/v1/auth/login
 * - USE_ADMIN_LOGIN error triggers admin endpoint retry
 * - Other HTTP 400 errors do NOT retry */
export async function login(
  email: string,
  otp: string
): Promise<AuthResult> {
  const trimmedEmail = email.trim().toLowerCase();
  const isAdminEmail = trimmedEmail === TEAM8_ADMIN_EMAIL;

  let responseData: any;
  let loginError: any = null;

  if (isAdminEmail) {
    try {
      responseData = await campusOsClient.post<LoginResponsePayload>(
        "/auth/admin/login",
        {
          email_id: trimmedEmail,
          otp: otp.trim(),
        }
      );
    } catch (err) {
      loginError = err;
      // Only retry admin endpoint if server specifically returned USE_ADMIN_LOGIN
      if (err instanceof ApiError && err.code === "USE_ADMIN_LOGIN") {
        try {
          responseData = await campusOsClient.post<LoginResponsePayload>(
            "/auth/admin/login",
            {
              email_id: trimmedEmail,
              otp: otp.trim(),
            }
          );
        } catch (retryErr) {
          loginError = retryErr;
        }
      }
    }
  } else {
    try {
      responseData = await campusOsClient.post<LoginResponsePayload>(
        "/auth/login",
        {
          email_id: trimmedEmail,
          otp: otp.trim(),
        }
      );
    } catch (err) {
      loginError = err;
      // Only retry admin endpoint if server specifically returned USE_ADMIN_LOGIN
      if (err instanceof ApiError && (err as ApiError).code === "USE_ADMIN_LOGIN") {
        try {
          responseData = await campusOsClient.post<LoginResponsePayload>(
            "/auth/admin/login",
            {
              email_id: trimmedEmail,
              otp: otp.trim(),
            }
          );
        } catch (retryErr) {
          loginError = retryErr;
        }
      }
    }
  }

  // If we still don't have response data after retry, return error
  if (!responseData) {
    return { profile: null, token: null, expiresAt: null, error: "Login failed" };
  }

  // Validate login response before accepting
  const token = responseData.access_token;
  if (!token) {
    return { profile: null, token: null, expiresAt: null, error: "No access_token returned by login endpoint" };
  }

  const expiresIn = responseData.expires_in && responseData.expires_in > 0
    ? responseData.expires_in
    : 43200; // default 12 hours

  // Token type must be bearer (case-insensitive)
  const tokenType = (responseData.token_type || "").toLowerCase();
  if (tokenType !== "bearer") {
    return { profile: null, token: null, expiresAt: null, error: `Expected token type 'bearer', got '${tokenType}'` };
  }

  // Validate expires_in is a positive number
  if (!(responseData.expires_in && responseData.expires_in > 0)) {
    return { profile: null, token: null, expiresAt: null, error: "Invalid token expiry returned by login endpoint" };
  }

  // Extract profile from login response, validating it has required fields
  let loginProfile: {
    role: CampusRole;
    team_id: string;
    name: string;
    email_id: string;
    dept?: string;
    designation?: string;
    phone_number?: string;
    institution_name?: string;
  } | null = null;
  if (responseData.profile && responseData.profile.role) {
    if (!responseData.profile.team_id) {
    } else if (!responseData.profile.name) {
    } else if (!responseData.profile.email_id) {
    } else {
      loginProfile = {
        role: responseData.profile.role,
        team_id: responseData.profile.team_id,
        name: responseData.profile.name,
        email_id: responseData.profile.email_id,
        dept: responseData.profile.dept,
        designation: responseData.profile.designation,
        phone_number: responseData.profile.phone_number,
        institution_name: responseData.profile.institution_name,
      };
    }
  }

  // Hydrate authoritative profile from /me endpoint
  let authoritativeProfile: {
    role: CampusRole;
    team_id: string;
    name: string;
    email_id: string;
    dept?: string;
    designation?: string;
    phone_number?: string;
    institution_name?: string;
  } | null = null;

  const isDeterminedAdmin = isAdminEmail || (loginProfile?.role === "admin");

  try {
    if (isDeterminedAdmin) {
      const rawProfile = await campusOsClient.get<any>("/admin/me");
      authoritativeProfile = extractProfile(rawProfile.profile);
    } else {
      const rawProfile = await campusOsClient.get<any>("/users/me");
      authoritativeProfile = extractProfile(rawProfile.profile);
    }
  } catch (profileErr) {
    // If /me call fails, use the profile provided in the login payload if valid
    if (loginProfile && loginProfile.role && loginProfile.team_id && loginProfile.name && loginProfile.email_id) {
      authoritativeProfile = loginProfile;
    } else {
      clearStoredSession();
      return { profile: null, token: null, expiresAt: null, error: "Could not retrieve authenticated user profile from CampusOS." };
    }
  }

  // Final validation of authoritative profile
  if (!authoritativeProfile || !authoritativeProfile.role) {
    clearStoredSession();
    return { profile: null, token: null, expiresAt: null, error: "Authoritative profile missing required role information." };
  }

  // Update stored session with authoritative profile
  saveSession(token, responseData.expires_in, authoritativeProfile);

  return {
    profile: authoritativeProfile,
    token,
    expiresAt: Date.now() + responseData.expires_in * 1000,
    error: undefined,
  };
}

/** Extracts a CampusProfile from a raw API response profile object. */
function extractProfile(
  raw: Record<string, unknown> | undefined
): {
  role: CampusRole;
  team_id: string;
  name: string;
  email_id: string;
  dept?: string;
  designation?: string;
  phone_number?: string;
  institution_name?: string;
} | null {
  if (!raw) return null;

  const role = (raw.role ?? "").toLowerCase() as CampusRole;
  const team_id = String(raw.team_id ?? "").trim();
  const name = String(raw.name ?? "").trim();
  const email_id = String(raw.email_id ?? "").trim();

  if (!role || !team_id || !name || !email_id) {
    return null;
  }

  return {
    role,
    team_id,
    name,
    email_id,
    dept: raw.dept ? String(raw.dept).trim() : undefined,
    designation: raw.designation ? String(raw.designation).trim() : undefined,
    phone_number: raw.phone_number ? String(raw.phone_number).trim() : undefined,
    institution_name: raw.institution_name ? String(raw.institution_name).trim() : undefined,
  };
}

/** Fetches full authoritative profile for active session
 * - On HTTP 401, clears session and returns null (does NOT restore stale profile)
 * - Network errors are handled separately from auth failures */
export async function getCurrentProfile(
  role?: string
): Promise<{
  profile: {
    role: CampusRole;
    team_id: string;
    name: string;
    email_id: string;
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

  // Validate session expiry before making request
  if (Date.now() >= session.expiresAt) {
    clearStoredSession();
    return { profile: null, error: undefined };
  }

  try {
    let endpoint: string;
    if (role === "admin" || session.profile.role === "admin") {
      endpoint = "/admin/me";
    } else {
      endpoint = "/users/me";
    }

    const rawProfile = await campusOsClient.get<any>(endpoint);
    const profileData = rawProfile.profile || rawProfile;
    const extracted = extractProfile(profileData);
    if (extracted) {
      return { profile: extracted, error: undefined };
    }
    clearStoredSession();
    return { profile: null, error: undefined };
  } catch (err) {
    const error = err instanceof Error ? err.message : "Request failed";

    // HTTP 401/403 - token is invalid/revoked, MUST clear session
    if (err instanceof ApiError && (err.status === 401 || err.status === 403 || err.code === "UNAUTHORIZED" || err.code === "INVALID_TOKEN" || err.code === "TOKEN_EXPIRED")) {
      clearStoredSession();
      return { profile: null, error: err.message };
    }

    // Network failures and other errors - do NOT clear session automatically
    return { profile: null, error: error };
  }
}

/** Gets stored session if valid */
export function getValidSession(): SessionData | null {
  return getStoredSession();
}

/** Logs out by clearing session */
export function logout(): void {
  clearStoredSession();
}