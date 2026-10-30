# DocDesk — Frontend Architecture & OpenCode Build Specification

> **Purpose:** Build the complete, responsive, interactive DocDesk frontend first. Do not build a backend or call the real CampusOS API in this phase. Use realistic mock data and a replaceable mock-service layer. After the frontend is complete and tested, integrate the supplied CampusOS API without redesigning the UI.
>
> **Primary readers:** OpenCode coding agents using the user's configured `GLM-5.3-Flash` or `DeepSeek-V4.1-Flash` model.
>
> **Project scope:** DocDesk — CampusOS document requests, not the separate FindIt, Notice Hub, or FixIt modules.

---

## 0. Instructions to the coding agent — read before changing files

1. Read this entire document before coding. Treat it as the frontend source of truth.
2. Implement **frontend only**. No backend, database, server routes, API calls, authentication service, or real CampusOS integration in this phase.
3. Keep the code ready for later integration: UI components must call service functions, not directly manipulate mock arrays or local storage.
4. Use mock data that accurately reflects the supplied API's field names, status values, role rules, validation rules, and lifecycle.
5. Do not invent API statuses or endpoints. In particular:
   - Valid DocDesk request statuses are exactly `pending`, `answered`, and `acknowledged`.
   - There are no separate API statuses named `approved`, `rejected`, `under_processing`, or `document_ready`.
   - There is no supplied `PATCH /requests/{id}/status` endpoint.
   - Student Affairs answers a request with a free-text message and an optional document. An answer may communicate approval, non-issuance/rejection, instructions to complete a form, or collection details. The API status still becomes `answered`.
6. `Student Affairs` is **office staff with `dept = "Student Affairs"`**, not a separate API role. `role` remains `office_staff`.
7. Admin is **read-only in DocDesk**. Never show the Admin Approve, Reject, Answer, Edit, Upload, document-type management, or TAT controls.
8. Students, faculty, and office staff are all requesters. The requester UI should be reusable across those roles. The Student Affairs office-staff user has additional DocDesk privileges.
9. The Admin may see all requests and download answer documents/filled forms. Admin may view document types. Admin cannot create, edit, archive, delete, answer, upload or set TAT in DocDesk.
10. The two photographed quick-reference pages include parts of other modules around DocDesk. Do not add Notice Hub or FixIt features to this DocDesk build.
11. Do not claim that a mock action was persisted on a server. Clearly label demo mode somewhere subtle (for example, a small `Demo data` label in the profile/menu or footer).
12. Build in small verified stages. After each stage, run the project, lint/type-check if configured, and fix errors before continuing.

---

## 1. Source analysis and precedence

This specification was prepared from these supplied project materials:

1. `api-cookbook.pdf` / `api-cookbook(1).pdf` — CampusOS API Guide, especially §1–3 and §6 DocDesk.
2. `guide.html` — CampusOS API Flow Guide, especially actor hierarchy, account/login flow, permission map, DocDesk lifecycle, screen suggestions, bonus features, and general UI/API patterns.
3. The two photographed quick-reference pages:
   - DocDesk section headed **“3. DocDesk: Document requests · `/api/v1/docdesk`**”.
   - Bonus endpoint table headed above the separate **FixIt: Maintenance tickets** section.
4. The user's initial UI outline in the conversation.

### How to resolve differences

- Use the Cookbook's detailed endpoint descriptions and field constraints where the quick-reference photo abbreviates them.
- The photographs confirm the endpoint families and the star-marked bonus operations. The Cookbook gives more complete query parameters, lifecycle restrictions, file limits, and response fields.
- The Flow Guide clarifies the role hierarchy and which screens are appropriate for each role.
- The user's original outline is a starting point, not a reason to change API roles or statuses.

### What the photographs show

**DocDesk base path:** `/api/v1/docdesk`

**Core request table:**

- `POST /requests` — non-admin requester submits `{ "doc_type_id", "reason" }`.
- `GET /requests?status=&doc_type_id=` — everyone; Student Affairs and Admin see all requests, other requesters see only their own.
- `PATCH /requests/{id}` and `DELETE /requests/{id}` — requester edits or withdraws while pending.
- `POST /requests/{id}/answer`, `PATCH /requests/{id}/answer`, `DELETE /requests/{id}/answer` — Student Affairs sends/changes/withdraws an answer; form-data includes required message and optional document.
- `POST /requests/{id}/acknowledge` — requester closes the answered request.

**Starred bonus table:**

- `GET /doc-types?status=` and `GET /doc-types/{id}` — fetch document types for dropdown.
- `POST /doc-types`, `PATCH /doc-types/{id}`, `DELETE /doc-types/{id}` — Student Affairs manages document types; create, edit, archive, delete.
- `PUT /requests/{id}/tat` — Student Affairs sets a turnaround date and note.
- `POST /requests/bulk-tat` — Student Affairs updates many requests; all-or-nothing.
- `GET /requests/{id}/document` — requester, Student Affairs, Admin download the document sent with the answer.
- `PUT /requests/{id}/filled-form`, `GET /requests/{id}/filled-form`, `DELETE /requests/{id}/filled-form` — requester uploads/downloads/removes the completed form; Student Affairs and Admin can read/download it under the full guide's permission rules.

The adjacent FixIt and Notice Hub endpoint rows are not DocDesk requirements.

---

## 2. Product scope

### 2.1 Problem context and product purpose

The project premise established for DocDesk is that students currently need to visit different college departments/offices to obtain academic documents. A manual process can involve paperwork, repeated office visits, waiting, and uncertainty about the progress of a request. DocDesk proposes a centralized digital request and delivery experience so eligible requesters can submit a request, see its progress, receive Student Affairs' response, access the attached document/form, return a completed form when required, and acknowledge the response.

DocDesk is the CampusOS academic-document request desk. A student or other eligible requester asks for an official document. Student Affairs reviews and answers the request, sometimes attaching a form/document for the requester to complete. The requester may upload the completed form and then acknowledge the answer to close the request.

The frontend should communicate these outcomes clearly: fewer unnecessary office visits, a visible request lifecycle, transparent turnaround expectations when Student Affairs sets a TAT, and convenient access to answer documents and returned forms. These are product goals; do not represent them as additional API fields or guaranteed backend functionality.

### 2.2 Core lifecycle

```text
Requester submits request
        |
        v
     PENDING
        |
        | Student Affairs submits an answer
        v
     ANSWERED
        |
        | Requester acknowledges the answer
        v
  ACKNOWLEDGED (closed)
```

Additional lifecycle rules:

