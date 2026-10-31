export type AdminDecision = "approved" | "rejected";

export interface AdminDecisionRecord {
  decision: AdminDecision;
  note?: string;
  decided_by?: string;
  decided_at: string;
}

export type AdminDecisionMap = Record<string, AdminDecisionRecord>;

const STORAGE_KEY = "docdesk.admin-decisions.v1";
const CHANGE_EVENT = "docdesk:admin-decisions-changed";

function hasStorage(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function getAllAdminDecisions(): AdminDecisionMap {
  if (!hasStorage()) return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    return parsed as AdminDecisionMap;
  } catch {
    return {};
  }
}

export function getAdminDecision(requestId: string): AdminDecisionRecord | null {
  return getAllAdminDecisions()[requestId] ?? null;
}

function persist(decisions: AdminDecisionMap): void {
  if (!hasStorage()) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(decisions));
  } catch {
    // Storage can be unavailable (private mode / quota); decisions then only
    // live for the current render.
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function setAdminDecision(
  requestId: string,
  record: AdminDecisionRecord,
): void {
  const decisions = getAllAdminDecisions();
  decisions[requestId] = record;
  persist(decisions);
}

export function clearAdminDecision(requestId: string): void {
  const decisions = getAllAdminDecisions();
  if (!(requestId in decisions)) return;
  delete decisions[requestId];
  persist(decisions);
}

export function subscribeAdminDecisions(listener: () => void): () => void {
  if (typeof window === "undefined") return () => undefined;
  const onStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY) listener();
  };
  window.addEventListener(CHANGE_EVENT, listener);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(CHANGE_EVENT, listener);
    window.removeEventListener("storage", onStorage);
  };
}
