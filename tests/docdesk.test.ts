import {
  getApiBaseUrl,
  resolveEndpointUrl,
  parseFilenameFromContentDisposition,
  campusOsClient,
} from "../src/services/api/campusOsClient";
import { ApiError } from "../src/services/api/apiErrors";
import {
  saveSession,
  getStoredSession,
  getValidToken,
  clearStoredSession,
  setOnSessionExpiredListener,
} from "../src/services/api/sessionStore";
import { campusOsAuthService } from "../src/services/api/campusOsAuthService";
import { campusOsDocDeskService } from "../src/services/api/campusOsDocDeskService";
import {
  isStudentAffairs,
  isRequester,
  normalizeDept,
  canViewAllRequests,
  canCreateRequest,
  canEditOwnPendingRequest,
  canWithdrawOwnPendingRequest,
  canAnswerRequest,
  canManageDocumentTypes,
  canSetTat,
  canAcknowledge,
  canUploadFilledForm,
  canRemoveFilledForm,
  canDownloadAnswerDocument,
  canDownloadFilledForm,
  areaForProfile,
  canAccessArea,
} from "../src/lib/permissions";
import {
  validateReason,
  validateDocTypeName,
  validateTatDate,
  validateAnswerFile,
  validateFilledFormFile,
} from "../src/lib/validation";
import type { DemoProfile } from "../src/types/auth";
import type { DocRequest } from "../src/types/request";

// Minimal test harness
let passed = 0;
let failed = 0;

function assert(description: string, condition: boolean, detail?: string) {
  if (condition) {
    passed++;
    console.log(`  ✓ ${description}`);
  } else {
    failed++;
    console.error(`  ✗ ${description}${detail ? ` — ${detail}` : ""}`);
  }
}

// Polyfill mock sessionStorage in Node environment if missing
if (typeof sessionStorage === "undefined") {
  const store = new Map<string, string>();
  (globalThis as unknown as { sessionStorage: Storage }).sessionStorage = {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, val: string) => store.set(key, String(val)),
    removeItem: (key: string) => store.delete(key),
    clear: () => store.clear(),
    key: (i: number) => Array.from(store.keys())[i] ?? null,
    length: store.size,
  };
}

// Mock fetch dispatcher
type FetchHandler = (url: string, init?: RequestInit) => Promise<Response>;
let currentFetchHandler: FetchHandler | null = null;
const originalFetch = globalThis.fetch;

beforeEachMock();

function beforeEachMock() {
  globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = typeof input === "string" ? input : input.toString();
    if (currentFetchHandler) {
      return currentFetchHandler(url, init);
    }
    return new Response(JSON.stringify({}), { status: 200 });
  };
}

