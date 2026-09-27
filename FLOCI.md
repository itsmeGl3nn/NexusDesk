# Floci setup and UI startup (Windows / PowerShell)

## 1. Prerequisites

Install Docker Desktop with Linux containers, Node.js 20 or newer, AWS CLI v2,
AWS SAM CLI, and Python. The `python`, `npm`, `aws`, `sam`, and `docker` commands
must be available in a new PowerShell window. On Windows, the deploy script also accepts Python installed through the `py` launcher.

Install the SAM endpoint wrapper once:

```powershell
python -m pip install aws-sam-cli-local
samlocal --version
```

`samlocal` is only a CLI wrapper here. The AWS emulator is Floci; no LocalStack
container, account, or auth token is needed. The wrapper routes requests through
`AWS_ENDPOINT_URL=http://localhost:4566`.

## 2. First startup or backend changes

```powershell
cd D:\NexusDesk
docker desktop start
.\deploy.ps1 -Local
```

The script installs backend dependencies, bundles handlers, runs `sam build`,
starts Floci/Ollama/ChromaDB, and runs `samlocal deploy`. It uses dummy AWS
credentials within the script and restores the previous environment afterward.
SAM creates Lambda functions, a REST API, five DynamoDB tables, Cognito resources,
and an attachments bucket. The local setup script also creates the three Cognito groups because Floci does not materialize that CloudFormation resource type. Resources are not seeded by the old LocalStack hooks.

Wait for the final `PASS` message. The checks exercise API Gateway and Lambda at
`/ping`, inspect DynamoDB/S3/Lambda, and check Ollama and ChromaDB endpoints.

## 3. Start the UI

Run this in a separate PowerShell window:

```powershell
cd D:\NexusDesk
.\start-ui.ps1
```

Keep the window open. Visit **http://localhost:5173**.
The script installs frontend dependencies if missing and resolves the API URL
from the deployed stack. Browser calls to `/api` use Vite's proxy, so no API ID,
stage, or CORS configuration needs to be copied into a frontend `.env` file.

## 4. Create a local login (once)

This workspace already has the local demo account below. For a fresh database, create it once. The UI has a login page but no registration page. With the UI running, create
an initial tenant and administrator through the existing registration endpoint:

```powershell
$body = @{
    tenantName = 'Local Demo'
    adminEmail = 'admin@localhost.com'
    adminPassword = 'Admin123!'
    adminFirstName = 'Local'
    adminLastName = 'Admin'
} | ConvertTo-Json
Invoke-RestMethod http://localhost:5173/api/tenants/register -Method Post -ContentType application/json -Body $body
```

These credentials are for the local emulator only. Register once, then sign in
using `admin@localhost.com` and `Admin123!`. If that account already exists, use
the existing login rather than registering again.

## 5. Daily startup

After the first successful deployment:

```powershell
cd D:\NexusDesk
docker desktop start
docker compose up -d floci ollama chroma
.\start-ui.ps1
```

Floci data, Ollama models, and ChromaDB data use named Docker volumes. Rerun
`.\deploy.ps1 -Local` after backend or SAM changes. Restart the UI script after redeploying because Floci can assign a new API ID. Frontend edits reload in Vite.
The AI application and model download are separate from this infrastructure phase;
Ollama starts without a downloaded model.

## 6. Stop

Press **Ctrl+C** in the UI terminal, then:

```powershell
cd D:\NexusDesk
docker compose down
```

Do not add `-v` unless you intend to delete the local data volumes.

## Troubleshooting

- **Docker engine unavailable:** open Docker Desktop and wait until Linux containers are ready.
- **Port 4566 already in use:** stop the old LocalStack container before starting Floci.
- **`python` is not recognized:** add the Python installation directory and its `Scripts` directory to PATH, then open a new terminal.
- **Stack not found:** run `.\deploy.ps1 -Local` before starting the UI.
- **Port 5173 occupied:** stop the previous Vite process. The script fails instead of silently changing ports.
- **API errors:** inspect `docker compose logs floci`; confirm `http://localhost:5173/api/ping` returns `{"status":"ok"}`.
- **PowerShell blocks scripts:** use `powershell -ExecutionPolicy Bypass -File .\start-ui.ps1` for that invocation.

Service ports: Floci `4566`, UI `5173`, Ollama `11434`, ChromaDB `8001`.
For custom stacks, pass the same `-StackName` and `-Region` to both scripts.

References: [Floci quick start](https://floci.io/floci/getting-started/quick-start/),
[Floci configuration](https://floci.io/floci/configuration/environment-variables/).

## Verified scope

SAM build/deploy, all six infrastructure checks, local registration, and browser login were verified. Dashboard call/team metrics remain existing demo values; Phase 1 does not complete later application features.
