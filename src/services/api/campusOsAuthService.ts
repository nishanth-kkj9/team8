// CampusOS authentication service
import type { CampusRole } from "../../types/auth";
import { ApiError } from "./apiErrors";
import { campusOsClient } from "./campusOsClient";
import {
  clearStoredSession,
  getStoredSession,
  saveSession,
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
  dept?: string;
  designation?: string;
  phone_number?: string;
  institution_name?: string;
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
    dept: raw.dept ? String(raw.dept).trim() : undefined,
    designation: raw.designation ? String(raw.designation).trim() : undefined,
    phone_number: raw.phone_number ? String(raw.phone_number).trim() : undefined,
    institution_name: raw.institution_name ? String(raw.institution_name).trim() : undefined,
  };
}

async function fetchProfileForRole(role: CampusRole) {
  const endpoint = role === "admin" ? "/admin/me" : "/users/me";
  const rawProfile = await campusOsClient.get<{ profile?: Record<string, unknown> }>(endpoint);
  const profileData = rawProfile?.profile ?? rawProfile;
  return extractProfile(profileData as Record<string, unknown> | undefined);
}

export const campusOsAuthService = {
  login,
  getCurrentProfile,
  getValidSession,
  logout,
};

export async function login(email: string, otp: string): Promise<AuthResult> {
  const trimmedEmail = email.trim().toLowerCase();
  const trimmedOtp = otp.trim();
  const isAdminEmail = trimmedEmail === TEAM8_ADMIN_EMAIL;

  try {
    const payload = { email_id: trimmedEmail, otp: trimmedOtp };
    const responseData = await campusOsClient.post<LoginResponsePayload>(
      isAdminEmail ? "/auth/admin/login" : "/auth/login",
      payload,
    );

    const token = responseData.access_token;
    if (!token) {
      return { profile: null, token: null, expiresAt: null, error: "No access_token returned by login endpoint." };
    }

    const expiresIn = responseData.expires_in && responseData.expires_in > 0 ? responseData.expires_in : 43200;
    const tokenType = (responseData.token_type || "").toLowerCase();
    if (tokenType && tokenType !== "bearer") {
      return { profile: null, token: null, expiresAt: null, error: `Expected token type 'bearer', got '${tokenType}'.` };
    }

    const loginProfile = responseData.profile ? extractProfile(responseData.profile as Record<string, unknown>) : null;
    const roleToFetch = isAdminEmail ? "admin" : loginProfile?.role ?? "student";
    const authoritativeProfile = await fetchProfileForRole(roleToFetch);
    if (!authoritativeProfile) {
      clearStoredSession();
      return { profile: null, token: null, expiresAt: null, error: "Could not retrieve authenticated user profile from CampusOS." };
    }
    if (isAdminEmail && authoritativeProfile.role !== "admin") {
      clearStoredSession();
      return { profile: null, token: null, expiresAt: null, error: "CampusOS did not confirm this account as an admin." };
    }

    saveSession(token, expiresIn, authoritativeProfile);
    const authenticated = Object.assign({ ...authoritativeProfile }, {
      profile: authoritativeProfile,
      token,
      expiresAt: Date.now() + expiresIn * 1000,
      error: undefined,
    });
    return authenticated as AuthResult & typeof authoritativeProfile;
  } catch (err) {
    const error = err instanceof ApiError ? err : undefined;
    if (error && (error.status === 401 || error.code === "UNAUTHORIZED" || error.code === "INVALID_TOKEN" || error.code === "TOKEN_EXPIRED")) {
      clearStoredSession();
      return { profile: null, token: null, expiresAt: null, error: error.message };
    }

    if (error && error.code === "USE_ADMIN_LOGIN" && !isAdminEmail) {
      try {
        const responseData = await campusOsClient.post<LoginResponsePayload>("/auth/admin/login", {
          email_id: trimmedEmail,
          otp: trimmedOtp,
        });
        const token = responseData.access_token;
        if (!token) {
          return { profile: null, token: null, expiresAt: null, error: "No access_token returned by login endpoint." };
        }
        const expiresIn = responseData.expires_in && responseData.expires_in > 0 ? responseData.expires_in : 43200;
        const authoritativeProfile = await fetchProfileForRole("admin");
        if (!authoritativeProfile) {
          clearStoredSession();
          return { profile: null, token: null, expiresAt: null, error: "Could not retrieve authenticated user profile from CampusOS." };
        }
        saveSession(token, expiresIn, authoritativeProfile);
        return { profile: authoritativeProfile, token, expiresAt: Date.now() + expiresIn * 1000, error: undefined };
      } catch (retryErr) {
        const retryError = retryErr instanceof ApiError ? retryErr : undefined;
        return {
          profile: null,
          token: null,
          expiresAt: null,
          error: retryError ? retryError.message : "Unable to sign in.",
        };
      }
    }

    return {
      profile: null,
      token: null,
      expiresAt: null,
      error: error ? error.message : "Unable to sign in.",
    };
  }
}

export async function getCurrentProfile(role?: string): Promise<{
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

  if (Date.now() >= session.expiresAt) {
    clearStoredSession();
    return { profile: null, error: undefined };
  }

  try {
    const endpoint = role === "admin" || session.profile.role === "admin" ? "/admin/me" : "/users/me";
    const rawProfile = await campusOsClient.get<{ profile?: Record<string, unknown> }>(endpoint);
    const profileData = rawProfile?.profile ?? rawProfile;
    const extracted = extractProfile(profileData as Record<string, unknown> | undefined);
    if (!extracted) {
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
