import type { DocRequest } from "../../src/types/request";
import { dateOnlyFromToday, isoDaysAgo } from "../../src/lib/date";

/**
 * Seed requests covering every required status/file combination
 * (ARCHITECTURE.md §7.1):
 *   DRQ-1001  pending, no TAT
 *   DRQ-1002  pending, with TAT
 *   DRQ-1003  answered, message only (no document)
 *   DRQ-1004  answered, answer document, no filled form (waiting on requester)
 *   DRQ-1005  answered, answer document + filled form (returned for SA review)
 *   DRQ-1006  acknowledged, answer + document
 *   DRQ-1007  pending, own request of the Student Affairs demo user
 *
 * Dates are computed relative to "today" so the demo always looks fresh.
 * `requested_by` (the requester's email) is the ownership key.
 */
export function buildSeedRequests(): DocRequest[] {
  return [
    {
      request_id: "DRQ-1001",
      doc_type_id: "dt-bonafide",
      doc_type_name: "Bonafide Certificate",
      reason:
        "I need a bonafide certificate for my passport application at the regional passport office.",
      status: "pending",
      requested_by: "asha.kumar@campus.edu",
      requested_by_name: "Asha Kumar",
      requested_by_role: "student",
      requested_by_dept: "CSE",
      requested_by_phone_number: "+91 98450 12345",
      created_at: isoDaysAgo(2, 9, 40),
      updated_at: isoDaysAgo(2, 9, 40),
    },
    {
      request_id: "DRQ-1002",
      doc_type_id: "dt-transcript",
      doc_type_name: "Transcript",
      reason:
        "Applying for higher studies — I need my semester 1 to 5 marks on one sheet.",
      status: "pending",
      tat: {
        expected_by: dateOnlyFromToday(6),
        note: "Official transcripts take 3–5 working days to prepare.",
        updated_by: "Ravi Shetty",
        updated_at: isoDaysAgo(1, 11, 5),
      },
      requested_by: "asha.kumar@campus.edu",
      requested_by_name: "Asha Kumar",
      requested_by_role: "student",
      requested_by_dept: "CSE",
      requested_by_phone_number: "+91 98450 12345",
      created_at: isoDaysAgo(3, 14, 20),
      updated_at: isoDaysAgo(1, 11, 5),
    },
    {
      request_id: "DRQ-1003",
      doc_type_id: "dt-bonafide",
      doc_type_name: "Bonafide Certificate",
      reason: "Employment bonafide required for my pending home loan application.",
      status: "answered",
      answer: {
        message:
          "Your employment bonafide is ready for collection at the Student Affairs counter (Mon–Fri, 10 AM–4 PM). Please carry your staff ID card.",
        answered_by: "ravi.shetty@campus.edu",
        answered_by_name: "Ravi Shetty",
        answered_at: isoDaysAgo(4, 12, 10),
      },
      requested_by: "meera.rao@campus.edu",
      requested_by_name: "Meera Rao",
      requested_by_role: "faculty",
      requested_by_phone_number: "+91 98450 23456",
      created_at: isoDaysAgo(5, 10, 5),
      updated_at: isoDaysAgo(4, 12, 10),
    },
    {
      request_id: "DRQ-1004",
      doc_type_id: "dt-scholarship",
      doc_type_name: "Scholarship Form",
      reason:
        "Applying for the state merit scholarship for the current academic year.",
      status: "answered",
      answer: {
        message:
          "Please complete the attached scholarship form, sign it, and upload the filled-in form back here so we can verify and forward it.",
        answered_by: "ravi.shetty@campus.edu",
        answered_by_name: "Ravi Shetty",
        answered_at: isoDaysAgo(1, 16, 45),
      },
      document: {
        file_id: "file-1004-form",
        filename: "scholarship-form-2026.pdf",
        content_type: "application/pdf",
        size_bytes: 184320,
      },
      requested_by: "asha.kumar@campus.edu",
      requested_by_name: "Asha Kumar",
      requested_by_role: "student",
      requested_by_dept: "CSE",
      requested_by_phone_number: "+91 98450 12345",
      created_at: isoDaysAgo(2, 11, 30),
      updated_at: isoDaysAgo(1, 16, 45),
    },
    {
      request_id: "DRQ-1005",
      doc_type_id: "dt-bonafide",
      doc_type_name: "Bonafide Certificate",
      reason: "Staff bonafide needed for my housing loan verification.",
      status: "answered",
      answer: {
        message:
          "Your request is approved. Please find the signed bonafide document attached.",
        answered_by: "ravi.shetty@campus.edu",
        answered_by_name: "Ravi Shetty",
        answered_at: isoDaysAgo(6, 10, 0),
      },
      document: {
        file_id: "file-1005-doc",
        filename: "staff-bonafide-suresh.pdf",
        content_type: "application/pdf",
        size_bytes: 121400,
      },
      filled_form: {
        file_id: "file-1005-filled",
        filename: "staff-bonafide-suresh-signed.pdf",
        content_type: "application/pdf",
        size_bytes: 143950,
      },
      requested_by: "suresh.babu@campus.edu",
      requested_by_name: "Suresh Babu",
      requested_by_role: "office_staff",
      requested_by_dept: "Accounts",
      requested_by_phone_number: "+91 98450 34567",
      created_at: isoDaysAgo(8, 9, 15),
      updated_at: isoDaysAgo(5, 15, 40),
    },
    {
      request_id: "DRQ-1006",
      doc_type_id: "dt-transcript",
      doc_type_name: "Transcript",
      reason: "Transcript required for my semester exchange programme application.",
      status: "acknowledged",
      answer: {
        message:
          "Your official transcript is attached. Please verify the details and contact Student Affairs within 7 days for any corrections.",
        answered_by: "ravi.shetty@campus.edu",
        answered_by_name: "Ravi Shetty",
        answered_at: isoDaysAgo(9, 12, 30),
      },
      document: {
        file_id: "file-1006-doc",
        filename: "transcript-asha-kumar.pdf",
        content_type: "application/pdf",
        size_bytes: 210800,
      },
      acknowledged_at: isoDaysAgo(1, 9, 5),
      requested_by: "asha.kumar@campus.edu",
      requested_by_name: "Asha Kumar",
      requested_by_role: "student",
      requested_by_dept: "CSE",
      requested_by_phone_number: "+91 98450 12345",
      created_at: isoDaysAgo(12, 10, 50),
      updated_at: isoDaysAgo(1, 9, 5),
    },
    {
      request_id: "DRQ-1007",
      doc_type_id: "dt-experience",
      doc_type_name: "Experience Certificate",
      reason:
        "Experience certificate required for an external audit engagement next month.",
      status: "pending",
      requested_by: "ravi.shetty@campus.edu",
      requested_by_name: "Ravi Shetty",
      requested_by_role: "office_staff",
      requested_by_dept: "Student Affairs",
      requested_by_phone_number: "+91 98450 45678",
      created_at: isoDaysAgo(1, 8, 55),
      updated_at: isoDaysAgo(1, 8, 55),
    },
  ];
}
