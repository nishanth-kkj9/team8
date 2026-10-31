import assert from "node:assert/strict";
import { createElement, type ComponentProps } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { campusOsDocDeskService } from "../src/services/api/campusOsDocDeskService";
import { ApiError } from "../src/services/api/apiErrors";
import { loadActiveDocTypes } from "../src/features/requester/utils/loadActiveDocTypes";
import { validateReason } from "../src/lib/validation";
import { canCreateRequest } from "../src/lib/permissions";
import type { DocType } from "../src/types/document";
import type { DemoProfile } from "../src/types/auth";
import { RequestForm } from "../src/features/requests/components/RequestForm";

// Only the HTTP-mocked checks use this origin; production requires the organiser URL.
process.env.VITE_API_BASE_URL ??= "https://campusos.test";

let passed = 0;
function check(name: string, fn: () => void): void {
  fn();
  passed += 1;
  console.log(`PASS ${name}`);
}

const activeA: DocType = { doc_type_id: "DTY-A", name: "Bonafide Certificate", description: "Proof of enrollment", status: "active" };
const activeB: DocType = { doc_type_id: "DTY-B", name: "Transcript", status: "active" };
const studyCertificate: DocType = { doc_type_id: "DTY-C", name: "Study Certificate", status: "active" };
const marksCard: DocType = { doc_type_id: "DTY-D", name: "Marks Card", status: "active" };
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

function renderRequestForm(props: Partial<ComponentProps<typeof RequestForm>> = {}): string {
  return renderToStaticMarkup(createElement(RequestForm, {
    docTypes: [],
    mode: "create",
    submitLabel: "Submit Request",
    documentTypeDisabled: true,
    submitDisabled: true,
    onSubmit: () => undefined,
    idPrefix: "request-check",
    ...props,
  }));
}
const fieldsVisible = (markup: string) => {
  assert.match(markup, /id="request-check-doc-type"/);
  assert.match(markup, /id="request-check-reason"/);
  assert.match(markup, /Submit Request/);
};
const submitButtonMarkup = (markup: string) => markup.match(/<button[^>]*>Submit Request<\/button>/)?.[0] ?? "";
const reasonTextareaMarkup = (markup: string) => markup.match(/<textarea[^>]*>/)?.[0] ?? "";
const emptyMarkup = renderRequestForm({ documentTypeDisabled: false });
fieldsVisible(emptyMarkup);
assert.match(emptyMarkup, /No active document types are currently available\./);
assert.match(emptyMarkup, /Please contact Admin\./);
assert.match(emptyMarkup, /name="reason"/);
assert.match(emptyMarkup, /0 \/ 1000/);
assert.match(emptyMarkup, /<fieldset[^>]*id="request-check-doc-type"/);
assert.doesNotMatch(emptyMarkup, /<button[^>]*aria-pressed=/);
assert.match(submitButtonMarkup(emptyMarkup), /\sdisabled=/);
assert.doesNotMatch(reasonTextareaMarkup(emptyMarkup), /\sdisabled=/);
passed += 1;
console.log("PASS empty catalog keeps both fields visible, shows the named options, and disables submission");

const loadingMarkup = renderRequestForm({ documentTypesLoading: true });
fieldsVisible(loadingMarkup);
assert.match(loadingMarkup, /Loading active document types/);
assert.match(loadingMarkup, /Loading active document types/);
assert.doesNotMatch(loadingMarkup, /<button[^>]*aria-pressed=/);
assert.match(submitButtonMarkup(loadingMarkup), /\sdisabled=/);
assert.doesNotMatch(reasonTextareaMarkup(loadingMarkup), /\sdisabled=/);
passed += 1;
console.log("PASS loading catalog keeps reason visible and disables unavailable submission");

const errorMarkup = renderRequestForm({ documentTypesError: "Catalog unavailable", onRetryDocumentTypes: () => undefined });
fieldsVisible(errorMarkup);
assert.match(errorMarkup, /Catalog unavailable/);
assert.match(errorMarkup, /Retry<\/button>/);
assert.doesNotMatch(errorMarkup, /<button[^>]*aria-pressed=/);
assert.match(submitButtonMarkup(errorMarkup), /\sdisabled=/);
assert.doesNotMatch(reasonTextareaMarkup(errorMarkup), /\sdisabled=/);
passed += 1;
console.log("PASS catalog error keeps fields visible, offers retry, and disables submission");

const activeMarkup = renderRequestForm({
  docTypes: [activeA, activeB, studyCertificate, marksCard, archived],
  initial: { doc_type_id: activeA.doc_type_id },
  documentTypeDisabled: false,
  submitDisabled: false,
});
fieldsVisible(activeMarkup);
assert.match(activeMarkup, /aria-pressed="true"[^>]*>Bonafide<\/button>/);
assert.match(activeMarkup, /aria-pressed="false"[^>]*>Study Certificate<\/button>/);
assert.match(activeMarkup, /aria-pressed="false"[^>]*>Marks Card<\/button>/);
assert.match(activeMarkup, /Transcript/);
assert.match(activeMarkup, /Proof of enrollment/);
assert.doesNotMatch(activeMarkup, /Old Type/);
assert.doesNotMatch(submitButtonMarkup(activeMarkup), /\sdisabled=/);
passed += 1;
console.log("PASS standard types map to API IDs, college types remain available, inactive types are excluded, and valid selection enables submit");

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
  reason: "  For scholarship application  ",
});
check("request creation posts exactly doc_type_id and trimmed reason", () => {
  assert.deepEqual(body, { doc_type_id: "DTY-A", reason: "For scholarship application" });
  assert.deepEqual(Object.keys(body as object).sort(), ["doc_type_id", "reason"]);
  assert.equal(String(requestInit?.method), "POST");
  assert.equal(created.request_id, "REQ-REAL-1");
  assert.equal(created.status, "pending");
});

let acknowledgeInit: RequestInit | undefined;
globalThis.fetch = async (_input, init) => {
  acknowledgeInit = init;
  return new Response(JSON.stringify({ request_id: "REQ-REAL-1", status: "acknowledged" }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};
await campusOsDocDeskService.acknowledgeRequest("REQ-REAL-1");
check("acknowledgement is a bodyless POST", () => {
  assert.equal(acknowledgeInit?.method, "POST");
  assert.equal(acknowledgeInit?.body, undefined);
});

let answerInit: RequestInit | undefined;
globalThis.fetch = async (_input, init) => {
  answerInit = init;
  return new Response(JSON.stringify({ request_id: "REQ-REAL-1", status: "answered" }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};
await campusOsDocDeskService.answerRequest("REQ-REAL-1", { message: "Your document is ready." });
check("answer submission uses multipart form data without forcing its Content-Type", () => {
  assert.ok(answerInit?.body instanceof FormData);
  assert.equal(new Headers(answerInit?.headers).has("Content-Type"), false);
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
