##############################################################################
# deploy.ps1 — Build Lambda handlers and deploy or run locally
#
# Usage (PowerShell):
#   .\deploy.ps1 -Local                  # start LocalStack + sam local start-api
#   .\deploy.ps1                         # first AWS deploy — opens guided prompts
#   .\deploy.ps1 -SkipGuided             # subsequent AWS deploys (uses samconfig.toml)
#   .\deploy.ps1 -StackName my-stack     # override stack name
#   .\deploy.ps1 -DryRun                 # build only, skip deploy
##############################################################################
param(
    [string] $StackName  = "contact-center-dev",
    [string] $Region     = "us-east-1",
    [string] $Port       = "3000",
    [switch] $SkipGuided,
    [switch] $DryRun,
    [switch] $Local
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Step([string]$msg) { Write-Host "`n==> $msg" -ForegroundColor Cyan }
function Ok([string]$msg)   { Write-Host "    ✓ $msg"  -ForegroundColor Green }
function Fail([string]$msg) { Write-Host "    ✗ $msg"  -ForegroundColor Red; exit 1 }

# ── 1. Install backend dependencies ──────────────────────────────────────────
Step "Installing backend dependencies"
Push-Location backend
npm ci --silent
if ($LASTEXITCODE -ne 0) { Fail "npm ci failed" }
Ok "node_modules ready"

# ── 2. Build Lambda handlers with esbuild ────────────────────────────────────
Step "Building Lambda handlers (esbuild)"
node build.js
if ($LASTEXITCODE -ne 0) { Fail "esbuild failed" }
Pop-Location

if ($DryRun) {
    Ok "DryRun flag set — skipping deploy"
    exit 0
}

# ── LOCAL mode: docker-compose + sam local start-api ─────────────────────────
if ($Local) {
    Step "Starting LocalStack (docker-compose)"
    docker-compose up -d
    if ($LASTEXITCODE -ne 0) { Fail "docker-compose up failed" }

    # Wait for LocalStack to be healthy
    Write-Host "    Waiting for LocalStack..." -ForegroundColor Yellow
    $retries = 0
    do {
        Start-Sleep -Seconds 2
        $status = try { (Invoke-WebRequest -Uri "http://localhost:4566/_localstack/health" -UseBasicParsing -TimeoutSec 2).StatusCode } catch { 0 }
        $retries++
    } while ($status -ne 200 -and $retries -lt 15)

    if ($status -ne 200) { Fail "LocalStack did not become healthy in time" }
    Ok "LocalStack is ready at http://localhost:4566"

    if (-not (Test-Path "env.local.json")) {
        Write-Host "    env.local.json not found — creating default" -ForegroundColor Yellow
        @'
{
  "Parameters": {
    "USERS_TABLE":           "Users",
    "TICKETS_TABLE":         "Tickets",
    "CALLS_TABLE":           "Calls",
    "LOGS_TABLE":            "Logs",
    "TENANTS_TABLE":         "Tenants",
    "COGNITO_USER_POOL_ID":  "local-pool-id",
    "COGNITO_CLIENT_ID":     "local-client-id",
    "AWS_ENDPOINT":          "http://localstack:4566"
  }
}
'@ | Set-Content env.local.json
        Write-Host "    Update COGNITO_USER_POOL_ID and COGNITO_CLIENT_ID in env.local.json with IDs from LocalStack" -ForegroundColor Yellow
    }

    Step "Starting SAM local API on http://localhost:$Port"
    sam local start-api `
        --template infrastructure/template.yaml `
        --env-vars env.local.json `
        --docker-network contact-center-network `
        --port $Port
    exit 0
}

# ── AWS DEPLOY mode ───────────────────────────────────────────────────────────

$samArgs = @(
    "deploy",
    "--template", "infrastructure/template.yaml",
    "--stack-name", $StackName,
    "--region", $Region,
    "--capabilities", "CAPABILITY_IAM", "CAPABILITY_AUTO_EXPAND",
    "--resolve-s3"
)

if (-not $SkipGuided -and -not (Test-Path "samconfig.toml")) {
    Write-Host "    No samconfig.toml found — running guided deploy (answers are saved for next time)" -ForegroundColor Yellow
    $samArgs += "--guided"
}

sam @samArgs
if ($LASTEXITCODE -ne 0) { Fail "SAM deploy failed" }

# ── 4. Print stack outputs ────────────────────────────────────────────────────
Step "Stack outputs"
aws cloudformation describe-stacks `
    --stack-name $StackName `
    --region $Region `
    --query "Stacks[0].Outputs" `
    --output table

Ok "Done — stack '$StackName' deployed"
