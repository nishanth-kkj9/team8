import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { CampusProfile } from "../types/auth";
import { isValidEmail } from "../lib/validation";
import { campusOsAuthService } from "../services/api/campusOsAuthService";
import { setOnSessionExpiredListener } from "../services/api/sessionStore";
import { saveSession } from "../services/api/sessionStore";

type AuthStatus = "restoring" | "restore-error" | "signed-out" | "signed-in";

interface AuthContextValue {
  profile: CampusProfile | null;
  status: AuthStatus;
  restoreError: string | null;
  retryRestore(): void;
  signInWithEmail(email: string, otp: string): Promise<{ profile: CampusProfile | null; error?: string }>;
  signOut(): void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<CampusProfile | null>(null);
  const [status, setStatus] = useState<AuthStatus>("restoring");
  const [restoreError, setRestoreError] = useState<string | null>(null);
  const generation = useRef(0);

  const restoreSession = useCallback(async () => {
    const current = ++generation.current;
    setStatus("restoring");
    setRestoreError(null);
    const session = campusOsAuthService.getValidSession();
    if (!session) {
      if (current === generation.current) { setProfile(null); setStatus("signed-out"); }
      return;
    }
    const result = await campusOsAuthService.getCurrentProfile();
    if (current !== generation.current) return;
    if (result.profile) {
      setProfile(result.profile);
      setStatus("signed-in");
    } else if (result.error && campusOsAuthService.getValidSession()) {
      setProfile(null);
      setRestoreError(result.error);
      setStatus("restore-error");
    } else {
      campusOsAuthService.logout();
      setProfile(null);
      setStatus("signed-out");
    }
  }, []);

  const signOut = useCallback(() => {
    generation.current += 1;
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

  useEffect(() => { void restoreSession(); }, [restoreSession]);

  const signInWithEmail = useCallback(
    async (email: string, otp: string) => {
      generation.current += 1;
      const current = generation.current;
      const trimmedEmail = email.trim();
      const trimmedOtp = otp.trim();

      if (!isValidEmail(trimmedEmail)) {
        return { profile: null, error: "Enter a valid email address." };
      }
      if (!trimmedOtp) {
        return { profile: null, error: "OTP is required." };
      }

      const result = await campusOsAuthService.login(trimmedEmail, trimmedOtp);
      if (current !== generation.current) return { profile: null, error: "Sign-in was cancelled." };
      if (result.error || !result.profile) {
        return { profile: null, error: result.error || "Authentication failed." };
      }

      if (!result.token || !result.expiresAt) return { profile: null, error: "CampusOS returned an incomplete session." };
      saveSession(result.token, Math.max(1, Math.floor((result.expiresAt - Date.now()) / 1000)), result.profile);
      setProfile(result.profile);
      setRestoreError(null);
      setStatus("signed-in");
      return { profile: result.profile, error: undefined };
    },
    [],
  );

  const value = useMemo<AuthContextValue>(
    () => ({ profile, status, restoreError, retryRestore: () => { void restoreSession(); }, signInWithEmail, signOut }),
    [profile, status, restoreError, restoreSession, signInWithEmail, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    return {
      profile: null,
      status: "signed-out" as const,
      restoreError: null,
      retryRestore: () => undefined,
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