- Requester can edit or withdraw their own request **only while `pending`**.
- Student Affairs can set TAT while the request is `pending`.
- Student Affairs can create, change, or withdraw an answer while it is not yet acknowledged.
- Withdrawing an answer returns the request to `pending` and removes its answer, attached document, and any filled-in form.
- Requester can acknowledge only an `answered` request.
- `acknowledged` is closed; requester and Student Affairs can view/download, but requester cannot remove the filled form after acknowledgement.
- A filled-in form round-trip requires an `answered` request with an answer document, and must happen before acknowledgement.

### 2.3 In scope

- Login/demo role selection UI.
- Requester portal for Student, Faculty and ordinary Office Staff.
- Student Affairs portal (Office Staff whose department is Student Affairs).
- Read-only Admin DocDesk portal.
- Request create/view/edit/withdraw interactions.
- Answer compose/edit/withdraw interactions for Student Affairs.
- Document-type management (starred bonus APIs).
- Single and bulk turnaround-time management (starred bonus APIs).
- Answer document attachment/download (starred bonus APIs).
- Filled-form upload/download/remove/review (starred bonus APIs).
- Mock data, client-side state, validation, dialogs, search, filters, pagination/load-more, empty/loading/error states.
- Responsive desktop, tablet, and mobile layouts.

### 2.4 Explicitly out of scope

- FindIt (lost and found).
- Notice Hub (announcements and doubts).
- FixIt (maintenance tickets).
- Real backend or database.
- Real API authentication/token storage in this phase.
- Real email/SMS/push notifications; no DocDesk notification endpoint is specified in the supplied material.
- Real approval/rejection status endpoints.
- Public self-service student signup or admin signup. The account guide says organisers create the Admin and Admin creates other users.

Admin user management exists in the wider CampusOS account module, but it is not part of DocDesk's core scope. Only add it as a clearly separated optional screen if the team explicitly wants a wider CampusOS account-management demo.

---

## 3. Roles and permissions

### 3.1 Actual roles

| UI profile | CampusOS role/profile | DocDesk permissions |
|---|---|---|
| Student | `role: "student"` | Create request; list/view own requests; edit/withdraw own pending requests; acknowledge own answered request; upload/remove own filled-in form; download own answer document and filled form; view document types. |
| Faculty | `role: "faculty"` | Same requester capabilities for own requests; view document types. |
| Other Office Staff | `role: "office_staff"`, department other than Student Affairs | Same requester capabilities for own requests; view document types. |
| Student Affairs Staff | `role: "office_staff"`, `dept: "Student Affairs"` | Requester capabilities for own requests plus view all requests, answer/change/withdraw answers, manage document types, set individual/bulk TAT, download documents and read/download filled forms. |
| Admin | `role: "admin"` | Read all requests, read document types, download answer documents and filled-in forms. **Read-only in DocDesk.** |

### 3.2 Role hierarchy from the account guide

- One Admin per team is created by the organisers.
- Admin creates students, faculty and office staff.
- Student profile fields include `name`, `usn`, `dept`, `email_id`, `phone_number`.
- Faculty fields include `name`, `designation`, `email_id`, `phone_number`.
- Office staff fields include `name`, `dept`, `designation`, `email_id`, `phone_number`.
- Student Affairs is identified by an office-staff profile with `dept = "Student Affairs"` (case-insensitive; the guide permits a trailing `dept`).
- User login uses an email plus the team's OTP. The team OTP is shared; there are not separate public signup flows for each role.

### 3.3 Frontend role handling

For demo mode, create a Demo Login screen with role/profile choices:

- Student demo
- Faculty demo
- Other Office Staff demo
- Student Affairs demo
- Admin demo

This is a **frontend demonstration shortcut**, not a claim that the backend has those separate login endpoints or a public role picker. Later, replace it with the actual login response and use `profile.role` plus `profile.dept` to determine access.

Centralize authorization visibility in `permissions.ts` (or equivalent). Do not scatter role string comparisons throughout components.

Example conceptual helpers:

```ts
canCreateRequest(profile)
canEditOwnPendingRequest(profile, request)
canWithdrawOwnPendingRequest(profile, request)
canViewAllRequests(profile)
canAnswerRequest(profile)
canManageDocumentTypes(profile)
canSetTat(profile)
canAcknowledge(profile, request)
canUploadFilledForm(profile, request)
canDownloadAnswerDocument(profile, request)
canDownloadFilledForm(profile, request)
```

The frontend's hidden/disabled controls are UX only. The future backend remains responsible for real authorization.

---

## 4. Information architecture and navigation

Build three role-based app shells with a shared visual system and reusable components.

### 4.1 Shared shell

- Brand/logo: DocDesk.
- Collapsible left sidebar on desktop.
- Mobile drawer navigation.
- Top bar with page title/breadcrumb, help affordance, profile menu, and `Demo mode` indicator.
- Main content container with consistent max width and responsive spacing.
- Toast/notification area for demo action feedback (not a claim of real server notifications).

### 4.2 Requester navigation (Student, Faculty, Other Office Staff)

1. Dashboard
2. Request a Document
3. My Requests
4. My Profile

Request details, answer/document view, filled-form upload and acknowledgement should be contextual pages or panels reached from My Requests.

### 4.3 Student Affairs navigation

1. Dashboard
2. All Requests / Processing Queue
3. Pending Requests
4. Answered Requests
5. Filled Forms to Review
6. Document Types
7. Turnaround Time

Use tabs/filters where a separate navigation item would be redundant. All request statuses remain the API values.

### 4.4 Admin navigation

1. Dashboard
2. All Requests
3. Document Details (read-only)

Optional account-management screens must be clearly outside the DocDesk area and must not leak write controls into the DocDesk Admin view.

---

## 5. Screen-by-screen requirements

## 5A. Authentication / Demo Login

**Route:** `/login`

Elements:

- DocDesk branding and short product description.
- Email field.
- OTP field (masked/unmasked toggle).
- Login button.
- Clear validation feedback.
- For this phase, demo role/profile selector or preconfigured demo account buttons.
- No self-signup forms.

Demo account options must be visibly identified as demo-only. Later backend integration will use:

- Admin: `POST /api/v1/auth/admin/login`
- Student/faculty/office staff: `POST /api/v1/auth/login`
- User profile: `GET /api/v1/users/me`
- Admin profile: `GET /api/v1/admin/me`

The supplied guide says the access token lasts 43,200 seconds (12 hours). Do not implement real token lifecycle until backend phase; design the auth context so it can support it later.

## 5B. Requester portal

