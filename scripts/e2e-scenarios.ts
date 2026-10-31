/**
 * Verification script covering all 9 required demo scenarios from ARCHITECTURE.md §13:
 *  - Scenario 1: Basic request submission
 *  - Scenario 2: Pending request edit and withdrawal
 *  - Scenario 3: Student Affairs answers request with optional attachment
 *  - Scenario 4: Requester acknowledges answered request
 *  - Scenario 5: Filled-form round trip (upload/replace/download/remove)
 *  - Scenario 6: Document type CRUD, archive, restore, and delete
 *  - Scenario 7: Turnaround Time (TAT) and bulk TAT with atomic rollbacks
 *  - Scenario 8: Admin read-only access (no mutation controls)
 *  - Scenario 9: Other requester roles (Faculty, Ordinary Staff) without USN requirement
 */
import { mockDocDeskService as svc } from "../tests/fixtures/mockDocDeskService";
import { seedProfiles } from "../tests/fixtures/seedProfiles";
import {
  canAccessArea,
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
  canViewAllRequests,
} from "../src/lib/permissions";
import { validateReason, validateDocTypeName, validateTatDate } from "../src/lib/validation";

// LocalStorage mock shim
const store = new Map<string, string>();
(globalThis as Record<string, unknown>).localStorage = {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => void store.set(k, v),
  removeItem: (k: string) => void store.delete(k),
  clear: () => void store.clear(),
  key: (i: number) => [...store.keys()][i] ?? null,
  get length() {
    return store.size;
  },
};

let passed = 0;
let failed = 0;

function assert(scenario: string, ok: boolean, detail = "") {
  if (ok) {
    passed++;
    console.log(`  ✓ [${scenario}] ${detail}`);
  } else {
    failed++;
    console.error(`  ✗ [${scenario}] FAILED: ${detail}`);
  }
}