async function runTests() {
  console.log("\n=========================================");
  console.log("   DocDesk Production Test Suite");
  console.log("=========================================\n");

  // 1. API Base URL construction
  console.log("[1. API base URL construction]");
  assert("Default base URL is api.campusos.edu", getApiBaseUrl().includes("api.campusos.edu"));
  assert(
    "resolveEndpointUrl handles path with leading slash",
    resolveEndpointUrl("/docdesk/requests").endsWith("/api/v1/docdesk/requests"),
  );
  assert(
    "resolveEndpointUrl preserves absolute URLs",
    resolveEndpointUrl("https://storage.campusos.edu/file.pdf") === "https://storage.campusos.edu/file.pdf",
  );
  assert(
    "resolveEndpointUrl handles path already containing /api/v1",
    resolveEndpointUrl("/api/v1/auth/login").endsWith("/api/v1/auth/login"),
  );

  // 2. Bearer authorization header
  console.log("\n[2. Bearer authorization header]");
  clearStoredSession();
  saveSession("test_jwt_token_12345", 3600, {
    role: "student",
    team_id: "team8",
    name: "Student One",
    email_id: "student1@campus.edu",
  });

  let capturedAuthHeader: string | null = null;
  currentFetchHandler = async (_url, init) => {
    const headers = new Headers(init?.headers);
    capturedAuthHeader = headers.get("Authorization");
    return new Response(JSON.stringify({ items: [], count: 0, next_cursor: null }), { status: 200 });
  };

  await campusOsClient.get("/docdesk/requests");
  assert(
    "Bearer token attached to authenticated requests",
    capturedAuthHeader === "Bearer test_jwt_token_12345",
  );

  // 3. JSON and multipart request handling
  console.log("\n[3. JSON and multipart request handling]");
  let capturedContentType: string | null = null;
  let capturedMethod: string | null = null;
  let capturedBodyText: string | null = null;

  currentFetchHandler = async (_url, init) => {
    capturedMethod = init?.method ?? null;
    const headers = new Headers(init?.headers);
    capturedContentType = headers.get("Content-Type");
    capturedBodyText = typeof init?.body === "string" ? init.body : null;
    return new Response(JSON.stringify({ request_id: "DRQ-1001", status: "pending" }), { status: 200 });
  };

  await campusOsClient.post("/docdesk/requests", { doc_type_id: "DTY-1", reason: "Need transcript" });
  assert("JSON POST sets method to POST", capturedMethod === "POST");
  assert("JSON POST sets Content-Type to application/json", capturedContentType === "application/json");
  assert("JSON POST stringifies body properly", !!capturedBodyText && capturedBodyText.includes("Need transcript"));

  // Multipart request (FormData)
  let isFormDataBody = false;
  currentFetchHandler = async (_url, init) => {
    capturedMethod = init?.method ?? null;
    const headers = new Headers(init?.headers);
    capturedContentType = headers.get("Content-Type"); // Browser/fetch sets boundary, so manual Content-Type MUST be absent
    isFormDataBody = init?.body instanceof FormData;
    return new Response(JSON.stringify({ request_id: "DRQ-1001", status: "answered" }), { status: 200 });
  };

  const form = new FormData();
  form.append("message", "Document issued");
  await campusOsClient.postForm("/docdesk/requests/DRQ-1001/answer", form);
  assert("Multipart request sends FormData body", isFormDataBody);
  assert("Multipart request does not hardcode Content-Type header", capturedContentType === null);

  // 4. Binary download and filename parsing
  console.log("\n[4. Binary download and filename parsing]");
  assert(
    "Parses standard filename in quotes",
    parseFilenameFromContentDisposition('attachment; filename="transcript.pdf"', "fallback.pdf") === "transcript.pdf",
  );
  assert(
    "Parses standard filename without quotes",
    parseFilenameFromContentDisposition("attachment; filename=certificate.docx", "fallback.docx") === "certificate.docx",
  );
  assert(
    "Parses UTF-8 encoded filename*",
    parseFilenameFromContentDisposition("attachment; filename*=UTF-8''my%20bonafide.pdf", "fallback.pdf") === "my bonafide.pdf",
  );
  assert(
    "Falls back when header is null",
    parseFilenameFromContentDisposition(null, "fallback.pdf") === "fallback.pdf",
  );

  currentFetchHandler = async () => {
    return new Response(new Uint8Array([1, 2, 3, 4]), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'attachment; filename="official_transcript.pdf"',
      },
    });
  };

  const downloadResult = await campusOsClient.downloadFile("/docdesk/requests/DRQ-1001/document");
  assert("downloadFile returns parsed filename", downloadResult.filename === "official_transcript.pdf");
  assert("downloadFile returns valid blob", downloadResult.blob.size === 4);

  // 5. API error envelope and Retry-After
  console.log("\n[5. API error envelope and Retry-After]");
  currentFetchHandler = async () => {
    return new Response(
      JSON.stringify({
        error: {
          code: "VALIDATION_ERROR",
          message: "Reason is too short",
          details: [{ field: "reason", message: "Reason must be 5-1000 characters" }],
        },
        request_id: "req_err_01",
      }),
      { status: 422 },
    );
  };

  try {
    await campusOsClient.post("/docdesk/requests", { reason: "Hi" });
    assert("ApiError thrown on 422", false, "No error was thrown");
  } catch (err) {
    assert("Error is instance of ApiError", err instanceof ApiError);
    if (err instanceof ApiError) {
      assert("ApiError extracts status 422", err.status === 422);
      assert("ApiError extracts code VALIDATION_ERROR", err.code === "VALIDATION_ERROR");
      assert("ApiError extracts requestId", err.requestId === "req_err_01");
      assert("ApiError preserves details array", Array.isArray(err.details));
    }
  }

  // 429 Rate Limit with Retry-After header
  currentFetchHandler = async () => {
    return new Response(
      JSON.stringify({
        error: {
          code: "RATE_LIMITED",
          message: "Too many requests",
        },
      }),
      {
        status: 429,
        headers: { "Retry-After": "30" },
      },
    );
  };

  try {
    await campusOsClient.get("/docdesk/requests");
    assert("429 error thrown", false);
  } catch (err) {
    if (err instanceof ApiError) {
      assert("429 status captured", err.status === 429);
      assert("Retry-After seconds parsed", err.retryAfterSeconds === 30);
    }
  }

  // 6. Auth login routing and session expiry
  console.log("\n[6. Auth login routing and session expiry]");
  clearStoredSession();
  let calledEndpoints: string[] = [];

  currentFetchHandler = async (url) => {
    calledEndpoints.push(url);
    return new Response(
      JSON.stringify({
        access_token: "admin_jwt_token_888",
        token_type: "bearer",
        expires_in: 3600,
        profile: {
          role: "admin",
          team_id: "team8",
          name: "Team 8 Admin",
          email_id: "admin@team8.com",
        },
      }),
      { status: 200 },
    );
  };

  const adminProfile = await campusOsAuthService.login("admin@team8.com", "valid_otp");
  assert(
    "admin@team8.com routes to /auth/admin/login",
    calledEndpoints.some((u) => u.endsWith("/auth/admin/login")),
  );
  assert("Admin profile hydrated", adminProfile.role === "admin");
  assert("Valid token stored in session", getValidToken() === "admin_jwt_token_888");

  // Non-admin login routes to /auth/login
  calledEndpoints = [];
  currentFetchHandler = async (url) => {
    calledEndpoints.push(url);
    return new Response(
      JSON.stringify({
        access_token: "student_jwt_token_777",
        expires_in: 3600,
        profile: {
          role: "student",
          team_id: "team8",
          name: "Asha Kumar",
          email_id: "asha.kumar@campus.edu",
        },
      }),
      { status: 200 },
    );
  };

  const studentProfile = await campusOsAuthService.login("asha.kumar@campus.edu", "student_otp");
  assert(
    "Student login routes to /auth/login",
    calledEndpoints.some((u) => u.endsWith("/auth/login")),
  );
  assert("Student profile hydrated", studentProfile.role === "student");

  // USE_ADMIN_LOGIN error handling
  let retryTriggered = false;
  currentFetchHandler = async (url) => {
    if (url.endsWith("/auth/login")) {
      return new Response(
        JSON.stringify({
          error: { code: "USE_ADMIN_LOGIN", message: "Use admin login endpoint" },
        }),
        { status: 400 },
      );
    }
    if (url.endsWith("/auth/admin/login")) {
      retryTriggered = true;
      return new Response(
        JSON.stringify({
          access_token: "admin_jwt_token_retry",
          profile: { role: "admin", team_id: "team8", name: "Admin", email_id: "admin@team8.com" },
        }),
        { status: 200 },
      );
    }
    return new Response(JSON.stringify({ role: "admin", team_id: "team8", name: "Admin", email_id: "admin@team8.com" }), { status: 200 });
  };

  await campusOsAuthService.login("some_admin@team8.com", "otp");
  assert("USE_ADMIN_LOGIN code triggers admin retry", retryTriggered);

  // Session expiry listener
  let expiryNotified = false;
  setOnSessionExpiredListener(() => {
    expiryNotified = true;
  });

  currentFetchHandler = async () => new Response("Unauthorized", { status: 401 });
  try {
    await campusOsClient.get("/docdesk/requests");
  } catch {
    // expected
  }
  assert("401 response notifies session expiry", expiryNotified);
  assert("Session cleared after 401", getStoredSession() === null);

  // 7. Role mapping (Student Affairs vs ordinary office staff)
  console.log("\n[7. Role mapping: Student Affairs vs ordinary office staff]");
  const studentUser: DemoProfile = { role: "student", team_id: "team8", name: "Student", email_id: "s@c.edu" };
  const facultyUser: DemoProfile = { role: "faculty", team_id: "team8", name: "Faculty", email_id: "f@c.edu" };
  const ordinaryStaff: DemoProfile = {
    role: "office_staff",
    team_id: "team8",
    name: "Staff HR",
    email_id: "hr@c.edu",
    dept: "Human Resources",
  };
  const saStaff1: DemoProfile = {
    role: "office_staff",
    team_id: "team8",
    name: "SA One",
    email_id: "sa1@c.edu",
    dept: "Student Affairs",
  };
  const saStaff2: DemoProfile = {
    role: "office_staff",
    team_id: "team8",
    name: "SA Two",
    email_id: "sa2@c.edu",
    dept: "student affairs dept",
  };
  const saStaff3: DemoProfile = {
    role: "office_staff",
    team_id: "team8",
    name: "SA Three",
    email_id: "sa3@c.edu",
    dept: "Student Affairs Department",
  };

  assert("Student is requester", isRequester(studentUser) && !isStudentAffairs(studentUser));
  assert("Faculty is requester", isRequester(facultyUser) && !isStudentAffairs(facultyUser));
  assert("Ordinary office staff is requester", isRequester(ordinaryStaff) && !isStudentAffairs(ordinaryStaff));
  assert("Student Affairs is identified", isStudentAffairs(saStaff1));
  assert("Student Affairs with trailing dept is normalized", isStudentAffairs(saStaff2));
  assert("Student Affairs with trailing Department is normalized", isStudentAffairs(saStaff3));
  assert("Area for Student Affairs is student-affairs", areaForProfile(saStaff1) === "student-affairs");
  assert("Area for ordinary staff is requester", areaForProfile(ordinaryStaff) === "requester");
  assert("Student Affairs access to /sa is allowed", canAccessArea("student-affairs", saStaff1));
  assert("Ordinary staff access to /sa is denied", !canAccessArea("student-affairs", ordinaryStaff));

  // 8. Admin read-only permissions
  console.log("\n[8. Admin read-only permissions]");
  const adminUser: DemoProfile = { role: "admin", team_id: "team8", name: "Admin", email_id: "admin@team8.com" };
  const mockReq: DocRequest = {
    request_id: "DRQ-100",
    doc_type_id: "DTY-1",
    doc_type_name: "Bonafide",
    reason: "For passport",
    status: "answered",
    requested_by: "student@campus.edu",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    document: { file_id: "F1", filename: "doc.pdf", content_type: "application/pdf", size_bytes: 100 },
    filled_form: { file_id: "F2", filename: "form.pdf", content_type: "application/pdf", size_bytes: 100 },
  };

  assert("Admin can view all requests", canViewAllRequests(adminUser));
  assert("Admin can download answer document", canDownloadAnswerDocument(adminUser, mockReq));
  assert("Admin can download filled form", canDownloadFilledForm(adminUser, mockReq));
  assert("Admin CANNOT create request", !canCreateRequest(adminUser));
  assert("Admin CANNOT edit pending request", !canEditOwnPendingRequest(adminUser, mockReq));
  assert("Admin CANNOT withdraw request", !canWithdrawOwnPendingRequest(adminUser, mockReq));
  assert("Admin CANNOT answer request", !canAnswerRequest(adminUser));
  assert("Admin CANNOT manage document types", !canManageDocumentTypes(adminUser));
  assert("Admin CANNOT set TAT", !canSetTat(adminUser));
  assert("Admin CANNOT acknowledge request", !canAcknowledge(adminUser, mockReq));
  assert("Admin CANNOT upload filled form", !canUploadFilledForm(adminUser, mockReq));
  assert("Admin CANNOT remove filled form", !canRemoveFilledForm(adminUser, mockReq));

  // 9. Request create / edit / withdraw
  console.log("\n[9. Request create / edit / withdraw]");
  let lastCallMethod = "";
  let lastCallUrl = "";
  let lastCallBody: unknown = null;

  currentFetchHandler = async (url, init) => {
    lastCallUrl = url;
    lastCallMethod = init?.method ?? "GET";
    lastCallBody = init?.body ? JSON.parse(init.body as string) : null;
    return new Response(JSON.stringify({ request_id: "DRQ-555", status: "pending", reason: "Hostel clearance" }), { status: 200 });
  };

  const createdReq = await campusOsDocDeskService.createRequest({ doc_type_id: "DTY-1", reason: "Hostel clearance" });
  assert("createRequest calls POST /docdesk/requests", lastCallMethod === "POST" && lastCallUrl.endsWith("/docdesk/requests"));
  assert("createRequest returns created record", createdReq.request_id === "DRQ-555");

  await campusOsDocDeskService.updatePendingRequest("DRQ-555", { reason: "Updated reason for clearance" });
  assert("updatePendingRequest calls PATCH /docdesk/requests/{id}", lastCallMethod === "PATCH" && lastCallUrl.endsWith("/docdesk/requests/DRQ-555"));

  await campusOsDocDeskService.withdrawPendingRequest("DRQ-555");
  assert("withdrawPendingRequest calls DELETE /docdesk/requests/{id}", lastCallMethod === "DELETE" && lastCallUrl.endsWith("/docdesk/requests/DRQ-555"));

  // 10. Answer create / edit / withdraw
  console.log("\n[10. Answer create / edit / withdraw]");
  currentFetchHandler = async (url, init) => {
    lastCallUrl = url;
    lastCallMethod = init?.method ?? "GET";
    return new Response(JSON.stringify({ request_id: "DRQ-555", status: "answered", answer: { message: "Approved" } }), { status: 200 });
  };

  await campusOsDocDeskService.answerRequest("DRQ-555", { message: "Approved" });
  assert("answerRequest calls POST /requests/{id}/answer", lastCallMethod === "POST" && lastCallUrl.endsWith("/requests/DRQ-555/answer"));

  await campusOsDocDeskService.updateAnswer("DRQ-555", { message: "Updated message" });
  assert("updateAnswer calls PATCH /requests/{id}/answer", lastCallMethod === "PATCH" && lastCallUrl.endsWith("/requests/DRQ-555/answer"));

  // Ensure empty PATCH is prevented
  try {
    await campusOsDocDeskService.updateAnswer("DRQ-555", {});
    assert("Empty PATCH updateAnswer rejected", false);
  } catch (err) {
    assert("Empty PATCH throws validation error", err instanceof ApiError && err.code === "VALIDATION_ERROR");
  }

  await campusOsDocDeskService.withdrawAnswer("DRQ-555");
  assert("withdrawAnswer calls DELETE /requests/{id}/answer", lastCallMethod === "DELETE" && lastCallUrl.endsWith("/requests/DRQ-555/answer"));

  // 11. Acknowledgement
  console.log("\n[11. Acknowledgement]");
  currentFetchHandler = async (url, init) => {
    lastCallUrl = url;
    lastCallMethod = init?.method ?? "GET";
    return new Response(JSON.stringify({ request_id: "DRQ-555", status: "acknowledged" }), { status: 200 });
  };

  const ackReq = await campusOsDocDeskService.acknowledgeRequest("DRQ-555");
  assert("acknowledgeRequest calls POST /requests/{id}/acknowledge", lastCallMethod === "POST" && lastCallUrl.endsWith("/requests/DRQ-555/acknowledge"));
  assert("acknowledgeRequest returns acknowledged status", ackReq.status === "acknowledged");

  // 12. Document-type create/edit/archive/restore/delete and single retrieval
  console.log("\n[12. Document-type management and single retrieval]");
  currentFetchHandler = async (url, init) => {
    lastCallUrl = url;
    lastCallMethod = init?.method ?? "GET";
    if (url.includes("/docdesk/doc-types/DTY-99")) {
      return new Response(JSON.stringify({ doc_type_id: "DTY-99", name: "Custom Form", status: "active" }), { status: 200 });
    }
    return new Response(JSON.stringify({ items: [{ doc_type_id: "DTY-1", name: "Bonafide", status: "active" }], count: 1, next_cursor: null }), { status: 200 });
  };

  const dtList = await campusOsDocDeskService.listDocumentTypes({ status: "active" });
  assert("listDocumentTypes returns items and count", dtList.items.length === 1 && dtList.count === 1);

  const singleDt = await campusOsDocDeskService.getDocumentType("DTY-99");
  assert("getDocumentType returns doc type", singleDt?.doc_type_id === "DTY-99");

  currentFetchHandler = async (url, init) => {
    lastCallUrl = url;
    lastCallMethod = init?.method ?? "GET";
    return new Response(JSON.stringify({ doc_type_id: "DTY-new", name: "Internship Letter", status: "active" }), { status: 200 });
  };
  await campusOsDocDeskService.createDocumentType({ name: "Internship Letter" });
  assert("createDocumentType calls POST /docdesk/doc-types", lastCallMethod === "POST" && lastCallUrl.endsWith("/docdesk/doc-types"));

  await campusOsDocDeskService.updateDocumentType("DTY-new", { status: "archived" });
  assert("updateDocumentType calls PATCH /docdesk/doc-types/{id}", lastCallMethod === "PATCH" && lastCallUrl.endsWith("/docdesk/doc-types/DTY-new"));

  await campusOsDocDeskService.deleteDocumentType("DTY-new");
  assert("deleteDocumentType calls DELETE /docdesk/doc-types/{id}", lastCallMethod === "DELETE" && lastCallUrl.endsWith("/docdesk/doc-types/DTY-new"));

  // 13. Single and bulk TAT
  console.log("\n[13. Single and bulk Turnaround Time (TAT)]");
  currentFetchHandler = async (url, init) => {
    lastCallUrl = url;
    lastCallMethod = init?.method ?? "GET";
    lastCallBody = init?.body ? JSON.parse(init.body as string) : null;
    return new Response(JSON.stringify({ request_id: "DRQ-10", status: "pending", tat: { expected_by: "2026-11-10" } }), { status: 200 });
  };

  await campusOsDocDeskService.setTat("DRQ-10", { expected_by: "2026-11-10", note: "Pending dean sign" });
  assert("setTat calls PUT /requests/{id}/tat", lastCallMethod === "PUT" && lastCallUrl.endsWith("/requests/DRQ-10/tat"));

  currentFetchHandler = async (url, init) => {
    lastCallUrl = url;
    lastCallMethod = init?.method ?? "GET";
    return new Response(JSON.stringify({ items: [{ request_id: "DRQ-1" }, { request_id: "DRQ-2" }] }), { status: 200 });
  };

  const bulkResult = await campusOsDocDeskService.setBulkTat({
    request_ids: ["DRQ-1", "DRQ-2"],
    expected_by: "2026-11-10",
  });
  assert("setBulkTat calls POST /requests/bulk-tat", lastCallMethod === "POST" && lastCallUrl.endsWith("/requests/bulk-tat"));
  assert("setBulkTat returns array of updated requests", bulkResult.length === 2);

  // Bulk error extraction helper
  const bulkError = new ApiError(409, "BATCH_REJECTED", "Batch failed", { request_ids: ["DRQ-FAIL-1", "DRQ-FAIL-2"] });
  const failedIds = bulkError.getFailedRequestIds();
  assert("getFailedRequestIds extracts failed IDs from error.details", failedIds.length === 2 && failedIds[0] === "DRQ-FAIL-1");

  // 14. Filled-form upload / download / removal restrictions
  console.log("\n[14. Filled-form upload / download / removal]");
  currentFetchHandler = async (url, init) => {
    lastCallUrl = url;
    lastCallMethod = init?.method ?? "GET";
    return new Response(JSON.stringify({ request_id: "DRQ-10", filled_form: { file_id: "F1", filename: "filled.pdf" } }), { status: 200 });
  };

  const dummyFile = new File([new Uint8Array([1, 2])], "filled.pdf", { type: "application/pdf" });
  await campusOsDocDeskService.uploadFilledForm("DRQ-10", dummyFile);
  assert("uploadFilledForm calls PUT /requests/{id}/filled-form", lastCallMethod === "PUT" && lastCallUrl.endsWith("/requests/DRQ-10/filled-form"));

  await campusOsDocDeskService.removeFilledForm("DRQ-10");
  assert("removeFilledForm calls DELETE /requests/{id}/filled-form", lastCallMethod === "DELETE" && lastCallUrl.endsWith("/requests/DRQ-10/filled-form"));

  // Permission rules: cannot upload filled form if request is pending
  const pendingReq: DocRequest = { ...mockReq, status: "pending" };
  const userMe: DemoProfile = { role: "student", team_id: "team8", name: "Me", email_id: "student@campus.edu" };
  assert("Cannot upload filled form on pending request", !canUploadFilledForm(userMe, pendingReq));

  // 15. Cursor pagination and filter preservation
  console.log("\n[15. Cursor pagination and filter preservation]");
  currentFetchHandler = async (url) => {
    lastCallUrl = url;
    return new Response(
      JSON.stringify({
        items: [{ request_id: "DRQ-P2-1" }, { request_id: "DRQ-P2-2" }],
        count: 50,
        next_cursor: "cursor_page_3",
      }),
      { status: 200 },
    );
  };

  const paginatedRes = await campusOsDocDeskService.listRequests({
    status: "pending",
    doc_type_id: "DTY-1",
    cursor: "cursor_page_2",
    limit: 25,
  });

  assert("listRequests preserves status filter in query", lastCallUrl.includes("status=pending"));
  assert("listRequests preserves doc_type_id filter in query", lastCallUrl.includes("doc_type_id=DTY-1"));
  assert("listRequests sends cursor in query", lastCallUrl.includes("cursor=cursor_page_2"));
  assert("listRequests preserves limit in query", lastCallUrl.includes("limit=25"));
  assert("listRequests returns next_cursor", paginatedRes.next_cursor === "cursor_page_3");
  assert("listRequests returns count", paginatedRes.count === 50);

  // 16. Validation and error states
  console.log("\n[16. Validation and error states]");
  assert("Reason < 5 chars rejected", validateReason("Hi") !== null);
  assert("Reason 5-1000 chars accepted", validateReason("Valid reason for document request") === null);
  assert("Reason > 1000 chars rejected", validateReason("A".repeat(1001)) !== null);

  assert("DocType name < 3 chars rejected", validateDocTypeName("ab") !== null);
  assert("DocType name 3-80 chars accepted", validateDocTypeName("Bonafide Certificate") === null);
  assert("DocType name > 80 chars rejected", validateDocTypeName("A".repeat(81)) !== null);

  assert("TAT date format must be YYYY-MM-DD", validateTatDate("01-11-2026") !== null);
  assert("TAT date before today rejected", validateTatDate("2020-01-01") !== null);
  assert("TAT date valid in future accepted", validateTatDate("2030-01-01") === null);

  const goodPdf = new File([new Uint8Array(100)], "test.pdf", { type: "application/pdf" });
  const badTxt = new File([new Uint8Array(100)], "notes.txt", { type: "text/plain" });
  assert("Answer file accepts PDF", validateAnswerFile(goodPdf) === null);
  assert("Answer file rejects TXT", validateAnswerFile(badTxt) !== null);

  const goodPng = new File([new Uint8Array(100)], "image.png", { type: "image/png" });
  assert("Filled form file accepts PNG", validateFilledFormFile(goodPng) === null);
  assert("Filled form file rejects TXT", validateFilledFormFile(badTxt) !== null);

  // Restore fetch
  globalThis.fetch = originalFetch;

  console.log("\n=========================================");
  console.log(`Summary: ${passed} passed, ${failed} failed`);
  console.log("=========================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

void runTests();