### Screen R1 — Dashboard

**Route:** `/app/dashboard`

Show:

- Greeting using the mock profile name.
- Profile summary: name, role, department/USN where applicable.
- Four statistics cards:
  - Total Requests
  - Pending
  - Answered
  - Acknowledged
- Primary `Request a Document` CTA.
- Recent requests table/list.
- Quick links to My Requests.
- TAT/expected-by date on relevant requests when available.

Do not show separate Approved and Rejected counts as API status counts. An answer message may communicate an approval or rejection outcome, but the request's state remains `answered`.

### Screen R2 — Request a Document

**Route:** `/app/requests/new`

Form fields:

| Field | UI behaviour |
|---|---|
| Requester name | Read-only mock profile data |
| Email | Read-only mock profile data |
| USN | Show for Student profile only |
| Department | Show when available on profile |
| Document type | Select from active mock document types |
| Reason | Required textarea, 5–1,000 characters, character counter |

Actions:

- Submit Request
- Cancel

On successful mock submission:

- Generate a clearly mock `DRQ-...` request ID.
- Add a request with status `pending`.
- Show success toast and confirmation screen/dialog.
- Navigate to request details or My Requests.

Future API mapping:

- `GET /api/v1/docdesk/doc-types?status=active&limit=100&cursor=` (starred bonus API)
- `POST /api/v1/docdesk/requests` with JSON `{ doc_type_id, reason }`

If dynamic doc types are not part of an initial demo iteration, the guide permits a fixed list, but this architecture includes the document-type manager and dynamic mock list.

### Screen R3 — My Requests

**Route:** `/app/requests`

Show own requests only for requester roles.

Table/list fields:

- Request ID
- Document type/name
- Reason (short preview)
- Submitted date
- Expected-by date (if TAT exists)
- Status (`pending`, `answered`, `acknowledged`)
- Last updated
- Actions

Features:

- Search by request ID/document name.
- Filter by status.
- Filter by document type.
- Sort by newest/oldest and expected date where useful.
- Pagination or `Load more` interaction.
- Empty state with `Request a Document` CTA.

Actions depend on status:

- Pending: View, Edit, Withdraw.
- Answered: View, open answer/document, upload filled form if a document was attached, Acknowledge.
- Acknowledged: View and Download available document; no edit/withdraw/filled-form removal.

### Screen R4 — Request Details / Tracking

**Route:** `/app/requests/:requestId`

Show:

- Request ID.
- Document type and description.
- Reason.
- Requester details available in the mock record.
- Created/submitted date and updated date.
- Current API status.
- Status timeline: Pending → Answered → Acknowledged.
- TAT panel if `tat` exists: expected date, note, updated by, updated at.
- Answer panel if `answer` exists: message, answered by name, answered at.
- Answer-document panel if `document` exists.
- Filled-form panel if `filled_form` exists.

Pending requester actions:

- Edit Request — changes only document type and/or reason in mock data.
- Withdraw Request — show confirmation dialog before removing/marking withdrawn in demo state. The API's delete operation withdraws the request; do not introduce `withdrawn` as a request status in the API model. A frontend-only audit label may be shown in a separate activity log if desired, but do not put it in the API status field.

Answered requester actions:

- Download answer document when present.
- Upload/replace filled-in form only if answer document exists.
- Remove filled-in form before acknowledgement.
- Acknowledge Request.

Acknowledged requester actions:

- View request, answer and download documents.
- Hide/disable actions that are no longer permitted.

### Screen R5 — Answer & Document panel

This may be a section of Request Details rather than a separate page.

Show:

- Student Affairs response message.
- Responder name and answered date.
- Attached answer document filename/type/size.
- Preview where browser supports the type, otherwise filename and download affordance.
- Download Document action.

Do not force an answer document: the answer `document` is optional. The response message is required by the API.

### Screen R6 — Filled-in Form upload

This may be a section or modal on an answered request.

Conditions:

- Request status is `answered`.
- An answer document exists.
- Request is not already acknowledged.

Requester actions:

- Upload filled-in form.
- Replace current filled-in form (uploading again replaces it).
- Download current filled-in form.
- Remove filled-in form before acknowledgement.

Allowed file types: PDF, Word `.docx`, JPEG, PNG. Maximum file size: 10 MB.

If the conditions are not met, show an explanatory disabled state rather than a dead upload button.

### Screen R7 — Profile

**Route:** `/app/profile`

Read-only profile details. API guide states users can read their profile but cannot edit it themselves.

Fields shown conditionally according to role:

- name
- email_id
- phone_number
- role
- usn (student only)
- dept (student and office staff)
- designation (faculty and office staff)

---

## 5C. Student Affairs portal

Student Affairs is the central processing role in DocDesk. Implement this portal as the primary administrative workflow, separate from the read-only Admin portal.

### Screen SA1 — Student Affairs Dashboard

**Route:** `/sa/dashboard`

Cards:

- Total Requests
- Pending
- Answered
- Acknowledged

Operational panels:

- Latest pending requests.
- Requests with TAT approaching/overdue (frontend-derived display only; no DocDesk `overdue` field is specified).
- Answered requests with an attached document but no `filled_form` (waiting for requester).
- Answered requests with both `document` and `filled_form` (returned form ready for SA review).
- Recent responses.
- Quick actions: Open Pending Queue, Manage Document Types, Set TAT.

### Screen SA2 — Request Queue / Pending Applications

**Route:** `/sa/requests`

Default view may select Pending, but provide status tabs/filters for all valid statuses.

Table columns:

- Request ID
- Requester name
- Requester email
- Requester role
- Department
- Document type
- Reason preview
- Submitted date
- Status
- Expected-by date (when TAT exists)
- Action: View Details

Controls:

- Search requester/name/email/request ID.
- Filter by status and document type.
- Date sort/filter.
- Checkbox selection for bulk TAT (pending only).
- Pagination/load more.

Future API mapping: `GET /api/v1/docdesk/requests?status=pending&doc_type_id=&mine=false&limit=25&cursor=`. Student Affairs can view everyone's requests. `mine=true` is available if the SA queue needs to show only that SA staff member's own requests.

### Screen SA3 — Request Review & Answer

**Route:** `/sa/requests/:requestId`

Read/review area:

- Request ID and status.
- Requester name, email, role, department, phone number where present.
- Document type.
- Reason.
- Created and updated dates.
- Existing TAT, if any.
- Existing answer and attached document, if any.
- Filled form, if returned.

Answer composer:

