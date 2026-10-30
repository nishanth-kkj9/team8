import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { DemoProfile } from "../types/auth";
import { docDeskService } from "../services/serviceProvider";
import { isValidEmail } from "../lib/validation";
import { campusOsAuthService } from "../services/api/campusOsAuthService";
import { setOnSessionExpiredListener } from "../services/api/sessionStore";

type AuthStatus = "restoring" | "signed-out" | "signed-in";

interface AuthContextValue {
  profile: DemoProfile | null;
  status: AuthStatus;
  signInWithEmail(email: string, otp: string): Promise<DemoProfile>;
  signOut(): void;
}

const DemoAuthContext = createContext<AuthContextValue | null>(null);

export function DemoAuthProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<DemoProfile | null>(null);
  const [status, setStatus] = useState<AuthStatus>("restoring");

  const signOut = useCallback(() => {
    campusOsAuthService.logout();
    docDeskService.setViewer(null);
    setProfile(null);
    setStatus("signed-out");
  }, []);

  // Listen to automatic session expiry events (e.g. 401 response from API)
  useEffect(() => {
    setOnSessionExpiredListener(() => {
      signOut();
    });
    return () => setOnSessionExpiredListener(null);
  }, [signOut]);

  // Restore authenticated session on mount from sessionStorage
  useEffect(() => {
    let mounted = true;

    async function restoreSession() {
      const apiSession = campusOsAuthService.getValidSession();
      if (apiSession) {
        try {
          const authoritativeProfile = await campusOsAuthService.getCurrentProfile();
          if (mounted && authoritativeProfile) {
            docDeskService.setViewer(authoritativeProfile);
            setProfile(authoritativeProfile);
            setStatus("signed-in");
            return;
          }
        } catch {
          // If profile fetch fails or token invalid, clear session
          campusOsAuthService.logout();
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
    async (email: string, otp: string): Promise<DemoProfile> => {
      const trimmedEmail = email.trim();
      const trimmedOtp = otp.trim();

      if (!isValidEmail(trimmedEmail)) {
        throw new Error("Enter a valid email address.");
      }
      if (!trimmedOtp) {
        throw new Error("OTP is required.");
      }

      const authenticatedProfile = await campusOsAuthService.login(trimmedEmail, trimmedOtp);
      docDeskService.setViewer(authenticatedProfile);
      setProfile(authenticatedProfile);
      setStatus("signed-in");
      return authenticatedProfile;
    },
    [],
  );

  const value = useMemo(
    () => ({ profile, status, signInWithEmail, signOut }),
    [profile, status, signInWithEmail, signOut],
  );

  return (
    <DemoAuthContext.Provider value={value}>
      {children}
    </DemoAuthContext.Provider>
  );
}

export const AuthProvider = DemoAuthProvider;

export function useDemoAuth(): AuthContextValue {
  const ctx = useContext(DemoAuthContext);
  if (!ctx) throw new Error("useDemoAuth must be used within DemoAuthProvider");
  return ctx;
}

export const useAuth = useDemoAuth;
