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
import { seedProfiles } from "../data/seedProfiles";
import { docDeskService } from "../services/serviceProvider";
import { isValidEmail } from "../lib/validation";

/**
 * Demo auth context (ARCHITECTURE.md §5A). This is a frontend demonstration
 * shortcut — it does not claim the backend has these login endpoints. The
 * context is shaped so a real token-based session (12-hour access token)
 * can replace it during API integration.
 */

const STORAGE_KEY_VIEWER = "docdesk.demo.viewer.v1";

type AuthStatus = "restoring" | "signed-out" | "signed-in";

interface DemoAuthContextValue {
  profile: DemoProfile | null;
  status: AuthStatus;
  signInWithDemoAccount(profile: DemoProfile): void;
  signInWithEmail(email: string, otp: string): Promise<DemoProfile>;
  signOut(): void;
}

const DemoAuthContext = createContext<DemoAuthContextValue | null>(null);

function findProfileByEmail(email: string): DemoProfile | undefined {
  const needle = email.trim().toLowerCase();
  return Object.values(seedProfiles).find(
    (p) => p.email_id.toLowerCase() === needle,
  );
}

export function DemoAuthProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<DemoProfile | null>(null);
  const [status, setStatus] = useState<AuthStatus>("restoring");

  // Restore the demo session across refreshes (demo preference persistence, §7.2).
  useEffect(() => {
    const storedEmail = localStorage.getItem(STORAGE_KEY_VIEWER);
    if (storedEmail) {
      const match = findProfileByEmail(storedEmail);
      if (match) {
        docDeskService.setViewer(match);
        setProfile(match);
        setStatus("signed-in");
        return;
      }
    }
    setStatus("signed-out");
  }, []);

  const applyProfile = useCallback((next: DemoProfile) => {
    docDeskService.setViewer(next);
    localStorage.setItem(STORAGE_KEY_VIEWER, next.email_id);
    setProfile(next);
    setStatus("signed-in");
  }, []);

  const signInWithDemoAccount = useCallback(
    (next: DemoProfile) => {
      applyProfile(next);
    },
    [applyProfile],
  );

  const signInWithEmail = useCallback(
    async (email: string, otp: string): Promise<DemoProfile> => {
      const trimmed = email.trim();
      if (!isValidEmail(trimmed)) {
        throw new Error("Enter a valid email address.");
      }
      if (otp.trim().length < 4) {
        throw new Error("Enter the demo OTP (any 4+ characters).");
      }
      await new Promise((resolve) => setTimeout(resolve, 350)); // brief mock latency
      const match = findProfileByEmail(trimmed);
      if (!match) {
        throw new Error(
          "No demo account uses this email. Pick one of the demo accounts below.",
        );
      }
      applyProfile(match);
      return match;
    },
    [applyProfile],
  );

  const signOut = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY_VIEWER);
    docDeskService.setViewer(null);
    setProfile(null);
    setStatus("signed-out");
  }, []);

  const value = useMemo(
    () => ({ profile, status, signInWithDemoAccount, signInWithEmail, signOut }),
    [profile, status, signInWithDemoAccount, signInWithEmail, signOut],
  );

  return (
    <DemoAuthContext.Provider value={value}>
      {children}
    </DemoAuthContext.Provider>
  );
}

export function useDemoAuth(): DemoAuthContextValue {
  const ctx = useContext(DemoAuthContext);
  if (!ctx) throw new Error("useDemoAuth must be used within DemoAuthProvider");
  return ctx;
}
