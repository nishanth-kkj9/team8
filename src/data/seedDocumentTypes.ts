import type { DocType } from "../types/document";
import { isoDaysAgo } from "../lib/date";

/**
 * Seed document types (ARCHITECTURE.md ??7.1). Includes one archived type so
 * Student Affairs can demonstrate restore behaviour in later phases.
 */
export function buildSeedDocumentTypes(): DocType[] {
  return [
    {
      doc_type_id: "dt-bonafide",
      name: "Bonafide Certificate",
      description: "Proof that you are a student here.",
      status: "active",
      created_by: "Ravi Shetty",
      created_at: isoDaysAgo(90, 9, 30),
      updated_at: isoDaysAgo(90, 9, 30),
    },
    {
      doc_type_id: "dt-transcript",
      name: "Transcript",
      description: "All semester marks on one sheet.",
      status: "active",
      created_by: "Ravi Shetty",
      created_at: isoDaysAgo(90, 9, 40),
      updated_at: isoDaysAgo(90, 9, 40),
    },
    {
      doc_type_id: "dt-scholarship",
      name: "Scholarship Form",
      description: "Form to fill in and return.",
      status: "active",
      created_by: "Ravi Shetty",
      created_at: isoDaysAgo(90, 9, 50),
      updated_at: isoDaysAgo(90, 9, 50),
    },
    {
      doc_type_id: "dt-experience",
      name: "Experience Certificate",
      description: "For staff and faculty.",
      status: "active",
      created_by: "Ravi Shetty",
      created_at: isoDaysAgo(90, 10, 0),
      updated_at: isoDaysAgo(90, 10, 0),
    },
    {
      doc_type_id: "dt-hostel-clearance",
      name: "Hostel Clearance Letter",
      description: "Clearance letter issued at hostel checkout.",
      status: "archived",
      created_by: "Ravi Shetty",
      created_at: isoDaysAgo(210, 11, 0),
      updated_at: isoDaysAgo(45, 15, 20),
    },
  ];
}