- Required response message textarea.
- Character counter: 1–2,000 characters.
- Optional answer document upload: PDF or DOCX, up to 10 MB.
- Send Answer.
- Edit Answer (when request is answered and not acknowledged).
- Withdraw Answer (confirmation required; returns request to pending and removes related answer/file/form data).

The answer is free text. For UX, optional response templates may prefill the message, for example:

- “Your request is approved. Please find the document attached.”
- “The requested document cannot be issued because …”
- “Please complete the attached form and upload it back.”
- “Your document is ready for collection …”

These are message templates only. Do not store `approved` or `rejected` as the request's API status.

Future API mapping:

- `POST /api/v1/docdesk/requests/{request_id}/answer` — multipart form-data: required `message`, optional `document`.
- `PATCH /api/v1/docdesk/requests/{request_id}/answer` — multipart form-data: any of `message`, `document`, `remove_document=true`.
- `DELETE /api/v1/docdesk/requests/{request_id}/answer` — withdraw answer and return request to pending.

### Screen SA4 — Document Type Manager

**Route:** `/sa/document-types`

This is a starred bonus capability, but must be included in the planned frontend.

List fields:

- Document type name
- Description
- Status (`active` or `archived`)
- Created by/date where provided
- Actions

Actions:

- Add document type.
- Edit name/description.
- Archive (sets status to `archived`; prevents new requests using that type).
- Restore (sets status to `active`).
- Delete (confirmation required).
- Filter Active / Archived.

Validation:

- Name required, 3–80 characters, unique.
- Description optional.

Future endpoints:

- `GET /api/v1/docdesk/doc-types?status=active&limit=100&cursor=` — everyone.
- `GET /api/v1/docdesk/doc-types/{doc_type_id}` — everyone.
- `POST /api/v1/docdesk/doc-types` — Student Affairs only.
- `PATCH /api/v1/docdesk/doc-types/{doc_type_id}` — Student Affairs only; fields may include `name`, `description`, `status`.
- `DELETE /api/v1/docdesk/doc-types/{doc_type_id}` — Student Affairs only.

### Screen SA5 — Turnaround Time (TAT) Management

**Route:** `/sa/turnaround-time`

This is a starred bonus capability.

Single request panel:

- Request ID and requester/document summary.
- Date picker for `expected_by`.
- Note textarea.
- Save TAT.

Bulk TAT panel:

- Pending request table with checkboxes.
- Select 1–100 distinct request IDs.
- Expected-by date picker.
- Optional note.
- Set TAT for Selected.
- Confirmation summary showing selected count and date.

Validation/behaviour:

- Only pending requests may receive TAT.
- `expected_by` is `YYYY-MM-DD` and cannot be before today.
- Bulk update is all-or-nothing. In the frontend demo, simulate an all-or-nothing result; never partially update the mock records when one selected item is invalid.
- Repeated IDs are ignored by the API; frontend should prevent duplicate selection.

Future endpoints:

- `PUT /api/v1/docdesk/requests/{request_id}/tat` with `{ expected_by, note }`.
- `POST /api/v1/docdesk/requests/bulk-tat` with `{ request_ids, expected_by, note }`.

### Screen SA6 — Filled Form Review

**Route:** `/sa/filled-forms`

This is a starred bonus capability.

Show answered requests with attached answer documents and any returned filled-in forms. Provide filters:

- Awaiting requester upload: `document` exists, `filled_form` absent.
- Returned form: both `document` and `filled_form` exist.
- Acknowledged/closed records for view/download only.

Details:

- Request ID
- Requester name
- Document type
- Original answer document
- Filled-in form filename/type/size
- Upload date where available
- Download/View action

SA can read/download filled-in forms. Do not present the SA role as able to upload the requester's filled form on their behalf unless the frontend clearly labels it as demo/admin assistance and the actual API permissions are later confirmed; the supplied API table grants upload to the requester for their own request.

---

## 5D. Admin DocDesk portal — read-only

### Screen A1 — Admin Dashboard

**Route:** `/admin/dashboard`

Cards:

- Total Requests
- Pending
- Answered
- Acknowledged

Panels:

- Recent requests across the institution.
- Request distribution by status.
- Request distribution by document type.
- Search/filter controls.

### Screen A2 — All Requests

**Route:** `/admin/requests`

Admin can view all requests. Provide:

- Request ID
- Requester name/email/role/department
- Document type
- Reason
- Created date
- Status
- TAT if present
- View Details

### Screen A3 — Request Details (read-only)

**Route:** `/admin/requests/:requestId`

Admin can inspect:

- Request fields and requester profile details returned in the record.
- TAT.
- Answer message and responder details.
- Attached answer document metadata.
- Filled-form metadata.
- Acknowledgement date.
- Download answer document.
- Download filled-in form.

Do not show any write action in the DocDesk Admin UI. The API guide explicitly says the Admin is read-only in this module and create/edit/upload calls return 403.

---

## 6. Data model for mock frontend

Use TypeScript interfaces matching the API's vocabulary. Do not rename fields to UI-only words in the shared domain model.

```ts
export type DocDeskStatus = "pending" | "answered" | "acknowledged";
export type DocumentTypeStatus = "active" | "archived";
export type CampusRole = "student" | "faculty" | "office_staff" | "admin";

export interface DemoProfile {
  role: CampusRole;
  team_id: string;
  name: string;
  email_id: string;
  phone_number?: string;
  usn?: string;          // student only
  dept?: string;         // student and office staff
  designation?: string; // faculty and office staff
  institution_name?: string; // may appear on admin profile
}

export interface DocType {
  doc_type_id: string;
  name: string;
  description?: string;
  status: DocumentTypeStatus;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
}

export interface StoredFileMetadata {
  file_id: string;
  filename: string;
  content_type: string;
  size_bytes: number;
  url?: string;
}

export interface RequestTat {
  expected_by: string; // YYYY-MM-DD
  note?: string;
  updated_by?: string;
  updated_at?: string;
}

export interface RequestAnswer {
  message: string;
  answered_by?: string;
  answered_by_name?: string;
  answered_at?: string;
  updated_at?: string;
}

export interface DocRequest {
  request_id: string;
  doc_type_id: string;
  doc_type_name: string;
  reason: string;
  status: DocDeskStatus;
  tat?: RequestTat;
  answer?: RequestAnswer;
  document?: StoredFileMetadata;
  filled_form?: StoredFileMetadata;
  acknowledged_at?: string;
  requested_by: string;
  requested_by_name?: string;
  requested_by_role?: Exclude<CampusRole, "admin">;
  requested_by_dept?: string;
  requested_by_phone_number?: string;
  created_at: string;
  updated_at: string;
}
```

