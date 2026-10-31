/**
 * Phase 4 service-level verification against the REAL mockDocDeskService.
 *
 * Proves the behaviours that cannot be triggered through the UI alone:
 *  - bulk TAT all-or-nothing (one non-pending id ??? whole batch rejected,
 *    no record touched)
 *  - duplicate-id dedup, 1???100 bounds
 *  - single TAT lifecycle restriction (pending only)
 *  - filled-form lifecycle restrictions (answered + document, pre-ack)
 *  - file type whitelist and 10 MB cap enforced by the service
 *  - doc type duplicate-name and archived-type request rejection
 *
 * Run: bun scripts/phase4-service-checks.ts
 */
import { mockDocDeskService as svc } from "../src/services/mockDocDeskService";
import type { DemoProfile } from "../src/types/auth";

// ---- localStorage shim (service persists to localStorage at call time) ----
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

function check(label: string, ok: boolean, detail = ""): void {
  if (ok) {
    passed += 1;
    console.log(`  PASS  ${label}${detail ? ` ??? ${detail}` : ""}`);
  } else {
    failed += 1;
    console.log(`  FAIL  ${label}${detail ? ` ??? ${detail}` : ""}`);
  }
}

function expectError(label: string, error: unknown, status: number, code: string): void {
  const e = error as { status?: number; code?: string; message?: string };
  check(
    label,
    e?.status === status && e?.code === code,
    `status=${e?.status} code=${e?.code} msg="${e?.message?.slice(0, 90)}"`,
  );
}

const sa: DemoProfile = {
  role: "office_staff",
  team_id: "t-sa",
  name: "Ravi Shetty",
  email_id: "ravi.shetty@campus.edu",
  dept: "Student Affairs",
};
const asha: DemoProfile = {
  role: "student",
  team_id: "t-stu",
  name: "Asha Kumar",
  email_id: "asha.kumar@campus.edu",
  usn: "CS21045",
  dept: "CSE",
};

function makeFile(name: string, type: string, bytes: number): File {
  return new File([new Uint8Array(bytes)], name, { type });
}

