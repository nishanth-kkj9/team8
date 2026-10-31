import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { CampusProfile } from "../types/auth";
import { isValidEmail } from "../lib/validation";
import { campusOsAuthService } from "../services/api/campusOsAuthService";
import { setOnSessionExpiredListener } from "../services/api/sessionStore";

type AuthStatus = "restoring" | "signed-out" | "signed-in";

interface AuthContextValue {
  profile: CampusProfile | null;
  status: AuthStatus;
  signInWithEmail(email: string, otp: string): Promise<{ profile: CampusProfile | null; error?: string }>;
  signOut(): void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<CampusProfile | null>(null);
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
    let active = true;

    async function restoreSession() {
      const session = campusOsAuthService.getValidSession();
      if (!session) {
        if (active) setStatus("signed-out");
        return;
      }

      try {
        const result = await campusOsAuthService.getCurrentProfile();
        if (!active) return;

        if (result.profile) {
          setProfile(result.profile);
          setStatus("signed-in");
          return;
        }
      } catch {
        // fall through to signed-out
      }

      if (active) {
        campusOsAuthService.logout();
        setProfile(null);
        setStatus("signed-out");
      }
    }

    void restoreSession();
    return () => {
      active = false;
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
      if (result.error || !result.profile) {
        return { profile: null, error: result.error || "Authentication failed." };
      }

      setProfile(result.profile);
      setStatus("signed-in");
      return { profile: result.profile, error: undefined };
    },
    [],
  );

  const value = useMemo<AuthContextValue>(
    () => ({ profile, status, signInWithEmail, signOut }),
    [profile, status, signInWithEmail, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    return {
      profile: null,
      status: "signed-out" as const,
      signInWithEmail: async (): Promise<{ profile: CampusProfile | null; error?: string }> => ({
        profile: null,
        error: "Not authenticated.",
      }),
      signOut: () => undefined,
    };
  }
  return ctx;
}

export function useDemoAuth() {
  return useAuth();
}

export const DemoAuthProvider = AuthProvider;
export const AuthContextValue = AuthContext;