Notes:

- The API omits optional properties such as `tat`, `answer`, `document`, `filled_form`, and `acknowledged_at` until they exist. Mock UI must check for their existence.
- The API generates IDs. The frontend may generate clearly mock IDs for demonstration, but keep ID generation inside the mock service so it can be removed during API integration.
- `requested_by` is the requester's email. Use that as the ownership key for demo filtering.
- Don't assume every requester has a USN; the API's user guide says only students have USN.
- Use ISO date/time strings for stored timestamps. Render timestamps in `Asia/Kolkata` for this project. TAT's `expected_by` is a date-only string.

---

## 7. Mock data and frontend state requirements

### 7.1 Demo data seed

Create realistic seed profiles for:

- Student: Asha Kumar, `role: student`, USN and department CSE.
- Faculty: Meera Rao, `role: faculty`.
- Ordinary Office Staff: Accounts/Library example, `role: office_staff` with a non-Student-Affairs department.
- Student Affairs: Ravi Shetty, `role: office_staff`, `dept: "Student Affairs"`.
- Admin: institution admin profile.

Create a varied request dataset with examples in all three valid statuses and with these combinations:

1. Pending request without TAT.
2. Pending request with TAT.
3. Answered request with message only (no document).
4. Answered request with answer document and no filled form (waiting for requester).
5. Answered request with answer document and filled form (returned for SA review).
6. Acknowledged request with answer and document.

Seed document types from the guide:

- Bonafide Certificate — Proof that you are a student here.
- Transcript — All semester marks on one sheet.
- Scholarship Form — Form to fill in and return.
- Experience Certificate — For staff and faculty.

Only active document types appear in the requester form dropdown. Include at least one archived type in SA's management table to demonstrate restore behaviour.

### 7.2 State architecture

- Use React Context or a small state store for current demo profile and request/document-type state.
- Use a service abstraction such as `mockDocDeskService.ts` for all data operations.
- Components/pages must call service methods; they must not mutate seed arrays directly.
- Persist request metadata, document types, and demo preferences in `localStorage` for refresh persistence.
- Do not put raw `File` blobs into localStorage. For demo files, use object URLs during the active session or IndexedDB if durable local file persistence is required. Revoke object URLs when no longer used.
- Include a `Reset demo data` action in a discreet developer/demo menu.

### 7.3 Recommended service contract

```ts
export interface DocDeskService {
  listRequests(filters?: RequestFilters): Promise<DocRequest[]>;
  getRequest(requestId: string): Promise<DocRequest | null>;
  createRequest(input: CreateRequestInput): Promise<DocRequest>;
  updatePendingRequest(requestId: string, input: UpdateRequestInput): Promise<DocRequest>;
  withdrawPendingRequest(requestId: string): Promise<void>;
  answerRequest(requestId: string, input: AnswerRequestInput): Promise<DocRequest>;
  updateAnswer(requestId: string, input: UpdateAnswerInput): Promise<DocRequest>;
  withdrawAnswer(requestId: string): Promise<DocRequest>;
  acknowledgeRequest(requestId: string): Promise<DocRequest>;
  listDocumentTypes(filters?: DocumentTypeFilters): Promise<DocType[]>;
  createDocumentType(input: CreateDocTypeInput): Promise<DocType>;
  updateDocumentType(docTypeId: string, input: UpdateDocTypeInput): Promise<DocType>;
  deleteDocumentType(docTypeId: string): Promise<void>;
  setTat(requestId: string, input: TatInput): Promise<DocRequest>;
  setBulkTat(input: BulkTatInput): Promise<DocRequest[]>;
  downloadAnswerDocument(requestId: string): Promise<DownloadableDemoFile | null>;
  uploadFilledForm(requestId: string, file: File): Promise<DocRequest>;
  downloadFilledForm(requestId: string): Promise<DownloadableDemoFile | null>;
  removeFilledForm(requestId: string): Promise<DocRequest>;
}
```

Implement this contract with a mock service now. Later implement a real `campusOsDocDeskService.ts` with the same contract and swap the provider/configuration.

---

## 8. Endpoint mapping for future backend integration

**Do not call these endpoints in the frontend-only phase.** This table is here so the architecture preserves compatibility.

Base path: `/api/v1/docdesk`

### 8.1 Core APIs

| Method | Endpoint | Role | Frontend feature |
|---|---|---|---|
| `POST` | `/requests` | Student, Faculty, Office Staff (non-admin) | Create request form |
| `GET` | `/requests?status=&doc_type_id=&mine=false&limit=25&cursor=` | Everyone; SA/Admin see all, others own only | Dashboard/list/search/filter |
| `GET` | `/requests/{request_id}` | Requester, Student Affairs, Admin | Request detail/tracking |
| `PATCH` | `/requests/{request_id}` | Requester, only while pending | Edit own pending request |
| `DELETE` | `/requests/{request_id}` | Requester, only while pending | Withdraw own pending request |
| `POST` | `/requests/{request_id}/answer` | Student Affairs | Send answer, optional document |
| `PATCH` | `/requests/{request_id}/answer` | Student Affairs, until acknowledged | Edit message/document or remove document |
| `DELETE` | `/requests/{request_id}/answer` | Student Affairs | Withdraw answer; request returns to pending |
| `POST` | `/requests/{request_id}/acknowledge` | Requester | Acknowledge answered request |

### 8.2 Starred bonus APIs shown in the photographs and Cookbook

| Method | Endpoint | Role | Frontend feature |
|---|---|---|---|
| `GET` | `/doc-types?status=active&limit=100&cursor=` | Everyone | Dynamic document-type dropdown/list |
| `GET` | `/doc-types/{doc_type_id}` | Everyone | Document-type detail |
| `POST` | `/doc-types` | Student Affairs | Add type |
| `PATCH` | `/doc-types/{doc_type_id}` | Student Affairs | Edit/archive/restore |
| `DELETE` | `/doc-types/{doc_type_id}` | Student Affairs | Delete type |
| `PUT` | `/requests/{request_id}/tat` | Student Affairs, pending request only | Set one TAT |
| `POST` | `/requests/bulk-tat` | Student Affairs | Set TAT for 1–100 requests, all-or-nothing |
| `GET` | `/requests/{request_id}/document` | Requester, Student Affairs, Admin | Download answer document |
| `PUT` | `/requests/{request_id}/filled-form` | Requester, own request | Upload/replace filled form |
| `GET` | `/requests/{request_id}/filled-form` | Requester, Student Affairs, Admin per guide's role matrix | Download/review filled form |
| `DELETE` | `/requests/{request_id}/filled-form` | Requester, before acknowledgement | Remove filled form |

