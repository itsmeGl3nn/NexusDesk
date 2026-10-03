# Start NexusDesk and test it manually

Use PowerShell on Windows. Run commands from `D:\NexusDesk` unless a different folder is shown.

The local AWS services run in **Floci**. The backend runs as Lambda functions inside Floci, reached through API Gateway. Deploying the backend prepares those functions; requests invoke them automatically. The frontend runs in a separate Vite terminal.

Default stack: `contact-center-dev`. AWS region: `us-east-1`.

## 1. Prerequisites

You need Docker Desktop with Linux containers, Node.js 20 or newer, AWS CLI v2, AWS SAM CLI, Python, and the `aws-sam-cli-local` endpoint wrapper.

Check the installed commands:

```powershell
cd D:\NexusDesk
docker --version
node --version
npm --version
aws --version
sam --version
samlocal --version
```

If `samlocal` is missing, install the wrapper once:

```powershell
py -3 -m pip install aws-sam-cli-local
```

If your Python installation uses the `python` command, use `python -m pip install aws-sam-cli-local` instead. Reopen PowerShell after installation if the command is not found.

## 2. Start Floci

In **Terminal 1**:

```powershell
cd D:\NexusDesk
docker desktop start
docker info
docker compose up -d floci ollama chroma
docker compose ps
```

Wait until Docker's Linux engine is ready. If the CLI startup hangs or the engine is unavailable, open Docker Desktop from the Start menu and wait for it to finish starting, then rerun the Compose command.

The Compose command starts Floci, Ollama, and ChromaDB in the background. These use Docker volumes to retain local data.

| Service | Address |
|---|---|
| Floci AWS endpoint | `http://localhost:4566` |
| Ollama | `http://localhost:11434` |
| ChromaDB | `http://localhost:8001` |

Ollama and ChromaDB are included in the deployment checks. The current login and ticket pages do not require a downloaded AI model or the separate Python AI application.

## 3. Deploy/start the backend

Run this for the first setup, and again whenever backend code or the SAM template changes:

```powershell
cd D:\NexusDesk
.\deploy.ps1 -Local
```

The script installs backend dependencies, bundles the handlers, builds the SAM template, deploys to Floci, prepares Cognito groups, and checks the infrastructure. Wait for the final `PASS` message.

The `-Local` flag selects Floci. The script supplies temporary dummy AWS credentials and restores your previous environment afterward.

Once deployed, the backend is available while Floci is running. Its API endpoint is stored in CloudFormation; the frontend startup script reads it automatically. The `npm start` script in `backend/` is not the server startup command for this application.

On later starts with no backend changes, you can skip deployment and continue to step 4.

## 4. Start the frontend

In **Terminal 2**:

```powershell
cd D:\NexusDesk
.\start-ui.ps1
```

Wait for Vite's `ready` message. Keep this terminal open.

