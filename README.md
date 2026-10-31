# DocDesk ??? CampusOS Document Requests

The CampusOS academic document request desk, built as a **frontend-only demo** per
`ARCHITECTURE.md`. Phases 1???3 are implemented: design system, role-aware AppShell,
demo login, protected role-aware routing, seed data, the mock service contract,
centralized permission helpers, the full requester lifecycle (create / list /
search / track / edit / withdraw / acknowledge), and the Student Affairs core
(dashboard, queue, review & answer composer with edit/withdraw). No backend and no
CampusOS API calls.

## Stack

- React 19 + Vite 8 + TypeScript (strict)
- Tailwind CSS 4 (CSS-first design tokens in `src/styles/index.css`)
- React Router 7 (`createBrowserRouter`)
- Lucide React icons, Inter Variable font (bundled locally)

## Run it

```bash
bun install        # or npm install
bun run dev        # dev server on http://localhost:3000 (strict port, sandbox preview)
bun run typecheck  # tsc --noEmit
bun run build      # typecheck + production build to dist/
bun run preview    # serve the production build on :3000
```

> `db:push` is a no-op kept for the sandbox dev runner; DocDesk Phase 1 has no database.

## Demo logins

The login screen offers five clearly-labelled demo accounts (any 4+ character OTP
works with the email form, or click an account card):

| Demo account | Profile | Portal |
|---|---|---|
| Student | Asha Kumar ?? CSE, USN 1NT21CS047 | `/app` |
| Faculty | Meera Rao ?? Associate Professor | `/app` |
| Other Office Staff | Suresh Babu ?? Accounts | `/app` |
| Student Affairs | Ravi Shetty ?? office_staff, dept "Student Affairs" | `/sa` |
| Admin | Vikram Desai ?? institution admin | `/admin` (read-only) |

Each role sees only its own navigation; typing another role's URL shows an
Access Denied page. Data is scoped per role: requesters see their own requests,
Student Affairs and Admin see all.

## Phase 1 contents

- **Design system** (`src/styles/index.css`): navy/indigo primary, royal blue accent,
  status colours (amber/blue/green), 10???12px radii, Inter typography.
- **AppShell** (`src/components/layout/`): collapsible sidebar, mobile drawer,
  topbar with breadcrumbs, help dialog, profile menu, `Demo data` indicator, toasts.
- **Demo login** (`src/features/auth/`): email + OTP with masked/unmasked toggle,
  inline validation, five demo account shortcuts.
- **Protected routes** (`src/routes/`): role-aware guards, access denied, 404,
  role home redirect; Phase 2+ screens are scaffolded with informative placeholders.
- **Seed data** (`src/data/`): 5 profiles, 5 document types (one archived),
  7 requests covering every required status/file combination, dates relative to today.
- **Mock service** (`src/services/`): the full `DocDeskService` contract from
  `ARCHITECTURE.md` ??7.3, implemented with localStorage persistence, viewer-scoped
  visibility, API-like error codes, and `resetDemoData()` (profile menu).
- **Permissions** (`src/lib/permissions.ts`): all authorization helpers
  (`canCreateRequest`, `canAnswerRequest`, `canManageDocumentTypes`, ???) in one place;
  components never compare role strings inline.

## Phase 2 contents ??? Requester core

- **Dashboard** (`RequesterDashboardPage`): live pending/answered/acknowledged
  counters from the mock service, quick links, recent requests table.
- **Request a Document** (`NewRequestPage`, `/app/requests/new`): active document
  type dropdown, reason with 5???1,000 character validation and counter, read-only
  requester details (USN for students only), mock `DRQ-???` ID from the service.
- **My Requests** (`MyRequestsPage`, `/app/requests`): search by ID/document name,
  status + document type filters, newest/oldest/expected-date sort, empty states.
- **Request detail** (`RequestDetailPage`, `/app/requests/:id`): lifecycle timeline,
  TAT panel, answer panel with optional document download, edit/withdraw while
  pending, acknowledge when answered ??? all with confirmation dialogs and toasts.
- **Shared components** (`src/components/requests/`, `src/features/requests/`):
  responsive `RequestTable` (desktop table / mobile cards), `RequestForm`,
  `RequestTimeline`, `AnswerPanel`, `FileMetadataCard`, `RequestFilters`.
- The Student Affairs answer step of the Phase 2 acceptance round trip is performed
  through the mock service directly (dev-only `window.__docDeskService` hook); the
  SA queue and answer composer UI arrive in Phase 3.

## Phase 3 contents ??? Student Affairs core

- **SA dashboard** (`SaDashboardPage`, `/sa/dashboard`): institution-wide counters,
  quick actions, latest pending queue, TAT due-soon/overdue attention panel
  (frontend-derived), awaiting-requester and returned-form counters, recent
  responses with message previews.
- **Request queue** (`SaQueuePage`, `/sa/requests`): status tabs (All / Pending /
  Answered / Acknowledged, synced with the `?status=` param and sidebar nav),
  search across requester name / email / request ID / document, doc-type filter,
  sort, and a requester-column table view.
- **Review & answer** (`SaRequestDetailPage`, `/sa/requests/:id`): requester
  details (name/email/role/dept/phone), reason, TAT, timeline, answer panel;
  answer composer with 1???2,000 character message counter, four response
  templates, optional PDF/DOCX attachment (???10 MB), edit answer (replace/remove
  document) and withdraw answer (confirmation; returns the request to pending).
- The Phase 2 dev-only `window.__docDeskService` hook was removed ??? SA answers
  now go through the real composer UI.

## Phases still to build

Per `ARCHITECTURE.md` ??12: Phase 4 bonus features (document types, TAT, bulk TAT,
filled forms), Phase 5 admin
read-only browsing, Phase 6 polish/QA. All later phases must go through
`docDeskService` ??? swap the mock for the real API in `src/services/serviceProvider.ts`.