### 8.3 API details that the frontend must respect

- Request create JSON body: `{ "doc_type_id": "...", "reason": "..." }`.
- Reason: 5–1,000 characters.
- Answer form-data: `message` required, 1–2,000 characters; `document` optional.
- PATCH answer form-data may include `message`, `document`, or `remove_document=true`.
- Document type name: 3–80 characters, unique; description optional.
- Document type status: `active` or `archived`.
- TAT body: `{ "expected_by": "YYYY-MM-DD", "note": "..." }`; date cannot be before today.
- Bulk TAT body includes `request_ids`, `expected_by`, and optional `note`; select 1–100 IDs; all-or-nothing.
- Answer document file: PDF or Word `.docx`, max 10 MB.
- Filled-in form: PDF, Word `.docx`, JPEG or PNG, max 10 MB.
- Filled-in form only works for an answered request with an answer document and before acknowledgement.
- When a file is re-uploaded in the supported operation, it replaces the old file.
- API file URLs in payloads expire after about 15 minutes; future download buttons must use the dedicated download endpoint with authentication.
- Lists are newest-first and paginated. `limit` is 1–100 (default 25); use `next_cursor` to load more; `null` means the final page.

---

## 9. UI validation, errors, and empty states

### 9.1 Frontend validation

Implement client-side validation now; match the API limits to avoid later surprises.

| Form/action | Validation |
|---|---|
| Login | Email required; OTP required (format can be finalized with supplied backend) |
| Create request | Active document type required; reason 5–1,000 characters |
| Edit pending request | Only document type and/or reason; reason 5–1,000 characters |
| Send answer | Message required, 1–2,000 characters; optional file PDF/DOCX, max 10 MB |
| Document type | Name 3–80 characters and unique; description optional |
| Set TAT | Date required; `YYYY-MM-DD`; not before today |
| Bulk TAT | 1–100 unique pending requests; date not before today; all-or-nothing mock behaviour |
| Filled form | Request must be answered and contain an answer document; not acknowledged; PDF/DOCX/JPEG/PNG, max 10 MB |

### 9.2 Error and state presentation

Create reusable components for:

- Inline field validation.
- Form-level error banner.
- Toast success/error feedback.
- Loading skeletons (even in mock mode, use brief async mock service states only if they improve perceived interaction; do not add artificial long delays).
- Empty-state illustration/message and next action.
- Confirmation dialogs for withdraw/delete/remove/acknowledge.
- Disabled states with a reason for unavailable actions.

During future API integration, use `error.code` rather than parsing human-readable text. The guide documents common response statuses including:

- `401` — invalid/expired token.
- `403 FORBIDDEN` — wrong role/permission.
- `404 NOT_FOUND` — missing or inaccessible record.
- `409` — record state does not permit the action (examples include `NOT_ANSWERED`, `NO_DOCUMENT`, `ALREADY_ACKNOWLEDGED`, `REQUEST_NOT_PENDING`, `DOC_TYPE_ARCHIVED`, `ALREADY_EXISTS`).
- `422 VALIDATION_ERROR` — highlight fields using error details.
- `429 RATE_LIMITED` — show retry guidance.

Mock service may simulate common cases so the UI can be tested, but do not invent exact server behaviour beyond the supplied guide.

---

## 10. UX and visual design system

### 10.1 Design direction

Use a clean, modern, professional academic SaaS dashboard. Avoid an outdated college ERP look. Make the Student Affairs processing queue the main operational screen and the Student dashboard the main student-facing screen.

Recommended defaults:

- Primary: deep navy / indigo.
- Accent: royal blue.
- Background: very light cool grey.
- Surfaces: white cards with restrained borders/shadows.
- Text: dark slate with muted secondary text.
- Status chips: amber for pending, blue for answered, green for acknowledged.
- Typography: Inter or a similar highly readable sans-serif.
- Icons: Lucide React.
- Rounded corners: approximately 10–14px, consistent throughout.
- Comfortable whitespace, clear visual hierarchy, clear labels.

These are design recommendations, not requirements from the API documents.

### 10.2 Responsive behaviour

- Desktop: fixed/collapsible sidebar plus wide data tables.
- Tablet: compact sidebar or drawer; tables may horizontally scroll.
- Mobile: drawer navigation; cards stack; request rows become compact cards; forms use full width; action menus remain accessible.
- Never rely on colour alone to communicate status; always show the status text.

### 10.3 Accessibility

- Semantic headings and landmarks.
- Explicit form labels and helper text.
- Keyboard-accessible menus, dialogs, tabs, and tables.
- Visible focus states.
- Sufficient text/background contrast.
- Accessible names for icon-only buttons.
- Confirmation wording that clearly identifies the action and affected request.

### 10.4 Shared reusable components

Build reusable primitives instead of repeating markup:

- `AppShell`, `Sidebar`, `Topbar`, `PageHeader`, `Breadcrumbs`
- `StatCard`, `StatusBadge`, `RequestTable`, `RequestCard`
- `SearchInput`, `StatusFilter`, `DocumentTypeFilter`, `DateRangeFilter`
- `RequestForm`, `AnswerComposer`, `DocumentTypeForm`, `TatForm`
- `FileDropzone`, `FileAttachmentCard`, `FilePreview`, `DownloadButton`
- `RequestTimeline`, `RequestDetailPanel`, `EmptyState`
- `ConfirmDialog`, `Modal`, `Toast`, `Pagination/LoadMore`

---

## 11. Recommended technology and project structure

Unless the team has already chosen a different stack, use:

- React + Vite
- TypeScript
- Tailwind CSS
- React Router
- Lucide React
- React Context for demo auth and shared data state
- React Hook Form + Zod (optional but recommended for consistent forms/validation)

Avoid adding a large component framework unless there is a clear need. Keep dependencies lean.

### Suggested folder structure

