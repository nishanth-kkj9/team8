import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { CampusRole } from "../types/auth";
import { docDeskService } from "../services/serviceProvider";
import { isValidEmail } from "../lib/validation";
import { campusOsAuthService } from "../services/api/campusOsAuthService";
import { setOnSessionExpiredListener } from "../services/api/sessionStore";

type AuthStatus = "restoring" | "signed-out" | "signed-in";

interface AuthContextValue {
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
      }
    | null;
  status: AuthStatus;
  signInWithEmail(
    email: string,
    otp: string
  ): Promise<{
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
      }
      | null>;
    error?: string;
  }>;
  signOut(): void;
}

// Simplified context
const AuthContext = createContext<
  | {
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
    status: AuthStatus;
    signInWithEmail: (
      email: string,
      otp: string
    ) => Promise<{
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
    }>;
    signOut(): void;
  } | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<
    | {
      role: CampusRole;
      team_id: string;
      name: string;
      email_id: string;
      dept?: string;
      designation?: string;
      phone_number?: string;
      institution_name?: string;
    } | null>(null);
  const [status, setStatus] = useState<AuthStatus>("restoring");

  const signOut = useCallback(() => {
    campusOsAuthService.logout();
    setProfile(null);
    setStatus("signed-out");
  }, []);

  useEffect(() => {
    setOnSessionExpiredListener(() => {
      signOut();
    });
    return () => setOnSessionExpiredListener(null);
  }, [signOut]);

  useEffect(() => {
    let mounted = true;

    async function restoreSession() {
      const apiSession = campusOsAuthService.getValidSession();
      if (apiSession) {
        try {
          const p = await campusOsAuthService.getCurrentProfile();
          if (mounted && p.profile) {
            setProfile(p.profile);
            setStatus("signed-in");
            return;
          }
        } catch {
          if (mounted) {
            clearStoredSession();
            setProfile(null);
            setStatus("signed-out");
          }
        }
      }
      if (mounted) {
        setStatus("signed-out");
      }
    }

    void restoreSession();
    return () => {
      mounted = false;
    };
  }, []);

  const signInWithEmail = useCallback(
    async (email: string, otp: string) => {
      const trimmedEmail = email.trim();
      const trimmedOtp = otp.trim();

      if (!isValidEmail(trimmedEmail)) {
        return { profile: null, error: "Enter a valid email address." };
      }
      if (!trimmedOtp) {
        return { profile: null, error: "OTP is required." };
      }

      const result = await campusOsAuthService.login(trimmedEmail, trimmedOtp);

      if (result.error) {
        return { profile: null, error: result.error };
      }

      setProfile(result.profile || null);
      setStatus("signed-in");
      return { profile: result.profile, error: result.error };
    },
    [],
  );

  return (
    <AuthContext.Provider
      profile={profile}
      status={status}
      signInWithEmail={signInWithEmail}
      signOut={signOut}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    return { profile: null, status: "signed-out", signInWithEmail: async () => ({ profile: null }), signOut } as const;
  }
  return ctx;
}

export function useDemoAuth() {
  return useAuth();
}

export const AuthContextValue = AuthContext;