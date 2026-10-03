# Contact Center frontend

React 19, TypeScript, Vite, React Router, Axios, Zustand, Tailwind CSS, and MUI.

## Run locally with Floci

From the repository root, start Docker Desktop, deploy the backend once, and start the UI:

```powershell
docker desktop start
.\deploy.ps1 -Local
.\start-ui.ps1
```

On later runs, use `docker compose up -d floci ollama chroma` and `.\start-ui.ps1`.
Keep the UI terminal open and visit http://localhost:5173/login.
See [the Floci setup guide](../FLOCI.md) for Cognito account creation and prerequisites.

## Environment

Copy `.env.example` to `.env` for a new checkout. `VITE_API_URL=/api` sends browser requests through Vite's development proxy. `start-ui.ps1` resolves `BACKEND_API_URL` from the deployed Floci stack and overrides stale environment settings. Restart it after deploying the backend.

For a separate backend, set `BACKEND_API_URL` to its actual base URL before running `npm run dev`. Vite loads `.env.local` after `.env`; keep both consistent. Browser-visible `VITE_*` variables must never contain AWS credentials. A production build using `/api` requires a reverse proxy routing `/api` to the deployed backend; Vite's development proxy does not run in production.

## Pages and authentication

- `/login`: Cognito email/password sign-in through Floci locally; Remember me chooses local storage or tab session storage.
- `/dashboard`: ticket totals with loading, error, and retry states.
- `/contact`: authenticated support form creating a ticket through `POST /tickets`.
- `/tickets`: ticket list, customer details, description editor, and validated status transitions.

Logout clears credentials and ticket state; expired sessions return to the login page. The login API is `POST /api/auth/login`; opening that API URL in a browser sends GET and is not the login page. Calls, Customers, and Analytics remain dashboard placeholders; call controls and team/call metrics are marked as demo data.

## Checks

```powershell
cd frontend
npm test
npm run lint
npm run build
```

Authentication regressions cover corrupt/expired sessions, Remember me, logout, stale requests, and session changes. The shared Axios instance is in `src/services/api.ts`; ticket APIs are in `src/services/ticketService.ts`.
