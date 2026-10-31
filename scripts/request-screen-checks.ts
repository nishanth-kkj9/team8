import assert from "node:assert/strict";
import { campusOsDocDeskService } from "../src/services/api/campusOsDocDeskService";
import { ApiError } from "../src/services/api/apiErrors";
import { loadActiveDocTypes } from "../src/features/requester/utils/loadActiveDocTypes";
import { validateReason } from "../src/lib/validation";
import { canCreateRequest } from "../src/lib/permissions";
import type { DocType } from "../src/types/document";
import type { DemoProfile } from "../src/types/auth";

let passed = 0;
function check(name: string, fn: () => void): void {
  fn();
  passed += 1;
  console.log(`PASS ${name}`);
}

const activeA: DocType = { doc_type_id: "DTY-A", name: "Bonafide Certificate", status: "active" };
const activeB: DocType = { doc_type_id: "DTY-B", name: "Transcript", status: "active" };
const archived: DocType = { doc_type_id: "DTY-X", name: "Old Type", status: "archived" };

const calls: Array<{ status?: string; limit?: number; cursor?: string }> = [];
const loaded = await loadActiveDocTypes({
  async listDocumentTypes(filters) {
    calls.push(filters ?? {});
    if (!filters?.cursor) {
      return { items: [activeA, archived], count: 2, next_cursor: "page-2" };
    }
    return { items: [activeA, activeB], count: 2, next_cursor: null };
  },
});
assert.deepEqual(loaded.map((type) => type.doc_type_id), ["DTY-A", "DTY-B"]);
assert.deepEqual(calls, [
  { status: "active", limit: 100 },
  { status: "active", limit: 100, cursor: "page-2" },
]);
passed += 1;
console.log("PASS active type filtering, duplicate prevention, pagination, and persistent active filter");

let requestedUrl = "";
let requestInit: RequestInit | undefined;
const originalFetch = globalThis.fetch;
globalThis.fetch = async (input, init) => {
  requestedUrl = String(input);
  requestInit = init;
  return new Response(JSON.stringify({ items: [activeA], count: 1, next_cursor: null }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};
await campusOsDocDeskService.listDocumentTypes({ status: "active", limit: 100 });
check("document type service calls real active list endpoint", () => {
  const url = new URL(requestedUrl);
  assert.equal(url.pathname, "/api/v1/docdesk/doc-types");
  assert.equal(url.searchParams.get("status"), "active");
  assert.equal(url.searchParams.get("limit"), "100");
});

let body: unknown;
globalThis.fetch = async (_input, init) => {
  requestInit = init;
  body = JSON.parse(String(init?.body));
  return new Response(JSON.stringify({
    request_id: "REQ-REAL-1",
    doc_type_id: "DTY-A",
    doc_type_name: activeA.name,
    reason: "For scholarship application",
    status: "pending",
    requested_by: "student@campus.edu",
    created_at: "2026-10-31T00:00:00Z",
    updated_at: "2026-10-31T00:00:00Z",
  }), { status: 201, headers: { "Content-Type": "application/json" } });
};
const created = await campusOsDocDeskService.createRequest({
  doc_type_id: "DTY-A",
  reason: "  For scholarship application  ".trim(),
});
check("request creation posts exactly doc_type_id and trimmed reason", () => {
  assert.deepEqual(body, { doc_type_id: "DTY-A", reason: "For scholarship application" });
  assert.deepEqual(Object.keys(body as object).sort(), ["doc_type_id", "reason"]);
  assert.equal(String(requestInit?.method), "POST");
  assert.equal(created.request_id, "REQ-REAL-1");
  assert.equal(created.status, "pending");
});

check("reason validation rejects empty and whitespace-only values", () => {
  assert.match(validateReason("" ) ?? "", /at least 5/);
  assert.match(validateReason("    \n") ?? "", /at least 5/);
});
check("reason validation enforces five character minimum", () => {
  assert.match(validateReason("four") ?? "", /at least 5/);
  assert.equal(validateReason("valid"), null);
});
check("reason validation enforces 1000 character maximum", () => {
  assert.match(validateReason("x".repeat(1001)) ?? "", /at most 1000/);
  assert.equal(validateReason("x".repeat(1000)), null);
});

const student: DemoProfile = { role: "student", team_id: "t", name: "Student", email_id: "student@campus.edu" };
const faculty: DemoProfile = { ...student, role: "faculty" };
const staff: DemoProfile = { ...student, role: "office_staff", dept: "Library" };
const studentAffairs: DemoProfile = { ...student, role: "office_staff", dept: "Student Affairs" };
const admin: DemoProfile = { ...student, role: "admin" };
check("request permission allows student, faculty, office staff, and Student Affairs; denies admin", () => {
  assert.equal(canCreateRequest(student), true);
  assert.equal(canCreateRequest(faculty), true);
  assert.equal(canCreateRequest(staff), true);
  assert.equal(canCreateRequest(studentAffairs), true);
  assert.equal(canCreateRequest(admin), false);
});

globalThis.fetch = async () => new Response(JSON.stringify({
  error: { code: "VALIDATION_ERROR", message: "Reason invalid", details: [{ field: "reason", message: "Too short" }] },
}), {
  status: 422,
  headers: { "Content-Type": "application/json" },
});
let apiFailure: ApiError | null = null;
try {
  await campusOsDocDeskService.createRequest({ doc_type_id: "DTY-A", reason: "short" });
} catch (error) {
  if (error instanceof ApiError) apiFailure = error;
}
check("API validation errors retain error code, message, and details", () => {
  assert.equal(apiFailure?.status, 422);
  assert.equal(apiFailure?.code, "VALIDATION_ERROR");
  assert.equal(apiFailure?.message, "Reason invalid");
  assert.deepEqual(apiFailure?.details, [{ field: "reason", message: "Too short" }]);
});

globalThis.fetch = async () => new Response(JSON.stringify({ error: { code: "RATE_LIMITED", message: "Slow down" } }), {
  status: 429,
  headers: { "Content-Type": "application/json", "Retry-After": "17" },
});
let rateLimit: ApiError | null = null;
try {
  await campusOsDocDeskService.createRequest({ doc_type_id: "DTY-A", reason: "valid reason" });
} catch (error) {
  if (error instanceof ApiError) rateLimit = error;
}
check("rate limit errors expose Retry-After", () => assert.equal(rateLimit?.retryAfterSeconds, 17));

globalThis.fetch = originalFetch;
console.log(`${passed} request screen checks passed.`);
