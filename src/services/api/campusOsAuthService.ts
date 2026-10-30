import type { DemoProfile } from "../../types/auth";
import { ApiError } from "./apiErrors";
import { campusOsClient } from "./campusOsClient";
import {
  clearStoredSession,
  getStoredSession,
  saveSession,
  type SessionData,
} from "./sessionStore";

export interface LoginResponsePayload {
  access_token: string;
  token_type?: string;
  expires_in?: number;
  profile?: DemoProfile;
}

const TEAM8_ADMIN_EMAIL = "admin@team8.com";

export const campusOsAuthService = {
  /**
   * Performs authentication via CampusOS auth endpoints.
   * Admin uses POST /api/v1/auth/admin/login
   * Requester/Staff uses POST /api/v1/auth/login
   */
  async login(email: string, otp: string): Promise<DemoProfile> {
    const trimmedEmail = email.trim().toLowerCase();
    const isAdminEmail = trimmedEmail === TEAM8_ADMIN_EMAIL;

    let responseData: LoginResponsePayload;

    if (isAdminEmail) {
      responseData = await campusOsClient.post<LoginResponsePayload>(
        "/auth/admin/login",
        {
          email_id: trimmedEmail,
          otp: otp.trim(),
        },
      );
    } else {
      try {
        responseData = await campusOsClient.post<LoginResponsePayload>(
          "/auth/login",
          {
            email_id: trimmedEmail,
            otp: otp.trim(),
          },
        );
      } catch (err) {
        if (
          err instanceof ApiError &&
          (err.code === "USE_ADMIN_LOGIN" || err.status === 400)
        ) {
          // If server demands admin login endpoint, retry via admin login endpoint
          responseData = await campusOsClient.post<LoginResponsePayload>(
            "/auth/admin/login",
            {
              email_id: trimmedEmail,
              otp: otp.trim(),
            },
          );
        } else {
          throw err;
        }
      }
    }

    const token = responseData.access_token;
    if (!token) {
      throw new ApiError(500, "AUTH_ERROR", "No access_token returned by login endpoint");
    }

    const expiresIn = responseData.expires_in || 43200; // default 12 hours

    // Temporarily save token so profile fetch has Authorization header
    saveSession(token, expiresIn, responseData.profile || {
      role: isAdminEmail ? "admin" : "student",
      team_id: "team8",
      name: isAdminEmail ? "Team 8 Admin" : trimmedEmail,
      email_id: trimmedEmail,
    });

    // Hydrate full user/admin profile
    let fullProfile: DemoProfile;
    try {
      if (isAdminEmail || responseData.profile?.role === "admin") {
        fullProfile = await campusOsClient.get<DemoProfile>("/admin/me");
      } else {
        fullProfile = await campusOsClient.get<DemoProfile>("/users/me");
      }
    } catch {
      // Fallback to profile returned in login payload if /me endpoint fails
      fullProfile = responseData.profile || {
        role: isAdminEmail ? "admin" : "student",
        team_id: "team8",
        name: isAdminEmail ? "Team 8 Admin" : trimmedEmail,
        email_id: trimmedEmail,
      };
    }

    // Update saved session with hydrated profile
    saveSession(token, expiresIn, fullProfile);
    return fullProfile;
  },

  /**
   * Fetches full profile for current session
   */
  async getCurrentProfile(role?: string): Promise<DemoProfile | null> {
    const session = getStoredSession();
    if (!session) return null;

    try {
      if (role === "admin" || session.profile.role === "admin") {
        return await campusOsClient.get<DemoProfile>("/admin/me");
      }
      return await campusOsClient.get<DemoProfile>("/users/me");
    } catch {
      return session.profile;
    }
  },

  /**
   * Gets stored session if valid
   */
  getValidSession(): SessionData | null {
    return getStoredSession();
  },

  /**
   * Logs out by clearing local session
   */
  logout(): void {
    clearStoredSession();
  },
};