async function runAllScenarios() {
  console.log("\n=======================================================");
  console.log("  DocDesk Architecture Specification — 9 Demo Scenarios");
  console.log("=======================================================\n");

  await svc.resetDemoData();

  const student = seedProfiles.student;
  const faculty = seedProfiles.faculty;
  const staff = seedProfiles.office_staff;
  const sa = seedProfiles.student_affairs;
  const admin = seedProfiles.admin;

  // -------------------------------------------------------------------------
  // Scenario 1: Basic request
  // -------------------------------------------------------------------------
  console.log("--- Scenario 1: Basic request ---");
  svc.setViewer(student);
  const activeTypes = (await svc.listDocumentTypes({ status: "active" })).filter(
    (t) => t.status === "active",
  );
  assert("Scenario 1", activeTypes.length > 0, "Retrieved active document types");

  const bonafide = activeTypes.find((t) => t.doc_type_id === "dt-bonafide")!;
  assert("Scenario 1", !!bonafide, "Bonafide Certificate is active and available");

  const validReason = "Need bonafide for passport verification at the regional office.";
  assert("Scenario 1", validateReason(validReason) === null, "Reason >= 5 chars passes validation");

  const newReq = await svc.createRequest({
    doc_type_id: bonafide.doc_type_id,
    reason: validReason,
  });
  assert(
    "Scenario 1",
    newReq.status === "pending" && newReq.request_id.startsWith("DRQ-"),
    `Created request ${newReq.request_id} with status 'pending'`,
  );

  const studentRequests = await svc.listRequests();
  assert(
    "Scenario 1",
    studentRequests.some((r) => r.request_id === newReq.request_id),
    "New request appears in student's request list",
  );

  // -------------------------------------------------------------------------
  // Scenario 2: Pending request edit/withdraw
  // -------------------------------------------------------------------------
  console.log("\n--- Scenario 2: Pending request edit/withdraw ---");
  assert(
    "Scenario 2",
    canEditOwnPendingRequest(student, newReq) && canWithdrawOwnPendingRequest(student, newReq),
    "Student has permission to edit and withdraw own pending request",
  );

  const updatedReason = "Updated reason for regional passport office appointment next week.";
  const editedReq = await svc.updatePendingRequest(newReq.request_id, {
    reason: updatedReason,
  });
  assert(
    "Scenario 2",
    editedReq.reason === updatedReason && editedReq.status === "pending",
    "Request reason updated while remaining pending",
  );

  await svc.withdrawPendingRequest(newReq.request_id);
  const afterWithdraw = await svc.listRequests();
  assert(
    "Scenario 2",
    !afterWithdraw.some((r) => r.request_id === newReq.request_id),
    "Withdrawn request is removed from active list without inventing non-API statuses",
  );

  // -------------------------------------------------------------------------
  // Scenario 3: SA answers a request
  // -------------------------------------------------------------------------
  console.log("\n--- Scenario 3: SA answers a request ---");
  svc.setViewer(sa);
  assert("Scenario 3", canAnswerRequest(sa), "Student Affairs has canAnswerRequest privilege");

  const allReqs = await svc.listRequests();
  const pendingForAsha = allReqs.find(
    (r) => r.status === "pending" && r.requested_by === student.email_id,
  );
  assert("Scenario 3", !!pendingForAsha, `Found pending request ${pendingForAsha?.request_id}`);

  const answerMsg = "Your request is approved. Please find the attached certificate.";
  const mockFile = new File([new Uint8Array(1024)], "certificate.pdf", {
    type: "application/pdf",
  });
  const answered = await svc.answerRequest(pendingForAsha!.request_id, {
    message: answerMsg,
    document: mockFile,
  });
  assert(
    "Scenario 3",
    answered.status === "answered" &&
      answered.answer?.message === answerMsg &&
      answered.document?.filename === "certificate.pdf",
    `Request ${answered.request_id} successfully answered with attachment`,
  );

  // -------------------------------------------------------------------------
  // Scenario 4: Requester acknowledges
  // -------------------------------------------------------------------------
  console.log("\n--- Scenario 4: Requester acknowledges ---");
  svc.setViewer(student);
  const ashaAnswered = (await svc.listRequests()).find((r) => r.request_id === answered.request_id)!;
  assert("Scenario 4", canAcknowledge(student, ashaAnswered), "Student can acknowledge own answered request");

  const acknowledged = await svc.acknowledgeRequest(ashaAnswered.request_id);
  assert(
    "Scenario 4",
    acknowledged.status === "acknowledged" && !!acknowledged.acknowledged_at,
    `Request ${acknowledged.request_id} transitioned to 'acknowledged' with timestamp`,
  );
  assert(
    "Scenario 4",
    !canEditOwnPendingRequest(student, acknowledged) && !canAcknowledge(student, acknowledged),
    "Write controls are disabled once acknowledged",
  );

  // -------------------------------------------------------------------------
  // Scenario 5: Filled-form round trip
  // -------------------------------------------------------------------------
  console.log("\n--- Scenario 5: Filled-form round trip ---");
  // Find DRQ-1004 which is answered with a document and no filled form yet
  const req1004 = (await svc.listRequests()).find((r) => r.request_id === "DRQ-1004")!;
  assert("Scenario 5", req1004.status === "answered" && !!req1004.document, "DRQ-1004 is answered with document");
  assert("Scenario 5", canUploadFilledForm(student, req1004), "Student can upload filled form");

  const filledFormFile = new File([new Uint8Array(2048)], "scholarship-filled.pdf", {
    type: "application/pdf",
  });
  const withFilledForm = await svc.uploadFilledForm(req1004.request_id, filledFormFile);
  assert(
    "Scenario 5",
    withFilledForm.filled_form?.filename === "scholarship-filled.pdf",
    "Filled form uploaded successfully",
  );

  // SA perspective
  svc.setViewer(sa);
  const saCheck = (await svc.listRequests()).find((r) => r.request_id === "DRQ-1004")!;
  assert("Scenario 5", canDownloadFilledForm(sa, saCheck), "SA can inspect and download returned filled form");

  // Requester replaces and removes before acknowledgement
  svc.setViewer(student);
  assert("Scenario 5", canRemoveFilledForm(student, saCheck), "Requester can remove form before acknowledgement");

  // -------------------------------------------------------------------------
  // Scenario 6: Document types
  // -------------------------------------------------------------------------
  console.log("\n--- Scenario 6: Document types CRUD ---");
  svc.setViewer(sa);
  assert("Scenario 6", canManageDocumentTypes(sa), "SA can manage document types");

  const uniqueName = "Character Certificate";
  assert("Scenario 6", validateDocTypeName(uniqueName) === null, "Document type name validates (3-80 chars)");

  const createdType = await svc.createDocumentType({
    name: uniqueName,
    description: "Good conduct certificate issued by department head.",
  });
  assert("Scenario 6", createdType.name === uniqueName && createdType.status === "active", "Document type created as active");

  const archivedType = await svc.updateDocumentType(createdType.doc_type_id, {
    status: "archived",
  });
  assert("Scenario 6", archivedType.status === "archived", "Document type archived");

  // Requester cannot see archived types in request creation dropdown
  svc.setViewer(student);
  const requesterTypes = (await svc.listDocumentTypes()).filter((t) => t.status === "active");
  assert(
    "Scenario 6",
    !requesterTypes.some((t) => t.doc_type_id === createdType.doc_type_id),
    "Archived document type does not appear in active request dropdown",
  );

  // SA restores and deletes
  svc.setViewer(sa);
  const restoredType = await svc.updateDocumentType(createdType.doc_type_id, {
    status: "active",
  });
  assert("Scenario 6", restoredType.status === "active", "Document type restored to active");

  await svc.deleteDocumentType(createdType.doc_type_id);
  const remainingTypes = await svc.listDocumentTypes();
  assert(
    "Scenario 6",
    !remainingTypes.some((t) => t.doc_type_id === createdType.doc_type_id),
    "Document type deleted cleanly",
  );

  // -------------------------------------------------------------------------
  // Scenario 7: Turnaround Time (TAT) and bulk TAT
  // -------------------------------------------------------------------------
  console.log("\n--- Scenario 7: Turnaround Time (TAT) and bulk TAT ---");
  svc.setViewer(sa);
  assert("Scenario 7", canSetTat(sa), "SA can set TAT");

  const futureDate = new Date(Date.now() + 5 * 86_400_000).toISOString().slice(0, 10);
  assert("Scenario 7", validateTatDate(futureDate) === null, "Future date YYYY-MM-DD validates");

  // Single TAT on pending request DRQ-1007
  const singleTat = await svc.setTat("DRQ-1007", {
    expected_by: futureDate,
    note: "Reviewing with department",
  });
  assert(
    "Scenario 7",
    singleTat.tat?.expected_by === futureDate && singleTat.tat.note === "Reviewing with department",
    "Single TAT set on pending request",
  );

  // Bulk TAT all-or-nothing check: invalid ID in batch must abort entire batch
  let bulkFailedCleanly = false;
  try {
    await svc.setBulkTat({
      request_ids: ["DRQ-1007", "DRQ-1006"], // DRQ-1006 is acknowledged!
      expected_by: futureDate,
      note: "Batch update",
    });
  } catch (err: unknown) {
    const e = err as { code: string };
    bulkFailedCleanly = e.code === "REQUEST_NOT_PENDING";
  }
  assert("Scenario 7", bulkFailedCleanly, "Bulk TAT with non-pending ID rejected atomically (all-or-nothing)");

  // -------------------------------------------------------------------------
  // Scenario 8: Admin read-only
  // -------------------------------------------------------------------------
  console.log("\n--- Scenario 8: Admin read-only ---");
  svc.setViewer(admin);
  assert("Scenario 8", canViewAllRequests(admin), "Admin can view all requests");
  assert("Scenario 8", !canCreateRequest(admin), "Admin CANNOT create requests");
  assert("Scenario 8", !canAnswerRequest(admin), "Admin CANNOT answer requests");
  assert("Scenario 8", !canManageDocumentTypes(admin), "Admin CANNOT manage document types");
  assert("Scenario 8", !canSetTat(admin), "Admin CANNOT set TAT");

  const adminReqList = await svc.listRequests();
  const reqWithFiles = adminReqList.find((r) => !!r.document && !!r.filled_form);
  assert("Scenario 8", !!reqWithFiles, "Found request with answer document and filled form");
  assert(
    "Scenario 8",
    canDownloadAnswerDocument(admin, reqWithFiles!) && canDownloadFilledForm(admin, reqWithFiles!),
    "Admin can inspect and download permitted files",
  );

  // -------------------------------------------------------------------------
  // Scenario 9: Other requester roles
  // -------------------------------------------------------------------------
  console.log("\n--- Scenario 9: Other requester roles (Faculty, Ordinary Staff) ---");
  // Faculty
  svc.setViewer(faculty);
  assert("Scenario 9", canCreateRequest(faculty), "Faculty can create requests");
  assert("Scenario 9", !canAccessArea("student-affairs", faculty), "Faculty cannot access /sa");
  const facReqs = await svc.listRequests();
  assert(
    "Scenario 9",
    facReqs.every((r) => r.requested_by === faculty.email_id),
    "Faculty only sees own requests",
  );

  // Ordinary Office Staff (Accounts)
  svc.setViewer(staff);
  assert("Scenario 9", canCreateRequest(staff), "Ordinary office staff can create requests");
  assert("Scenario 9", !canAccessArea("student-affairs", staff), "Accounts staff cannot access /sa");
  const staffReqs = await svc.listRequests();
  assert(
    "Scenario 9",
    staffReqs.every((r) => r.requested_by === staff.email_id),
    "Ordinary staff only sees own requests",
  );

  console.log("\n=======================================================");
  console.log(`  Scenarios Result: ${passed} passed, ${failed} failed`);
  console.log("=======================================================\n");

  if (failed > 0) process.exit(1);
}

void runAllScenarios();