```text
docdesk-frontend/
├── public/
│   ├── logo.svg
│   └── assets/
├── src/
│   ├── app/
│   │   ├── App.tsx
│   │   ├── router.tsx
│   │   └── providers.tsx
│   ├── components/
│   │   ├── layout/
│   │   ├── navigation/
│   │   ├── dashboard/
│   │   ├── requests/
│   │   ├── documents/
│   │   ├── forms/
│   │   ├── tables/
│   │   └── ui/
│   ├── features/
│   │   ├── auth/
│   │   ├── requester/
│   │   ├── student-affairs/
│   │   ├── admin/
│   │   ├── requests/
│   │   ├── document-types/
│   │   └── turnaround-time/
│   ├── data/
│   │   ├── seedProfiles.ts
│   │   ├── seedDocumentTypes.ts
│   │   └── seedRequests.ts
│   ├── services/
│   │   ├── docDeskService.types.ts
│   │   ├── mockDocDeskService.ts
│   │   └── serviceProvider.ts
│   ├── context/
│   │   ├── DemoAuthContext.tsx
│   │   └── DocDeskDataContext.tsx
│   ├── hooks/
│   ├── lib/
│   │   ├── permissions.ts
│   │   ├── validation.ts
│   │   ├── date.ts
│   │   └── fileValidation.ts
│   ├── types/
│   │   ├── auth.ts
│   │   ├── document.ts
│   │   └── request.ts
│   ├── styles/
│   │   └── index.css
│   └── main.tsx
├── ARCHITECTURE.md
├── README.md
├── package.json
├── tsconfig.json
└── vite.config.ts
```

The names may be adjusted slightly to fit an existing repository, but preserve the separation between pages, domain types, permissions, and data service.

### Route plan

```text
/login

/app/dashboard
/app/requests
/app/requests/new
/app/requests/:requestId
/app/profile

/sa/dashboard
/sa/requests
/sa/requests/:requestId
/sa/document-types
/sa/turnaround-time
/sa/filled-forms

/admin/dashboard
/admin/requests
/admin/requests/:requestId
```

Use protected route wrappers for demo roles. If a user manually types an unauthorized route, show an Access Denied page or redirect to their own dashboard.

---

## 12. Frontend implementation phases

Do not attempt all screens in one giant code generation step. Implement in this order.

### Phase 1 — Foundation

- Inspect existing repository before changing it.
- Set up React/Vite/TypeScript/Tailwind if not already configured.
- Establish design tokens and global styles.
- Build shared AppShell/sidebar/topbar/page header.
- Build demo login and role-aware routing.
- Add seed data and mock service contract.

**Acceptance criteria:** App starts cleanly; can demo-login as Student, Faculty, Other Office Staff, SA, Admin; each role sees only its intended navigation.

### Phase 2 — Requester core

- Dashboard and live mock counters.
- Create request form.
- My Requests list/search/filter.
- Request detail/tracking timeline.
- Edit/withdraw pending request.
- Answer message and answer document display.
- Acknowledge request.

**Acceptance criteria:** Create a request in demo mode; it appears in list/dashboard; edit and withdraw pending; switch to SA role to answer it; switch back to requester to view and acknowledge it.

### Phase 3 — Student Affairs core

- SA dashboard.
- Pending queue/all request list.
- Request details.
- Answer composer with optional document.
- Edit/withdraw answer.

**Acceptance criteria:** SA can see all seeded requests and send/edit/withdraw answers according to the lifecycle. Requester/Admin cannot see SA-only write controls.

### Phase 4 — Bonus DocDesk features from photos

- Document type manager (active/archive/restore/delete).
- Single TAT.
- Bulk TAT with 1–100 selection and atomic mock operation.
- Answer document download interaction.
- Filled-in form upload/replace/download/remove.
- SA filled-form review queue.

**Acceptance criteria:** All starred endpoint workflows are demonstrable in mock mode, with file-type/size checks and lifecycle restrictions.

### Phase 5 — Admin read-only

- Admin dashboard.
- All requests list.
- Request detail read-only.
- Download answer document/filled form.

**Acceptance criteria:** Admin can inspect all requests and download available demo files, but cannot mutate DocDesk records or see write actions.

### Phase 6 — Polish and quality assurance

- Responsive layouts.
- Search, filtering, pagination/load-more.
- Empty/loading/error states.
- Confirmation dialogs and toasts.
- Keyboard/accessibility checks.
- Refresh persistence/reset demo data.
- Full role-and-lifecycle test matrix.

**Acceptance criteria:** No dead buttons, no blank routes, no console errors, consistent status semantics, and usable mobile layout.

---

## 13. Required end-to-end frontend demo scenarios

The OpenCode agent must implement and manually test these scenarios using mock data.

### Scenario 1 — Basic request

1. Demo-login as Student.
2. Open Request a Document.
3. Choose Bonafide Certificate.
4. Enter a reason of at least five characters.
5. Submit.
6. Confirm a new `pending` request appears in dashboard and My Requests.

### Scenario 2 — Pending request edit/withdraw

1. Open a pending request as its requester.
2. Edit reason/document type and save.
3. Confirm changes appear.
4. Withdraw another pending request after confirmation.
5. Verify it no longer appears as an active request. Do not invent a new API status for withdrawn requests.

### Scenario 3 — SA answers a request

1. Demo-login as Student Affairs office staff.
2. Open the pending queue.
3. Search and open a request.
4. Write a response message.
5. Optionally attach a PDF/DOCX under 10 MB.
6. Send Answer.
7. Verify the request is now `answered` and shows the response/document.

### Scenario 4 — Requester acknowledges

1. Switch to the original requester.
2. Open the answered request.
3. Read the answer and download/view its document if present.
4. Acknowledge.
5. Verify status becomes `acknowledged` and write actions disappear.

### Scenario 5 — Filled-form round trip

1. SA answers a request with an answer document.
2. Requester uploads a PDF/DOCX/JPEG/PNG filled form under 10 MB.
3. SA opens Filled Forms and can view/download the returned form.
4. Requester can replace or remove the file before acknowledging.
5. Once acknowledged, removing the filled form is no longer permitted.

### Scenario 6 — Document types

1. SA adds a document type with a unique 3–80 character name.
2. It appears in the requester dropdown.
3. SA edits description/name.
4. SA archives it; it disappears from new request dropdowns.
5. SA restores it; it reappears.
6. SA deletes another type after confirmation.

### Scenario 7 — TAT and bulk TAT

1. SA sets a future expected date and note on a pending request.
2. Requester sees the expected date/note on the detail page.
3. SA selects multiple pending requests and sets one date/note.
4. Simulate one invalid/non-pending selection and verify no selected mock record is partially updated.
5. Confirm acknowledged/answered requests cannot receive TAT.

### Scenario 8 — Admin read-only

1. Demo-login as Admin.
2. Open all requests and view a request with answer and files.
3. Download the answer document and filled form when available.
4. Verify no create/edit/withdraw/answer/upload/TAT/document-type mutation actions are available.

### Scenario 9 — Other requester roles