Open **[http://localhost:5173/login](http://localhost:5173/login)** in your browser.

The script installs frontend dependencies if needed and sets the current Floci API as Vite's proxy target. Browser requests go through `/api`. Restart the frontend after deploying the backend, because Floci can change the API ID.

If the frontend is already running on port 5173, use the open UI or stop its existing terminal with **Ctrl+C** before starting another copy.

## 5. Confirm the connection

In **Terminal 1**, with the frontend running:

```powershell
Invoke-RestMethod http://localhost:5173/api/ping -TimeoutSec 120
```

Expected result: `status` is `ok`. This checks the frontend proxy, API Gateway, and a backend Lambda function together.

## 6. Sign in with Cognito

The existing local demo account is:

| Field | Value |
|---|---|
| Email | `admin@localhost.com` |
| Password | `Admin123!` |

These credentials are for the local Floci emulator. Enter them on the `/login` page and select **Sign In**. The dashboard should open.

### Only for a fresh local database

If the demo account has never been created, register its tenant once while the frontend is running:

```powershell
cd D:\NexusDesk
$registration = @{
    tenantName = 'Local Demo'
    adminEmail = 'admin@localhost.com'
    adminPassword = 'Admin123!'
    adminFirstName = 'Local'
    adminLastName = 'Admin'
} | ConvertTo-Json

Invoke-RestMethod http://localhost:5173/api/tenants/register `
    -Method Post `
    -ContentType application/json `
    -Body $registration
```

Register only once. An existing account should be used for login instead of registering it again.

## 7. Manual test checklist

### Login and logout

1. While signed out, visit `http://localhost:5173/tickets`. You should return to `/login`.
2. Submit the demo email with an incorrect password. A readable error should appear, and you should stay on the login page.
3. Submit the correct credentials. The dashboard should open, with ticket totals loaded from the backend.
4. Refresh the page. The valid session should remain signed in.
5. Select **Logout**. You should return to `/login`.
6. Visit `/tickets` again, or use the browser Back button. Protected content should remain unavailable while signed out.
7. Sign in with **Remember me** selected. Close and reopen the tab, then visit `/dashboard`; the valid remembered session should restore. Logout clears it. With Remember me unchecked, the session is scoped to the current tab; browsers may restore tab session storage when restoring a browsing session.

Expired sessions require signing in again. Google sign-in and self-service password reset are not configured in this frontend; the page uses Cognito email/password login.

### Contact form and ticket dashboard

1. Sign in, then select **Contact Support** in the sidebar.
2. Try submitting an empty form. Required fields should prevent submission.
3. Complete the form using a test name, `manual-test@example.test`, a subject, and a description.
4. Select **Send request**. The button should show its loading state, followed by a success message with a ticket link.
5. Open the ticket link. The ticket should appear in the list and its details should show the customer, subject, email, and description.
6. Edit the description, change **Open** to **In progress**, and select **Save changes**. Confirm the saved message and new status.
7. Refresh, select the same ticket, and confirm the changes remain saved.
8. Change **In progress** to **Resolved**. A resolution is required. Enter one and save; then **Closed** becomes available as the next status.
9. Open **Dashboard** and confirm the ticket totals reflect its current status.

Manual test tickets remain in your local database. There is no ticket-delete endpoint in the current application.

### Loading, errors, and recovery

To exercise an API connection error without signing out:

1. Keep the frontend terminal running and stay signed in.
2. In Terminal 1, run `docker compose stop floci`.
3. Reload **Tickets**. An API error with **Retry** should appear. A failed connection should not silently appear as an empty ticket list.
4. Run `docker compose up -d floci` and wait for it to become ready.
5. Select **Retry**. Tickets should load again. If your token expired while testing, sign in again.

Calls, Customers, and Analytics currently open dashboard placeholders. Call controls and call/team metrics are marked as demo content; they are not part of the working ticket flow.

## 8. Everyday startup: short version

After the initial deployment, with Docker Desktop ready:

```powershell
cd D:\NexusDesk
docker compose up -d floci ollama chroma
.\start-ui.ps1
```

Visit `http://localhost:5173/login`. Keep the terminal open. If backend code changed, run `.\deploy.ps1 -Local` before starting the frontend.

## 9. Stop everything

Press **Ctrl+C** in the frontend terminal. Then:

```powershell
cd D:\NexusDesk
docker compose down
```

The standard shutdown preserves the Docker data volumes. Adding `-v` deletes them, including your local Floci accounts and records.

## Troubleshooting

| Problem | What to do |
|---|---|
| Docker engine unavailable | Open Docker Desktop and wait for Linux containers to be ready. Check `docker info`. |
| Stack not found | Run `.\deploy.ps1 -Local`, then start the frontend again. |
| `Missing Authentication Token` | Check the route, HTTP method, and proxy target. Use `/login` in the browser; `/api/auth/login` is a POST API endpoint. Restart the frontend after deployment. |
| API points to old port 3001 | Use `.\start-ui.ps1`; it overrides stale frontend environment settings and resolves the current Floci endpoint. |
| Port 5173 is occupied | Stop the existing Vite terminal with Ctrl+C or use its running UI. |
| PowerShell blocks the startup script | Use `powershell -ExecutionPolicy Bypass -File .\start-ui.ps1` for that invocation. |
| PowerShell blocks the deployment script | Use `powershell -ExecutionPolicy Bypass -File .\deploy.ps1 -Local` for that invocation. |
| Floci stopped during a check | Restart with `docker compose up -d floci ollama chroma`, then retry the health check. |
| Login fails with the documented demo credentials | Confirm Floci is ready and that the account exists in the current Cognito user pool. Create it only on a fresh database. |

Inspect the local AWS service logs:

```powershell
cd D:\NexusDesk
docker compose ps -a
docker compose logs --tail 100 floci
```

For additional setup details, see [FLOCI.md](FLOCI.md). For the current architecture and API routes, see [README.md](README.md).
