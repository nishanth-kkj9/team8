# DocDesk

DocDesk is a role-based CampusOS frontend for academic document requests. It uses the organiser-provided CampusOS API for authentication, request data, document types, turnaround dates, answers, and file transfers. There is no production demo login or mock-data fallback.

## Requirements

- Node.js 20 or newer
- The CampusOS API base URL supplied by the organisers
- A provisioned campus account and the team's runtime OTP

Copy `.env.example` to `.env` and set `VITE_API_BASE_URL` to the organiser-provided API origin. The client adds `/api/v1` once. The app stops with a configuration error if this value is missing. Never put OTPs or access tokens in Vite variables.

```sh
npm ci
npm run dev
npm run typecheck
npm test
npm run build
npm run preview
```

## Authentication and roles

The login form accepts a registered email and OTP. Team 8's pre-provisioned Admin uses `POST /api/v1/auth/admin/login`; other accounts use `POST /api/v1/auth/login`. The app verifies the returned bearer token, expiry, and server profile using `/admin/me` or `/users/me` before granting access. CampusOS's Flow Guide says the OTP is shared by the team; account-creation responses may return this same team OTP. The Admin account screen labels it as shared and displays it only in the in-memory success panel when the API returns it.

DocDesk has two portals: Student and Admin. Students submit and track document requests. Admin staff review requests and manage the document types students can select. The Admin account can create Student accounts and Admin staff accounts; staff accounts use CampusOS's `office_staff` role in the Student Affairs department so they can manage document types. There is no public signup.

CampusOS tokens are stored in `sessionStorage` for the browser session. This enables bearer API requests but remains accessible to same-origin JavaScript; keep dependencies trusted and deploy with a restrictive content-security policy.

## DocDesk API coverage

The service adapter in `src/services/api/campusOsDocDeskService.ts` implements request create/list/detail/edit/withdraw, answer create/edit/withdraw, acknowledgement, document type list/detail/create/edit/archive/restore/delete, single and atomic bulk TAT, answer-document download, and filled-form upload/download/removal. Request statuses are `pending`, `answered`, and `acknowledged`. Multipart requests let the browser set the boundary; successful downloads are treated as binary Blobs.

The CampusOS API is authoritative for validation and permissions. The UI checks the documented field and file limits before sending requests. API errors retain status, code, message, details, request ID, and Retry-After when available.

## Verification limits

CI runs typecheck, the repository's HTTP-mocked/service checks, and a production build. These checks do not prove that organiser credentials, CORS, or a live CampusOS deployment work. Live API verification requires the organiser URL and provisioned test accounts; none are included in this repository. Do not treat a local build or mocked HTTP test as live integration proof.

The track assignment PDF lists DocDesk for Team 8. The official starter repository could not be retrieved in this environment, so this standalone repository has not been verified against any starter-only feature-track constraints.
