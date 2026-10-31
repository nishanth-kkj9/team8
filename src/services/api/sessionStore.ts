import type { DemoProfile } from "../../types/auth";

const SESSION_STORAGE_KEY = "docdesk.session.v1";

export interface SessionData {
  accessToken: string;
  expiresAt: number; // UTC timestamp in ms
  profile: DemoProfile;
}

type SessionExpiredCallback = () => void;
let onSessionExpiredListener: SessionExpiredCallback | null = null;

export function setOnSessionExpiredListener(cb: SessionExpiredCallback | null): void {
  onSessionExpiredListener = cb;
}

export function notifySessionExpired(): void {
  clearStoredSession();
  if (onSessionExpiredListener) {
    onSessionExpiredListener();
  }
}

export function saveSession(
  token: string,
  expiresInSeconds: number,
  profile: DemoProfile,
): SessionData {
  const expiresAt = Date.now() + expiresInSeconds * 1000;
  const data: SessionData = {
    accessToken: token,
    expiresAt,
    profile,
  };
  try {
    sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(data));
  } catch (err) {
    // Keep authentication data out of logs.
  }
  return data;
}

export function getStoredSession(): SessionData | null {
  try {
    const raw = sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return null;
    const session: SessionData = JSON.parse(raw);
    if (Date.now() >= session.expiresAt) {
      clearStoredSession();
      return null;
    }
    return session;
  } catch {
    clearStoredSession();
    return null;
  }
}

export function getValidToken(): string | null {
  const session = getStoredSession();
  return session ? session.accessToken : null;
}

export function clearStoredSession(): void {
  try {
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
  } catch {
    // ignore
  }
}