async function main(): Promise<void> {
  console.log("\n== Phase 4 service-level checks ==");
  await svc.resetDemoData();

  // ---- bulk TAT: all-or-nothing ------------------------------------------
  svc.setViewer(sa);
  const all = await svc.listRequests();
  const pending = all.filter((r) => r.status === "pending").map((r) => r.request_id);
  const answered = all.filter((r) => r.status === "answered").map((r) => r.request_id);
  console.log(`\n[Bulk TAT all-or-nothing] pending=${pending.join(",")} answered=${answered.join(",")}`);

  const tomorrow = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);

  try {
    await svc.setBulkTat({ request_ids: [pending[0]!, answered[0]!], expected_by: tomorrow });
    check("bulk with one answered id is rejected", false, "no error thrown");
  } catch (error) {
    expectError("bulk with one answered id is rejected", error, 409, "REQUEST_NOT_PENDING");
  }

  const after = await svc.listRequests();
  const p1 = after.find((r) => r.request_id === pending[0]);
  check(
    "pending member of the rejected batch is untouched",
    !p1?.tat,
    p1?.tat ? `unexpected tat=${p1.tat.expected_by}` : "no TAT was written",
  );
  const untouchedAnswered = after.find((r) => r.request_id === answered[0]);
  check(
    "answered member of the rejected batch is untouched",
    untouchedAnswered?.status === "answered" && !untouchedAnswered?.tat,
  );

  // unknown id in the batch also rejects the whole batch
  try {
    await svc.setBulkTat({ request_ids: [pending[0]!, "DRQ-9999"], expected_by: tomorrow });
    check("bulk with unknown id is rejected", false, "no error thrown");
  } catch (error) {
    expectError("bulk with unknown id is rejected", error, 404, "NOT_FOUND");
  }
  const after2 = await svc.listRequests();
  check(
    "still nothing written after unknown-id rejection",
    !after2.find((r) => r.request_id === pending[0])?.tat,
  );

  // valid batch succeeds
  const updated = await svc.setBulkTat({ request_ids: pending, expected_by: tomorrow, note: "batch week" });
  check("valid bulk batch succeeds", updated.length === pending.length, `updated=${updated.length}`);
  check(
    "every member got the same expected_by",
    updated.every((r) => r.tat?.expected_by === tomorrow),
  );

  // duplicates are ignored (dedup) ??? same batch again via duplicate ids
  const dup = await svc.setBulkTat({ request_ids: [pending[0]!, pending[0]!], expected_by: tomorrow });
  check("duplicate ids are deduped", dup.length === 1, `returned=${dup.length}`);

  // bounds: 0 and >100 rejected
  try {
    await svc.setBulkTat({ request_ids: [], expected_by: tomorrow });
    check("bulk with 0 ids rejected", false, "no error thrown");
  } catch (error) {
    expectError("bulk with 0 ids rejected", error, 422, "VALIDATION_ERROR");
  }
  try {
    const fake = Array.from({ length: 101 }, (_, i) => `DRQ-${2000 + i}`);
    await svc.setBulkTat({ request_ids: fake, expected_by: tomorrow });
    check("bulk with 101 ids rejected", false, "no error thrown");
  } catch (error) {
    expectError("bulk with 101 ids rejected", error, 422, "VALIDATION_ERROR");
  }

  // ---- single TAT lifecycle ----------------------------------------------
  console.log("\n[Single TAT lifecycle]");
  try {
    await svc.setTat(answered[0]!, { expected_by: tomorrow });
    check("single TAT on answered request rejected", false, "no error thrown");
  } catch (error) {
    expectError("single TAT on answered request rejected", error, 409, "REQUEST_NOT_PENDING");
  }

  // ---- filled-form lifecycle (service level) ------------------------------
  console.log("\n[Filled-form lifecycle]");
  const ashaPending = all.find((r) => r.requested_by === asha.email_id && r.status === "pending");
  const ashaAnswered = all.find((r) => r.requested_by === asha.email_id && r.status === "answered");
  // Foreign requests: answered without document (expect NO_DOCUMENT is NOT
  // reachable ??? ownership is checked first, so expect FORBIDDEN).
  const foreignAnsweredNoDoc = all.find(
    (r) => r.status === "answered" && !r.document && r.requested_by !== asha.email_id,
  );
  const foreignAnsweredWithDoc = all.find(
    (r) => r.status === "answered" && !!r.document && r.requested_by !== asha.email_id,
  );
  const acknowledged = all.find((r) => r.status === "acknowledged");

  svc.setViewer(asha);
  const png = makeFile("form.png", "image/png", 100);

  try {
    await svc.uploadFilledForm(ashaPending!.request_id, png);
    check("upload on pending rejected", false, "no error thrown");
  } catch (error) {
    expectError("upload on pending rejected", error, 409, "NOT_ANSWERED");
  }
  try {
    await svc.uploadFilledForm(acknowledged!.request_id, png);
    check("upload on acknowledged rejected", false, "no error thrown");
  } catch (error) {
    expectError("upload on acknowledged rejected", error, 409, "ALREADY_ACKNOWLEDGED");
  }
  try {
    await svc.uploadFilledForm(foreignAnsweredNoDoc!.request_id, png);
    check("upload on someone else's request rejected", false, "no error thrown");
  } catch (error) {
    expectError("upload on someone else's request rejected", error, 403, "FORBIDDEN");
  }
  try {
    await svc.uploadFilledForm(foreignAnsweredWithDoc!.request_id, png);
    check("upload to another requester's request rejected", false, "no error thrown");
  } catch (error) {
    expectError("upload to another requester's request rejected", error, 403, "FORBIDDEN");
  }
  if (ashaAnswered) {
    try {
      await svc.uploadFilledForm(ashaAnswered.request_id, makeFile("notes.txt", "text/plain", 10));
      check("service rejects .txt filled form", false, "no error thrown");
    } catch (error) {
      expectError("service rejects .txt filled form", error, 422, "VALIDATION_ERROR");
    }
    try {
      await svc.uploadFilledForm(ashaAnswered.request_id, makeFile("big.pdf", "application/pdf", 11 * 1024 * 1024));
      check("service rejects >10 MB filled form", false, "no error thrown");
    } catch (error) {
      expectError("service rejects >10 MB filled form", error, 422, "VALIDATION_ERROR");
    }
    const withForm = await svc.uploadFilledForm(ashaAnswered.request_id, png);
    check("valid upload succeeds", withForm.filled_form?.filename === "form.png");
    try {
      await svc.removeFilledForm(acknowledged!.request_id);
      check("remove after acknowledgement rejected", false, "no error thrown");
    } catch (error) {
      expectError("remove after acknowledgement rejected", error, 409, "ALREADY_ACKNOWLEDGED");
    }
    const removed = await svc.removeFilledForm(ashaAnswered.request_id);
    check("remove before acknowledgement succeeds", !removed.filled_form);
  }

  // ---- doc type rules ------------------------------------------------------
  console.log("\n[Document type rules]");
  svc.setViewer(sa);
  try {
    await svc.createDocumentType({ name: "Bonafide Certificate" });
    check("duplicate doc type name rejected", false, "no error thrown");
  } catch (error) {
    expectError("duplicate doc type name rejected", error, 409, "ALREADY_EXISTS");
  }
  svc.setViewer(asha);
  const archivedType = (await svc.listDocumentTypes()).find((t) => t.status === "archived");
  try {
    await svc.createRequest({ doc_type_id: archivedType!.doc_type_id, reason: "Need it for hostel checkout." });
    check("request against archived doc type rejected", false, "no error thrown");
  } catch (error) {
    expectError("request against archived doc type rejected", error, 409, "DOC_TYPE_ARCHIVED");
  }
  svc.setViewer(null);

  console.log(`\n== ${passed} passed, ${failed} failed ==`);
  if (failed > 0) process.exit(1);
}

void main();
