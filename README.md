# DocDesk — CampusOS Document Requests

DocDesk is a React application for requesting and managing official campus documents through the CampusOS API.

## Account flow

- The organizer provisions the Team 8 Admin account. Sign in with `admin@team8.com` and enter the organizer-provided OTP at runtime.
- An authenticated Admin creates student accounts from `/admin/users/new`.
- Students do not self-register. They sign in with their registered email and the account OTP issued by CampusOS.
- The shared login page routes users according to the profile returned by CampusOS.

The app does not hardcode, autofill, log, or persist OTP credentials. Student creation requires an authenticated Admin session and uses `POST /api/v1/admin/users`.

## Development

Install dependencies and start the Vite development server:

```sh
npm install
npm run dev
```

Set `VITE_API_BASE_URL` when using a non-default CampusOS API host.

## Validation

```sh
npm run typecheck
npm test
npm run build
```

Authentication should be considered live only after testing against the real CampusOS API.