1. Demo-login as Faculty and Ordinary Office Staff.
2. Confirm each can create and manage their own requests.
3. Confirm they cannot see the institution-wide SA queue.
4. Confirm no unnecessary USN field is required for Faculty/Office Staff.

---

## 14. OpenCode agent workflow and model usage

The user may run OpenCode with either `GLM-5.3-Flash` or `DeepSeek-V4.1-Flash`. Keep this specification model-agnostic: the selected model must follow the same constraints and acceptance criteria.

### Recommended OpenCode instruction

Copy this into OpenCode as the initial task after placing this file in the project root as `ARCHITECTURE.md`:

```text
Read ARCHITECTURE.md completely before writing code.

We are building the DocDesk frontend only. Do not build a backend or call a real API.
Use the recommended React + Vite + TypeScript + Tailwind stack unless the repository
already has an equivalent stack. Build a role-aware, responsive, working frontend with
mock data behind a service abstraction. Follow all API field names, roles, statuses,
endpoint mappings, restrictions and UI workflows in ARCHITECTURE.md.

First inspect the repository and report the current structure and any existing setup.
Then propose a short implementation plan. Implement Phase 1 only. Run the app and
check for errors. Do not proceed to later phases until Phase 1 is working.
Never invent DocDesk statuses or endpoints. In particular, the only request statuses
are pending, answered and acknowledged; Student Affairs answers requests with a
free-text message and optional document; Admin is read-only in DocDesk.
```

### Suggested task prompts by phase

**Phase 1:**

```text
Implement Phase 1 — Foundation from ARCHITECTURE.md only. Inspect the repository first.
Set up the shared design system, role-aware AppShell, demo login, protected routes,
seed data, mock service contract, and centralized permission helpers. Run and verify it.
```

**Phase 2:**

```text
Implement Phase 2 — Requester core from ARCHITECTURE.md. Use only the mock service.
Add dashboard counters, request form, My Requests, detail/tracking, edit/withdraw,
answer display and acknowledge. Test the requester lifecycle. Do not add API calls.
```

**Phase 3:**

```text
Implement Phase 3 — Student Affairs core from ARCHITECTURE.md. Add dashboard,
request queue, request detail and answer composer. Make sure Student Affairs is an
office_staff profile with dept Student Affairs. Preserve status values exactly.
```

**Phase 4:**

```text
Implement Phase 4 — all starred DocDesk bonus features from ARCHITECTURE.md:
document type CRUD/archive/restore, single and bulk TAT, answer file attachment,
filled-form upload/replace/download/remove and SA filled-form review. Use mock service.
Validate file type, 10 MB size, pending/answered/acknowledged restrictions and bulk
all-or-nothing behaviour.
```

**Phase 5:**

```text
Implement Phase 5 — read-only Admin DocDesk portal. Admin can inspect all requests
and download available files, but must not get any DocDesk mutation action. Test role
restrictions directly and by manually entering routes.
```

**Phase 6:**

```text
Implement Phase 6 — responsive polish and QA. Run every end-to-end demo scenario in
ARCHITECTURE.md, fix dead buttons, missing states, validation problems, responsive
layout issues and console/type errors. Do not start backend integration.
```

### Model collaboration suggestion

If both configured models are available in the OpenCode workflow:

- Use one selected model to implement a clearly bounded phase at a time.
- Use the other as a reviewer: ask it to compare the diff against `ARCHITECTURE.md`, find permission/status/field mismatches, missing endpoints in the future mapping, dead controls, and broken responsive states.
- Do not ask both models to rewrite the same files concurrently.
- Keep one source of truth: this `ARCHITECTURE.md` plus the repository's actual code.

No claim is made here about which model is faster or more accurate; choose based on your own OpenCode testing and available context window.

---

## 15. Definition of Done for the frontend-only milestone

The frontend milestone is complete only when:

- [ ] Login/demo profile selection works for Student, Faculty, Other Office Staff, Student Affairs, and Admin.
- [ ] Role-based navigation and page access work.
- [ ] Requester dashboard uses the correct four status counters.
- [ ] Request creation works with correct validation.
- [ ] My Requests search/filter/list/detail works.
- [ ] Pending request edit and withdraw work in mock state.
- [ ] SA can view all requests and answer/edit/withdraw answers.
- [ ] Answer message and optional answer document UI work.
- [ ] Acknowledge works only for answered requests.
- [ ] Document type create/edit/archive/restore/delete works for SA.
- [ ] Single and bulk TAT works with validation and all-or-nothing behaviour.
- [ ] Answer-document download interaction works in demo mode.
- [ ] Filled-form upload/replace/download/remove works with conditions and file validation.
- [ ] SA can review returned filled forms.
- [ ] Admin portal is read-only for DocDesk and can inspect/download permitted files.
- [ ] Faculty and ordinary office staff can use requester flows without student-only USN assumptions.
- [ ] Empty, loading, error, success, and confirmation states exist.
- [ ] Layout works on desktop, tablet and mobile.
- [ ] Mock data persists across refresh (except temporary object URLs if not using IndexedDB).
- [ ] Reset demo data works.
- [ ] No real backend/API calls are present.
- [ ] No dead buttons or placeholder routes remain.
- [ ] Project builds and runs without TypeScript/build errors.

---

## 16. Final guardrails and unresolved items

1. **Do not build a separate Verify endpoint or `under_processing` status.** Verification/review is a Student Affairs activity while the request is pending.
2. **Do not model approval/rejection as request statuses.** The response is free text; status becomes `answered`.
3. **Do not give Admin write controls in DocDesk.** The supplied role table says Admin can only read here.
4. **Do not confuse Student Affairs with Admin.** SA is `office_staff` with `dept = "Student Affairs"` and is the role that answers requests.
5. **Do not assume all answer messages include a file.** The message is required; attached document is optional.
6. **Do not assume all answered requests include a filled form.** Filled form exists only after the requester uploads it, and only when an answer document exists.
7. **Do not add notifications as an existing endpoint.** The supplied DocDesk specification does not define a notification API. A frontend-only toast is allowed as local interaction feedback.
8. **Do not include Notice Hub or FixIt screens in DocDesk.** The photographed pages show neighbouring module rows; they are not part of the DocDesk base path.
9. The photos use abbreviated paths such as `/requests/{id}` and `/doc-types/{id}`. During backend phase, use the full path and detailed query parameters from the Cookbook.
10. The first milestone is strictly a functional mock frontend. Backend integration starts only after the user explicitly begins the backend phase.

---

**End of DocDesk Frontend Architecture Specification.**
